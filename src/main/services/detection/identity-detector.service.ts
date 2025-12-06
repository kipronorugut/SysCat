import log from 'electron-log';
import { graphApiService } from '../graph-api.service';
import { BaseDetector, DetectionResult } from './base-detector.service';

/**
 * Identity & Access Security Detector
 * Implements detection for MFA, legacy auth, privileged access, etc.
 * This is the foundation for Phase 1 capabilities (1-30)
 */
export class IdentityDetector extends BaseDetector {
  protected detectorName = 'IdentityDetector';
  
  // Cache for admin users and directory roles to avoid repeated API calls
  private adminUsersCache: Set<string> | null = null;
  private adminUsersCacheTimestamp: number = 0;
  private readonly ADMIN_CACHE_TTL = 60000; // 1 minute cache

  /**
   * Run all identity-related detections
   */
  async detect(): Promise<DetectionResult[]> {
    log.info('[IdentityDetector] Running identity security scan');

    const results: DetectionResult[] = [];

    // Run all detection methods in parallel for performance
    const [
      mfaResults,
      legacyAuthResults,
      adminRoleResults,
      guestAccessResults,
      inactiveAccountResults,
    ] = await Promise.all([
      this.detectMFAgaps(),
      this.detectLegacyAuth(),
      this.detectAdminRoles(),
      this.detectGuestAccessIssues(),
      this.detectInactiveAccounts(),
    ]);

    results.push(...mfaResults);
    results.push(...legacyAuthResults);
    results.push(...adminRoleResults);
    results.push(...guestAccessResults);
    results.push(...inactiveAccountResults);

    log.info('[IdentityDetector] Scan complete', { totalFindings: results.length });
    return results;
  }

  /**
   * Detection #1: Users without MFA
   * Optimized: Parallel processing and cached admin checks
   */
  private async detectMFAgaps(): Promise<DetectionResult[]> {
    log.debug('[IdentityDetector] Checking MFA status');

    try {
      const users = await graphApiService.getUsers();
      const mfaGaps: DetectionResult['affectedResources'] = [];
      const adminMfaGaps: DetectionResult['affectedResources'] = [];

      // Sample first 100 users for MVP (can be expanded)
      const sampleUsers = users.filter(u => u.accountEnabled && u.userType !== 'Guest').slice(0, 100);

      // Pre-load admin users cache once (much faster than checking per user)
      await this.loadAdminUsersCache();

      // Process users in parallel batches (10 at a time to avoid overwhelming the API)
      const batchSize = 10;
      for (let i = 0; i < sampleUsers.length; i += batchSize) {
        const batch = sampleUsers.slice(i, i + batchSize);
        
        // Process batch in parallel
        const batchResults = await Promise.all(
          batch.map(async (user) => {
            try {
              const mfaStatus = await graphApiService.getMFAStatus(user.id);
              
              if (!mfaStatus.mfaRegistered) {
                // Use cached admin check (much faster)
                const isAdmin = this.adminUsersCache?.has(user.id) || false;
                
                return {
                  id: user.id,
                  name: user.userPrincipalName || user.displayName,
                  details: {
                    displayName: user.displayName,
                    isAdmin,
                    accountEnabled: user.accountEnabled,
                  },
                  isAdmin,
                };
              }
              return null;
            } catch (error: any) {
              log.debug('[IdentityDetector] Could not check MFA for user', { userId: user.id, error: error.message });
              return null;
            }
          })
        );

        // Categorize results
        for (const result of batchResults) {
          if (result) {
            if (result.isAdmin) {
              adminMfaGaps.push({
                id: result.id,
                name: result.name,
                details: result.details,
              });
            } else {
              mfaGaps.push({
                id: result.id,
                name: result.name,
                details: result.details,
              });
            }
          }
        }
      }

      const results: DetectionResult[] = [];

      // Critical: Admin accounts without MFA
      if (adminMfaGaps.length > 0) {
        results.push(
          this.createResult({
            type: 'mfa_admin_gap',
            severity: 'critical',
            title: 'Admin Accounts Without MFA',
            description: `${adminMfaGaps.length} administrator account(s) do not have MFA registered. This is a critical security risk.`,
            affectedResources: adminMfaGaps,
            recommendation: 'Enable MFA enforcement for all admin accounts immediately. Consider using Conditional Access policies.',
            remediation: {
              automated: true,
              action: 'enforce_mfa',
              estimatedTime: 5,
            },
            metadata: {
              count: adminMfaGaps.length,
              priority: 'critical',
            },
          })
        );
      }

      // High: Regular users without MFA
      if (mfaGaps.length > 0) {
        results.push(
          this.createResult({
            type: 'mfa_user_gap',
            severity: 'high',
            title: 'Users Without MFA',
            description: `${mfaGaps.length} user account(s) do not have MFA registered.`,
            affectedResources: mfaGaps,
            recommendation: 'Enforce MFA registration for all users. Consider gradual rollout or Conditional Access policies.',
            remediation: {
              automated: true,
              action: 'enforce_mfa',
              estimatedTime: 10,
            },
            metadata: {
              count: mfaGaps.length,
            },
          })
        );
      }

      return results;
    } catch (error: any) {
      log.error('[IdentityDetector] Error detecting MFA gaps', error);
      return [];
    }
  }

