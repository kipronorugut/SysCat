import log from 'electron-log';
import { db } from '../database/db';

/**
 * Update Service
 * Manages weekly updates to recommendations, stories, and emerging threats
 * Similar to Griffin31's "Up to Date" feature
 */
export interface Update {
  id: string;
  version: string;
  type: 'recommendations' | 'stories' | 'threats' | 'all';
  changes: UpdateChange[];
  applied: boolean;
  appliedAt?: Date;
  createdAt: Date;
}

export interface UpdateChange {
  type: 'added' | 'updated' | 'deprecated' | 'removed';
  category: string;
  itemId: string;
  itemName: string;
  description: string;
  metadata?: Record<string, any>;
}

export interface UpdateCheckResult {
  hasUpdates: boolean;
  latestVersion: string;
  currentVersion: string;
  updates: Update[];
  lastChecked: Date;
}

/**
 * Update Service
 * Handles weekly updates to recommendations, security stories, and emerging threats
 */
export class UpdateService {
  private currentVersion = '1.0.0';
  private lastCheckDate: Date | null = null;
  private readonly UPDATE_CHECK_INTERVAL = 7 * 24 * 60 * 60 * 1000; // 7 days

  constructor() {
    this.initializeDatabase();
    this.loadLastCheck();
  }

  /**
   * Initialize database tables
   */
  private async initializeDatabase(): Promise<void> {
    try {
      const database = await db();
      database.exec(`
        CREATE TABLE IF NOT EXISTS updates (
          id TEXT PRIMARY KEY,
          version TEXT NOT NULL,
          type TEXT NOT NULL,
          changes TEXT NOT NULL,
          applied INTEGER DEFAULT 0,
          applied_at TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS update_history (
          id TEXT PRIMARY KEY,
          version TEXT NOT NULL,
          checked_at TEXT DEFAULT CURRENT_TIMESTAMP,
          has_updates INTEGER DEFAULT 0
        );

        CREATE INDEX IF NOT EXISTS idx_updates_version ON updates(version);
        CREATE INDEX IF NOT EXISTS idx_updates_applied ON updates(applied);
      `);
      log.info('[UpdateService] Database initialized');
    } catch (error: any) {
      log.error('[UpdateService] Error initializing database', error);
    }
  }

  /**
   * Load last check date
   */
  private loadLastCheck(): void {
    try {
      const database = await db();
      const row = database
        .prepare('SELECT * FROM update_history ORDER BY checked_at DESC LIMIT 1')
        .get() as any;

      if (row) {
        this.lastCheckDate = new Date(row.checked_at);
      }
    } catch (error: any) {
      log.error('[UpdateService] Error loading last check', error);
    }
  }

  /**
   * Check for updates
   * In a real implementation, this would connect to an update server
   * For now, we'll simulate weekly updates
   */
  async checkForUpdates(): Promise<UpdateCheckResult> {
    log.info('[UpdateService] Checking for updates');

    const now = new Date();
    const shouldCheck = !this.lastCheckDate || 
      (now.getTime() - this.lastCheckDate.getTime()) >= this.UPDATE_CHECK_INTERVAL;

    if (!shouldCheck) {
      log.debug('[UpdateService] Update check not due yet');
      return {
        hasUpdates: false,
        latestVersion: this.currentVersion,
        currentVersion: this.currentVersion,
        updates: [],
        lastChecked: this.lastCheckDate || now,
      };
    }

    // Record check
    try {
      const database = await db();
      const checkId = `check-${Date.now()}`;
      database
        .prepare('INSERT INTO update_history (id, version, checked_at, has_updates) VALUES (?, ?, ?, ?)')
        .run(checkId, this.currentVersion, now.toISOString(), 0);
      
      this.lastCheckDate = now;
    } catch (error: any) {
      log.error('[UpdateService] Error recording check', error);
    }

    // TODO: In production, this would:
    // 1. Connect to update server/API
    // 2. Compare versions
    // 3. Download update manifest
    // 4. Return available updates

    // For now, simulate weekly updates
    const updates = await this.simulateWeeklyUpdates();

    return {
      hasUpdates: updates.length > 0,
      latestVersion: updates.length > 0 ? updates[0].version : this.currentVersion,
      currentVersion: this.currentVersion,
      updates,
      lastChecked: now,
    };
  }

  /**
   * Simulate weekly updates (for development)
   * In production, this would fetch from an update server
   */
  private async simulateWeeklyUpdates(): Promise<Update[]> {
    // Check if we have unapplied updates
    const unapplied = await this.getUnappliedUpdates();
    if (unapplied.length > 0) {
      return unapplied;
    }

    // Simulate new update every week
    const weekNumber = Math.floor((Date.now() - new Date('2025-01-01').getTime()) / (7 * 24 * 60 * 60 * 1000));
    const newVersion = `1.0.${weekNumber}`;

    if (newVersion === this.currentVersion) {
      return [];
    }

    const update: Update = {
      id: `update-${Date.now()}`,
      version: newVersion,
      type: 'all',
      changes: [
        {
          type: 'added',
          category: 'recommendations',
          itemId: `rec-${Date.now()}`,
          itemName: 'New Security Recommendation',
          description: 'Added new security recommendation based on latest Microsoft guidance',
        },
        {
          type: 'updated',
          category: 'stories',
          itemId: 'emerging-threats',
          itemName: 'Emerging Threats Story',
          description: 'Updated emerging threats story with latest threat intelligence',
        },
      ],
      applied: false,
      createdAt: new Date(),
    };

    await this.saveUpdate(update);
    return [update];
  }

