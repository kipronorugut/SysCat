import axios, { AxiosInstance } from 'axios';
import log from 'electron-log';
import { authService, REQUIRED_SCOPES } from './auth.service';
import { configCacheService } from './config-cache.service';

// Add delete method helper
declare module 'axios' {
  export interface AxiosInstance {
    delete<T = any>(url: string, config?: any): Promise<{ data: T }>;
  }
}

const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';

export interface TenantSummary {
  userCount: number;
  licensedUserCount: number;
  guestUserCount: number;
  inactiveUserCount: number; // 90+ days
  mfaAdoptionRate: number;
  skuSummary: {
    skuId: string;
    skuPartNumber: string;
    enabled: number;
    consumed: number;
    available: number;
  }[];
  savingsOpportunity: {
    unusedLicenses: number;
    inactiveAccounts: number;
    estimatedMonthlySavings: number;
  };
}

export interface User {
  id: string;
  userPrincipalName: string;
  displayName: string;
  userType: string;
  accountEnabled: boolean;
  assignedLicenses: string[];
  lastSignIn?: Date;
  mfaRegistered: boolean;
  signInActivity?: {
    lastSignInDateTime?: Date;
  };
}

export interface License {
  skuId: string;
  skuPartNumber: string;
  enabled: number;
  consumed: number;
  available: number;
}

export class GraphApiService {
  private axiosInstance: AxiosInstance;
  
