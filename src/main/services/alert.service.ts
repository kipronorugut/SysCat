import log from 'electron-log';
import { app, Notification } from 'electron';
import { DetectionResult } from './detection/base-detector.service';
import { db } from '../database/db';

/**
 * Alert Service
 * Provides real-time alerts for critical misconfigurations and changes
 * Similar to Griffin31's "Real-Time Alerts" feature
 */
export interface Alert {
  id: string;
  type: 'critical' | 'high' | 'medium' | 'low';
  category: 'security' | 'configuration' | 'compliance' | 'cost';
  title: string;
  message: string;
  detectionId?: string;
  painPointId?: string;
  resourceId?: string;
  resourceName?: string;
  actionUrl?: string;
  acknowledged: boolean;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  createdAt: Date;
  metadata?: Record<string, any>;
}

export interface AlertConfig {
  enabled: boolean;
  critical: boolean;
  high: boolean;
  medium: boolean;
  low: boolean;
  desktopNotifications: boolean;
  systemTrayNotifications: boolean;
  soundEnabled: boolean;
}

export class AlertService {
  private config: AlertConfig = {
    enabled: true,
    critical: true,
    high: true,
    medium: false,
    low: false,
    desktopNotifications: true,
    systemTrayNotifications: true,
    soundEnabled: false,
  };

  constructor() {
    this.initializeDatabase();
    this.loadConfig();
  }

  /**
   * Initialize database tables
   */
  private async initializeDatabase(): Promise<void> {
    try {
      const database = await db();
      database.exec(`
        CREATE TABLE IF NOT EXISTS alerts (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          category TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          detection_id TEXT,
          pain_point_id TEXT,
          resource_id TEXT,
          resource_name TEXT,
          action_url TEXT,
          acknowledged INTEGER DEFAULT 0,
          acknowledged_at TEXT,
          acknowledged_by TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          metadata TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type);
        CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged ON alerts(acknowledged);
        CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at);
      `);
      log.info('[AlertService] Database initialized');
    } catch (error: any) {
      log.error('[AlertService] Error initializing database', error);
    }
  }

  /**
   * Load configuration from settings
   */
  private loadConfig(): void {
    // TODO: Load from settings service
    log.debug('[AlertService] Using default alert configuration');
  }

  /**
   * Create alert from detection result
   */
  async createAlertFromDetection(detection: DetectionResult): Promise<Alert> {
    log.info('[AlertService] Creating alert from detection', { type: detection.type, severity: detection.severity });

    // Only create alerts for critical and high severity (configurable)
    if (!this.shouldAlert(detection.severity)) {
      log.debug('[AlertService] Alert suppressed by configuration', { severity: detection.severity });
      return null as any; // Type workaround
    }

    const alert: Alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: detection.severity,
      category: this.mapCategory(detection.type),
      title: detection.title,
      message: detection.description,
      detectionId: detection.id,
      resourceId: detection.affectedResources[0]?.id,
      resourceName: detection.affectedResources[0]?.name,
      acknowledged: false,
      createdAt: new Date(),
      metadata: detection.metadata,
    };

    await this.saveAlert(alert);
    await this.sendNotification(alert);

