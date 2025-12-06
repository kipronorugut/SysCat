import log from 'electron-log';
import { db } from '../database/db';
import { EnhancedRecommendation } from '../../shared/types/pain-points';

/**
 * Recommendation Registry Service
 * Manages a comprehensive database of 300+ security recommendations
 * Similar to Griffin31's "Recommendations Repository" feature
 * 
 * This service provides:
 * - Pre-defined recommendations database
 * - Versioning and update tracking
 * - Category-based organization
 * - Search and filtering
 * - Relationship mapping
 */

export interface RegistryRecommendation extends EnhancedRecommendation {
  registryId: string; // Unique ID in registry
  version: string;
  category: string;
  tags: string[];
  lastUpdated: Date;
  source: 'microsoft' | 'community' | 'custom';
  applicableTo: string[]; // License types this applies to
  prerequisites?: string[]; // Other recommendations that should be done first
}

export interface RecommendationSearchFilters {
  category?: string;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  quickWin?: boolean;
  licenseType?: string;
  tags?: string[];
  searchText?: string;
}

/**
 * Recommendation Registry Service
 * Scalable foundation for 300+ recommendations
 */
export class RecommendationRegistryService {
  private recommendations: Map<string, RegistryRecommendation> = new Map();

  constructor() {
    this.initializeDatabase();
    this.loadRegistry();
  }

  /**
   * Initialize database tables
   */
  private async initializeDatabase(): Promise<void> {
    try {
      const database = await db();
      database.exec(`
        CREATE TABLE IF NOT EXISTS recommendation_registry (
          registry_id TEXT PRIMARY KEY,
          id TEXT NOT NULL,
          version TEXT NOT NULL,
          category TEXT NOT NULL,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          severity TEXT NOT NULL,
          tags TEXT NOT NULL,
          source TEXT NOT NULL,
          applicable_to TEXT NOT NULL,
          prerequisites TEXT,
          step_by_step_guide TEXT NOT NULL,
          license_requirements TEXT NOT NULL,
          user_impact TEXT NOT NULL,
          estimated_work TEXT NOT NULL,
          related_recommendations TEXT,
          related_stories TEXT,
          quick_win INTEGER DEFAULT 0,
          impact_score INTEGER NOT NULL,
          effort_score INTEGER NOT NULL,
          last_updated TEXT DEFAULT CURRENT_TIMESTAMP,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_registry_category ON recommendation_registry(category);
        CREATE INDEX IF NOT EXISTS idx_registry_severity ON recommendation_registry(severity);
        CREATE INDEX IF NOT EXISTS idx_registry_quick_win ON recommendation_registry(quick_win);
        CREATE INDEX IF NOT EXISTS idx_registry_tags ON recommendation_registry(tags);
      `);
      log.info('[RecommendationRegistry] Database initialized');
    } catch (error: any) {
      log.error('[RecommendationRegistry] Error initializing database', error);
    }
  }

  /**
   * Load registry from database
   */
  private async loadRegistry(): Promise<void> {
    try {
      const database = await db();
      const rows = database.prepare('SELECT * FROM recommendation_registry').all();

      for (const row of rows as any[]) {
        const rec: RegistryRecommendation = {
          registryId: row.registry_id,
          id: row.id,
          version: row.version,
          category: row.category,
          title: row.title,
          description: row.description,
          painPointId: '', // Not applicable for registry items
          stepByStepGuide: JSON.parse(row.step_by_step_guide),
          licenseRequirements: JSON.parse(row.license_requirements),
          userImpact: JSON.parse(row.user_impact),
          estimatedWork: JSON.parse(row.estimated_work),
          relatedRecommendations: row.related_recommendations ? JSON.parse(row.related_recommendations) : [],
          relatedStories: row.related_stories ? JSON.parse(row.related_stories) : [],
          quickWin: row.quick_win === 1,
          impactScore: row.impact_score,
          effortScore: row.effort_score,
          tags: row.tags ? JSON.parse(row.tags) : [],
          lastUpdated: new Date(row.last_updated),
          source: row.source,
          applicableTo: row.applicable_to ? JSON.parse(row.applicable_to) : [],
          prerequisites: row.prerequisites ? JSON.parse(row.prerequisites) : undefined,
        };

        this.recommendations.set(row.registry_id, rec);
      }

      log.info(`[RecommendationRegistry] Loaded ${this.recommendations.size} recommendations from registry`);
    } catch (error: any) {
      log.error('[RecommendationRegistry] Error loading registry', error);
    }
  }

