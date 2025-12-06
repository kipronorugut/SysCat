import log from 'electron-log';
import { IdentityDetector } from './detection/identity-detector.service';
import { LicensingDetector } from './detection/licensing-detector.service';
import { ExchangeDetector } from './detection/exchange-detector.service';
import { TeamsDetector } from './detection/teams-detector.service';
import { SharePointDetector } from './detection/sharepoint-detector.service';
import { SecurityDetector } from './detection/security-detector.service';
import { BaseDetector } from './detection/base-detector.service';
import { PainPoint, PainPointCategory, PainPointSummary } from '../../shared/types/pain-points';
import { db } from '../database/db';
import { securityStoriesService } from './security-stories.service';
import { recommendationsService } from './recommendations.service';

/**
 * Central Pain Point Manager
 * Orchestrates all detectors and provides unified interface
 * This is the core service that addresses all 300+ pain points
 */
export class PainPointManager {
  private detectors: Map<PainPointCategory, BaseDetector> = new Map();
  private painPointsCache: PainPoint[] | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_TTL = 30000; // 30 seconds cache

  constructor() {
    // Initialize all detectors
    this.detectors.set('identity', new IdentityDetector());
    this.detectors.set('licensing', new LicensingDetector());
    this.detectors.set('exchange', new ExchangeDetector());
    this.detectors.set('teams', new TeamsDetector());
    this.detectors.set('sharepoint', new SharePointDetector());
    this.detectors.set('security', new SecurityDetector());
    // Add more detectors as they're implemented
  }

  /**
   * Run all detectors and return comprehensive pain point report
   */
  async scanAll(): Promise<PainPoint[]> {
    log.info('[PainPointManager] Starting comprehensive pain point scan');

    // Run all detectors in parallel for performance
    const detectorPromises = Array.from(this.detectors.entries()).map(async ([category, detector]) => {
      try {
        log.debug(`[PainPointManager] Running ${category} detector`);
        const results = await detector.detect();
        log.info(`[PainPointManager] ${category} detector found ${results.length} issues`);
        return { category, results };
      } catch (error: any) {
        log.error(`[PainPointManager] Error running ${category} detector`, error);
        return { category, results: [] };
      }
    });

    const detectorResults = await Promise.all(detectorPromises);

    // Convert DetectionResult to PainPoint format
    const painPoints: PainPoint[] = [];

    for (const { category, results } of detectorResults) {
      for (const result of results) {
        const painPoint: PainPoint = {
          id: result.id,
          category: category as PainPointCategory,
          severity: result.severity,
          title: result.title,
          description: result.description,
          painPointNumber: result.metadata?.painPointNumber || result.metadata?.painPointNumbers?.[0],
          affectedResources: result.affectedResources.map(r => ({
            id: r.id,
            name: r.name,
            type: r.details?.type || 'unknown',
            details: r.details,
          })),
          impact: {
            cost: result.metadata?.estimatedMonthlySavings,
            time: result.remediation?.estimatedTime,
            risk: this.getRiskDescription(result.severity),
          },
          recommendation: result.recommendation,
          remediation: {
            type: result.remediation?.automated ? 'automated' : 'manual',
            automated: result.remediation?.automated || false,
            action: result.remediation?.action,
            estimatedTime: result.remediation?.estimatedTime,
            requiresApproval: result.severity === 'critical',
            rollbackAvailable: result.remediation?.automated || false,
          },
          metadata: result.metadata,
          detectedAt: new Date(),
        };

        painPoints.push(painPoint);
      }
    }

    // Store results in database
    await this.storePainPoints(painPoints);

    // Clear cache so next getAllPainPoints() will fetch fresh data
    this.clearCache();

    // Auto-assign pain points to security stories (fire-and-forget)
    try {
      securityStoriesService.autoAssignPainPointsToStories(painPoints);
    } catch (err: any) {
      log.error('[PainPointManager] Error auto-assigning to stories', err);
    }

    // Generate recommendations for all pain points (fire-and-forget)
    // Use setTimeout to make it non-blocking
    setTimeout(() => {
      try {
        painPoints.forEach(pp => {
          try {
            recommendationsService.generateRecommendation(pp);
          } catch (err: any) {
            log.error(`[PainPointManager] Error generating recommendation for ${pp.id}`, err);
          }
        });
      } catch (err: any) {
        log.error('[PainPointManager] Error generating recommendations', err);
      }
    }, 0);

    log.info('[PainPointManager] Scan complete', {
      totalPainPoints: painPoints.length,
      byCategory: this.groupByCategory(painPoints),
    });

    return painPoints;
  }

  /**
   * Get summary statistics by category
   * Optimized: Uses cached pain points and parallel processing
   */
  async getSummary(): Promise<Map<PainPointCategory, PainPointSummary>> {
    log.info('[PainPointManager] Generating summary statistics');

    // Get all pain points from cache or database (much faster than per-category queries)
    const allPainPoints = await this.getAllPainPoints();
    
    // Group by category in memory (faster than multiple DB queries)
    const painPointsByCategory = new Map<PainPointCategory, PainPoint[]>();
    for (const painPoint of allPainPoints) {
      if (!painPointsByCategory.has(painPoint.category)) {
        painPointsByCategory.set(painPoint.category, []);
      }
      painPointsByCategory.get(painPoint.category)!.push(painPoint);
    }

    const summaries = new Map<PainPointCategory, PainPointSummary>();

    // Run detector summaries in parallel (much faster)
    const summaryPromises = Array.from(this.detectors.entries()).map(async ([category, detector]) => {
      try {
        const detectionSummary = await detector.getSummary();
        const painPoints = painPointsByCategory.get(category) || [];

        const summary: PainPointSummary = {
          category,
          total: detectionSummary.total,
          bySeverity: {
            critical: detectionSummary.critical,
            high: detectionSummary.high,
            medium: detectionSummary.medium,
            low: detectionSummary.low,
            info: 0,
          },
          estimatedImpact: {
            monthlyCost: painPoints.reduce((sum, p) => sum + (p.impact.cost || 0), 0),
            monthlyTimeWasted: painPoints.reduce((sum, p) => sum + (p.impact.time || 0), 0),
          },
          automatedFixes: painPoints.filter(p => p.remediation.automated).length,
          manualFixes: painPoints.filter(p => !p.remediation.automated).length,
        };

        return { category, summary };
      } catch (error: any) {
        log.error(`[PainPointManager] Error getting summary for ${category}`, error);
        return null;
      }
    });

    const results = await Promise.all(summaryPromises);
    for (const result of results) {
      if (result) {
        summaries.set(result.category, result.summary);
      }
    }

    return summaries;
  }

