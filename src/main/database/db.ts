import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import log from 'electron-log';
import * as path from 'path';
import { settingsService } from '../services/settings.service';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';

let dbInstance: SqlJsDatabase | null = null;
let dbInitialized = false;
let sqlJsModule: any = null;

// Wrapper to make sql.js API compatible with better-sqlite3 style
export class Database {
  private db: SqlJsDatabase;
  private statementCache: Map<string, any> = new Map();

  constructor(db: SqlJsDatabase) {
    this.db = db;
  }

  exec(sql: string): void {
    try {
      this.db.run(sql);
    } catch (err: any) {
      // Ignore "table already exists" errors
      if (!err.message?.includes('already exists')) {
        throw err;
      }
    }
  }

  prepare(sql: string): PreparedStatement {
    // Cache prepared statements for better performance
    let stmt = this.statementCache.get(sql);
    if (!stmt) {
      stmt = this.db.prepare(sql);
      this.statementCache.set(sql, stmt);
      log.debug(`[Database] Cached prepared statement: ${sql.substring(0, 50)}...`);
    }
    return new PreparedStatement(stmt);
  }

  // Clear statement cache (useful for schema changes)
  clearStatementCache(): void {
    this.statementCache.clear();
    log.debug('[Database] Cleared statement cache');
  }

  close(): void {
    this.db.close();
  }

  // Get the underlying sql.js database for direct access if needed
  getRawDb(): SqlJsDatabase {
    return this.db;
  }
}

class PreparedStatement {
  private stmt: any;

  constructor(stmt: any) {
    this.stmt = stmt;
  }

  run(...params: any[]): void {
    this.stmt.bind(params);
    this.stmt.step();
    this.stmt.reset();
  }

  get(...params: any[]): any {
    this.stmt.bind(params);
    const result = this.stmt.getAsObject();
    this.stmt.reset();
    return result;
  }

  all(...params: any[]): any[] {
    this.stmt.bind(params);
    const results: any[] = [];
    while (this.stmt.step()) {
      results.push(this.stmt.getAsObject());
    }
    this.stmt.reset();
    return results;
  }
}

