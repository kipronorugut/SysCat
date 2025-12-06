import log from 'electron-log';
import { graphApiService } from '../graph-api.service';
import { BaseDetector, DetectionResult } from './base-detector.service';

/**
 * Licensing & Cost Management Detector
 * Addresses pain points 1-25: Complex licensing, cost optimization, license reconciliation
 */
export class LicensingDetector extends BaseDetector {
  protected detectorName = 'LicensingDetector';

  async detect(): Promise<DetectionResult[]> {
    log.info('[LicensingDetector] Running licensing and cost management scan');

    const results: DetectionResult[] = [];

    const [
      unusedLicenseResults,
      disabledAccountLicenseResults,
      guestLicenseResults,
      overlappingLicenseResults,
      serviceAccountLicenseResults,
      expiredTrialResults,
      nceCommitmentResults,
    ] = await Promise.all([
      this.detectUnusedLicenses(),
      this.detectDisabledAccountLicenses(),
      this.detectGuestLicenses(),
      this.detectOverlappingLicenses(),
      this.detectServiceAccountLicenses(),
      this.detectExpiredTrials(),
      this.detectNCECommitmentIssues(),
    ]);

    results.push(...unusedLicenseResults);
    results.push(...disabledAccountLicenseResults);
    results.push(...guestLicenseResults);
    results.push(...overlappingLicenseResults);
    results.push(...serviceAccountLicenseResults);
    results.push(...expiredTrialResults);
    results.push(...nceCommitmentResults);

    log.info('[LicensingDetector] Scan complete', { totalFindings: results.length });
    return results;
  }

  /**
   * Pain Point #1-3: Unused licenses and license waste
   */
  private async detectUnusedLicenses(): Promise<DetectionResult[]> {
    log.debug('[LicensingDetector] Checking for unused licenses');

    try {
      const licenses = await graphApiService.getLicenses();
      const unusedLicenses = licenses.filter(l => l.available > 0);

      if (unusedLicenses.length === 0) {
        return [];
      }

      const totalUnused = unusedLicenses.reduce((sum, l) => sum + l.available, 0);
      const estimatedMonthlyCost = totalUnused * 12; // Rough estimate: $12/month per license

      return [
        this.createResult({
          type: 'unused_licenses',
          severity: 'medium',
          title: 'Unused Licenses Detected',
          description: `Found ${totalUnused} unused license(s) across ${unusedLicenses.length} SKU(s). This represents potential monthly savings of approximately $${estimatedMonthlyCost.toFixed(2)}.`,
          affectedResources: unusedLicenses.map(l => ({
            id: l.skuId,
            name: l.skuPartNumber,
            details: {
              enabled: l.enabled,
              consumed: l.consumed,
              available: l.available,
              estimatedMonthlyCost: l.available * 12,
            },
          })),
          recommendation: 'Review license allocation and consider reducing purchased licenses to match actual consumption.',
          remediation: {
            automated: false,
            action: 'review_license_allocation',
            estimatedTime: 30,
          },
          metadata: {
            totalUnused,
            estimatedMonthlySavings: estimatedMonthlyCost,
            painPointNumbers: [1, 2, 3],
          },
        }),
      ];
    } catch (error: any) {
      log.error('[LicensingDetector] Error detecting unused licenses', error);
      return [];
    }
  }

  /**
   * Pain Point #4-5: Disabled accounts with licenses
   */
  private async detectDisabledAccountLicenses(): Promise<DetectionResult[]> {
    log.debug('[LicensingDetector] Checking disabled accounts with licenses');

    try {
      const users = await graphApiService.getUsers();
      const disabledWithLicenses = users.filter(
        u => !u.accountEnabled && u.assignedLicenses && u.assignedLicenses.length > 0
      );

      if (disabledWithLicenses.length === 0) {
        return [];
      }

      const totalLicenses = disabledWithLicenses.reduce(
        (sum, u) => sum + (u.assignedLicenses?.length || 0),
        0
      );
      const estimatedMonthlyCost = totalLicenses * 12;

      return [
        this.createResult({
          type: 'disabled_account_licenses',
          severity: 'high',
          title: 'Disabled Accounts with Active Licenses',
          description: `Found ${disabledWithLicenses.length} disabled account(s) with ${totalLicenses} license(s) still assigned. Estimated monthly waste: $${estimatedMonthlyCost.toFixed(2)}.`,
          affectedResources: disabledWithLicenses.map(u => ({
            id: u.id,
            name: u.userPrincipalName || u.displayName,
            details: {
              displayName: u.displayName,
              licenseCount: u.assignedLicenses?.length || 0,
              licenses: u.assignedLicenses || [],
            },
          })),
          recommendation: 'Remove licenses from disabled accounts immediately to reduce costs.',
          remediation: {
            automated: true,
            action: 'remove_licenses_from_disabled',
            estimatedTime: 5,
          },
          metadata: {
            count: disabledWithLicenses.length,
            totalLicenses,
            estimatedMonthlySavings: estimatedMonthlyCost,
            painPointNumbers: [4, 5],
          },
        }),
      ];
    } catch (error: any) {
      log.error('[LicensingDetector] Error detecting disabled account licenses', error);
      return [];
    }
  }