  /**
   * Detection #2: Legacy authentication usage
   * Optimized: Parallel processing in batches
   */
  private async detectLegacyAuth(): Promise<DetectionResult[]> {
    log.debug('[IdentityDetector] Checking legacy authentication');

    try {
      const users = await graphApiService.getUsers();
      const legacyAuthUsers: DetectionResult['affectedResources'] = [];

      // Sample users for MVP (checking all would be too slow)
      const sampleUsers = users.filter(u => u.accountEnabled).slice(0, 50);

      // Process in parallel batches (10 at a time)
      const batchSize = 10;
      for (let i = 0; i < sampleUsers.length; i += batchSize) {
        const batch = sampleUsers.slice(i, i + batchSize);
        
        const batchResults = await Promise.all(
          batch.map(async (user) => {
            try {
              const legacyCheck = await graphApiService.checkLegacyAuth(user.id);
              
              if (legacyCheck.hasLegacyAuth) {
                return {
                  id: user.id,
                  name: user.userPrincipalName || user.displayName,
                  details: {
                    displayName: user.displayName,
                    protocols: legacyCheck.protocols,
                    lastUsed: legacyCheck.lastUsed,
                  },
                };
              }
              return null;
            } catch (error: any) {
              log.debug('[IdentityDetector] Could not check legacy auth for user', { userId: user.id });
              return null;
            }
          })
        );

        // Add non-null results
        for (const result of batchResults) {
          if (result) {
            legacyAuthUsers.push(result);
          }
        }
      }

      if (legacyAuthUsers.length === 0) {
        return [];
      }

      return [
        this.createResult({
          type: 'legacy_auth',
          severity: 'high',
          title: 'Legacy Authentication Detected',
          description: `${legacyAuthUsers.length} user(s) are using legacy authentication protocols (IMAP, POP3, Exchange ActiveSync, etc.). These are less secure and should be disabled.`,
          affectedResources: legacyAuthUsers,
          recommendation: 'Disable legacy authentication protocols. Migrate users to modern authentication methods.',
          remediation: {
            automated: true,
            action: 'block_legacy_auth',
            estimatedTime: 5,
          },
          metadata: {
            count: legacyAuthUsers.length,
            protocols: [...new Set(legacyAuthUsers.flatMap(u => u.details?.protocols || []))],
          },
        }),
      ];
    } catch (error: any) {
      log.error('[IdentityDetector] Error detecting legacy auth', error);
      return [];
    }
  }

  /**
   * Detection #3: Excessive admin roles
   */
  private async detectAdminRoles(): Promise<DetectionResult[]> {
    log.debug('[IdentityDetector] Checking admin roles');

    try {
      const roles = await graphApiService.getDirectoryRoles();
      const globalAdminRole = roles.find(r => r.displayName === 'Global Administrator');

      if (!globalAdminRole) {
        log.warn('[IdentityDetector] Global Administrator role not found');
        return [];
      }

      const globalAdmins = await graphApiService.getRoleMembers(globalAdminRole.id);

      // Check for excessive role assignments
      const userRoleCounts: Record<string, { userName: string; roles: string[] }> = {};

      for (const role of roles.slice(0, 20)) { // Sample roles for MVP
        const members = await graphApiService.getRoleMembers(role.id);
        for (const member of members) {
          if (!userRoleCounts[member.id]) {
            userRoleCounts[member.id] = {
              userName: member.userPrincipalName,
              roles: [],
            };
          }
          userRoleCounts[member.id].roles.push(role.displayName);
        }
      }

      const excessiveRoles = Object.entries(userRoleCounts)
        .filter(([_, data]) => data.roles.length > 3)
        .map(([userId, data]) => ({
          id: userId,
          name: data.userName,
          details: {
            roleCount: data.roles.length,
            roles: data.roles,
          },
        }));

      const results: DetectionResult[] = [];

      // Critical: Too many Global Admins
      if (globalAdmins.length > 5) {
        results.push(
          this.createResult({
            type: 'excessive_global_admins',
            severity: 'critical',
            title: 'Excessive Global Administrators',
            description: `Found ${globalAdmins.length} Global Administrator(s). Microsoft recommends no more than 2-5 Global Admins.`,
            affectedResources: globalAdmins.map(admin => ({
              id: admin.id,
              name: admin.userPrincipalName,
              details: { displayName: admin.displayName },
            })),
            recommendation: 'Reduce Global Administrator count. Use role-based access control with least privilege.',
            remediation: {
              automated: false,
              action: 'review_and_reduce',
              estimatedTime: 30,
            },
            metadata: {
              count: globalAdmins.length,
              recommendedMax: 5,
            },
          })
        );
      }

      // High: Users with excessive role assignments
      if (excessiveRoles.length > 0) {
        results.push(
          this.createResult({
            type: 'excessive_role_assignments',
            severity: 'high',
            title: 'Users with Excessive Role Assignments',
            description: `${excessiveRoles.length} user(s) have more than 3 directory role assignments. This violates least privilege principles.`,
            affectedResources: excessiveRoles,
            recommendation: 'Review and consolidate role assignments. Consider using PIM (Privileged Identity Management) for temporary access.',
            remediation: {
              automated: false,
              action: 'review_roles',
              estimatedTime: 20,
            },
            metadata: {
              count: excessiveRoles.length,
            },
          })
        );
      }

      return results;
    } catch (error: any) {
      log.error('[IdentityDetector] Error detecting admin roles', error);
      return [];
    }
  }