    return alert;
  }

  /**
   * Create alert manually
   */
  async createAlert(alert: Omit<Alert, 'id' | 'createdAt' | 'acknowledged'>): Promise<Alert> {
    const newAlert: Alert = {
      ...alert,
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      acknowledged: false,
    };

    await this.saveAlert(newAlert);
    await this.sendNotification(newAlert);

    return newAlert;
  }

  /**
   * Save alert to database
   */
  private async saveAlert(alert: Alert): Promise<void> {
    try {
      const database = await db();
      database
        .prepare(
          `INSERT INTO alerts (id, type, category, title, message, detection_id, pain_point_id, 
           resource_id, resource_name, action_url, acknowledged, acknowledged_at, acknowledged_by, 
           created_at, metadata)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          alert.id,
          alert.type,
          alert.category,
          alert.title,
          alert.message,
          alert.detectionId || null,
          alert.painPointId || null,
          alert.resourceId || null,
          alert.resourceName || null,
          alert.actionUrl || null,
          alert.acknowledged ? 1 : 0,
          alert.acknowledgedAt ? alert.acknowledgedAt.toISOString() : null,
          alert.acknowledgedBy || null,
          alert.createdAt.toISOString(),
          alert.metadata ? JSON.stringify(alert.metadata) : null
        );

      log.info(`[AlertService] Saved alert ${alert.id}`);
    } catch (error: any) {
      log.error('[AlertService] Error saving alert', error);
      throw error;
    }
  }

  /**
   * Send desktop notification
   */
  private async sendNotification(alert: Alert): Promise<void> {
    if (!this.config.enabled || !this.config.desktopNotifications) {
      return;
    }

    if (!this.shouldAlert(alert.type)) {
      return;
    }

    try {
      // Only show notifications if app is ready
      if (!app.isReady()) {
        log.debug('[AlertService] App not ready, skipping notification');
        return;
      }

      const notification = new Notification({
        title: `SysCat: ${alert.title}`,
        body: alert.message,
        urgency: alert.type === 'critical' ? 'critical' : 'normal',
        silent: !this.config.soundEnabled,
      });

      notification.show();
      log.info(`[AlertService] Sent desktop notification for alert ${alert.id}`);
    } catch (error: any) {
      log.error('[AlertService] Error sending notification', error);
    }
  }

  /**
   * Get all alerts
   */
  async getAllAlerts(includeAcknowledged = false): Promise<Alert[]> {
    try {
      const database = await db();
      const query = includeAcknowledged
        ? 'SELECT * FROM alerts ORDER BY created_at DESC'
        : 'SELECT * FROM alerts WHERE acknowledged = 0 ORDER BY created_at DESC';
      
      const rows = database.prepare(query).all();

      return rows.map((row: any) => ({
        id: row.id,
        type: row.type,
        category: row.category,
        title: row.title,
        message: row.message,
        detectionId: row.detection_id,
        painPointId: row.pain_point_id,
        resourceId: row.resource_id,
        resourceName: row.resource_name,
        actionUrl: row.action_url,
        acknowledged: row.acknowledged === 1,
        acknowledgedAt: row.acknowledged_at ? new Date(row.acknowledged_at) : undefined,
        acknowledgedBy: row.acknowledged_by,
        createdAt: new Date(row.created_at),
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      }));
    } catch (error: any) {
      log.error('[AlertService] Error getting alerts', error);
      return [];
    }
  }

  /**
   * Get unacknowledged alerts
   */
  async getUnacknowledgedAlerts(): Promise<Alert[]> {
    return this.getAllAlerts(false);
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(id: string, acknowledgedBy: string): Promise<void> {
    try {
      const database = await db();
      database
        .prepare(
          'UPDATE alerts SET acknowledged = 1, acknowledged_at = CURRENT_TIMESTAMP, acknowledged_by = ? WHERE id = ?'
        )
        .run(acknowledgedBy, id);

      log.info(`[AlertService] Acknowledged alert ${id}`);
    } catch (error: any) {
      log.error('[AlertService] Error acknowledging alert', error);
      throw error;
    }
  }

  /**
   * Get alert statistics
   */
  async getAlertStats(): Promise<{
    total: number;
    unacknowledged: number;
    byType: Record<string, number>;
    byCategory: Record<string, number>;
  }> {
    try {
      const database = await db();
      const allAlerts = await this.getAllAlerts(true);
      const unacknowledged = await this.getUnacknowledgedAlerts();

      const byType: Record<string, number> = {};
      const byCategory: Record<string, number> = {};

      for (const alert of allAlerts) {
        byType[alert.type] = (byType[alert.type] || 0) + 1;
        byCategory[alert.category] = (byCategory[alert.category] || 0) + 1;
      }

      return {
        total: allAlerts.length,
        unacknowledged: unacknowledged.length,
        byType,
        byCategory,
      };
    } catch (error: any) {
      log.error('[AlertService] Error getting alert stats', error);
      return {
        total: 0,
        unacknowledged: 0,
        byType: {},
        byCategory: {},
      };
    }
  }

  /**
   * Check if alert should be sent based on severity
   */
  private shouldAlert(severity: Alert['type']): boolean {
    switch (severity) {
      case 'critical':
        return this.config.critical;
      case 'high':
        return this.config.high;
      case 'medium':
        return this.config.medium;
      case 'low':
        return this.config.low;
      default:
        return false;
    }
  }

  /**
   * Map detection type to alert category
   */
  private mapCategory(type: string): Alert['category'] {
    if (type.includes('security') || type.includes('mfa') || type.includes('auth')) {
      return 'security';
    }
    if (type.includes('license') || type.includes('cost')) {
      return 'cost';
    }
    if (type.includes('compliance')) {
      return 'compliance';
    }
    return 'configuration';
  }

  /**
   * Update alert configuration
   */
  updateConfig(config: Partial<AlertConfig>): void {
    this.config = { ...this.config, ...config };
    log.info('[AlertService] Updated alert configuration', this.config);
  }

  /**
   * Get alert configuration
   */
  getConfig(): AlertConfig {
    return { ...this.config };
  }
}

export const alertService = new AlertService();

