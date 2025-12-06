import log from 'electron-log';
import { PainPoint, EnhancedRecommendation } from '../../shared/types/pain-points';

/**
 * Recommendations Service
 * Provides enhanced recommendations with step-by-step guides, license requirements,
 * user impact, estimated work, and relationships
 * Similar to Griffin31's "Recommendations Repository" feature
 */
export class RecommendationsService {
  private recommendations: Map<string, EnhancedRecommendation> = new Map();

  /**
   * Generate enhanced recommendation from pain point
   */
  generateRecommendation(painPoint: PainPoint): EnhancedRecommendation {
    log.debug(`[RecommendationsService] Generating recommendation for pain point ${painPoint.id}`);

    // Check if recommendation already exists
    const existing = this.recommendations.get(painPoint.id);
    if (existing) {
      return existing;
    }

    // Generate step-by-step guide based on category and remediation type
    const stepByStepGuide = this.generateStepByStepGuide(painPoint);

    // Determine license requirements
    const licenseRequirements = this.determineLicenseRequirements(painPoint);

    // Assess user impact
    const userImpact = this.assessUserImpact(painPoint);

    // Estimate work
    const estimatedWork = this.estimateWork(painPoint);

    // Calculate quick win status
    const quickWin = this.isQuickWin(painPoint, estimatedWork, userImpact);

    // Calculate impact and effort scores
    const impactScore = this.calculateImpactScore(painPoint);
    const effortScore = this.calculateEffortScore(estimatedWork, painPoint);

    const recommendation: EnhancedRecommendation = {
      id: `rec-${painPoint.id}`,
      painPointId: painPoint.id,
      title: painPoint.title,
      description: painPoint.description,
      stepByStepGuide,
      licenseRequirements,
      userImpact,
      estimatedWork,
      relatedRecommendations: [],
      relatedStories: [],
      quickWin,
      impactScore,
      effortScore,
    };

    this.recommendations.set(painPoint.id, recommendation);
    return recommendation;
  }

  /**
   * Generate step-by-step guide
   */
  private generateStepByStepGuide(painPoint: PainPoint): EnhancedRecommendation['stepByStepGuide'] {
    const guide: EnhancedRecommendation['stepByStepGuide'] = [];

    // Generic guide structure
    guide.push({
      step: 1,
      title: 'Assess Current State',
      description: `Review the current configuration and identify all affected resources. This pain point affects ${painPoint.affectedResources.length} resource(s).`,
    });

    if (painPoint.remediation.automated) {
      guide.push({
        step: 2,
        title: 'Review Automated Fix',
        description: 'This issue can be fixed automatically. Review the proposed changes before applying.',
        action: painPoint.remediation.action,
      });
      guide.push({
        step: 3,
        title: 'Apply Fix',
        description: 'Click the "Auto-Fix" button to apply the remediation automatically.',
      });
    } else {
      guide.push({
        step: 2,
        title: 'Plan Remediation',
        description: painPoint.recommendation,
      });
      guide.push({
        step: 3,
        title: 'Implement Changes',
        description: 'Follow Microsoft documentation and best practices to implement the recommended changes.',
      });
    }

    guide.push({
      step: guide.length + 1,
      title: 'Verify Resolution',
      description: 'Confirm that the issue has been resolved and monitor for any side effects.',
    });

    // Add category-specific steps
    this.addCategorySpecificSteps(painPoint, guide);

    return guide;
  }

  /**
   * Add category-specific steps
   */
  private addCategorySpecificSteps(
    painPoint: PainPoint,
    guide: EnhancedRecommendation['stepByStepGuide']
  ): void {
    switch (painPoint.category) {
      case 'identity':
        if (painPoint.title.toLowerCase().includes('mfa')) {
          guide.splice(1, 0, {
            step: 2,
            title: 'Configure MFA Policy',
            description: 'Navigate to Azure AD > Security > Authentication methods and configure MFA requirements.',
          });
        }
        break;
      case 'licensing':
        guide.splice(1, 0, {
          step: 2,
          title: 'Review License Assignments',
          description: 'Navigate to Microsoft 365 admin center > Billing > Licenses to review current assignments.',
        });
        break;
      case 'security':
        guide.splice(1, 0, {
          step: 2,
          title: 'Review Security Settings',
          description: 'Navigate to Microsoft 365 Defender portal to review current security configurations.',
        });
        break;
    }

    // Renumber steps
    guide.forEach((step, index) => {
      step.step = index + 1;
    });
  }

  /**
   * Determine license requirements
   */
  private determineLicenseRequirements(painPoint: PainPoint): string[] {
    const requirements: string[] = [];

    // Category-based requirements
    if (painPoint.category === 'identity') {
      if (painPoint.title.toLowerCase().includes('conditional access') || painPoint.title.toLowerCase().includes('identity protection')) {
        requirements.push('Azure AD Premium P1 or P2');
      }
    }

    if (painPoint.category === 'security') {
      if (painPoint.title.toLowerCase().includes('defender') || painPoint.title.toLowerCase().includes('threat')) {
        requirements.push('Microsoft 365 E5 or Microsoft Defender for Office 365');
      }
    }

    // Check for Copilot-related issues by title/description (category doesn't exist yet)
    if (painPoint.title.toLowerCase().includes('copilot') || painPoint.description.toLowerCase().includes('copilot')) {
      requirements.push('Microsoft 365 Copilot license');
    }

    // Default: Basic Microsoft 365 license
    if (requirements.length === 0) {
      requirements.push('Microsoft 365 Business Standard or higher');
    }

    return requirements;
  }

