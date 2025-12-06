import { ipcMain } from 'electron';
import log from 'electron-log';
import { alertService, Alert, AlertConfig } from '../services/alert.service';
import { DetectionResult } from '../services/detection/base-detector.service';

/**
 * IPC Handler for Alert Service
 * Exposes alert functionality to renderer process
 */
export function registerAlertHandlers(): void {
  log.info('[AlertHandler] Registering alert IPC handlers');

  // Get all alerts
  ipcMain.handle('alerts:getAll', async (_event, includeAcknowledged: boolean = false) => {
    try {
      return await alertService.getAllAlerts(includeAcknowledged);
    } catch (error: any) {
      log.error('[AlertHandler] Error getting alerts', error);
      throw error;
    }
  });

  // Get unacknowledged alerts
  ipcMain.handle('alerts:getUnacknowledged', async () => {
    try {
      return await alertService.getUnacknowledgedAlerts();
    } catch (error: any) {
      log.error('[AlertHandler] Error getting unacknowledged alerts', error);
      throw error;
    }
  });

  // Acknowledge alert
  ipcMain.handle('alerts:acknowledge', async (_event, alertId: string, acknowledgedBy: string) => {
    try {
      await alertService.acknowledgeAlert(alertId, acknowledgedBy);
      return { success: true };
    } catch (error: any) {
      log.error('[AlertHandler] Error acknowledging alert', error);
      throw error;
    }
  });

  // Create alert from detection
  ipcMain.handle('alerts:createFromDetection', async (_event, detection: DetectionResult) => {
    try {
      return await alertService.createAlertFromDetection(detection);
    } catch (error: any) {
      log.error('[AlertHandler] Error creating alert from detection', error);
      throw error;
    }
  });

  // Get alert statistics
  ipcMain.handle('alerts:getStats', async () => {
    try {
      return await alertService.getAlertStats();
    } catch (error: any) {
      log.error('[AlertHandler] Error getting alert stats', error);
      throw error;
    }
  });

  // Get alert configuration
  ipcMain.handle('alerts:getConfig', async () => {
    try {
      return alertService.getConfig();
    } catch (error: any) {
      log.error('[AlertHandler] Error getting alert config', error);
      throw error;
    }
  });

  // Update alert configuration
  ipcMain.handle('alerts:updateConfig', async (_event, config: Partial<AlertConfig>) => {
    try {
      alertService.updateConfig(config);
      return { success: true };
    } catch (error: any) {
      log.error('[AlertHandler] Error updating alert config', error);
      throw error;
    }
  });
}

