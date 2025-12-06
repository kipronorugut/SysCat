import log from 'electron-log';
import { IdentityDetector } from './detection/identity-detector.service';
import { ExchangeDetector } from './detection/exchange-detector.service';
import { SharePointDetector } from './detection/sharepoint-detector.service';
import { TeamsDetector } from './detection/teams-detector.service';
import { CopilotDetector } from './detection/copilot-detector.service';
import { IntuneDetector } from './detection/intune-detector.service';
import { DefenderDetector } from './detection/defender-detector.service';
import { DetectionResult } from './detection/base-detector.service';

/**
 * Unified Security Scanner Service
 * Orchestrates all security detectors and provides unified interface
 * This is the entry point for the full security scan
 * Matches Griffin31's "Comprehensive Protection" coverage
 */
export class SecurityScannerService {
  private identityDetector: IdentityDetector;
  private exchangeDetector: ExchangeDetector;
  private sharePointDetector: SharePointDetector;
  private teamsDetector: TeamsDetector;
  private copilotDetector: CopilotDetector;
  private intuneDetector: IntuneDetector;
  private defenderDetector: DefenderDetector;

  constructor() {
    this.identityDetector = new IdentityDetector();
    this.exchangeDetector = new ExchangeDetector();
    this.sharePointDetector = new SharePointDetector();
    this.teamsDetector = new TeamsDetector();
    this.copilotDetector = new CopilotDetector();
    this.intuneDetector = new IntuneDetector();
    this.defenderDetector = new DefenderDetector();
  }

  /**
   * Run complete security scan
   * Returns all findings across all detector categories
   */
  async runFullScan(): Promise<{
    totalFindings: number;
    findings: DetectionResult[];
    summary: {
      critical: number;
      high: number;
      medium: number;
      low: number;
      byCategory: Record<string, number>;
    };
  }> {
    log.info('[SecurityScanner] Starting full security scan');

    const allFindings: DetectionResult[] = [];

    try {
      // Run all detectors in parallel for comprehensive coverage
      // Matches Griffin31's coverage: EntraID, Exchange, SharePoint, Teams, Copilot, Intune, Defender
      const [
        identityFindings,
        exchangeFindings,
        sharePointFindings,
        teamsFindings,
        copilotFindings,
        intuneFindings,
        defenderFindings,
      ] = await Promise.all([
        this.identityDetector.detect(),
        this.exchangeDetector.detect(),
        this.sharePointDetector.detect(),
        this.teamsDetector.detect(),
        this.copilotDetector.detect(),
        this.intuneDetector.detect(),
        this.defenderDetector.detect(),
      ]);

      allFindings.push(...identityFindings);
      allFindings.push(...exchangeFindings);
      allFindings.push(...sharePointFindings);
      allFindings.push(...teamsFindings);
      allFindings.push(...copilotFindings);
      allFindings.push(...intuneFindings);
      allFindings.push(...defenderFindings);

      // Calculate summary
      const summary = {
        critical: allFindings.filter(f => f.severity === 'critical').length,
        high: allFindings.filter(f => f.severity === 'high').length,
        medium: allFindings.filter(f => f.severity === 'medium').length,
        low: allFindings.filter(f => f.severity === 'low').length,
        byCategory: this.groupByCategory(allFindings),
      };

      log.info('[SecurityScanner] Scan complete', {
        totalFindings: allFindings.length,
        summary,
      });

      return {
        totalFindings: allFindings.length,
        findings: allFindings,
        summary,
      };
    } catch (error: any) {
      log.error('[SecurityScanner] Error running full scan', error);
      throw error;
    }
  }

  /**
   * Get security posture score (0-100)
   */
  async calculateSecurityScore(): Promise<{
    overall: number;
    breakdown: {
      identity: number;
      email: number;
      collaboration: number;
      compliance: number;
    };
    trends?: Array<{ date: string; score: number }>;
  }> {
    const scan = await this.runFullScan();

    // Calculate score based on findings
    // Higher severity findings = lower score
    const criticalPenalty = scan.summary.critical * 10;
    const highPenalty = scan.summary.high * 5;
    const mediumPenalty = scan.summary.medium * 2;
    const lowPenalty = scan.summary.low * 1;

    const maxPenalty = 100;
    const penalty = Math.min(criticalPenalty + highPenalty + mediumPenalty + lowPenalty, maxPenalty);
    const overall = Math.max(0, 100 - penalty);

    // Calculate breakdown by category
    const allFindings = scan.findings;
    const identityFindings = allFindings.filter((f: DetectionResult) => f.type.includes('identity') || f.type.includes('mfa') || f.type.includes('auth'));
    const emailFindings = allFindings.filter((f: DetectionResult) => f.type.includes('exchange') || f.type.includes('email'));
    const collaborationFindings = allFindings.filter((f: DetectionResult) => f.type.includes('sharepoint') || f.type.includes('teams'));
    const complianceFindings = allFindings.filter((f: DetectionResult) => f.type.includes('intune') || f.type.includes('defender'));

    const calculateCategoryScore = (findings: DetectionResult[]) => {
      const criticalPenalty = findings.filter((f: DetectionResult) => f.severity === 'critical').length * 10;
      const highPenalty = findings.filter((f: DetectionResult) => f.severity === 'high').length * 5;
      const mediumPenalty = findings.filter((f: DetectionResult) => f.severity === 'medium').length * 2;
      const lowPenalty = findings.filter((f: DetectionResult) => f.severity === 'low').length * 1;
      const penalty = Math.min(criticalPenalty + highPenalty + mediumPenalty + lowPenalty, 100);
      return Math.max(0, 100 - penalty);
    };

    return {
      overall,
      breakdown: {
        identity: calculateCategoryScore(identityFindings),
        email: calculateCategoryScore(emailFindings),
        collaboration: calculateCategoryScore(collaborationFindings),
        compliance: calculateCategoryScore(complianceFindings),
      },
    };
  }

  /**
   * Group findings by category/type
   */
  private groupByCategory(findings: DetectionResult[]): Record<string, number> {
    const categories: Record<string, number> = {};

    for (const finding of findings) {
      const category = finding.type.split('_')[0] || 'unknown';
      categories[category] = (categories[category] || 0) + 1;
    }

    return categories;
  }

  /**
   * Get findings by severity
   */
  getFindingsBySeverity(
    findings: DetectionResult[],
    severity: DetectionResult['severity']
  ): DetectionResult[] {
    return findings.filter(f => f.severity === severity);
  }

  /**
   * Get findings by type
   */
  getFindingsByType(findings: DetectionResult[], type: string): DetectionResult[] {
    return findings.filter(f => f.type === type);
  }
}

export const securityScannerService = new SecurityScannerService();

