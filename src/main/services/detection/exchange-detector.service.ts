import log from 'electron-log';
import { graphApiService } from '../graph-api.service';
import { BaseDetector, DetectionResult } from './base-detector.service';

/**
 * Exchange Online Administration Detector
 * Addresses pain points 56-90: Mail flow, shared mailboxes, retention, etc.
 */
export class ExchangeDetector extends BaseDetector {
  protected detectorName = 'ExchangeDetector';

  async detect(): Promise<DetectionResult[]> {
    log.info('[ExchangeDetector] Running Exchange Online administration scan');

    const results: DetectionResult[] = [];

    const [
      sharedMailboxResults,
      forwardingResults,
      retentionResults,
      quotaResults,
    ] = await Promise.all([
      this.detectSharedMailboxIssues(),
      this.detectEmailForwarding(),
      this.detectRetentionIssues(),
      this.detectQuotaIssues(),
    ]);

    results.push(...sharedMailboxResults);
    results.push(...forwardingResults);
    results.push(...retentionResults);
    results.push(...quotaResults);

    log.info('[ExchangeDetector] Scan complete', { totalFindings: results.length });
    return results;
  }

  /**
   * Pain Point #58: Shared mailbox auto-mapping and performance issues
   * Pain Point #60: Shared mailbox licensing (50GB limit)
   */
  private async detectSharedMailboxIssues(): Promise<DetectionResult[]> {
    log.debug('[ExchangeDetector] Checking shared mailbox issues');

    try {
      // Get all users and filter for shared mailboxes
      // Shared mailboxes typically have userType = 'Shared' or have mailboxSettings indicating shared
      const users = await graphApiService.getUsers({ top: 999 });
      const sharedMailboxes = users.filter((u: any) => u.userType === 'Shared' || !u.accountEnabled);
      
      // Check for shared mailboxes with licenses (waste)
      const licensedShared = sharedMailboxes.filter((u: any) => 
        u.assignedLicenses && u.assignedLicenses.length > 0
      );

      if (licensedShared.length > 0) {
        return [
          this.createResult({
            type: 'exchange_shared_mailbox_licenses',
            severity: 'medium',
            title: 'Shared Mailboxes with Licenses',
            description: `${licensedShared.length} shared mailbox/mailboxes have licenses assigned. Shared mailboxes don't require licenses and have a 50GB limit.`,
            affectedResources: licensedShared.map((mb: any) => ({
              id: mb.id,
              name: mb.userPrincipalName || mb.displayName,
              details: {
                displayName: mb.displayName,
                licenseCount: mb.assignedLicenses?.length || 0,
              },
            })),
            recommendation: 'Remove licenses from shared mailboxes to reduce costs. Shared mailboxes work without licenses.',
            remediation: {
              automated: true,
              action: 'remove_shared_mailbox_licenses',
              estimatedTime: 5,
            },
            metadata: {
              count: licensedShared.length,
              estimatedSavings: licensedShared.length * 12, // Rough monthly estimate
            },
          }),
        ];
      }

      return [];
    } catch (error: any) {
      log.error('[ExchangeDetector] Error detecting shared mailbox issues', error);
      return [];
    }
  }

  /**
   * Pain Point #63: Email forwarding policies
   */
  private async detectEmailForwarding(): Promise<DetectionResult[]> {
    log.debug('[ExchangeDetector] Checking email forwarding');

    try {
      // Email forwarding detection requires Exchange-specific API
      // This would check for users with forwarding enabled that might violate policy
      
      return []; // Placeholder - requires Exchange-specific API permissions
    } catch (error: any) {
      log.error('[ExchangeDetector] Error detecting email forwarding', error);
      return [];
    }
  }

  /**
   * Pain Point #64: Litigation hold vs retention policy confusion
   */
  private async detectRetentionIssues(): Promise<DetectionResult[]> {
    log.debug('[ExchangeDetector] Checking retention and hold policies');

    try {
      // Retention policy detection requires Compliance API access
      
      return []; // Placeholder - requires Compliance API permissions
    } catch (error: any) {
      log.error('[ExchangeDetector] Error detecting retention issues', error);
      return [];
    }
  }

  /**
   * Pain Point #66: Mailbox size quotas
   */
  private async detectQuotaIssues(): Promise<DetectionResult[]> {
    log.debug('[ExchangeDetector] Checking mailbox quota issues');

    try {
      // Mailbox quota detection requires Exchange-specific API
      // Would check for mailboxes approaching quota limits
      
      return []; // Placeholder - requires Exchange-specific API permissions
    } catch (error: any) {
      log.error('[ExchangeDetector] Error detecting quota issues', error);
      return [];
    }
  }
}