  /**
   * Save update to database
   */
  private async saveUpdate(update: Update): Promise<void> {
    try {
      const database = await db();
      database
        .prepare(
          'INSERT INTO updates (id, version, type, changes, applied, applied_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        )
        .run(
          update.id,
          update.version,
          update.type,
          JSON.stringify(update.changes),
          update.applied ? 1 : 0,
          update.appliedAt ? update.appliedAt.toISOString() : null,
          update.createdAt.toISOString()
        );

      log.info(`[UpdateService] Saved update ${update.id}`);
    } catch (error: any) {
      log.error('[UpdateService] Error saving update', error);
      throw error;
    }
  }

  /**
   * Get unapplied updates
   */
  async getUnappliedUpdates(): Promise<Update[]> {
    try {
      const database = await db();
      const rows = database
        .prepare('SELECT * FROM updates WHERE applied = 0 ORDER BY created_at DESC')
        .all();

      return rows.map((row: any) => ({
        id: row.id,
        version: row.version,
        type: row.type,
        changes: JSON.parse(row.changes),
        applied: row.applied === 1,
        appliedAt: row.applied_at ? new Date(row.applied_at) : undefined,
        createdAt: new Date(row.created_at),
      }));
    } catch (error: any) {
      log.error('[UpdateService] Error getting unapplied updates', error);
      return [];
    }
  }

  /**
   * Apply update
   */
  async applyUpdate(updateId: string): Promise<void> {
    try {
      const database = await db();
      const update = await this.getUpdateById(updateId);

      if (!update) {
        throw new Error(`Update ${updateId} not found`);
      }

      if (update.applied) {
        log.warn(`[UpdateService] Update ${updateId} already applied`);
        return;
      }

      // Apply changes
      for (const change of update.changes) {
        await this.applyChange(change);
      }

      // Mark as applied
      database
        .prepare('UPDATE updates SET applied = 1, applied_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(updateId);

      // Update current version
      this.currentVersion = update.version;

      log.info(`[UpdateService] Applied update ${updateId}`);
    } catch (error: any) {
      log.error('[UpdateService] Error applying update', error);
      throw error;
    }
  }

  /**
   * Apply a single change
   */
  private async applyChange(change: UpdateChange): Promise<void> {
    log.debug('[UpdateService] Applying change', change);

    // TODO: Implement actual change application
    // This would:
    // 1. Add/update/remove recommendations
    // 2. Update security stories
    // 3. Update threat intelligence
    // 4. Refresh recommendation registry

    switch (change.type) {
      case 'added':
        log.info(`[UpdateService] Added ${change.category}: ${change.itemName}`);
        break;
      case 'updated':
        log.info(`[UpdateService] Updated ${change.category}: ${change.itemName}`);
        break;
      case 'deprecated':
        log.info(`[UpdateService] Deprecated ${change.category}: ${change.itemName}`);
        break;
      case 'removed':
        log.info(`[UpdateService] Removed ${change.category}: ${change.itemName}`);
        break;
    }
  }

  /**
   * Get update by ID
   */
  private async getUpdateById(id: string): Promise<Update | null> {
    try {
      const database = await db();
      const row = database.prepare('SELECT * FROM updates WHERE id = ?').get(id) as any;

      if (!row) return null;

      return {
        id: row.id,
        version: row.version,
        type: row.type,
        changes: JSON.parse(row.changes),
        applied: row.applied === 1,
        appliedAt: row.applied_at ? new Date(row.applied_at) : undefined,
        createdAt: new Date(row.created_at),
      };
    } catch (error: any) {
      log.error('[UpdateService] Error getting update', error);
      return null;
    }
  }

  /**
   * Get current version
   */
  getCurrentVersion(): string {
    return this.currentVersion;
  }

  /**
   * Get update history
   */
  async getUpdateHistory(limit = 10): Promise<Update[]> {
    try {
      const database = await db();
      const rows = database
        .prepare('SELECT * FROM updates ORDER BY created_at DESC LIMIT ?')
        .all(limit);

      return rows.map((row: any) => ({
        id: row.id,
        version: row.version,
        type: row.type,
        changes: JSON.parse(row.changes),
        applied: row.applied === 1,
        appliedAt: row.applied_at ? new Date(row.applied_at) : undefined,
        createdAt: new Date(row.created_at),
      }));
    } catch (error: any) {
      log.error('[UpdateService] Error getting update history', error);
      return [];
    }
  }
}

export const updateService = new UpdateService();