  /**
   * Get pain points by category
   */
  async getPainPointsByCategory(category: PainPointCategory): Promise<PainPoint[]> {
    try {
      const database = await db();
      const rows = database
        .prepare(
          `SELECT * FROM pain_points WHERE category = ? ORDER BY 
           CASE severity 
             WHEN 'critical' THEN 1 
             WHEN 'high' THEN 2 
             WHEN 'medium' THEN 3 
             WHEN 'low' THEN 4 
             ELSE 5 
           END, detected_at DESC`
        )
        .all(category);

      return rows.map((row: any) => ({
        ...JSON.parse(row.data),
        detectedAt: new Date(row.detected_at),
        lastChecked: row.last_checked ? new Date(row.last_checked) : undefined,
      }));
    } catch (error: any) {
      log.error('[PainPointManager] Error getting pain points by category', error);
      return [];
    }
  }

  /**
   * Get all pain points
   * Optimized with caching to avoid repeated database queries
   */
  async getAllPainPoints(forceRefresh: boolean = false): Promise<PainPoint[]> {
    // Return cached data if available and fresh
    const now = Date.now();
    if (!forceRefresh && this.painPointsCache && (now - this.cacheTimestamp) < this.CACHE_TTL) {
      log.debug('[PainPointManager] Returning cached pain points');
      return this.painPointsCache;
    }

    try {
      log.debug('[PainPointManager] Loading pain points from database');
      const database = await db();
      const rows = database
        .prepare(
          `SELECT * FROM pain_points ORDER BY 
           CASE severity 
             WHEN 'critical' THEN 1 
             WHEN 'high' THEN 2 
             WHEN 'medium' THEN 3 
             WHEN 'low' THEN 4 
             ELSE 5 
           END, detected_at DESC`
        )
        .all();

      const painPoints = rows.map((row: any) => {
        try {
          return {
            ...JSON.parse(row.data),
            detectedAt: new Date(row.detected_at),
            lastChecked: row.last_checked ? new Date(row.last_checked) : undefined,
          };
        } catch (parseError) {
          log.error('[PainPointManager] Error parsing pain point data', { id: row.id, error: parseError });
          return null;
        }
      }).filter((p): p is PainPoint => p !== null);

      // Update cache
      this.painPointsCache = painPoints;
      this.cacheTimestamp = now;
      
      log.info(`[PainPointManager] Loaded ${painPoints.length} pain points from database`);
      return painPoints;
    } catch (error: any) {
      log.error('[PainPointManager] Error getting all pain points', error);
      return [];
    }
  }

  /**
   * Clear the pain points cache (call after storing new pain points)
   */
  clearCache(): void {
    this.painPointsCache = null;
    this.cacheTimestamp = 0;
    log.debug('[PainPointManager] Cleared pain points cache');
  }

  /**
   * Store pain points in database
   */
  private async storePainPoints(painPoints: PainPoint[]): Promise<void> {
    try {
      const database = await db();

      // Table should already exist from migrations, but ensure it does
      database.exec(`
        CREATE TABLE IF NOT EXISTS pain_points (
          id TEXT PRIMARY KEY,
          category TEXT NOT NULL,
          severity TEXT NOT NULL,
          data TEXT NOT NULL,
          detected_at TEXT NOT NULL,
          last_checked TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Store each pain point
      const stmt = database.prepare(
        `INSERT OR REPLACE INTO pain_points (id, category, severity, data, detected_at, last_checked)
         VALUES (?, ?, ?, ?, ?, ?)`
      );

      for (const painPoint of painPoints) {
        stmt.run(
          painPoint.id,
          painPoint.category,
          painPoint.severity,
          JSON.stringify(painPoint),
          painPoint.detectedAt.toISOString(),
          new Date().toISOString()
        );
      }

      log.debug(`[PainPointManager] Stored ${painPoints.length} pain points in database`);
    } catch (error: any) {
      log.error('[PainPointManager] Error storing pain points', error);
      // Don't throw - allow scan to complete even if storage fails
    }
  }

  /**
   * Helper: Get risk description from severity
   */
  private getRiskDescription(severity: string): string {
    switch (severity) {
      case 'critical':
        return 'Critical security or compliance risk requiring immediate attention';
      case 'high':
        return 'High risk that could lead to security incidents or significant cost waste';
      case 'medium':
        return 'Moderate risk that should be addressed to prevent issues';
      case 'low':
        return 'Low risk, but addressing could improve efficiency';
      default:
        return 'Informational - no immediate risk';
    }
  }

  /**
   * Helper: Group pain points by category
   */
  private groupByCategory(painPoints: PainPoint[]): Record<string, number> {
    const grouped: Record<string, number> = {};
    for (const painPoint of painPoints) {
      grouped[painPoint.category] = (grouped[painPoint.category] || 0) + 1;
    }
    return grouped;
  }
}

export const painPointManager = new PainPointManager();