  /**
   * Pain Point #10: Guest user licensing
   */
  private async detectGuestLicenses(): Promise<DetectionResult[]> {
    log.debug('[LicensingDetector] Checking guest user licenses');

    try {
      const users = await graphApiService.getUsers();
      const guestsWithLicenses = users.filter(
        u => u.userType === 'Guest' && u.assignedLicenses && u.assignedLicenses.length > 0
      );

      if (guestsWithLicenses.length === 0) {
        return [];
      }

      const totalLicenses = guestsWithLicenses.reduce(
        (sum, u) => sum + (u.assignedLicenses?.length || 0),
        0
      );

      return [
        this.createResult({
          type: 'guest_licenses',
          severity: 'medium',
          title: 'Guest Users with Licenses',
          description: `Found ${guestsWithLicenses.length} guest user(s) with ${totalLicenses} license(s) assigned. Guest users typically do not need licenses.`,
          affectedResources: guestsWithLicenses.map(u => ({
            id: u.id,
            name: u.userPrincipalName || u.displayName,
            details: {
              displayName: u.displayName,
              licenseCount: u.assignedLicenses?.length || 0,
            },
          })),
          recommendation: 'Review guest user license assignments. Remove licenses unless specifically required.',
          remediation: {
            automated: true,
            action: 'remove_guest_licenses',
            estimatedTime: 5,
          },
          metadata: {
            count: guestsWithLicenses.length,
            painPointNumber: 10,
          },
        }),
      ];
    } catch (error: any) {
      log.error('[LicensingDetector] Error detecting guest licenses', error);
      return [];
    }
  }

  /**
   * Pain Point #9: Overlapping licenses (e.g., E3 + standalone Exchange)
   */
  private async detectOverlappingLicenses(): Promise<DetectionResult[]> {
    log.debug('[LicensingDetector] Checking for overlapping licenses');

    try {
      const users = await graphApiService.getUsers();
      const overlapping: Array<{ user: any; overlapping: string[] }> = [];

      // Common overlapping scenarios
      const e3SkuIds = ['ENTERPRISEPACK']; // E3
      const e5SkuIds = ['ENTERPRISEPREMIUM']; // E5
      const exchangeStandalone = ['EXCHANGESTANDARD', 'EXCHANGEENTERPRISE'];

      for (const user of users) {
        if (!user.assignedLicenses || user.assignedLicenses.length < 2) continue;

        const hasE3 = user.assignedLicenses.some((id: string) => e3SkuIds.includes(id));
        const hasE5 = user.assignedLicenses.some((id: string) => e5SkuIds.includes(id));
        const hasExchangeStandalone = user.assignedLicenses.some((id: string) =>
          exchangeStandalone.includes(id)
        );

        if ((hasE3 || hasE5) && hasExchangeStandalone) {
          overlapping.push({
            user,
            overlapping: ['E3/E5 includes Exchange, standalone Exchange is redundant'],
          });
        }
      }

      if (overlapping.length === 0) {
        return [];
      }

      return [
        this.createResult({
          type: 'overlapping_licenses',
          severity: 'low',
          title: 'Overlapping License Assignments',
          description: `Found ${overlapping.length} user(s) with overlapping license assignments (e.g., E3/E5 + standalone Exchange).`,
          affectedResources: overlapping.map(o => ({
            id: o.user.id,
            name: o.user.userPrincipalName || o.user.displayName,
            details: {
              displayName: o.user.displayName,
              overlapping: o.overlapping,
              licenses: o.user.assignedLicenses,
            },
          })),
          recommendation: 'Review and remove redundant license assignments to optimize costs.',
          remediation: {
            automated: false,
            action: 'review_overlapping_licenses',
            estimatedTime: 15,
          },
          metadata: {
            count: overlapping.length,
            painPointNumber: 9,
          },
        }),
      ];
    } catch (error: any) {
      log.error('[LicensingDetector] Error detecting overlapping licenses', error);
      return [];
    }
  }

