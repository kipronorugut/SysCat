import log from 'electron-log';
import { graphApiService } from '../graph-api.service';
import { BaseDetector, DetectionResult } from './base-detector.service';

/**
 * Intune Configuration Detector
 * Detects security misconfigurations in Microsoft Intune
 * Similar to Griffin31's Intune security coverage
 */
export class IntuneDetector extends BaseDetector {
  protected detectorName = 'IntuneDetector';

  /**
   * Run all Intune-related detections
   */
  async detect(): Promise<DetectionResult[]> {
    log.info('[IntuneDetector] Running Intune security scan');

    const results: DetectionResult[] = [];

    // Run all detection methods
    const [
      complianceResults,
      policyResults,
      enrollmentResults,
      appResults,
    ] = await Promise.all([
      this.detectComplianceGaps(),
      this.detectPolicyIssues(),
      this.detectEnrollmentIssues(),
      this.detectAppProtectionGaps(),
    ]);

    results.push(...complianceResults);
    results.push(...policyResults);
    results.push(...enrollmentResults);
    results.push(...appResults);

    log.info('[IntuneDetector] Scan complete', { totalFindings: results.length });
    return results;
  }

  /**
   * Detection: Device compliance policy gaps
   */
  private async detectComplianceGaps(): Promise<DetectionResult[]> {
    log.debug('[IntuneDetector] Checking compliance policies');

    try {
      const policies = await graphApiService.getIntuneCompliancePolicies();
      
      if (policies.length === 0) {
        return [
          this.createResult({
            type: 'intune_no_compliance_policies',
            severity: 'high',
            title: 'No Intune Compliance Policies Configured',
            description: 'No device compliance policies found. Compliance policies are essential for securing devices and ensuring they meet security requirements.',
            affectedResources: [],
            recommendation: 'Create device compliance policies for all platforms (Windows, iOS, Android) to enforce security requirements.',
            remediation: {
              automated: false,
              action: 'create_compliance_policies',
              estimatedTime: 60,
            },
            metadata: {
              platforms: ['Windows', 'iOS', 'Android'],
            },
          }),
        ];
      }

      // Check for unassigned policies
      const unassignedPolicies = policies.filter(p => !p.isAssigned);
      if (unassignedPolicies.length > 0) {
        return [
          this.createResult({
            type: 'intune_unassigned_compliance_policies',
            severity: 'medium',
            title: 'Unassigned Compliance Policies',
            description: `${unassignedPolicies.length} compliance policy/policies are not assigned to any groups or users.`,
            affectedResources: unassignedPolicies.map(p => ({
              id: p.id,
              name: p.displayName,
              details: { description: p.description },
            })),
            recommendation: 'Assign compliance policies to appropriate groups to ensure devices are protected.',
            remediation: {
              automated: false,
              action: 'assign_compliance_policies',
              estimatedTime: 30,
            },
            metadata: {
              count: unassignedPolicies.length,
            },
          }),
        ];
      }

      return [];
    } catch (error: any) {
      log.error('[IntuneDetector] Error detecting compliance gaps', error);
      return [];
    }
  }

  /**
   * Detection: Configuration policy issues
   */
  private async detectPolicyIssues(): Promise<DetectionResult[]> {
    log.debug('[IntuneDetector] Checking configuration policies');

    try {
      const policies = await graphApiService.getIntuneConfigurationPolicies();
      
      if (policies.length === 0) {
        return [
          this.createResult({
            type: 'intune_no_configuration_policies',
            severity: 'medium',
            title: 'No Intune Configuration Policies',
            description: 'No device configuration policies found. Configuration policies help secure and manage devices.',
            affectedResources: [],
            recommendation: 'Create device configuration policies to enforce security settings on managed devices.',
            remediation: {
              automated: false,
              action: 'create_configuration_policies',
              estimatedTime: 45,
            },
          }),
        ];
      }

      // Check for unassigned policies
      const unassignedPolicies = policies.filter(p => !p.isAssigned);
      if (unassignedPolicies.length > 0) {
        return [
          this.createResult({
            type: 'intune_unassigned_configuration_policies',
            severity: 'low',
            title: 'Unassigned Configuration Policies',
            description: `${unassignedPolicies.length} configuration policy/policies are not assigned.`,
            affectedResources: unassignedPolicies.map(p => ({
              id: p.id,
              name: p.displayName,
            })),
            recommendation: 'Assign configuration policies to ensure devices receive security settings.',
            remediation: {
              automated: false,
              action: 'assign_configuration_policies',
              estimatedTime: 20,
            },
            metadata: {
              count: unassignedPolicies.length,
            },
          }),
        ];
      }

      return [];
    } catch (error: any) {
      log.error('[IntuneDetector] Error detecting policy issues', error);
      return [];
    }
  }

  /**
   * Detection: Device enrollment issues
   */
  private async detectEnrollmentIssues(): Promise<DetectionResult[]> {
    log.debug('[IntuneDetector] Checking device enrollment');

    try {
      const restrictions = await graphApiService.getIntuneEnrollmentRestrictions();
      
      if (restrictions.length === 0) {
        return [
          this.createResult({
            type: 'intune_no_enrollment_restrictions',
            severity: 'high',
            title: 'No Device Enrollment Restrictions',
            description: 'No enrollment restrictions configured. This allows any device to enroll, which is a security risk.',
            affectedResources: [],
            recommendation: 'Configure device enrollment restrictions to control which devices can enroll in Intune.',
            remediation: {
              automated: false,
              action: 'create_enrollment_restrictions',
              estimatedTime: 30,
            },
            metadata: {
              platforms: ['Windows', 'iOS', 'Android'],
            },
          }),
        ];
      }

      return [];
    } catch (error: any) {
      log.error('[IntuneDetector] Error detecting enrollment issues', error);
      return [];
    }
  }

  /**
   * Detection: App protection policy gaps
   */
  private async detectAppProtectionGaps(): Promise<DetectionResult[]> {
    log.debug('[IntuneDetector] Checking app protection policies');

    try {
      const policies = await graphApiService.getIntuneAppProtectionPolicies();
      
      if (policies.length === 0) {
        return [
          this.createResult({
            type: 'intune_no_app_protection',
            severity: 'high',
            title: 'No App Protection Policies (MAM)',
            description: 'No Mobile Application Management (MAM) policies found. App protection policies protect corporate data in mobile apps.',
            affectedResources: [],
            recommendation: 'Create app protection policies to protect corporate data in mobile applications, even for unmanaged devices.',
            remediation: {
              automated: false,
              action: 'create_app_protection_policies',
              estimatedTime: 45,
            },
            metadata: {
              platforms: ['iOS', 'Android'],
            },
          }),
        ];
      }

      // Check for unassigned policies
      const unassignedPolicies = policies.filter(p => !p.isAssigned);
      if (unassignedPolicies.length > 0) {
        return [
          this.createResult({
            type: 'intune_unassigned_app_protection',
            severity: 'medium',
            title: 'Unassigned App Protection Policies',
            description: `${unassignedPolicies.length} app protection policy/policies are not assigned.`,
            affectedResources: unassignedPolicies.map(p => ({
              id: p.id,
              name: p.displayName,
            })),
            recommendation: 'Assign app protection policies to protect corporate data in mobile apps.',
            remediation: {
              automated: false,
              action: 'assign_app_protection_policies',
              estimatedTime: 20,
            },
            metadata: {
              count: unassignedPolicies.length,
            },
          }),
        ];
      }

      return [];
    } catch (error: any) {
      log.error('[IntuneDetector] Error detecting app protection gaps', error);
      return [];
    }
  }
}