export async function getDb(): Promise<Database> {
  if (dbInstance && dbInitialized) {
    return new Database(dbInstance);
  }

  // Initialize sql.js if not already done
  if (!sqlJsModule) {
    log.info('[Database] Initializing sql.js');
    try {
      sqlJsModule = await initSqlJs({
        locateFile: (file: string) => {
          // In Electron, we need to load sql-wasm.wasm from node_modules
          // Try multiple possible paths
          const possiblePaths = [
            path.join(__dirname, '../../node_modules/sql.js/dist/sql-wasm.wasm'),
            path.join(process.cwd(), 'node_modules/sql.js/dist/sql-wasm.wasm'),
            `https://sql.js.org/dist/${file}`, // Fallback to CDN
          ];

          for (const wasmPath of possiblePaths) {
            if (existsSync(wasmPath)) {
              return wasmPath;
            }
          }

          // If not found locally, return the CDN URL
          return possiblePaths[2];
        },
      });
      log.info('[Database] sql.js initialized successfully');
    } catch (err) {
      log.error('[Database] Failed to initialize sql.js', err);
      throw err;
    }
  }

  // Get storage path from settings
  const storagePath = settingsService.getStoragePath();

  // Ensure directory exists
  try {
    mkdirSync(storagePath, { recursive: true });
  } catch (err) {
    log.error('[Database] Failed to create storage directory', err);
  }

  const dbPath = path.join(storagePath, 'syscat.db');
  log.info('[Database] Opening database', { path: dbPath });

  // Load existing database or create new one
  if (existsSync(dbPath)) {
    try {
      const buffer = readFileSync(dbPath);
      dbInstance = new sqlJsModule.Database(buffer);
      const fileSize = (buffer.length / 1024).toFixed(2);
      log.info(`[Database] Loaded existing database from disk (${fileSize} KB) - cached config will be available`);
    } catch (err) {
      log.warn('[Database] Failed to load existing database, creating new one', err);
      dbInstance = new sqlJsModule.Database();
    }
  } else {
    dbInstance = new sqlJsModule.Database();
    log.info('[Database] Created new database - will persist cache on first use');
  }

  if (!dbInstance) {
    throw new Error('Failed to initialize database');
  }

  // Run migrations
  const db = new Database(dbInstance);
  runMigrations(db);

  // Optimized auto-save with debouncing (only save if there were changes)
  if (!dbInitialized) {
    let lastSaveTime = Date.now();
    let pendingSave: NodeJS.Timeout | null = null;
    let hasChanges = false;

    // Debounced save function - waits for 5 seconds of inactivity before saving
    const debouncedSave = () => {
      if (pendingSave) {
        clearTimeout(pendingSave);
      }
      
      pendingSave = setTimeout(() => {
        if (dbInstance && hasChanges) {
          try {
            const data = dbInstance.export();
            writeFileSync(dbPath, Buffer.from(data));
            const saveTime = Date.now();
            const timeSinceLastSave = saveTime - lastSaveTime;
            log.debug(`[Database] Auto-saved database (${timeSinceLastSave}ms since last save)`);
            lastSaveTime = saveTime;
            hasChanges = false;
          } catch (err) {
            log.error('[Database] Failed to save database', err);
          }
        }
        pendingSave = null;
      }, 5000); // Wait 5 seconds of inactivity
    };

    // Mark changes when database operations occur
    // Note: sql.js doesn't have change events, so we'll use a periodic check
    // but only save if enough time has passed
    setInterval(() => {
      if (dbInstance) {
        hasChanges = true;
        debouncedSave();
      }
    }, 30000); // Check every 30 seconds, but save is debounced

    // Force save on process exit
    process.on('beforeExit', () => {
      if (pendingSave) {
        clearTimeout(pendingSave);
      }
      if (dbInstance && hasChanges) {
        try {
          const data = dbInstance.export();
          writeFileSync(dbPath, Buffer.from(data));
          log.debug('[Database] Final save on exit');
        } catch (err) {
          log.error('[Database] Failed to save database on exit', err);
        }
      }
    });
  }

  dbInitialized = true;
  log.info('[Database] Database initialized');
  return db;
}

function runMigrations(db: Database): void {
  log.info('[Database] Running migrations');

  // Create activity log table
  db.exec(`
    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      module TEXT NOT NULL,
      user_id TEXT,
      details TEXT,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);

  // Create index for faster queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_activity_log_created_at 
    ON activity_log(created_at DESC)
  `);

  // Create index for user lookups
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_activity_log_user_id 
    ON activity_log(user_id)
  `);

  // Create tenant snapshot table (for historical data)
  db.exec(`
    CREATE TABLE IF NOT EXISTS tenant_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      snapshot_date TEXT NOT NULL,
      user_count INTEGER,
      licensed_user_count INTEGER,
      guest_user_count INTEGER,
      inactive_user_count INTEGER,
      mfa_adoption_rate REAL,
      unused_licenses INTEGER,
      estimated_monthly_savings REAL,
      data TEXT,
      created_at TEXT NOT NULL
    )
  `);

  // Create index for snapshot queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tenant_snapshots_date 
    ON tenant_snapshots(snapshot_date DESC)
  `);

  // Create automation rules table
  db.exec(`
    CREATE TABLE IF NOT EXISTS automation_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      module TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      config TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // Create pain points table
  db.exec(`
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

  // Create index for pain point queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_pain_points_category 
    ON pain_points(category)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_pain_points_severity 
    ON pain_points(severity)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_pain_points_detected_at 
    ON pain_points(detected_at DESC)
  `);

  log.info('[Database] Migrations complete');
}

// Lazy initialization - returns a promise
export async function db(): Promise<Database> {
  return getDb();
}
