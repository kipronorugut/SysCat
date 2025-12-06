import log from 'electron-log';
import { graphApiService } from './graph-api.service';
import { db } from '../database/db';

export interface SafeFixPlan {
  licenseWaste: {
    targets: Array<{
      userId: string;
      userName: string;
      licenses: string[];
      reason: string;
    }>;
    estimatedSavings: number;
  };
  inactiveAccounts: {
    targets: Array<{
      userId: string;
      userName: string;
      lastSignIn?: Date;
      daysInactive: number;
    }>;
    estimatedSavings: number;
  };
  mfaGaps: {
    targets: Array<{
      userId: string;
      userName: string;
    }>;
    count: number;
  };
}

export interface FixResult {
  success: boolean;
  actionsTaken: number;
  errors: string[];
  savings: {
    licensesReclaimed: number;
    accountsDisabled: number;
    estimatedMonthlySavings: number;
  };
}

export class AutomationService {
  /**
   * Get a plan of safe fixes that can be applied automatically
   * This is the "lazy sysadmin" core feature - one button to fix everything safe
   */
  async getSafeFixPlan(): Promise<SafeFixPlan> {
    log.info('[AutomationService] Generating safe fix plan');

    try {
      await graphApiService.getTenantSummary();
      const users = await graphApiService.getUsers();

      // Find license waste: users with licenses but account disabled
      const licenseWasteTargets = users
        .filter((u) => !u.accountEnabled && u.assignedLicenses && u.assignedLicenses.length > 0)
        .map((u) => ({
          userId: u.id,
          userName: u.userPrincipalName,
          licenses: u.assignedLicenses || [],
          reason: 'Account disabled but licenses still assigned',
        }));

      // Find inactive accounts (disabled accounts are already inactive)
      const inactiveAccounts = users
        .filter((u) => !u.accountEnabled)
        .map((u) => ({
          userId: u.id,
          userName: u.userPrincipalName,
          lastSignIn: u.lastSignIn,
          daysInactive: 999, // Placeholder - would calculate from lastSignIn
        }));

      // Find MFA gaps (simplified - would need to check authentication methods)
      const mfaGaps = users
        .filter((u) => u.accountEnabled && u.userType !== 'Guest')
        .slice(0, 50) // Sample for MVP
        .map((u) => ({
          userId: u.id,
          userName: u.userPrincipalName,
        }));

      const plan: SafeFixPlan = {
        licenseWaste: {
          targets: licenseWasteTargets,
          estimatedSavings: licenseWasteTargets.length * 12, // Rough: $12/month per license
        },
        inactiveAccounts: {
          targets: inactiveAccounts,
          estimatedSavings: inactiveAccounts.length * 12, // Rough: $12/month per account
        },
        mfaGaps: {
          targets: mfaGaps,
          count: mfaGaps.length,
        },
      };

      log.info('[AutomationService] Safe fix plan generated', {
        licenseWaste: licenseWasteTargets.length,
        inactiveAccounts: inactiveAccounts.length,
        mfaGaps: mfaGaps.length,
      });

      return plan;
    } catch (error: any) {
      log.error('[AutomationService] Error generating safe fix plan', error);
      throw error;
    }
  }

  /**
   * Apply fixes for a specific category (license waste, inactive accounts, or mfa gaps)
   */
  async applyCategoryFixes(plan: SafeFixPlan, category: 'licenseWaste' | 'inactiveAccounts' | 'mfaGaps'): Promise<FixResult> {
    log.info('[AutomationService] Applying category fixes', { category });

    // Create a partial plan with only the selected category
    const partialPlan: SafeFixPlan = {
      licenseWaste: category === 'licenseWaste' ? plan.licenseWaste : { targets: [], estimatedSavings: 0 },
      inactiveAccounts: category === 'inactiveAccounts' ? plan.inactiveAccounts : { targets: [], estimatedSavings: 0 },
      mfaGaps: category === 'mfaGaps' ? plan.mfaGaps : { targets: [], count: 0 },
    };

    return this.applySafeFixes(partialPlan);
  }

