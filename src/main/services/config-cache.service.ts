import log from 'electron-log';
import { db } from '../database/db';
import { TenantSummary, User, License } from './graph-api.service';

/**
 * Configuration Cache Service
 * Caches tenant configuration data in SQLite to avoid repeated Graph API calls
 * Provides elegant refresh and async update for config state sync
 */
export class ConfigCacheService {
  private syncInProgress = false;
  private syncQueue: Array<() => Promise<void>> = [];
  private cacheTTL: Record<string, number> = {
    tenantSummary: 5 * 60 * 1000, // 5 minutes
    users: 10 * 60 * 1000, // 10 minutes
    licenses: 30 * 60 * 1000, // 30 minutes (licenses change less frequently)
  };

  private dbInitialized = false;

  constructor() {
    // Initialize database asynchronously (non-blocking)
    this.initializeDatabase()
      .then(() => {
        // Log cache status on startup
        this.logCacheStatusOnStartup();
      })
      .catch((error) => {
        log.error('[ConfigCacheService] Failed to initialize database', error);
      });
    // Start background sync worker
    this.startBackgroundSync();
  }

  /**
   * Log cache status on app startup to show what's available
   */
  private async logCacheStatusOnStartup(): Promise<void> {
    try {
      await this.ensureInitialized();
      const database = await db();
      const now = new Date().toISOString();
      
      // Count valid (non-expired) cache entries
      const validCache = database
        .prepare('SELECT COUNT(*) as count FROM config_cache WHERE expires_at > ?')
        .get(now) as any;
      
      // Count expired cache entries
      const expiredCache = database
        .prepare('SELECT COUNT(*) as count FROM config_cache WHERE expires_at <= ?')
        .get(now) as any;
      
      // Get cache by type
      const byType = database
        .prepare('SELECT cache_type, COUNT(*) as count FROM config_cache WHERE expires_at > ? GROUP BY cache_type')
        .all(now) as any[];

      log.info('[ConfigCacheService] Cache status on startup', {
        validEntries: validCache?.count || 0,
        expiredEntries: expiredCache?.count || 0,
        byType: byType.reduce((acc, row) => {
          acc[row.cache_type] = row.count;
          return acc;
        }, {} as Record<string, number>),
      });

      if (validCache?.count > 0) {
        log.info('[ConfigCacheService] Cached data will be used on first load - no API calls needed until cache expires');
      }
    } catch (error: any) {
      log.error('[ConfigCacheService] Error logging cache status', error);
    }
  }

  /**
   * Initialize database tables for config cache
   */
  private async initializeDatabase(): Promise<void> {
    if (this.dbInitialized) return;
    try {
      const database = await db();
      database.exec(`
        CREATE TABLE IF NOT EXISTS config_cache (
          cache_key TEXT PRIMARY KEY,
          cache_type TEXT NOT NULL,
          data TEXT NOT NULL,
          expires_at TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          version INTEGER DEFAULT 1
        );

        CREATE INDEX IF NOT EXISTS idx_config_cache_type 
        ON config_cache(cache_type);

        CREATE INDEX IF NOT EXISTS idx_config_cache_expires 
        ON config_cache(expires_at);
      `);
      this.dbInitialized = true;
      log.info('[ConfigCacheService] Database initialized');
    } catch (error: any) {
      log.error('[ConfigCacheService] Error initializing database', error);
      throw error;
    }
  }

  /**
   * Ensure database is initialized before operations
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.dbInitialized) {
      await this.initializeDatabase();
    }
  }

  /**
   * Get cached data or return null if expired/missing
   */
  async get<T>(cacheKey: string, cacheType: string): Promise<T | null> {
    try {
      await this.ensureInitialized();
      const database = await db();
      const now = new Date().toISOString();
      
      const row = database
        .prepare(
          `SELECT data, expires_at FROM config_cache 
           WHERE cache_key = ? AND cache_type = ? AND expires_at > ?`
        )
        .get(cacheKey, cacheType, now) as any;

      if (!row) {
        log.debug(`[ConfigCacheService] Cache miss for ${cacheType}:${cacheKey}`);
        return null;
      }

      const expiresAt = new Date(row.expires_at);
      const nowTimestamp = Date.now();
      const expiresIn = expiresAt.getTime() - nowTimestamp;
      const expiresInMinutes = Math.round(expiresIn / 1000 / 60);
      
      log.info(`[ConfigCacheService] Cache hit for ${cacheType}:${cacheKey} (expires in: ${expiresInMinutes} min) - using cached data, no API call needed`);
      return JSON.parse(row.data) as T;
    } catch (error: any) {
      log.error('[ConfigCacheService] Error getting cache', error);
      return null;
    }
  }

