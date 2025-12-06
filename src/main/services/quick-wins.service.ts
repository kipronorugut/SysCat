import log from 'electron-log';
import { PainPoint, EnhancedRecommendation } from '../../shared/types/pain-points';
import { recommendationsService } from './recommendations.service';
import { aiAnalyticsService } from './ai-analytics.service';

/**
 * Quick Wins Service
 * Enhanced prioritization system for quick wins
 * Similar to Griffin31's "Quick Wins" feature - prioritize easy fixes with minimal effort and no user impact
 */
export interface QuickWinMetrics {
  totalQuickWins: number;
  estimatedTimeSavings: number; // Minutes
  estimatedCostSavings: number; // Dollars
  averageImpactScore: number;
  averageEffortScore: number;
  byCategory: Record<string, number>;
}

export interface QuickWinPriority {
  recommendation: EnhancedRecommendation;
  priority: number; // 1-100, higher = more priority
  reasons: string[];
  estimatedValue: {
    time: number;
    cost: number;
    security: number;
  };
}

/**
 * Quick Wins Service
 * Provides intelligent prioritization of quick wins
 */
export class QuickWinsService {
  /**
   * Get prioritized quick wins
   * Uses AI analytics if available, otherwise uses enhanced algorithm
   */
  async getPrioritizedQuickWins(painPoints: PainPoint[]): Promise<QuickWinPriority[]> {
    log.info('[QuickWinsService] Getting prioritized quick wins', { count: painPoints.length });

    // Generate recommendations for all pain points
    const recommendations = painPoints.map(pp => recommendationsService.generateRecommendation(pp));
    
    // Filter to quick wins only
    const quickWins = recommendations.filter(r => r.quickWin);

    if (quickWins.length === 0) {
      return [];
    }

    // Try AI prioritization first
    try {
      const aiPrioritized = await aiAnalyticsService.prioritizeRecommendations(quickWins);
      return this.calculateQuickWinPriorities(aiPrioritized);
    } catch (error: any) {
      log.debug('[QuickWinsService] AI prioritization unavailable, using algorithm', error);
      return this.calculateQuickWinPriorities(quickWins);
    }
  }

  /**
   * Calculate quick win priorities with enhanced algorithm
   */
  private calculateQuickWinPriorities(recommendations: EnhancedRecommendation[]): QuickWinPriority[] {
    return recommendations.map(rec => {
      const priority = this.calculatePriority(rec);
      const reasons = this.getPriorityReasons(rec);
      const estimatedValue = this.calculateEstimatedValue(rec);

      return {
        recommendation: rec,
        priority,
        reasons,
        estimatedValue,
      };
    }).sort((a, b) => b.priority - a.priority); // Sort by priority descending
  }

  /**
   * Calculate priority score (1-100)
   * Higher score = higher priority
   */
  private calculatePriority(rec: EnhancedRecommendation): number {
    let score = 50; // Base score

    // Impact/Effort ratio (higher is better)
    const impactEffortRatio = rec.impactScore / rec.effortScore;
    score += impactEffortRatio * 10; // Up to +30 points

    // Quick win bonus
    if (rec.quickWin) {
      score += 15;
    }

    // High impact bonus
    if (rec.impactScore >= 7) {
      score += 10;
    }

    // Low effort bonus
    if (rec.effortScore <= 2) {
      score += 10;
    }

    // Time savings (faster fixes get priority)
    if (rec.estimatedWork.time <= 5) {
      score += 5;
    }

    // No user impact bonus
    if (rec.userImpact.changeType === 'none') {
      score += 5;
    }

    // Cost impact bonus
    // This would need to be calculated from the pain point
    // For now, we'll use impact score as proxy

    return Math.min(100, Math.max(1, Math.round(score)));
  }