  // Cache for frequently accessed data
  private directoryRolesCache: Array<{ id: string; displayName: string; description: string }> | null = null;
  private roleMembersCache: Map<string, Array<{ id: string; userPrincipalName: string; displayName: string }>> = new Map();
  private cacheTimestamps: Map<string, number> = new Map();
  private readonly CACHE_TTL = 60000; // 1 minute cache

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: GRAPH_BASE_URL,
      timeout: 30000,
    });
  }

  /**
   * Retry helper with exponential backoff
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        
        // Don't retry on 403 (permission errors) or 401 (auth errors)
        if (error?.response?.status === 403 || error?.response?.status === 401) {
          throw error;
        }
        
        // Don't retry on last attempt
        if (attempt === maxRetries) {
          break;
        }
        
        // Check if it's a retryable error (timeout, 429, 500, 502, 503, 504)
        const isRetryable = 
          error?.code === 'ETIMEDOUT' ||
          error?.code === 'ECONNRESET' ||
          error?.response?.status === 429 ||
          error?.response?.status === 500 ||
          error?.response?.status === 502 ||
          error?.response?.status === 503 ||
          error?.response?.status === 504;
        
        if (!isRetryable) {
          throw error;
        }
        
        // Calculate delay with exponential backoff
        const delay = baseDelay * Math.pow(2, attempt);
        
        // For 429 errors, check Retry-After header
        if (error?.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'];
          if (retryAfter) {
            const retryDelay = parseInt(retryAfter) * 1000;
            log.debug('[GraphApiService] Rate limited, waiting', { retryAfter: retryDelay });
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            continue;
          }
        }
        
        log.debug('[GraphApiService] Retrying request', { attempt: attempt + 1, maxRetries, delay });
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }

  private async get<T>(path: string, query: Record<string, string | number | boolean> = {}): Promise<T> {
    const url = new URL(`${GRAPH_BASE_URL}${path}`);

    Object.entries(query).forEach(([k, v]) => {
      url.searchParams.append(k, String(v));
    });

    return this.retryWithBackoff(async () => {
      // Use the same scopes that were requested during authentication
      const token = await authService.getAccessToken(REQUIRED_SCOPES);

      log.debug('[GraphApiService] GET', url.toString());

      try {
        const res = await this.axiosInstance.get<T>(url.toString(), {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        return res.data;
      } catch (error: any) {
        // Enhance error messages
        if (error?.response?.status === 403) {
          log.warn('[GraphApiService] Permission denied', { path, status: 403 });
          throw new Error(`Permission denied for ${path}. Required permissions may not be granted.`);
        } else if (error?.response?.status === 429) {
          log.warn('[GraphApiService] Rate limited', { path, status: 429 });
          throw error; // Will be retried with backoff
        } else if (error?.code === 'ETIMEDOUT') {
          log.warn('[GraphApiService] Request timeout', { path, code: error.code });
          throw error; // Will be retried with backoff
        }
        throw error;
      }
    });
  }

  private async patch<T>(path: string, data: any): Promise<T> {
    return this.retryWithBackoff(async () => {
      const token = await authService.getAccessToken(REQUIRED_SCOPES);

      log.debug('[GraphApiService] PATCH', `${GRAPH_BASE_URL}${path}`, data);

      try {
        const res = await this.axiosInstance.patch<T>(`${GRAPH_BASE_URL}${path}`, data, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        return res.data;
      } catch (error: any) {
        if (error?.response?.status === 403) {
          log.warn('[GraphApiService] Permission denied', { path, status: 403 });
          throw new Error(`Permission denied for ${path}. Required permissions may not be granted.`);
        }
        throw error;
      }
    });
  }

  // Reserved for future use (POST operations)
  // private async post<T>(path: string, data: any): Promise<T> {
  //   const token = await authService.getAccessToken(REQUIRED_SCOPES);
  //   const res = await this.axiosInstance.post<T>(`${GRAPH_BASE_URL}${path}`, data, {
  //     headers: {
  //       Authorization: `Bearer ${token}`,
  //       'Content-Type': 'application/json',
  //     },
  //   });
  //   return res.data;
  // }

  async getTenantSummary(): Promise<TenantSummary> {
    log.info('[GraphApiService] Getting tenant summary (with cache)');
    
    // Use cache service - returns cached data immediately, refreshes in background if stale
    return configCacheService.getTenantSummary(async () => {
      return this.fetchTenantSummaryInternal();
    });
  }

  /**
   * Internal method to fetch tenant summary from Graph API
   * This is called by the cache service when needed
   */
  private async fetchTenantSummaryInternal(): Promise<TenantSummary> {
    log.info('[GraphApiService] Fetching tenant summary from Graph API');

    try {
      // Get users with pagination
      const users: User[] = [];
      let nextLink: string | null = null;
      let pageCount = 0;
      const maxPages = 10; // Safety limit

      do {
        const query: any = {
          $select: 'id,userPrincipalName,displayName,userType,accountEnabled,assignedLicenses',
          $top: 999,
        };

        if (nextLink) {
          // Extract query params from nextLink
          const url = new URL(nextLink);
          query.$skip = url.searchParams.get('$skip') || 0;
        }

        const response = await this.get<{ value: any[]; '@odata.nextLink'?: string }>('/users', query);
        users.push(...response.value);
        nextLink = response['@odata.nextLink'] || null;
        pageCount++;

        if (pageCount >= maxPages) {
          log.warn('[GraphApiService] Hit max pages limit, stopping pagination');
          break;
        }
      } while (nextLink);

      log.info('[GraphApiService] Fetched users', { count: users.length });

      // Get sign-in activity for active users (sample)
      const activeUsers = users.filter((u) => u.accountEnabled && u.userType !== 'Guest').slice(0, 100);
      const signInData: Record<string, any> = {};

      // Batch get sign-in activity (Graph API limitation - can't get all at once efficiently)
      // For MVP, we'll sample the first 100 active users
      for (const user of activeUsers) {
        try {
          const activity = await this.get(`/users/${user.id}/authentication/signInPreferences`);
          signInData[user.id] = activity;
        } catch (err) {
          // Some users might not have sign-in data
          log.debug('[GraphApiService] No sign-in data for user', user.id);
        }
      }

      // Get licenses (SKUs)
      const skusData = await this.get<{ value: any[] }>('/subscribedSkus');
      const skuSummary = skusData.value.map((sku) => ({
        skuId: sku.skuId,
        skuPartNumber: sku.skuPartNumber,
        enabled: sku.prepaidUnits?.enabled ?? 0,
        consumed: sku.consumedUnits ?? 0,
        available: (sku.prepaidUnits?.enabled ?? 0) - (sku.consumedUnits ?? 0),
      }));

      // Calculate stats
      const userCount = users.length;
      const guestUserCount = users.filter((u) => u.userType === 'Guest').length;
      const licensedUserCount = users.filter(
        (u) => Array.isArray(u.assignedLicenses) && u.assignedLicenses.length > 0
      ).length;

      // For MVP: assume inactive = disabled accounts (we'll enhance this later with actual sign-in data)
      const inactiveUserCount = users.filter((u) => !u.accountEnabled).length;

      // MFA adoption (simplified - would need to check authentication methods)
      const mfaAdoptionRate = 0.7; // Placeholder - would need to query authentication methods

      // Calculate savings opportunity
      const unusedLicenses = skuSummary.reduce((sum, sku) => sum + Math.max(0, sku.available), 0);
      const inactiveAccounts = inactiveUserCount;
      const estimatedMonthlySavings = unusedLicenses * 12 + inactiveAccounts * 12; // Rough estimate

      const summary: TenantSummary = {
        userCount,
        guestUserCount,
        licensedUserCount,
        inactiveUserCount,
        mfaAdoptionRate,
        skuSummary,
        savingsOpportunity: {
          unusedLicenses,
          inactiveAccounts,
          estimatedMonthlySavings,
        },
      };

      log.info('[GraphApiService] Tenant summary complete', summary);
      return summary;
    } catch (error: any) {
      log.error('[GraphApiService] Error fetching tenant summary', error);
      throw error;
    }
  }

  async getUsers(params?: { top?: number; filter?: string }): Promise<User[]> {
    log.info('[GraphApiService] Getting users (with cache)', params);
    
    // Use cache service - returns cached data immediately, refreshes in background if stale
    return configCacheService.getUsers(params, async () => {
      return this.fetchUsersInternal(params);
    });
  }

  /**
   * Internal method to fetch users from Graph API
   */
  private async fetchUsersInternal(params?: { top?: number; filter?: string }): Promise<User[]> {
    log.info('[GraphApiService] Fetching users from Graph API', params);

    const query: any = {
      $select: 'id,userPrincipalName,displayName,userType,accountEnabled,assignedLicenses',
      $top: params?.top || 999,
    };

    if (params?.filter) {
      query.$filter = params.filter;
    }

    const response = await this.get<{ value: any[] }>('/users', query);
    return response.value;
  }

  async getLicenses(): Promise<License[]> {
    log.info('[GraphApiService] Getting licenses (with cache)');
    
    // Use cache service - returns cached data immediately, refreshes in background if stale
    return configCacheService.getLicenses(async () => {
      return this.fetchLicensesInternal();
    });
  }

  /**
   * Internal method to fetch licenses from Graph API
   */
  private async fetchLicensesInternal(): Promise<License[]> {
    log.info('[GraphApiService] Fetching licenses from Graph API');

    const skusData = await this.get<{ value: any[] }>('/subscribedSkus');
    return skusData.value.map((sku) => ({
      skuId: sku.skuId,
      skuPartNumber: sku.skuPartNumber,
      enabled: sku.prepaidUnits?.enabled ?? 0,
      consumed: sku.consumedUnits ?? 0,
      available: (sku.prepaidUnits?.enabled ?? 0) - (sku.consumedUnits ?? 0),
    }));
  }

  /**
   * Remove licenses from a user
   * This is a safe operation - it only removes license assignments, doesn't delete the user
   */
  async removeLicensesFromUser(userId: string, skuIds: string[]): Promise<void> {
    log.info('[GraphApiService] Removing licenses from user', { userId, skuIds });

    if (!skuIds || skuIds.length === 0) {
      log.warn('[GraphApiService] No SKU IDs provided, skipping');
      return;
    }

    try {
      // First, get current user to see their assigned licenses
      const user = await this.get<{ assignedLicenses: Array<{ skuId: string }> }>(`/users/${userId}`);
      const currentLicenses = user.assignedLicenses || [];

      // Build the update payload: remove only the specified SKUs
      const licensesToRemove = currentLicenses
        .filter((license) => skuIds.includes(license.skuId))
        .map((license) => ({ skuId: license.skuId }));

      if (licensesToRemove.length === 0) {
        log.info('[GraphApiService] User does not have the specified licenses, nothing to remove');
        return;
      }

      // Update user's assignedLicenses by removing the specified ones
      // Graph API requires us to send all licenses we want to keep (addOperation) 
      // and all licenses we want to remove (removeLicenses)
      const licensesToKeep = currentLicenses
        .filter((license) => !skuIds.includes(license.skuId))
        .map((license) => ({ skuId: license.skuId }));

      await this.patch(`/users/${userId}`, {
        assignedLicenses: [
          ...licensesToKeep.map((l) => ({ skuId: l.skuId, disabledPlans: [] })),
        ],
      });

      // Invalidate cache after license changes
      await configCacheService.invalidate('users', 'users');
      await configCacheService.invalidate('tenant-summary', 'tenantSummary');
      await configCacheService.invalidate('licenses', 'licenses');

      log.info('[GraphApiService] Successfully removed licenses', {
        userId,
        removedCount: licensesToRemove.length,
      });
    } catch (error: any) {
      log.error('[GraphApiService] Error removing licenses', error);
      throw new Error(`Failed to remove licenses: ${error?.message || error}`);
    }
  }

  /**
   * Update user account properties
   */
  async updateUser(userId: string, updates: { accountEnabled?: boolean }): Promise<void> {
    log.info('[GraphApiService] Updating user', { userId, updates });

    try {
      await this.patch(`/users/${userId}`, updates);
      
      // Invalidate cache after user updates
      await configCacheService.invalidate('users', 'users');
      await configCacheService.invalidate('tenant-summary', 'tenantSummary');

      log.info('[GraphApiService] Successfully updated user', { userId });
    } catch (error: any) {
      log.error('[GraphApiService] Error updating user', error);
      throw new Error(`Failed to update user: ${error?.message || error}`);
    }
  }

  /**
   * Get detailed user information including sign-in activity
   */
  async getUserDetails(userId: string): Promise<User & { signInActivity?: any }> {
    log.info('[GraphApiService] Getting user details', { userId });

    try {
      const user = await this.get<{
        id: string;
        userPrincipalName: string;
        displayName: string;
        userType: string;
        accountEnabled: boolean;
        assignedLicenses: Array<{ skuId: string }>;
      }>(`/users/${userId}`);

      // Try to get sign-in activity (may not be available for all tenants)
      let signInActivity;
      try {
        const activity = await this.get(`/users/${userId}/authentication/signInPreferences`);
        signInActivity = activity;
      } catch (err) {
        log.debug('[GraphApiService] Could not fetch sign-in activity for user', userId);
      }

      return {
        id: user.id,
        userPrincipalName: user.userPrincipalName,
        displayName: user.displayName,
        userType: user.userType,
        accountEnabled: user.accountEnabled,
        assignedLicenses: (user.assignedLicenses || []).map((l) => l.skuId),
        signInActivity: signInActivity as { lastSignInDateTime?: Date } | undefined,
        mfaRegistered: false, // Would need additional API call to check
      };
    } catch (error: any) {
      log.error('[GraphApiService] Error getting user details', error);
      throw new Error(`Failed to get user details: ${error?.message || error}`);
    }
  }

  /**
   * Get MFA status for a user
   */
  async getMFAStatus(userId: string): Promise<{
    mfaRegistered: boolean;
    methods: string[];
    enforced: boolean;
  }> {
    log.debug('[GraphApiService] Getting MFA status', { userId });

    try {
      const authMethods = await this.get<{ value: any[] }>(`/users/${userId}/authentication/methods`);
      const mfaMethods = authMethods.value?.filter((m: any) => {
        const methodType = m['@odata.type'];
        return [
          '#microsoft.graph.microsoftAuthenticatorAuthenticationMethod',
          '#microsoft.graph.phoneAuthenticationMethod',
          '#microsoft.graph.fido2AuthenticationMethod',
          '#microsoft.graph.passwordlessMicrosoftAuthenticatorAuthenticationMethod',
        ].includes(methodType);
      }) || [];

      // Check if MFA is enforced (would need Conditional Access API for full check)
      // For now, we just check if methods are registered
      return {
        mfaRegistered: mfaMethods.length > 0,
        methods: mfaMethods.map((m: any) => m['@odata.type']),
        enforced: false, // Would need CA policy check for accurate enforcement status
      };
    } catch (error: any) {
      log.debug('[GraphApiService] Could not get MFA status', { userId, error: error.message });
      return {
        mfaRegistered: false,
        methods: [],
        enforced: false,
      };
    }
  }

  /**
   * Check for legacy authentication usage
   */
  async checkLegacyAuth(userId: string): Promise<{
    hasLegacyAuth: boolean;
    protocols: string[];
    lastUsed?: Date;
  }> {
    log.debug('[GraphApiService] Checking legacy auth', { userId });

    try {
      // Query sign-in logs for legacy protocols
      // Note: Requires AuditLog.Read.All permission (may need to add to scopes)
      const legacyProtocols = ['exchangeActiveSync', 'imap', 'pop3', 'authenticatorApp'];

      // Try to get recent sign-ins (last 30 days)
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      try {
        const signIns = await this.get<{ value: any[] }>(
          `/auditLogs/signIns?$filter=userId eq '${userId}' and createdDateTime ge ${startDate.toISOString()}&$top=100`
        );

        const foundProtocols = signIns.value
          ?.filter((s: any) => {
            const clientApp = s.clientApp || '';
            const appDisplayName = s.appDisplayName || '';
            return legacyProtocols.some(p => 
              clientApp.toLowerCase().includes(p.toLowerCase()) ||
              appDisplayName.toLowerCase().includes(p.toLowerCase())
            );
          })
          .map((s: any) => s.clientApp || s.appDisplayName || 'unknown') || [];

        if (foundProtocols.length > 0) {
          const lastSignIn = signIns.value
            ?.sort((a: any, b: any) => 
              new Date(b.createdDateTime).getTime() - new Date(a.createdDateTime).getTime()
            )[0];

          return {
            hasLegacyAuth: true,
            protocols: [...new Set(foundProtocols)],
            lastUsed: lastSignIn ? new Date(lastSignIn.createdDateTime) : undefined,
          };
        }
      } catch (err: any) {
        // Audit logs may not be available or permission may be missing
        log.debug('[GraphApiService] Could not check sign-in logs', { userId, error: err.message });
      }

      return {
        hasLegacyAuth: false,
        protocols: [],
      };
    } catch (error: any) {
      log.error('[GraphApiService] Error checking legacy auth', error);
      return {
        hasLegacyAuth: false,
        protocols: [],
      };
    }
  }

  /**
   * Get directory roles
   */
  async getDirectoryRoles(): Promise<Array<{
    id: string;
    displayName: string;
    description: string;
  }>> {
    const cacheKey = 'directoryRoles';
    const now = Date.now();
    const cachedTimestamp = this.cacheTimestamps.get(cacheKey) || 0;

    // Return cached data if fresh
    if (this.directoryRolesCache && (now - cachedTimestamp) < this.CACHE_TTL) {
      log.debug('[GraphApiService] Returning cached directory roles');
      return this.directoryRolesCache;
    }

    log.debug('[GraphApiService] Getting directory roles');

    try {
      const roles = await this.get<{ value: any[] }>('/directoryRoles');
      const mappedRoles = roles.value.map((r: any) => ({
        id: r.id,
        displayName: r.displayName,
        description: r.description || '',
      }));
      
      // Update cache
      this.directoryRolesCache = mappedRoles;
      this.cacheTimestamps.set(cacheKey, now);
      
      return mappedRoles;
    } catch (error: any) {
      log.error('[GraphApiService] Error getting directory roles', error);
      throw new Error(`Failed to get directory roles: ${error?.message || error}`);
    }
  }

  /**
   * Get members of a directory role
   */
  async getRoleMembers(roleId: string): Promise<Array<{
    id: string;
    userPrincipalName: string;
    displayName: string;
  }>> {
    const cacheKey = `roleMembers:${roleId}`;
    const now = Date.now();
    const cachedTimestamp = this.cacheTimestamps.get(cacheKey) || 0;

    // Return cached data if fresh
    const cached = this.roleMembersCache.get(roleId);
    if (cached && (now - cachedTimestamp) < this.CACHE_TTL) {
      log.debug('[GraphApiService] Returning cached role members', { roleId });
      return cached;
    }

    log.debug('[GraphApiService] Getting role members', { roleId });

    try {
      const members = await this.get<{ value: any[] }>(`/directoryRoles/${roleId}/members`);
      const mappedMembers = members.value
        .filter((m: any) => m['@odata.type'] === '#microsoft.graph.user')
        .map((m: any) => ({
          id: m.id,
          userPrincipalName: m.userPrincipalName || '',
          displayName: m.displayName || '',
        }));
      
      // Update cache
      this.roleMembersCache.set(roleId, mappedMembers);
      this.cacheTimestamps.set(cacheKey, now);
      
      return mappedMembers;
    } catch (error: any) {
      log.error('[GraphApiService] Error getting role members', error);
      throw new Error(`Failed to get role members: ${error?.message || error}`);
    }
  }

  /**
   * Clear all caches (useful after making changes)
   */
  clearCache(): void {
    this.directoryRolesCache = null;
    this.roleMembersCache.clear();
    this.cacheTimestamps.clear();
    log.debug('[GraphApiService] Cleared all caches');
  }

  /**
   * Block legacy authentication for a user
   */
  async blockLegacyAuth(userId: string): Promise<void> {
    log.info('[GraphApiService] Blocking legacy auth', { userId });

    try {
      // Note: This is a simplified approach
      // Full legacy auth blocking requires Conditional Access policies
      // For now, we log the action. Actual blocking requires CA policy creation
      // In the future, we could create CA policies via: POST /identity/conditionalAccess/policies
      log.info('[GraphApiService] Legacy auth blocking recommended', {
        userId,
        note: 'Full blocking requires Conditional Access policy creation',
      });
    } catch (error: any) {
      log.error('[GraphApiService] Error blocking legacy auth', error);
      throw new Error(`Failed to block legacy auth: ${error?.message || error}`);
    }
  }

  /**
   * Remove a role assignment from a user
   */
  async removeRoleAssignment(roleId: string, userId: string): Promise<void> {
    log.info('[GraphApiService] Removing role assignment', { roleId, userId });

    try {
      // DELETE /directoryRoles/{roleId}/members/{userId}/$ref
      await this.axiosInstance.delete(
        `${GRAPH_BASE_URL}/directoryRoles/${roleId}/members/${userId}/$ref`,
        {
          headers: {
            Authorization: `Bearer ${await authService.getAccessToken(REQUIRED_SCOPES)}`,
          },
        }
      );

      log.info('[GraphApiService] Successfully removed role assignment', { roleId, userId });
    } catch (error: any) {
      log.error('[GraphApiService] Error removing role assignment', error);
      throw new Error(`Failed to remove role assignment: ${error?.message || error}`);
    }
  }

  /**
   * Get Intune device compliance policies
   * Requires: DeviceManagementConfiguration.Read.All
   */
  async getIntuneCompliancePolicies(): Promise<Array<{
    id: string;
    displayName: string;
    description?: string;
    platforms: string[];
    isAssigned: boolean;
  }>> {
    log.debug('[GraphApiService] Getting Intune compliance policies');

    try {
      const policies = await this.get<{ value: any[] }>('/deviceManagement/deviceCompliancePolicies');
      return policies.value.map((p: any) => ({
        id: p.id,
        displayName: p.displayName,
        description: p.description,
        platforms: p.platformsForCompliancePolicyApplication || [],
        isAssigned: p.isAssigned || false,
      }));
    } catch (error: any) {
      log.debug('[GraphApiService] Could not get Intune compliance policies', { error: error.message });
      // May not have permissions or Intune may not be licensed
      return [];
    }
  }

  /**
   * Get Intune device configuration policies
   * Requires: DeviceManagementConfiguration.Read.All
   */
  async getIntuneConfigurationPolicies(): Promise<Array<{
    id: string;
    displayName: string;
    description?: string;
    platforms: string[];
    isAssigned: boolean;
  }>> {
    log.debug('[GraphApiService] Getting Intune configuration policies');

    try {
      const policies = await this.get<{ value: any[] }>('/deviceManagement/deviceConfigurations');
      return policies.value.map((p: any) => ({
        id: p.id,
        displayName: p.displayName,
        description: p.description,
        platforms: p.platforms || [],
        isAssigned: p.isAssigned || false,
      }));
    } catch (error: any) {
      log.debug('[GraphApiService] Could not get Intune configuration policies', { error: error.message });
      return [];
    }
  }

  /**
   * Get Intune app protection policies (MAM)
   * Requires: DeviceManagementApps.Read.All
   */
  async getIntuneAppProtectionPolicies(): Promise<Array<{
    id: string;
    displayName: string;
    description?: string;
    platforms: string[];
    isAssigned: boolean;
  }>> {
    log.debug('[GraphApiService] Getting Intune app protection policies');

    try {
      const policies = await this.get<{ value: any[] }>('/deviceAppManagement/managedAppPolicies');
      return policies.value.map((p: any) => ({
        id: p.id,
        displayName: p.displayName,
        description: p.description,
        platforms: p.platforms || [],
        isAssigned: p.isAssigned || false,
      }));
    } catch (error: any) {
      log.debug('[GraphApiService] Could not get Intune app protection policies', { error: error.message });
      return [];
    }
  }

  /**
   * Get Intune enrollment restrictions
   * Requires: DeviceManagementServiceConfig.Read.All
   */
  async getIntuneEnrollmentRestrictions(): Promise<Array<{
    id: string;
    displayName: string;
    platformType: string;
    priority: number;
  }>> {
    log.debug('[GraphApiService] Getting Intune enrollment restrictions');

    try {
      const restrictions = await this.get<{ value: any[] }>('/deviceManagement/deviceEnrollmentConfigurations');
      return restrictions.value.map((r: any) => ({
        id: r.id,
        displayName: r.displayName,
        platformType: r.platformType || 'all',
        priority: r.priority || 0,
      }));
    } catch (error: any) {
      log.debug('[GraphApiService] Could not get Intune enrollment restrictions', { error: error.message });
      return [];
    }
  }

  /**
   * Get Conditional Access policies
   * Requires: Policy.Read.All
   */
  async getConditionalAccessPolicies(): Promise<Array<{
    id: string;
    displayName: string;
    state: string;
    conditions: any;
    grantControls: any;
  }>> {
    log.debug('[GraphApiService] Getting Conditional Access policies');

    try {
      const policies = await this.get<{ value: any[] }>('/identity/conditionalAccess/policies');
      return policies.value.map((p: any) => ({
        id: p.id,
        displayName: p.displayName,
        state: p.state,
        conditions: p.conditions,
        grantControls: p.grantControls,
      }));
    } catch (error: any) {
      log.debug('[GraphApiService] Could not get Conditional Access policies', { error: error.message });
      return [];
    }
  }

  /**
   * Get service principals with admin roles
   */
  async getServicePrincipalsWithAdminRoles(): Promise<Array<{
    id: string;
    displayName: string;
    appId: string;
    servicePrincipalType: string;
    appRoles: any[];
  }>> {
    log.debug('[GraphApiService] Getting service principals with admin roles');

    try {
      const servicePrincipals = await this.get<{ value: any[] }>('/servicePrincipals', {
        $select: 'id,displayName,appId,servicePrincipalType,appRoles',
        $top: 999,
      });

      // Filter for service principals that might have admin roles
      // This is a simplified check - full check would require checking role assignments
      return servicePrincipals.value.map((sp: any) => ({
        id: sp.id,
        displayName: sp.displayName,
        appId: sp.appId,
        servicePrincipalType: sp.servicePrincipalType,
        appRoles: sp.appRoles || [],
      }));
    } catch (error: any) {
      log.debug('[GraphApiService] Could not get service principals', { error: error.message });
      return [];
    }
  }
}

export const graphApiService = new GraphApiService();