  /**
   * Set cached data with TTL
   */
  async set<T>(cacheKey: string, cacheType: string, data: T, ttl?: number): Promise<void> {
    try {
      await this.ensureInitialized();
      const database = await db();
      const now = new Date();
      const ttlMs = ttl || this.cacheTTL[cacheType] || 5 * 60 * 1000;
      const expiresAt = new Date(now.getTime() + ttlMs);

      database
        .prepare(
          `INSERT OR REPLACE INTO config_cache 
           (cache_key, cache_type, data, expires_at, updated_at) 
           VALUES (?, ?, ?, ?, ?)`
        )
        .run(
          cacheKey,
          cacheType,
          JSON.stringify(data),
          expiresAt.toISOString(),
          now.toISOString()
        );

      log.debug(`[ConfigCacheService] Cached ${cacheType}:${cacheKey} (expires: ${expiresAt.toISOString()})`);
    } catch (error: any) {
      log.error('[ConfigCacheService] Error setting cache', error);
    }
  }

  /**
   * Invalidate cache for a specific key or type
   */
  async invalidate(cacheKey?: string, cacheType?: string): Promise<void> {
    try {
      await this.ensureInitialized();
      const database = await db();
      
      if (cacheKey && cacheType) {
        database.prepare('DELETE FROM config_cache WHERE cache_key = ? AND cache_type = ?')
          .run(cacheKey, cacheType);
        log.debug(`[ConfigCacheService] Invalidated ${cacheType}:${cacheKey}`);
      } else if (cacheType) {
        database.prepare('DELETE FROM config_cache WHERE cache_type = ?')
          .run(cacheType);
        log.debug(`[ConfigCacheService] Invalidated all ${cacheType} cache`);
      } else {
        database.exec('DELETE FROM config_cache');
        log.debug('[ConfigCacheService] Invalidated all cache');
      }
    } catch (error: any) {
      log.error('[ConfigCacheService] Error invalidating cache', error);
    }
  }

  /**
   * Get tenant summary with caching
   */
  async getTenantSummary(fetchFn: () => Promise<TenantSummary>): Promise<TenantSummary> {
    const cacheKey = 'tenant-summary';
    const cacheType = 'tenantSummary';

    // Try cache first
    const cached = await this.get<TenantSummary>(cacheKey, cacheType);
    if (cached) {
      // Trigger background refresh if cache is older than 50% of TTL
      this.scheduleBackgroundRefresh(cacheKey, cacheType, fetchFn);
      return cached;
    }

    // Cache miss - fetch fresh data
    log.info('[ConfigCacheService] Cache miss for tenant summary, fetching fresh data from Graph API');
    const fresh = await fetchFn();
    await this.set(cacheKey, cacheType, fresh);
    log.info('[ConfigCacheService] Tenant summary cached and will persist across app restarts');
    return fresh;
  }

  /**
   * Get users with caching
   */
  async getUsers(
    params: { top?: number; filter?: string } | undefined,
    fetchFn: () => Promise<User[]>
  ): Promise<User[]> {
    const cacheKey = `users-${JSON.stringify(params || {})}`;
    const cacheType = 'users';

    // Try cache first
    const cached = await this.get<User[]>(cacheKey, cacheType);
    if (cached) {
      // Trigger background refresh
      this.scheduleBackgroundRefresh(cacheKey, cacheType, fetchFn);
      return cached;
    }

    // Cache miss - fetch fresh data
    log.info('[ConfigCacheService] Cache miss for users, fetching fresh data from Graph API');
    const fresh = await fetchFn();
    await this.set(cacheKey, cacheType, fresh);
    log.info('[ConfigCacheService] Users cached and will persist across app restarts');
    return fresh;
  }

  /**
   * Get licenses with caching
   */
  async getLicenses(fetchFn: () => Promise<License[]>): Promise<License[]> {
    const cacheKey = 'licenses';
    const cacheType = 'licenses';

    // Try cache first
    const cached = await this.get<License[]>(cacheKey, cacheType);
    if (cached) {
      // Trigger background refresh
      this.scheduleBackgroundRefresh(cacheKey, cacheType, fetchFn);
      return cached;
    }

    // Cache miss - fetch fresh data
    log.info('[ConfigCacheService] Cache miss for licenses, fetching fresh data from Graph API');
    const fresh = await fetchFn();
    await this.set(cacheKey, cacheType, fresh);
    log.info('[ConfigCacheService] Licenses cached and will persist across app restarts');
    return fresh;
  }

  /**
   * Schedule background refresh for cached data
   */
  private scheduleBackgroundRefresh<T>(
    cacheKey: string,
    cacheType: string,
    fetchFn: () => Promise<T>
  ): void {
    // Check if cache is stale (older than 50% of TTL)
    this.checkAndRefreshIfStale(cacheKey, cacheType, fetchFn).catch((error) => {
      log.error('[ConfigCacheService] Error in background refresh', error);
    });
  }

