import log from 'electron-log';
import { PainPoint } from '../../shared/types/pain-points';
import { recommendationRegistryService, RegistryRecommendation } from './recommendation-registry.service';
import { recommendationsService } from './recommendations.service';

/**
 * Recommendation Linker Service
 * Links detected pain points to registry recommendations
 * Provides intelligent matching and suggestions
 */
export interface LinkedRecommendation {
  painPoint: PainPoint;
  registryRecommendation: RegistryRecommendation;
  matchScore: number; // 0-100, higher = better match
  matchReasons: string[];
}

export interface RecommendationMatch {
  registryId: string;
  recommendation: RegistryRecommendation;
  matchScore: number;
  reasons: string[];
}

/**
 * Recommendation Linker Service
 * Intelligently links pain points to registry recommendations
 */
export class RecommendationLinkerService {
  /**
   * Find matching registry recommendations for a pain point
   */
  async findMatchingRecommendations(painPoint: PainPoint): Promise<RecommendationMatch[]> {
    log.debug(`[RecommendationLinker] Finding matches for pain point: ${painPoint.id}`);

    // Search registry by category
    const categoryMatches = await recommendationRegistryService.searchRecommendations({
      category: painPoint.category,
    });

    // Search by text similarity
    const textMatches = await recommendationRegistryService.searchRecommendations({
      searchText: this.extractKeywords(painPoint),
    });

    // Combine and deduplicate
    const allMatches = new Map<string, RegistryRecommendation>();
    for (const match of [...categoryMatches, ...textMatches]) {
      allMatches.set(match.registryId, match);
    }

    // Score each match
    const scoredMatches: RecommendationMatch[] = [];
    for (const rec of allMatches.values()) {
      const score = this.calculateMatchScore(painPoint, rec);
      if (score > 30) { // Only return matches with >30% similarity
        scoredMatches.push({
          registryId: rec.registryId,
          recommendation: rec,
          matchScore: score,
          reasons: this.getMatchReasons(painPoint, rec),
        });
      }
    }

    // Sort by match score descending
    scoredMatches.sort((a, b) => b.matchScore - a.matchScore);

    log.debug(`[RecommendationLinker] Found ${scoredMatches.length} matches for ${painPoint.id}`);
    return scoredMatches;
  }

  /**
   * Link pain point to best matching registry recommendation
   */
  async linkPainPointToRegistry(painPoint: PainPoint): Promise<LinkedRecommendation | null> {
    const matches = await this.findMatchingRecommendations(painPoint);
    
    if (matches.length === 0) {
      return null;
    }

    const bestMatch = matches[0];
    
    return {
      painPoint,
      registryRecommendation: bestMatch.recommendation,
      matchScore: bestMatch.matchScore,
      matchReasons: bestMatch.reasons,
    };
  }

  /**
   * Link multiple pain points to registry recommendations
   */
  async linkPainPoints(painPoints: PainPoint[]): Promise<LinkedRecommendation[]> {
    log.info(`[RecommendationLinker] Linking ${painPoints.length} pain points to registry`);

    const linked: LinkedRecommendation[] = [];

    for (const painPoint of painPoints) {
      try {
        const linkedRec = await this.linkPainPointToRegistry(painPoint);
        if (linkedRec) {
          linked.push(linkedRec);
        }
      } catch (error: any) {
        log.error(`[RecommendationLinker] Error linking pain point ${painPoint.id}`, error);
      }
    }

    log.info(`[RecommendationLinker] Linked ${linked.length} of ${painPoints.length} pain points`);
    return linked;
  }

  /**
   * Calculate match score between pain point and registry recommendation
   */
  private calculateMatchScore(painPoint: PainPoint, recommendation: RegistryRecommendation): number {
    let score = 0;

    // Category match (40 points)
    if (painPoint.category === recommendation.category) {
      score += 40;
    }

    // Title similarity (30 points)
    const titleSimilarity = this.calculateTextSimilarity(
      painPoint.title.toLowerCase(),
      recommendation.title.toLowerCase()
    );
    score += titleSimilarity * 30;

    // Description similarity (20 points)
    const descSimilarity = this.calculateTextSimilarity(
      painPoint.description.toLowerCase(),
      recommendation.description.toLowerCase()
    );
    score += descSimilarity * 20;

    // Tag matching (10 points)
    if (recommendation.tags && Array.isArray(recommendation.tags) && recommendation.tags.length > 0) {
      const painPointKeywords = this.extractKeywords(painPoint);
      const matchingTags = recommendation.tags.filter((tag: string) =>
        painPointKeywords.some((keyword: string) => tag.toLowerCase().includes(keyword.toLowerCase()))
      );
      score += (matchingTags.length / recommendation.tags.length) * 10;
    }

    return Math.min(100, Math.round(score));
  }

  /**
   * Get match reasons
   */
  private getMatchReasons(painPoint: PainPoint, recommendation: RegistryRecommendation): string[] {
    const reasons: string[] = [];

    if (painPoint.category === recommendation.category) {
      reasons.push('Same category');
    }

    const titleWords = painPoint.title.toLowerCase().split(/\s+/);
    const recTitleWords = recommendation.title.toLowerCase().split(/\s+/);
    const commonWords = titleWords.filter(w => recTitleWords.includes(w) && w.length > 3);
    if (commonWords.length > 0) {
      reasons.push(`Similar title (${commonWords.join(', ')})`);
    }

    const matchingTags = recommendation.tags.filter(tag =>
      painPoint.title.toLowerCase().includes(tag.toLowerCase()) ||
      painPoint.description.toLowerCase().includes(tag.toLowerCase())
    );
    if (matchingTags.length > 0) {
      reasons.push(`Matching tags: ${matchingTags.join(', ')}`);
    }

    return reasons;
  }

  /**
   * Extract keywords from pain point
   */
  private extractKeywords(painPoint: PainPoint): string {
    const text = `${painPoint.title} ${painPoint.description}`.toLowerCase();
    // Remove common words and extract meaningful terms
    const words = text.split(/\s+/).filter(w => w.length > 3);
    return words.join(' ');
  }

  /**
   * Calculate text similarity (simple Jaccard similarity)
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.split(/\s+/).filter(w => w.length > 2));
    const words2 = new Set(text2.split(/\s+/).filter(w => w.length > 2));

    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    if (union.size === 0) return 0;
    return intersection.size / union.size;
  }

  /**
   * Get enhanced recommendation for pain point
   * Combines pain point data with registry recommendation
   */
  async getEnhancedRecommendation(painPoint: PainPoint): Promise<any> {
    // First try to get from registry
    const matches = await this.findMatchingRecommendations(painPoint);
    
    if (matches.length > 0 && matches[0].matchScore > 70) {
      // Use registry recommendation if high match
      const registryRec = matches[0].recommendation;
      
      // Merge with pain point specific data
      return {
        ...registryRec,
        painPointId: painPoint.id,
        affectedResources: painPoint.affectedResources,
        detectedAt: painPoint.detectedAt,
        matchScore: matches[0].matchScore,
      };
    }

    // Fallback to generated recommendation
    return recommendationsService.generateRecommendation(painPoint);
  }
}

export const recommendationLinkerService = new RecommendationLinkerService();