  /**
   * Detection #4: Guest access issues
   */
  private async detectGuestAccessIssues(): Promise<DetectionResult[]> {
    log.debug('[IdentityDetector] Checking guest access');

    try {
      const users = await graphApiService.getUsers();
      const guestUsers = users.filter(u => u.userType === 'Guest' && u.accountEnabled);

      if (guestUsers.length === 0) {
        return [];
      }

      // Check for guests with licenses (potential waste)
      const licensedGuests = guestUsers.filter(u => 
        u.assignedLicenses && u.assignedLicenses.length > 0
      );

      if (licensedGuests.length === 0) {
        return [];
      }

      return [
        this.createResult({
          type: 'guest_license_waste',
          severity: 'medium',
          title: 'Guest Users with Licenses',
          description: `${licensedGuests.length} guest user(s) have licenses assigned. Guest users typically do not need licenses.`,
          affectedResources: licensedGuests.map(guest => ({
            id: guest.id,
            name: guest.userPrincipalName || guest.displayName,
            details: {
              displayName: guest.displayName,
              licenseCount: guest.assignedLicenses?.length || 0,
            },
          })),
          recommendation: 'Review and remove unnecessary licenses from guest accounts to reduce costs.',
          remediation: {
            automated: true,
            action: 'remove_guest_licenses',
            estimatedTime: 5,
          },
          metadata: {
            count: licensedGuests.length,
          },
        }),
      ];
    } catch (error: any) {
      log.error('[IdentityDetector] Error detecting guest access issues', error);
      return [];
    }
  }

  /**
   * Detection #5: Inactive accounts (already detected, but standardized here)
   */
  private async detectInactiveAccounts(): Promise<DetectionResult[]> {
    log.debug('[IdentityDetector] Checking inactive accounts');

    try {
      const users = await graphApiService.getUsers();
      const inactiveUsers = users.filter(u => !u.accountEnabled);

      if (inactiveUsers.length === 0) {
        return [];
      }

      return [
        this.createResult({
          type: 'inactive_accounts',
          severity: 'medium',
          title: 'Inactive Accounts',
          description: `${inactiveUsers.length} account(s) are disabled but may still have licenses or access.`,
          affectedResources: inactiveUsers.map(user => ({
            id: user.id,
            name: user.userPrincipalName || user.displayName,
            details: {
              displayName: user.displayName,
              hasLicenses: (user.assignedLicenses?.length || 0) > 0,
            },
          })),
          recommendation: 'Review and remove licenses from inactive accounts. Consider archiving or deleting accounts after retention period.',
          remediation: {
            automated: true,
            action: 'process_inactive_accounts',
            estimatedTime: 5,
          },
          metadata: {
            count: inactiveUsers.length,
          },
        }),
      ];
    } catch (error: any) {
      log.error('[IdentityDetector] Error detecting inactive accounts', error);
      return [];
    }
  }

  /**
   * Helper: Load admin users cache (called once per scan)
   * This avoids making repeated API calls for each user check
   */
  private async loadAdminUsersCache(): Promise<void> {
    const now = Date.now();
    
    // Return cached data if fresh
    if (this.adminUsersCache && (now - this.adminUsersCacheTimestamp) < this.ADMIN_CACHE_TTL) {
      log.debug('[IdentityDetector] Using cached admin users');
      return;
    }

    log.debug('[IdentityDetector] Loading admin users cache');
    this.adminUsersCache = new Set<string>();

    try {
      const roles = await graphApiService.getDirectoryRoles();
      const adminRoles = ['Global Administrator', 'User Administrator', 'Privileged Role Administrator'];
      
      // Get members for all admin roles in parallel
      const memberPromises = roles
        .filter(role => adminRoles.includes(role.displayName))
        .map(role => graphApiService.getRoleMembers(role.id).catch(err => {
          log.debug('[IdentityDetector] Could not get role members', { roleId: role.id, error: err.message });
          return [];
        }));

      const memberArrays = await Promise.all(memberPromises);
      
      // Add all admin user IDs to cache
      for (const members of memberArrays) {
        for (const member of members) {
          this.adminUsersCache.add(member.id);
        }
      }

      this.adminUsersCacheTimestamp = now;
      log.debug(`[IdentityDetector] Cached ${this.adminUsersCache.size} admin users`);
    } catch (error: any) {
      log.error('[IdentityDetector] Error loading admin users cache', error);
      this.adminUsersCache = new Set<string>(); // Empty cache on error
    }
  }

}

