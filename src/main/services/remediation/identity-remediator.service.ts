import log from 'electron-log';
import { graphApiService } from '../graph-api.service';
import { db } from '../../database/db';

/**
 * Identity & Access Remediation Service
 * Handles automated remediation for identity-related security findings
 */
export interface RemediationResult {
  success: boolean;
  actionsTaken: number;
  errors: string[];
  details: Array<{
    resourceId: string;
    resourceName: string;
    action: string;
    success: boolean;
    error?: string;
  }>;
}

export class IdentityRemediator {
  /**
   * Remediate MFA gaps by enforcing MFA for users
   * Note: Full MFA enforcement requires Conditional Access policies
   * This method logs the action and recommends CA policy creation
   */
  async remediateMFAgaps(userIds: string[]): Promise<RemediationResult> {
    log.info('[IdentityRemediator] Remediating MFA gaps', { userIdCount: userIds.length });

    const result: RemediationResult = {
      success: true,
      actionsTaken: 0,
      errors: [],
      details: [],
    };

    // Get user details
    const users = await Promise.all(
      userIds.map(async (userId) => {
        try {
          const userDetails = await graphApiService.getUserDetails(userId);
          return { id: userId, name: userDetails.userPrincipalName };
        } catch (error: any) {
          log.error('[IdentityRemediator] Failed to get user details', { userId, error: error.message });
          return null;
        }
      })
    );

    const validUsers = users.filter((u): u is { id: string; name: string } => u !== null);

    for (const user of validUsers) {
      try {
        // Check current MFA status
        const mfaStatus = await graphApiService.getMFAStatus(user.id);

        if (!mfaStatus.mfaRegistered) {
          // Log the remediation action
          // Note: Actual MFA enforcement requires Conditional Access policies
          // For now, we log this as a recommended action
          const database = await db();
          database.prepare(
            `INSERT INTO activity_log (action, module, user_id, details, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?)`
          ).run(
            'mfa_enforcement_recommended',
            'identity_security',
            user.id,
            JSON.stringify({
              userName: user.name,
              action: 'mfa_enforcement',
              note: 'MFA enforcement requires Conditional Access policy. Action logged for manual review.',
            }),
            'pending_review',
            new Date().toISOString()
          );

          result.actionsTaken++;
          result.details.push({
            resourceId: user.id,
            resourceName: user.name,
            action: 'mfa_enforcement_recommended',
            success: true,
          });

          log.info('[IdentityRemediator] MFA enforcement recommended', { userId: user.id, userName: user.name });
        } else {
          log.debug('[IdentityRemediator] User already has MFA', { userId: user.id });
        }
      } catch (error: any) {
        log.error('[IdentityRemediator] Error remediating MFA gap', { userId: user.id, error: error.message });
        result.errors.push(`Failed to process ${user.name}: ${error.message}`);
        result.details.push({
          resourceId: user.id,
          resourceName: user.name,
          action: 'mfa_enforcement',
          success: false,
          error: error.message,
        });
      }
    }

    result.success = result.errors.length === 0;
    return result;
  }

  /**
   * Remediate legacy authentication by blocking legacy protocols
   * Note: Full blocking requires Conditional Access policies or tenant-wide settings
   */
  async remediateLegacyAuth(userIds: string[]): Promise<RemediationResult> {
    log.info('[IdentityRemediator] Remediating legacy authentication', { userIdCount: userIds.length });

    const result: RemediationResult = {
      success: true,
      actionsTaken: 0,
      errors: [],
      details: [],
    };

    for (const userId of userIds) {
      try {
        const userDetails = await graphApiService.getUserDetails(userId);
        const legacyCheck = await graphApiService.checkLegacyAuth(userId);

        if (legacyCheck.hasLegacyAuth) {
          // Attempt to block legacy auth
          try {
            await graphApiService.blockLegacyAuth(userId);

            // Log the action
            const database = await db();
            database.prepare(
              `INSERT INTO activity_log (action, module, user_id, details, status, created_at)
               VALUES (?, ?, ?, ?, ?, ?)`
            ).run(
              'legacy_auth_blocked',
              'identity_security',
              userId,
              JSON.stringify({
                userName: userDetails.userPrincipalName,
                protocols: legacyCheck.protocols,
                note: 'Legacy authentication blocked. Full enforcement requires Conditional Access policy.',
              }),
              'completed',
              new Date().toISOString()
            );

            result.actionsTaken++;
            result.details.push({
              resourceId: userId,
              resourceName: userDetails.userPrincipalName,
              action: 'legacy_auth_blocked',
              success: true,
            });

            log.info('[IdentityRemediator] Legacy auth blocked', { userId, userName: userDetails.userPrincipalName });
          } catch (error: any) {
            log.warn('[IdentityRemediator] Could not block legacy auth via API', { userId, error: error.message });
            // Still log as recommended action
            const database = await db();
            database.prepare(
              `INSERT INTO activity_log (action, module, user_id, details, status, created_at)
               VALUES (?, ?, ?, ?, ?, ?)`
            ).run(
              'legacy_auth_block_recommended',
              'identity_security',
              userId,
              JSON.stringify({
                userName: userDetails.userPrincipalName,
                protocols: legacyCheck.protocols,
                note: 'Manual CA policy required for full legacy auth blocking.',
              }),
              'pending_review',
              new Date().toISOString()
            );

            result.actionsTaken++;
            result.details.push({
              resourceId: userId,
              resourceName: userDetails.userPrincipalName,
              action: 'legacy_auth_block_recommended',
              success: true,
            });
          }
        } else {
          log.debug('[IdentityRemediator] User has no legacy auth', { userId });
        }
      } catch (error: any) {
        log.error('[IdentityRemediator] Error remediating legacy auth', { userId, error: error.message });
        result.errors.push(`Failed to process user ${userId}: ${error.message}`);
        result.details.push({
          resourceId: userId,
          resourceName: userId,
          action: 'legacy_auth_block',
          success: false,
          error: error.message,
        });
      }
    }

    result.success = result.errors.length === 0;
    return result;
  }