  /**
   * Assess user impact
   */
  private assessUserImpact(painPoint: PainPoint): EnhancedRecommendation['userImpact'] {
    const affectedCount = painPoint.affectedResources.length;

    // Automated fixes typically have no user impact
    if (painPoint.remediation.automated && painPoint.severity !== 'critical') {
      return {
        description: 'No user impact expected. This is an automated fix that runs in the background.',
        affectedUsers: 0,
        downtime: 'None',
        changeType: 'none',
      };
    }

    // Critical issues may have user impact
    if (painPoint.severity === 'critical') {
      return {
        description: `This change may affect ${affectedCount} user(s). Users may experience temporary service interruption.`,
        affectedUsers: affectedCount,
        downtime: 'Minimal - typically less than 5 minutes',
        changeType: 'high',
      };
    }

    // High severity
    if (painPoint.severity === 'high') {
      return {
        description: `This change may affect ${affectedCount} user(s). Users may notice changes in functionality.`,
        affectedUsers: affectedCount,
        downtime: 'None',
        changeType: 'medium',
      };
    }

    // Medium/Low severity
    return {
      description: `This change affects ${affectedCount} resource(s) but should have minimal user impact.`,
      affectedUsers: affectedCount,
      downtime: 'None',
      changeType: 'low',
    };
  }

  /**
   * Estimate work required
   */
  private estimateWork(painPoint: PainPoint): EnhancedRecommendation['estimatedWork'] {
    const baseTime = painPoint.remediation.estimatedTime || 30;
    const complexity = painPoint.remediation.automated ? 'low' : painPoint.severity === 'critical' ? 'high' : 'medium';

    return {
      time: baseTime,
      complexity,
      requiresApproval: painPoint.remediation.requiresApproval || painPoint.severity === 'critical',
    };
  }

  /**
   * Determine if this is a quick win
   */
  private isQuickWin(
    painPoint: PainPoint,
    estimatedWork: EnhancedRecommendation['estimatedWork'],
    userImpact: EnhancedRecommendation['userImpact']
  ): boolean {
    // Quick wins are: automated, low effort, no user impact
    return (
      painPoint.remediation.automated &&
      estimatedWork.complexity === 'low' &&
      userImpact.changeType === 'none' &&
      estimatedWork.time <= 15
    );
  }

  /**
   * Calculate impact score (1-10)
   */
  private calculateImpactScore(painPoint: PainPoint): number {
    let score = 0;

    // Severity contributes to impact
    switch (painPoint.severity) {
      case 'critical':
        score += 5;
        break;
      case 'high':
        score += 4;
        break;
      case 'medium':
        score += 2;
        break;
      case 'low':
        score += 1;
        break;
    }

    // Cost impact
    if (painPoint.impact.cost && painPoint.impact.cost > 100) {
      score += 2;
    } else if (painPoint.impact.cost && painPoint.impact.cost > 0) {
      score += 1;
    }

    // Time impact
    if (painPoint.impact.time && painPoint.impact.time > 10) {
      score += 1;
    }

    // Number of affected resources
    if (painPoint.affectedResources.length > 10) {
      score += 1;
    }

    return Math.min(10, Math.max(1, score));
  }

  /**
   * Calculate effort score (1-10, where 1 = low effort)
   */
  private calculateEffortScore(
    estimatedWork: EnhancedRecommendation['estimatedWork'],
    painPoint: PainPoint
  ): number {
    let score = 1; // Start with low effort

    // Complexity
    switch (estimatedWork.complexity) {
      case 'high':
        score += 5;
        break;
      case 'medium':
        score += 3;
        break;
      case 'low':
        score += 0;
        break;
    }

    // Time required
    if (estimatedWork.time > 120) {
      score += 2;
    } else if (estimatedWork.time > 60) {
      score += 1;
    }

    // Requires approval adds effort
    if (estimatedWork.requiresApproval) {
      score += 1;
    }

    // Manual fixes require more effort
    if (!painPoint.remediation.automated) {
      score += 1;
    }

    return Math.min(10, Math.max(1, score));
  }

  /**
   * Get recommendation by pain point ID
   */
  getRecommendation(painPointId: string): EnhancedRecommendation | null {
    return this.recommendations.get(painPointId) || null;
  }

  /**
   * Get all recommendations
   */
  getAllRecommendations(): EnhancedRecommendation[] {
    return Array.from(this.recommendations.values());
  }

  /**
   * Get quick wins (easy fixes with minimal effort)
   */
  getQuickWins(): EnhancedRecommendation[] {
    return Array.from(this.recommendations.values()).filter((r) => r.quickWin);
  }

  /**
   * Get recommendations by impact/effort matrix
   */
  getRecommendationsByPriority(): {
    highImpactLowEffort: EnhancedRecommendation[];
    highImpactHighEffort: EnhancedRecommendation[];
    lowImpactLowEffort: EnhancedRecommendation[];
    lowImpactHighEffort: EnhancedRecommendation[];
  } {
    const recommendations = Array.from(this.recommendations.values());

    return {
      highImpactLowEffort: recommendations.filter((r) => r.impactScore >= 7 && r.effortScore <= 3),
      highImpactHighEffort: recommendations.filter((r) => r.impactScore >= 7 && r.effortScore > 3),
      lowImpactLowEffort: recommendations.filter((r) => r.impactScore < 7 && r.effortScore <= 3),
      lowImpactHighEffort: recommendations.filter((r) => r.impactScore < 7 && r.effortScore > 3),
    };
  }
}

export const recommendationsService = new RecommendationsService();