  /**
   * Add recommendation to registry
   */
  async addRecommendation(recommendation: Omit<RegistryRecommendation, 'registryId' | 'lastUpdated'>): Promise<RegistryRecommendation> {
    const registryId = `reg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const newRec: RegistryRecommendation = {
      ...recommendation,
      registryId,
      lastUpdated: now,
    };

    await this.saveRecommendation(newRec);
    this.recommendations.set(registryId, newRec);

    log.info(`[RecommendationRegistry] Added recommendation ${registryId}`);
    return newRec;
  }

  /**
   * Save recommendation to database
   */
  private async saveRecommendation(rec: RegistryRecommendation): Promise<void> {
    try {
      const database = await db();
      database
        .prepare(
          `INSERT OR REPLACE INTO recommendation_registry (
            registry_id, id, version, category, title, description, severity, tags, source,
            applicable_to, prerequisites, step_by_step_guide, license_requirements,
            user_impact, estimated_work, related_recommendations, related_stories,
            quick_win, impact_score, effort_score, last_updated, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          rec.registryId,
          rec.id,
          rec.version,
          rec.category,
          rec.title,
          rec.description,
          rec.impactScore >= 8 ? 'critical' : rec.impactScore >= 6 ? 'high' : rec.impactScore >= 4 ? 'medium' : 'low',
          JSON.stringify(rec.tags),
          rec.source,
          JSON.stringify(rec.applicableTo),
          rec.prerequisites ? JSON.stringify(rec.prerequisites) : null,
          JSON.stringify(rec.stepByStepGuide),
          JSON.stringify(rec.licenseRequirements),
          JSON.stringify(rec.userImpact),
          JSON.stringify(rec.estimatedWork),
          JSON.stringify(rec.relatedRecommendations),
          JSON.stringify(rec.relatedStories),
          rec.quickWin ? 1 : 0,
          rec.impactScore,
          rec.effortScore,
          rec.lastUpdated.toISOString(),
          rec.lastUpdated.toISOString()
        );
    } catch (error: any) {
      log.error('[RecommendationRegistry] Error saving recommendation', error);
      throw error;
    }
  }

  /**
   * Search recommendations
   */
  async searchRecommendations(filters: RecommendationSearchFilters): Promise<RegistryRecommendation[]> {
    let results = Array.from(this.recommendations.values());

    // Apply filters
    if (filters.category) {
      results = results.filter(r => r.category === filters.category);
    }

    if (filters.severity) {
      const severityMap: Record<string, number> = {
        critical: 8,
        high: 6,
        medium: 4,
        low: 2,
      };
      const minScore = severityMap[filters.severity];
      results = results.filter(r => r.impactScore >= minScore);
    }

    if (filters.quickWin !== undefined) {
      results = results.filter(r => r.quickWin === filters.quickWin);
    }

    if (filters.licenseType) {
      results = results.filter(r => 
        r.applicableTo.includes(filters.licenseType!) || 
        r.applicableTo.length === 0
      );
    }

    if (filters.tags && filters.tags.length > 0) {
      results = results.filter(r => 
        filters.tags!.some(tag => r.tags.includes(tag))
      );
    }

    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase();
      results = results.filter(r => 
        r.title.toLowerCase().includes(searchLower) ||
        r.description.toLowerCase().includes(searchLower) ||
        r.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    return results;
  }

  /**
   * Get recommendation by registry ID
   */
  getRecommendation(registryId: string): RegistryRecommendation | null {
    return this.recommendations.get(registryId) || null;
  }

  /**
   * Get all recommendations
   */
  getAllRecommendations(): RegistryRecommendation[] {
    return Array.from(this.recommendations.values());
  }

  /**
   * Get recommendations by category
   */
  getRecommendationsByCategory(category: string): RegistryRecommendation[] {
    return Array.from(this.recommendations.values()).filter(r => r.category === category);
  }

  /**
   * Get quick wins from registry
   */
  getQuickWins(): RegistryRecommendation[] {
    return Array.from(this.recommendations.values()).filter(r => r.quickWin);
  }

  /**
   * Get recommendations count
   */
  getCount(): number {
    return this.recommendations.size;
  }

  /**
   * Initialize with comprehensive recommendations
   * Loads from recommendation-registry-data.ts
   */
  async initializeSampleRecommendations(): Promise<void> {
    if (this.recommendations.size > 0) {
      log.debug('[RecommendationRegistry] Registry already populated, skipping initialization');
      return;
    }

    log.info('[RecommendationRegistry] Initializing recommendations from data file');

    try {
      // Dynamic import to avoid circular dependencies
      const { RECOMMENDATION_DATA } = await import('./recommendation-registry-data');
      
      let loaded = 0;
      for (const rec of RECOMMENDATION_DATA) {
        try {
          await this.addRecommendation(rec);
          loaded++;
        } catch (error: any) {
          log.error(`[RecommendationRegistry] Error loading recommendation ${rec.id}`, error);
        }
      }

      log.info(`[RecommendationRegistry] Initialized ${loaded} recommendations from registry data`);
    } catch (error: any) {
      log.error('[RecommendationRegistry] Error loading recommendation data', error);
      // Fallback to minimal sample if data file not available
      await this.initializeFallbackSamples();
    }
  }

  /**
   * Fallback sample recommendations if data file not available
   */
  private async initializeFallbackSamples(): Promise<void> {
    log.warn('[RecommendationRegistry] Using fallback sample recommendations');
    
    const fallback: Omit<RegistryRecommendation, 'registryId' | 'lastUpdated'>[] = [
      {
        id: 'rec-mfa-enforcement',
        version: '1.0.0',
        category: 'identity',
        title: 'Enforce MFA for All Users',
        description: 'Enable multi-factor authentication for all user accounts to prevent unauthorized access.',
        painPointId: '',
        stepByStepGuide: [
          { step: 1, title: 'Navigate to Azure AD', description: 'Go to Azure AD > Security > Authentication methods' },
          { step: 2, title: 'Enable MFA', description: 'Configure MFA policy to require MFA for all users' },
          { step: 3, title: 'Verify', description: 'Confirm MFA is enabled and test with a test account' },
        ],
        licenseRequirements: ['Microsoft 365 Business Standard or higher'],
        userImpact: {
          description: 'Users will need to register MFA methods on next login',
          affectedUsers: 0,
          downtime: 'None',
          changeType: 'low',
        },
        estimatedWork: {
          time: 15,
          complexity: 'low',
          requiresApproval: false,
        },
        relatedRecommendations: [],
        relatedStories: ['protect-users', 'identity-protection'],
        quickWin: true,
        impactScore: 9,
        effortScore: 2,
        tags: ['mfa', 'authentication', 'security'],
        source: 'microsoft',
        applicableTo: ['m365-business-standard', 'm365-e3', 'm365-e5'],
      },
    ];

    for (const sample of fallback) {
      await this.addRecommendation(sample);
    }

    log.info(`[RecommendationRegistry] Initialized ${fallback.length} fallback recommendations`);
  }
}

export const recommendationRegistryService = new RecommendationRegistryService();