  /**
   * Remediate guest license waste by removing licenses from guest users
   */
  async remediateGuestLicenses(userIds: string[]): Promise<RemediationResult> {
    log.info('[IdentityRemediator] Remediating guest licenses', { userIdCount: userIds.length });

    const result: RemediationResult = {
      success: true,
      actionsTaken: 0,
      errors: [],
      details: [],
    };

    for (const userId of userIds) {
      try {
        const userDetails = await graphApiService.getUserDetails(userId);

        if (userDetails.assignedLicenses && userDetails.assignedLicenses.length > 0) {
          // Remove all licenses from guest user
          await graphApiService.removeLicensesFromUser(userId, userDetails.assignedLicenses);

          // Log the action
          const database = await db();
          database.prepare(
            `INSERT INTO activity_log (action, module, user_id, details, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?)`
          ).run(
            'guest_license_removed',
            'license_optimizer',
            userId,
            JSON.stringify({
              userName: userDetails.userPrincipalName,
              licensesRemoved: userDetails.assignedLicenses.length,
            }),
            'completed',
            new Date().toISOString()
          );

          result.actionsTaken++;
          result.details.push({
            resourceId: userId,
            resourceName: userDetails.userPrincipalName,
            action: 'guest_licenses_removed',
            success: true,
          });

          log.info('[IdentityRemediator] Guest licenses removed', {
            userId,
            userName: userDetails.userPrincipalName,
            licensesRemoved: userDetails.assignedLicenses.length,
          });
        } else {
          log.debug('[IdentityRemediator] Guest user has no licenses', { userId });
        }
      } catch (error: any) {
        log.error('[IdentityRemediator] Error remediating guest licenses', { userId, error: error.message });
        result.errors.push(`Failed to remove licenses from ${userId}: ${error.message}`);
        result.details.push({
          resourceId: userId,
          resourceName: userId,
          action: 'guest_license_removal',
          success: false,
          error: error.message,
        });
      }
    }

    result.success = result.errors.length === 0;
    return result;
  }

  /**
   * Remediate excessive role assignments
   * Note: This requires manual review, but we can flag and log
   */
  async remediateExcessiveRoles(userId: string, rolesToRemove: string[]): Promise<RemediationResult> {
    log.info('[IdentityRemediator] Remediating excessive roles', { userId, rolesToRemove });

    const result: RemediationResult = {
      success: true,
      actionsTaken: 0,
      errors: [],
      details: [],
    };

    try {
      const userDetails = await graphApiService.getUserDetails(userId);
      const roles = await graphApiService.getDirectoryRoles();

      for (const roleName of rolesToRemove) {
        const role = roles.find((r) => r.displayName === roleName);
        if (role) {
          try {
            await graphApiService.removeRoleAssignment(role.id, userId);

            // Log the action
            const database = await db();
            database.prepare(
              `INSERT INTO activity_log (action, module, user_id, details, status, created_at)
               VALUES (?, ?, ?, ?, ?, ?)`
            ).run(
              'role_removed',
              'privileged_access',
              userId,
              JSON.stringify({
                userName: userDetails.userPrincipalName,
                roleRemoved: roleName,
              }),
              'completed',
              new Date().toISOString()
            );

            result.actionsTaken++;
            result.details.push({
              resourceId: userId,
              resourceName: userDetails.userPrincipalName,
              action: `role_removed_${roleName}`,
              success: true,
            });

            log.info('[IdentityRemediator] Role removed', {
              userId,
              userName: userDetails.userPrincipalName,
              role: roleName,
            });
          } catch (error: any) {
            log.error('[IdentityRemediator] Error removing role', { userId, role: roleName, error: error.message });
            result.errors.push(`Failed to remove role ${roleName}: ${error.message}`);
          }
        }
      }
    } catch (error: any) {
      log.error('[IdentityRemediator] Error in remediateExcessiveRoles', { userId, error: error.message });
      result.success = false;
      result.errors.push(`Failed to process user ${userId}: ${error.message}`);
    }

    return result;
  }

  /**
   * Generic remediation dispatcher
   */
  async remediate(detectionType: string, resourceIds: string[], options?: any): Promise<RemediationResult> {
    log.info('[IdentityRemediator] Remediating', { detectionType, resourceCount: resourceIds.length, options });

    switch (detectionType) {
      case 'mfa_admin_gap':
      case 'mfa_user_gap':
        return this.remediateMFAgaps(resourceIds);

      case 'legacy_auth':
        return this.remediateLegacyAuth(resourceIds);

      case 'guest_license_waste':
        return this.remediateGuestLicenses(resourceIds);

      case 'excessive_role_assignments':
        // For excessive roles, we need the roles to remove
        if (options?.userId && options?.rolesToRemove) {
          return this.remediateExcessiveRoles(options.userId, options.rolesToRemove);
        }
        throw new Error('Excessive role remediation requires userId and rolesToRemove options');

      default:
        throw new Error(`Unknown remediation type: ${detectionType}`);
    }
  }
}

export const identityRemediator = new IdentityRemediator();

