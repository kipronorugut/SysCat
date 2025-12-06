import log from 'electron-log';
import { db } from '../database/db';
import { PainPoint } from '../../shared/types/pain-points';

/**
 * Integration Service
 * Handles integrations with external systems (task management, SIEM, XDR, ticketing)
 * Similar to Griffin31's "Seamless Integrations" feature
 */
export type IntegrationType = 'task_management' | 'siem' | 'xdr' | 'ticketing';

export type IntegrationStatus = 'connected' | 'disconnected' | 'error' | 'configuring';

export interface Integration {
  id: string;
  type: IntegrationType;
  name: string;
  provider: string; // e.g., 'jira', 'azure_devops', 'splunk', 'sentinel', 'servicenow'
  config: Record<string, any>;
  status: IntegrationStatus;
  lastSync?: Date;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IntegrationSyncResult {
  success: boolean;
  itemsSynced: number;
  errors: string[];
  timestamp: Date;
}

/**
 * Integration Service
 * Manages connections to external systems for automated workflows
 */
export class IntegrationService {
  private integrations: Map<string, Integration> = new Map();

  constructor() {
    this.initializeDatabase();
    this.loadIntegrations();
  }

  /**
   * Initialize database tables
   */
  private async initializeDatabase(): Promise<void> {
    try {
      const database = await db();
      database.exec(`
        CREATE TABLE IF NOT EXISTS integrations (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          name TEXT NOT NULL,
          provider TEXT NOT NULL,
          config TEXT NOT NULL,
          status TEXT NOT NULL,
          last_sync TEXT,
          enabled INTEGER DEFAULT 1,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS integration_syncs (
          id TEXT PRIMARY KEY,
          integration_id TEXT NOT NULL,
          pain_point_id TEXT,
          sync_type TEXT NOT NULL,
          success INTEGER DEFAULT 0,
          items_synced INTEGER DEFAULT 0,
          errors TEXT,
          timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (integration_id) REFERENCES integrations(id)
        );

        CREATE INDEX IF NOT EXISTS idx_integrations_type ON integrations(type);
        CREATE INDEX IF NOT EXISTS idx_integrations_status ON integrations(status);
      `);
      log.info('[IntegrationService] Database initialized');
    } catch (error: any) {
      log.error('[IntegrationService] Error initializing database', error);
    }
  }

  /**
   * Load integrations from database
   */
  private async loadIntegrations(): Promise<void> {
    try {
      const database = await db();
      const rows = database.prepare('SELECT * FROM integrations').all();

      for (const row of rows as any[]) {
        const integration: Integration = {
          id: row.id,
          type: row.type,
          name: row.name,
          provider: row.provider,
          config: JSON.parse(row.config),
          status: row.status,
          lastSync: row.last_sync ? new Date(row.last_sync) : undefined,
          enabled: row.enabled === 1,
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at),
        };

        this.integrations.set(integration.id, integration);
      }

      log.info(`[IntegrationService] Loaded ${this.integrations.size} integrations`);
    } catch (error: any) {
      log.error('[IntegrationService] Error loading integrations', error);
    }
  }