  /**
   * Get priority reasons
   */
  private getPriorityReasons(rec: EnhancedRecommendation): string[] {
    const reasons: string[] = [];

    if (rec.quickWin) {
      reasons.push('Quick win - automated fix with no user impact');
    }

    if (rec.impactScore >= 7 && rec.effortScore <= 3) {
      reasons.push('High impact, low effort');
    }

    if (rec.estimatedWork.time <= 5) {
      reasons.push('Very fast to implement');
    }

    if (rec.userImpact.changeType === 'none') {
      reasons.push('No user impact');
    }

    if (rec.impactScore >= 8) {
      reasons.push('High security impact');
    }

    if (rec.effortScore <= 2) {
      reasons.push('Minimal effort required');
    }

    return reasons;
  }

  /**
   * Calculate estimated value
   */
  private calculateEstimatedValue(rec: EnhancedRecommendation): {
    time: number;
    cost: number;
    security: number;
  } {
    // Time value = time saved by fixing this
    const timeValue = rec.estimatedWork.time;

    // Cost value = estimated monthly cost impact (would come from pain point)
    // For now, estimate based on impact score
    const costValue = rec.impactScore * 10; // Rough estimate

    // Security value = impact score normalized to 0-100
    const securityValue = rec.impactScore * 10;

    return {
      time: timeValue,
      cost: costValue,
      security: securityValue,
    };
  }

  /**
   * Get quick win metrics
   */
  async getQuickWinMetrics(painPoints: PainPoint[]): Promise<QuickWinMetrics> {
    const recommendations = painPoints.map(pp => recommendationsService.generateRecommendation(pp));
    const quickWins = recommendations.filter(r => r.quickWin);

    const totalTime = quickWins.reduce((sum, r) => sum + r.estimatedWork.time, 0);
    const totalCost = quickWins.reduce((sum, r) => {
      // Would need pain point cost data
      return sum + (r.impactScore * 10);
    }, 0);

    const avgImpact = quickWins.length > 0
      ? quickWins.reduce((sum, r) => sum + r.impactScore, 0) / quickWins.length
      : 0;

    const avgEffort = quickWins.length > 0
      ? quickWins.reduce((sum, r) => sum + r.effortScore, 0) / quickWins.length
      : 0;

    // Group by category (would need to map from pain points)
    const byCategory: Record<string, number> = {};
    for (const rec of quickWins) {
      const painPoint = painPoints.find(pp => pp.id === rec.painPointId);
      if (painPoint) {
        byCategory[painPoint.category] = (byCategory[painPoint.category] || 0) + 1;
      }
    }

    return {
      totalQuickWins: quickWins.length,
      estimatedTimeSavings: totalTime,
      estimatedCostSavings: totalCost,
      averageImpactScore: avgImpact,
      averageEffortScore: avgEffort,
      byCategory,
    };
  }

  /**
   * Get quick wins by category
   */
  getQuickWinsByCategory(
    quickWins: QuickWinPriority[],
    category: string
  ): QuickWinPriority[] {
    return quickWins.filter(qw => {
      const painPoint = qw.recommendation.painPointId;
      // Would need to check pain point category
      // For now, return all if category matches
      return true; // Simplified
    });
  }

  /**
   * Get top N quick wins
   */
  getTopQuickWins(quickWins: QuickWinPriority[], limit: number = 10): QuickWinPriority[] {
    return quickWins.slice(0, limit);
  }

  /**
   * Batch apply quick wins
   */
  async batchApplyQuickWins(quickWins: QuickWinPriority[]): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    log.info('[QuickWinsService] Batch applying quick wins', { count: quickWins.length });

    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const quickWin of quickWins) {
      try {
        // TODO: Implement actual remediation
        // Would call remediation service
        log.debug(`[QuickWinsService] Applying quick win: ${quickWin.recommendation.title}`);
        success++;
      } catch (error: any) {
        failed++;
        errors.push(`${quickWin.recommendation.title}: ${error.message}`);
        log.error('[QuickWinsService] Error applying quick win', error);
      }
    }

    return { success, failed, errors };
  }
}

export const quickWinsService = new QuickWinsService();