  /**
   * Pain Point #2: Service accounts with expensive licenses
   */
  private async detectServiceAccountLicenses(): Promise<DetectionResult[]> {
    log.debug('[LicensingDetector] Checking service account licenses');

    try {
      const users = await graphApiService.getUsers();
      // Common service account patterns
      const serviceAccountPatterns = [
        /^svc-/i,
        /^service-/i,
        /-service$/i,
        /^system-/i,
        /^admin-/i,
        /service account/i,
      ];

      const serviceAccounts = users.filter(u => {
        const upn = u.userPrincipalName?.toLowerCase() || '';
        const displayName = u.displayName?.toLowerCase() || '';
        return serviceAccountPatterns.some(
          pattern => pattern.test(upn) || pattern.test(displayName)
        );
      });

      const withLicenses = serviceAccounts.filter(
        u => u.assignedLicenses && u.assignedLicenses.length > 0
      );

      if (withLicenses.length === 0) {
        return [];
      }

      return [
        this.createResult({
          type: 'service_account_licenses',
          severity: 'medium',
          title: 'Service Accounts with Licenses',
          description: `Found ${withLicenses.length} potential service account(s) with licenses assigned. Service accounts typically do not need user licenses.`,
          affectedResources: withLicenses.map(u => ({
            id: u.id,
            name: u.userPrincipalName || u.displayName,
            details: {
              displayName: u.displayName,
              licenseCount: u.assignedLicenses?.length || 0,
            },
          })),
          recommendation: 'Review service accounts and remove unnecessary licenses. Use managed identities or app-only authentication where possible.',
          remediation: {
            automated: false,
            action: 'review_service_account_licenses',
            estimatedTime: 20,
          },
          metadata: {
            count: withLicenses.length,
            painPointNumber: 2,
          },
        }),
      ];
    } catch (error: any) {
      log.error('[LicensingDetector] Error detecting service account licenses', error);
      return [];
    }
  }

  /**
   * Pain Point #19: Expired trial licenses
   */
  private async detectExpiredTrials(): Promise<DetectionResult[]> {
    log.debug('[LicensingDetector] Checking for expired trial licenses');

    try {
      const licenses = await graphApiService.getLicenses();
      // Trial SKUs often contain "TRIAL" in the name
      const trialLicenses = licenses.filter(l =>
        l.skuPartNumber.toUpperCase().includes('TRIAL')
      );

      if (trialLicenses.length === 0) {
        return [];
      }

      return [
        this.createResult({
          type: 'expired_trials',
          severity: 'low',
          title: 'Trial Licenses Detected',
          description: `Found ${trialLicenses.length} trial license SKU(s). Review if these are still needed or should be converted to paid licenses.`,
          affectedResources: trialLicenses.map(l => ({
            id: l.skuId,
            name: l.skuPartNumber,
            details: {
              enabled: l.enabled,
              consumed: l.consumed,
            },
          })),
          recommendation: 'Review trial licenses and either convert to paid licenses or remove if no longer needed.',
          remediation: {
            automated: false,
            action: 'review_trial_licenses',
            estimatedTime: 10,
          },
          metadata: {
            count: trialLicenses.length,
            painPointNumber: 19,
          },
        }),
      ];
    } catch (error: any) {
      log.error('[LicensingDetector] Error detecting expired trials', error);
      return [];
    }
  }

  /**
   * Pain Point #1: NCE commitment issues (detection only - remediation requires manual review)
   */
  private async detectNCECommitmentIssues(): Promise<DetectionResult[]> {
    log.debug('[LicensingDetector] Checking NCE commitment patterns');

    // NCE (New Commerce Experience) issues are mostly policy/compliance related
    // We can detect potential issues like annual commitments that might be problematic
    // Actual NCE data requires billing API access which may not be available

    return []; // Placeholder - would need billing API access
  }
}