  /**
   * Create new integration
   */
  async createIntegration(
    integration: Omit<Integration, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'lastSync'>
  ): Promise<Integration> {
    const id = `integration-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const newIntegration: Integration = {
      ...integration,
      id,
      status: 'configuring',
      createdAt: now,
      updatedAt: now,
    };

    await this.saveIntegration(newIntegration);
    this.integrations.set(id, newIntegration);

    log.info(`[IntegrationService] Created integration ${id}`);
    return newIntegration;
  }

  /**
   * Save integration to database
   */
  private async saveIntegration(integration: Integration): Promise<void> {
    try {
      const database = await db();
      database
        .prepare(
          `INSERT OR REPLACE INTO integrations (id, type, name, provider, config, status, last_sync, enabled, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          integration.id,
          integration.type,
          integration.name,
          integration.provider,
          JSON.stringify(integration.config),
          integration.status,
          integration.lastSync ? integration.lastSync.toISOString() : null,
          integration.enabled ? 1 : 0,
          integration.createdAt.toISOString(),
          integration.updatedAt.toISOString()
        );
    } catch (error: any) {
      log.error('[IntegrationService] Error saving integration', error);
      throw error;
    }
  }

  /**
   * Test integration connection
   */
  async testConnection(integrationId: string): Promise<boolean> {
    const integration = this.integrations.get(integrationId);
    if (!integration) {
      throw new Error(`Integration ${integrationId} not found`);
    }

    log.info(`[IntegrationService] Testing connection for ${integration.provider}`);

    try {
      // Test connection based on provider type
      const connected = await this.testProviderConnection(integration);
      
      // Update status
      integration.status = connected ? 'connected' : 'error';
      integration.updatedAt = new Date();
      await this.saveIntegration(integration);

      return connected;
    } catch (error: any) {
      log.error('[IntegrationService] Connection test failed', error);
      integration.status = 'error';
      integration.updatedAt = new Date();
      await this.saveIntegration(integration);
      return false;
    }
  }

  /**
   * Test provider-specific connection
   */
  private async testProviderConnection(integration: Integration): Promise<boolean> {
    // TODO: Implement actual connection tests for each provider
    // For now, simulate based on provider type
    
    switch (integration.provider) {
      case 'jira':
      case 'azure_devops':
        // Task management - would test API connection
        return true; // Simulated
      
      case 'splunk':
      case 'sentinel':
        // SIEM - would test API connection
        return true; // Simulated
      
      case 'defender':
      case 'crowdstrike':
        // XDR - would test API connection
        return true; // Simulated
      
      case 'servicenow':
      case 'zendesk':
        // Ticketing - would test API connection
        return true; // Simulated
      
      default:
        return false;
    }
  }

  /**
   * Sync pain point to integration
   */
  async syncPainPoint(integrationId: string, painPoint: PainPoint): Promise<IntegrationSyncResult> {
    const integration = this.integrations.get(integrationId);
    if (!integration) {
      throw new Error(`Integration ${integrationId} not found`);
    }

    if (!integration.enabled || integration.status !== 'connected') {
      throw new Error(`Integration ${integrationId} is not available`);
    }

    log.info(`[IntegrationService] Syncing pain point ${painPoint.id} to ${integration.provider}`);

    try {
      const result = await this.syncToProvider(integration, painPoint);
      
      // Record sync
      await this.recordSync(integrationId, painPoint.id, 'pain_point', result);

      // Update last sync
      integration.lastSync = new Date();
      await this.saveIntegration(integration);

      return result;
    } catch (error: any) {
      log.error('[IntegrationService] Sync failed', error);
      const errorResult: IntegrationSyncResult = {
        success: false,
        itemsSynced: 0,
        errors: [error.message],
        timestamp: new Date(),
      };
      await this.recordSync(integrationId, painPoint.id, 'pain_point', errorResult);
      throw error;
    }
  }

  /**
   * Sync to provider-specific system
   */
  private async syncToProvider(integration: Integration, painPoint: PainPoint): Promise<IntegrationSyncResult> {
    // TODO: Implement actual sync logic for each provider
    
    switch (integration.type) {
      case 'task_management':
        return await this.syncToTaskManagement(integration, painPoint);
      
      case 'siem':
        return await this.syncToSIEM(integration, painPoint);
      
      case 'xdr':
        return await this.syncToXDR(integration, painPoint);
      
      case 'ticketing':
        return await this.syncToTicketing(integration, painPoint);
      
      default:
        throw new Error(`Unknown integration type: ${integration.type}`);
    }
  }

  /**
   * Sync to task management system
   */
  private async syncToTaskManagement(integration: Integration, painPoint: PainPoint): Promise<IntegrationSyncResult> {
    log.debug(`[IntegrationService] Syncing to task management: ${integration.provider}`);
    
    // TODO: Implement actual API calls
    // Would create task/ticket in Jira, Azure DevOps, etc.
    
    return {
      success: true,
      itemsSynced: 1,
      errors: [],
      timestamp: new Date(),
    };
  }

  /**
   * Sync to SIEM system
   */
  private async syncToSIEM(integration: Integration, painPoint: PainPoint): Promise<IntegrationSyncResult> {
    log.debug(`[IntegrationService] Syncing to SIEM: ${integration.provider}`);
    
    // TODO: Implement actual API calls
    // Would send security finding to Splunk, Sentinel, etc.
    
    return {
      success: true,
      itemsSynced: 1,
      errors: [],
      timestamp: new Date(),
    };
  }

  /**
   * Sync to XDR system
   */
  private async syncToXDR(integration: Integration, painPoint: PainPoint): Promise<IntegrationSyncResult> {
    log.debug(`[IntegrationService] Syncing to XDR: ${integration.provider}`);
    
    // TODO: Implement actual API calls
    // Would send threat intelligence to Defender, CrowdStrike, etc.
    
    return {
      success: true,
      itemsSynced: 1,
      errors: [],
      timestamp: new Date(),
    };
  }

  /**
   * Sync to ticketing system
   */
  private async syncToTicketing(integration: Integration, painPoint: PainPoint): Promise<IntegrationSyncResult> {
    log.debug(`[IntegrationService] Syncing to ticketing: ${integration.provider}`);
    
    // TODO: Implement actual API calls
    // Would create ticket in ServiceNow, Zendesk, etc.
    
    return {
      success: true,
      itemsSynced: 1,
      errors: [],
      timestamp: new Date(),
    };
  }

  /**
   * Record sync operation
   */
  private async recordSync(
    integrationId: string,
    painPointId: string,
    syncType: string,
    result: IntegrationSyncResult
  ): Promise<void> {
    try {
      const database = await db();
      const id = `sync-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      database
        .prepare(
          `INSERT INTO integration_syncs (id, integration_id, pain_point_id, sync_type, success, items_synced, errors, timestamp)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          id,
          integrationId,
          painPointId,
          syncType,
          result.success ? 1 : 0,
          result.itemsSynced,
          JSON.stringify(result.errors),
          result.timestamp.toISOString()
        );
    } catch (error: any) {
      log.error('[IntegrationService] Error recording sync', error);
    }
  }

  /**
   * Get all integrations
   */
  getAllIntegrations(): Integration[] {
    return Array.from(this.integrations.values());
  }

  /**
   * Get integration by ID
   */
  getIntegration(id: string): Integration | null {
    return this.integrations.get(id) || null;
  }

  /**
   * Get integrations by type
   */
  getIntegrationsByType(type: IntegrationType): Integration[] {
    return Array.from(this.integrations.values()).filter(i => i.type === type);
  }

  /**
   * Update integration
   */
  async updateIntegration(id: string, updates: Partial<Integration>): Promise<Integration | null> {
    const integration = this.integrations.get(id);
    if (!integration) {
      return null;
    }

    const updated: Integration = {
      ...integration,
      ...updates,
      updatedAt: new Date(),
    };

    await this.saveIntegration(updated);
    this.integrations.set(id, updated);

    return updated;
  }

  /**
   * Delete integration
   */
  async deleteIntegration(id: string): Promise<void> {
    try {
      const database = await db();
      database.prepare('DELETE FROM integrations WHERE id = ?').run(id);
      this.integrations.delete(id);
      log.info(`[IntegrationService] Deleted integration ${id}`);
    } catch (error: any) {
      log.error('[IntegrationService] Error deleting integration', error);
      throw error;
    }
  }

  /**
   * Get supported providers by type
   */
  getSupportedProviders(type: IntegrationType): string[] {
    switch (type) {
      case 'task_management':
        return ['jira', 'azure_devops', 'trello', 'asana'];
      case 'siem':
        return ['splunk', 'sentinel', 'qradar', 'arcsight'];
      case 'xdr':
        return ['defender', 'crowdstrike', 'sentinelone', 'palo_alto'];
      case 'ticketing':
        return ['servicenow', 'zendesk', 'freshservice', 'jira_service_management'];
      default:
        return [];
    }
  }
}

export const integrationService = new IntegrationService();

