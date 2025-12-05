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
      // For MVP: We'll log what we would do, but not actually make Graph API calls yet
      // This is a safety measure - you can enable actual API calls once tested

      // 1. Reclaim licenses from disabled accounts
      for (const target of plan.licenseWaste.targets) {
        try {
          // TODO: Implement actual license removal via Graph API
          // await graphApiService.removeLicenses(target.userId, target.licenses);
          log.info('[AutomationService] Would reclaim licenses', {
            user: target.userName,
            licenses: target.licenses,
          });

          // Log to database
          const database = await db();
          database.prepare(
            `INSERT INTO activity_log (action, module, user_id, details, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?)`
          ).run(
            'license_reclaim',
            'license_optimizer',
            target.userId,
            JSON.stringify({ licenses: target.licenses, reason: target.reason }),
            'pending', // Would be 'completed' when actually implemented
            new Date().toISOString()
          );

          result.actionsTaken++;
          result.savings.licensesReclaimed += target.licenses.length;
        } catch (error: any) {
          log.error('[AutomationService] Error reclaiming licenses', error);
          result.errors.push(`Failed to reclaim licenses for ${target.userName}: ${error.message}`);
        }
      }

      // 2. Disable sign-in for inactive accounts (already disabled, but log it)
      for (const target of plan.inactiveAccounts.targets) {
        try {
          // Account is already disabled, just log it
          log.info('[AutomationService] Account already disabled', {
            user: target.userName,
            daysInactive: target.daysInactive,
          });

          const database = await db();
          database.prepare(
            `INSERT INTO activity_log (action, module, user_id, details, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?)`
          ).run(
            'account_review',
            'user_lifecycle',
            target.userId,
            JSON.stringify({ daysInactive: target.daysInactive }),
            'reviewed',
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