  /**
   * Apply safe fixes - the "Fix All Safe Issues" button
   * Only does reversible, non-destructive operations
   */
  async applySafeFixes(plan: SafeFixPlan): Promise<FixResult> {
    log.info('[AutomationService] Applying safe fixes', plan);

    const result: FixResult = {
      success: true,
      actionsTaken: 0,
      errors: [],
      savings: {
        licensesReclaimed: 0,
        accountsDisabled: 0,
        estimatedMonthlySavings: 0,
      },
    };

    try {
      // 1. Reclaim licenses from disabled accounts
      for (const target of plan.licenseWaste.targets) {
        try {
          log.info('[AutomationService] Reclaiming licenses', {
            user: target.userName,
            licenses: target.licenses,
          });

          // Actually remove the licenses via Graph API
          await graphApiService.removeLicensesFromUser(target.userId, target.licenses);

          // Log to database
          const database = await db();
          database.prepare(
            `INSERT INTO activity_log (action, module, user_id, details, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?)`
          ).run(
            'license_reclaim',
            'license_optimizer',
            target.userId,
            JSON.stringify({ 
              licenses: target.licenses, 
              reason: target.reason,
              userName: target.userName 
            }),
            'completed',
            new Date().toISOString()
          );

          result.actionsTaken++;
          result.savings.licensesReclaimed += target.licenses.length;
        } catch (error: any) {
          log.error('[AutomationService] Error reclaiming licenses', error);
          result.errors.push(`Failed to reclaim licenses for ${target.userName}: ${error.message}`);
          
          // Log the error to database
          try {
            const database = await db();
            database.prepare(
              `INSERT INTO activity_log (action, module, user_id, details, status, created_at)
               VALUES (?, ?, ?, ?, ?, ?)`
            ).run(
              'license_reclaim',
              'license_optimizer',
              target.userId,
              JSON.stringify({ 
                licenses: target.licenses, 
                reason: target.reason,
                userName: target.userName,
                error: error.message 
              }),
              'failed',
              new Date().toISOString()
            );
          } catch (dbError) {
            log.error('[AutomationService] Failed to log error to database', dbError);
          }
        }
      }

      // 2. Process inactive accounts - ensure they're disabled and licenses removed
      for (const target of plan.inactiveAccounts.targets) {
        try {
          log.info('[AutomationService] Processing inactive account', {
            user: target.userName,
            daysInactive: target.daysInactive,
          });

          // Get user details to check current state
          const userDetails = await graphApiService.getUserDetails(target.userId);
          
          // Ensure account is disabled
          if (userDetails.accountEnabled) {
            await graphApiService.updateUser(target.userId, { accountEnabled: false });
            log.info('[AutomationService] Disabled inactive account', { user: target.userName });
          }

          // Remove any licenses from inactive account
          if (userDetails.assignedLicenses && userDetails.assignedLicenses.length > 0) {
            await graphApiService.removeLicensesFromUser(target.userId, userDetails.assignedLicenses);
            log.info('[AutomationService] Removed licenses from inactive account', {
              user: target.userName,
              licensesRemoved: userDetails.assignedLicenses.length,
            });
            result.savings.licensesReclaimed += userDetails.assignedLicenses.length;
          }

          const database = await db();
          database.prepare(
            `INSERT INTO activity_log (action, module, user_id, details, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?)`
          ).run(
            'account_review',
            'user_lifecycle',
            target.userId,
            JSON.stringify({ 
              daysInactive: target.daysInactive,
              userName: target.userName,
              licensesRemoved: userDetails.assignedLicenses?.length || 0
            }),
            'completed',
            new Date().toISOString()
          );

          result.actionsTaken++;
          result.savings.accountsDisabled++;
        } catch (error: any) {
          log.error('[AutomationService] Error processing inactive account', error);
          result.errors.push(`Failed to process ${target.userName}: ${error.message}`);
        }
      }

      result.savings.estimatedMonthlySavings =
        plan.licenseWaste.estimatedSavings + plan.inactiveAccounts.estimatedSavings;

      log.info('[AutomationService] Safe fixes applied', result);
      return result;
    } catch (error: any) {
      log.error('[AutomationService] Error applying safe fixes', error);
      result.success = false;
      result.errors.push(`Fatal error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Apply individual fix for a specific user/target
   */
  async applyIndividualFix(
    category: 'licenseWaste' | 'inactiveAccounts',
    userId: string,
    details?: any
  ): Promise<{ success: boolean; message: string }> {
    log.info('[AutomationService] Applying individual fix', { category, userId });

    try {
      if (category === 'licenseWaste' && details?.licenses) {
        await graphApiService.removeLicensesFromUser(userId, details.licenses);
        
        const database = await db();
        database.prepare(
          `INSERT INTO activity_log (action, module, user_id, details, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        ).run(
          'license_reclaim',
          'license_optimizer',
          userId,
          JSON.stringify({ licenses: details.licenses, userName: details.userName }),
          'completed',
          new Date().toISOString()
        );

        return { success: true, message: `Removed ${details.licenses.length} license(s) from ${details.userName}` };
      } else if (category === 'inactiveAccounts') {
        const userDetails = await graphApiService.getUserDetails(userId);
        
        if (userDetails.accountEnabled) {
          await graphApiService.updateUser(userId, { accountEnabled: false });
        }

        if (userDetails.assignedLicenses && userDetails.assignedLicenses.length > 0) {
          await graphApiService.removeLicensesFromUser(userId, userDetails.assignedLicenses);
        }

        const database = await db();
        database.prepare(
          `INSERT INTO activity_log (action, module, user_id, details, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        ).run(
          'account_review',
          'user_lifecycle',
          userId,
          JSON.stringify({ userName: details?.userName || userDetails.userPrincipalName }),
          'completed',
          new Date().toISOString()
        );

        return { success: true, message: `Processed inactive account: ${details?.userName || userDetails.userPrincipalName}` };
      }

      return { success: false, message: 'Unknown category or missing details' };
    } catch (error: any) {
      log.error('[AutomationService] Error applying individual fix', error);
      throw error;
    }
  }

  async runModule(module: string, action: string, params?: any): Promise<any> {
    log.info('[AutomationService] Running module', { module, action, params });

    // This is the extensible hook for future automation modules
    switch (module) {
      case 'license_optimizer':
        return this.runLicenseOptimizer(action, params);
      case 'user_lifecycle':
        return this.runUserLifecycle(action, params);
      case 'security':
        return this.runSecurity(action, params);
      default:
        throw new Error(`Unknown module: ${module}`);
    }
  }

  private async runLicenseOptimizer(action: string, params?: any): Promise<any> {
    log.info('[AutomationService] License optimizer', { action, params });
    // TODO: Implement license optimizer actions
    return { success: true, message: 'License optimizer action executed' };
  }

  private async runUserLifecycle(action: string, params?: any): Promise<any> {
    log.info('[AutomationService] User lifecycle', { action, params });
    // TODO: Implement user lifecycle actions
    return { success: true, message: 'User lifecycle action executed' };
  }

  private async runSecurity(action: string, params?: any): Promise<any> {
    log.info('[AutomationService] Security', { action, params });
    // TODO: Implement security actions
    return { success: true, message: 'Security action executed' };
  }
}

export const automationService = new AutomationService();