  /**
   * Check if cache is stale and refresh if needed
   */
  private async checkAndRefreshIfStale<T>(
    cacheKey: string,
    cacheType: string,
    fetchFn: () => Promise<T>
  ): Promise<void> {
    try {
      await this.ensureInitialized();
      const database = await db();
      const row = database
        .prepare('SELECT updated_at, expires_at FROM config_cache WHERE cache_key = ? AND cache_type = ?')
        .get(cacheKey, cacheType) as any;

      if (!row) return;

      const updatedAt = new Date(row.updated_at);
      const expiresAt = new Date(row.expires_at);
      const now = new Date();
      const ttl = expiresAt.getTime() - updatedAt.getTime();
      const age = now.getTime() - updatedAt.getTime();

      // Refresh if cache is older than 50% of TTL
      if (age > ttl * 0.5) {
        log.debug(`[ConfigCacheService] Cache stale for ${cacheType}:${cacheKey}, refreshing in background`);
        await this.queueBackgroundSync(cacheKey, cacheType, fetchFn);
      }
    } catch (error: any) {
      log.error('[ConfigCacheService] Error checking cache staleness', error);
    }
  }

  /**
   * Queue a background sync operation
   */
  private async queueBackgroundSync<T>(
    cacheKey: string,
    cacheType: string,
    fetchFn: () => Promise<T>
  ): Promise<void> {
    const syncTask = async () => {
      try {
        log.debug(`[ConfigCacheService] Background sync: ${cacheType}:${cacheKey}`);
        const fresh = await fetchFn();
        await this.set(cacheKey, cacheType, fresh);
        log.debug(`[ConfigCacheService] Background sync complete: ${cacheType}:${cacheKey}`);
      } catch (error: any) {
        log.error(`[ConfigCacheService] Background sync failed: ${cacheType}:${cacheKey}`, error);
        // Don't throw - background sync failures shouldn't break the app
      }
    };

    this.syncQueue.push(syncTask);
    this.processSyncQueue();
  }

  /**
   * Process sync queue (non-blocking)
   */
  private async processSyncQueue(): Promise<void> {
    if (this.syncInProgress || this.syncQueue.length === 0) {
      return;
    }

    this.syncInProgress = true;

    while (this.syncQueue.length > 0) {
      const task = this.syncQueue.shift();
      if (task) {
        try {
          await task();
          // Small delay between syncs to avoid overwhelming the API
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error: any) {
          log.error('[ConfigCacheService] Error processing sync task', error);
        }
      }
    }

    this.syncInProgress = false;
  }

  /**
   * Start background sync worker
   * Periodically cleans expired cache and refreshes stale data
   */
  private startBackgroundSync(): void {
    // Clean expired cache every 5 minutes
    setInterval(async () => {
      try {
        await this.ensureInitialized();
        const database = await db();
        const now = new Date().toISOString();
        database
          .prepare('DELETE FROM config_cache WHERE expires_at < ?')
          .run(now);
        
        log.debug('[ConfigCacheService] Cleaned expired cache entries');
      } catch (error: any) {
        log.error('[ConfigCacheService] Error cleaning expired cache', error);
      }
    }, 5 * 60 * 1000); // Every 5 minutes

    log.info('[ConfigCacheService] Background sync worker started');
  }

  /**
   * Force refresh all cache (useful after major changes)
   */
  async forceRefreshAll(): Promise<void> {
    log.info('[ConfigCacheService] Force refreshing all cache');
    await this.invalidate();
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalEntries: number;
    byType: Record<string, number>;
    expiredEntries: number;
  }> {
    try {
      await this.ensureInitialized();
      const database = await db();
      const now = new Date().toISOString();

      const total = database.prepare('SELECT COUNT(*) as count FROM config_cache').get() as any;
      const expired = database
        .prepare('SELECT COUNT(*) as count FROM config_cache WHERE expires_at < ?')
        .get(now) as any;
      const byType = database
        .prepare('SELECT cache_type, COUNT(*) as count FROM config_cache GROUP BY cache_type')
        .all() as any[];

      const byTypeMap: Record<string, number> = {};
      byType.forEach((row: any) => {
        byTypeMap[row.cache_type] = row.count;
      });

      return {
        totalEntries: total?.count || 0,
        byType: byTypeMap,
        expiredEntries: expired?.count || 0,
      };
    } catch (error: any) {
      log.error('[ConfigCacheService] Error getting cache stats', error);
      return { totalEntries: 0, byType: {}, expiredEntries: 0 };
    }
  }
}

export const configCacheService = new ConfigCacheService();

