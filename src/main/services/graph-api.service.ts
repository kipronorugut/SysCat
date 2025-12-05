import axios, { AxiosInstance } from 'axios';
import log from 'electron-log';
import { authService } from './auth.service';

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

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: GRAPH_BASE_URL,
      timeout: 30000,
    });
  }

  private async get<T>(path: string, query: Record<string, string | number | boolean> = {}): Promise<T> {
    const url = new URL(`${GRAPH_BASE_URL}${path}`);

    Object.entries(query).forEach(([k, v]) => {
      url.searchParams.append(k, String(v));
    });

    const token = await authService.getAccessToken(['https://graph.microsoft.com/.default']);

    log.debug('[GraphApiService] GET', url.toString());

    const res = await this.axiosInstance.get<T>(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return res.data;
  }

  async getTenantSummary(): Promise<TenantSummary> {
    log.info('[GraphApiService] Fetching tenant summary');

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
    log.info('[GraphApiService] Fetching users', params);

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
    log.info('[GraphApiService] Fetching licenses');

    const skusData = await this.get<{ value: any[] }>('/subscribedSkus');
    return skusData.value.map((sku) => ({
      skuId: sku.skuId,
      skuPartNumber: sku.skuPartNumber,
      enabled: sku.prepaidUnits?.enabled ?? 0,
      consumed: sku.consumedUnits ?? 0,
      available: (sku.prepaidUnits?.enabled ?? 0) - (sku.consumedUnits ?? 0),
    }));
  }
}

export const graphApiService = new GraphApiService();

