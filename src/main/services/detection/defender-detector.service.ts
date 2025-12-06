import log from 'electron-log';
import { graphApiService } from '../graph-api.service';
import { BaseDetector, DetectionResult } from './base-detector.service';

/**
 * Microsoft Defender Security Detector
 * Detects security misconfigurations in Microsoft Defender
 * Similar to Griffin31's Defender security coverage
 */
export class DefenderDetector extends BaseDetector {
  protected detectorName = 'DefenderDetector';

  /**
   * Run all Defender-related detections
   */
  async detect(): Promise<DetectionResult[]> {
    log.info('[DefenderDetector] Running Defender security scan');

    const results: DetectionResult[] = [];

    // Run all detection methods
    const [
      policyResults,
      threatResults,
      safeResults,
      emailResults,
    ] = await Promise.all([
      this.detectPolicyGaps(),
      this.detectThreatProtectionGaps(),
      this.detectSafeLinksGaps(),
      this.detectEmailSecurityGaps(),
    ]);

    results.push(...policyResults);
    results.push(...threatResults);
    results.push(...safeResults);
    results.push(...emailResults);

    log.info('[DefenderDetector] Scan complete', { totalFindings: results.length });
    return results;
  }

  /**
   * Detection: Defender policy misconfigurations
   * Note: Defender policies are managed through Microsoft 365 Defender portal
   * Graph API has limited support, so we check for Conditional Access policies related to security
   */
  private async detectPolicyGaps(): Promise<DetectionResult[]> {
    log.debug('[DefenderDetector] Checking Defender-related policies');

    try {
      // Check Conditional Access policies for security-related configurations
      const caPolicies = await graphApiService.getConditionalAccessPolicies();
      
      // Check if there are policies that might relate to Defender/security
      // This is a simplified check - full Defender policy checking requires Defender API
      const enabledPolicies = caPolicies.filter(p => p.state === 'enabled');
      
      if (enabledPolicies.length === 0) {
        return [
          this.createResult({
            type: 'defender_no_ca_policies',
            severity: 'high',
            title: 'No Conditional Access Policies Enabled',
            description: 'No Conditional Access policies are enabled. CA policies are essential for enforcing security controls and can work with Defender.',
            affectedResources: [],
            recommendation: 'Enable Conditional Access policies to enforce security controls. Consider policies that work with Microsoft Defender.',
            remediation: {
              automated: false,
              action: 'create_ca_policies',
              estimatedTime: 60,
            },
            metadata: {
              note: 'Defender-specific policies require Microsoft 365 Defender portal access',
            },
          }),
        ];
      }

      return [];
    } catch (error: any) {
      log.error('[DefenderDetector] Error detecting policy gaps', error);
      return [];
    }
  }

  /**
   * Detection: Threat protection gaps
   * Note: Full Defender policy checking requires Microsoft 365 Defender API
   * This provides a basic check based on available Graph API data
   */
  private async detectThreatProtectionGaps(): Promise<DetectionResult[]> {
    log.debug('[DefenderDetector] Checking threat protection');

    try {
      // Check for Conditional Access policies that might indicate threat protection
      // Full Defender checking requires Defender API access
      const caPolicies = await graphApiService.getConditionalAccessPolicies();
      const securityPolicies = caPolicies.filter(p => 
        p.state === 'enabled' &&
        (p.grantControls?.builtInControls?.includes('mfa') || 
         p.grantControls?.builtInControls?.includes('compliantDevice'))
      );

      if (securityPolicies.length === 0) {
        return [
          this.createResult({
            type: 'defender_threat_protection_gaps',
            severity: 'high',
            title: 'Threat Protection May Not Be Configured',
            description: 'No security-focused Conditional Access policies detected. Microsoft Defender for Office 365 threat protection should be configured.',
            affectedResources: [],
            recommendation: 'Configure Microsoft Defender for Office 365 threat protection policies (Safe Attachments, Safe Links, Anti-phishing) in the Microsoft 365 Defender portal.',
            remediation: {
              automated: false,
              action: 'configure_defender_threat_protection',
              estimatedTime: 45,
            },
            metadata: {
              note: 'Full Defender policy checking requires Microsoft 365 Defender portal access',
              defenderPortal: 'https://security.microsoft.com',
            },
          }),
        ];
      }

      return [];
    } catch (error: any) {
      log.error('[DefenderDetector] Error detecting threat protection gaps', error);
      return [];
    }
  }

  /**
   * Detection: Safe Links configuration gaps
   */
  private async detectSafeLinksGaps(): Promise<DetectionResult[]> {
    log.debug('[DefenderDetector] Checking Safe Links configuration');

    try {
      // TODO: Check Safe Links policy configuration
      // Verify Safe Links is enabled and properly configured
      return [];
    } catch (error: any) {
      log.error('[DefenderDetector] Error detecting Safe Links gaps', error);
      return [];
    }
  }

  /**
   * Detection: Email security gaps
   */
  private async detectEmailSecurityGaps(): Promise<DetectionResult[]> {
    log.debug('[DefenderDetector] Checking email security');

    try {
      // TODO: Check Defender for Office 365 email security settings
      // Verify anti-spam, anti-phishing, etc.
      return [];
    } catch (error: any) {
      log.error('[DefenderDetector] Error detecting email security gaps', error);
      return [];
    }
  }
}

