import { IpcMain } from 'electron';
import log from 'electron-log';
import { automationService } from '../services/automation.service';
import { securityScannerService } from '../services/security-scanner.service';
import { identityRemediator } from '../services/remediation/identity-remediator.service';
import { db } from '../database/db';

export function registerAutomationHandlers(ipcMain: IpcMain): void {
  log.info('[IPC] Registering automation handlers');

  ipcMain.handle('automation:safe-fix-plan', async () => {
    log.info('[IPC] automation:safe-fix-plan called');
    try {
      const plan = await automationService.getSafeFixPlan();
      return plan;
    } catch (error: any) {
      log.error('[IPC] automation:safe-fix-plan error', error);
      throw error;
    }
  });

  ipcMain.handle('automation:apply-safe-fixes', async (_event, plan: any) => {
    log.info('[IPC] automation:apply-safe-fixes called');
    try {
      const result = await automationService.applySafeFixes(plan);
      return result;
    } catch (error: any) {
      log.error('[IPC] automation:apply-safe-fixes error', error);
      throw error;
    }
  });

  ipcMain.handle('automation:apply-category-fixes', async (_event, plan: any, category: string) => {
    log.info('[IPC] automation:apply-category-fixes called', { category });
    try {
      const result = await automationService.applyCategoryFixes(plan, category as any);
      return result;
    } catch (error: any) {
      log.error('[IPC] automation:apply-category-fixes error', error);
      throw error;
    }
  });

  ipcMain.handle('automation:apply-individual-fix', async (_event, category: string, userId: string, details?: any) => {
    log.info('[IPC] automation:apply-individual-fix called', { category, userId });
    try {
      const result = await automationService.applyIndividualFix(category as any, userId, details);
      return result;
    } catch (error: any) {
      log.error('[IPC] automation:apply-individual-fix error', error);
      throw error;
    }
  });

  ipcMain.handle('automation:run', async (_event, module: string, action: string, params?: any) => {
    log.info('[IPC] automation:run called', { module, action, params });
    try {
      const result = await automationService.runModule(module, action, params);
      return result;
    } catch (error: any) {
      log.error('[IPC] automation:run error', error);
      throw error;
    }
  });

  ipcMain.handle('automation:get-activity-log', async (_event, limit: number = 50) => {
    log.info('[IPC] automation:get-activity-log called', { limit });
    try {
      const database = await db();
      const activities = database
        .prepare(`SELECT * FROM activity_log ORDER BY created_at DESC LIMIT ?`)
        .all(limit);

      // Parse JSON details
      return activities.map((activity: any) => ({
        ...activity,
        details: activity.details ? JSON.parse(activity.details) : null,
      }));
    } catch (error: any) {
      log.error('[IPC] automation:get-activity-log error', error);
      throw error;
    }
  });

  ipcMain.handle('security:run-full-scan', async () => {
    log.info('[IPC] security:run-full-scan called');
    try {
      const scanResult = await securityScannerService.runFullScan();
      return scanResult;
    } catch (error: any) {
      log.error('[IPC] security:run-full-scan error', error);
      throw error;
    }
  });

  ipcMain.handle('security:get-security-score', async () => {
    log.info('[IPC] security:get-security-score called');
    try {
      const score = await securityScannerService.calculateSecurityScore();
      return score;
    } catch (error: any) {
      log.error('[IPC] security:get-security-score error', error);
      throw error;
    }
  });

  ipcMain.handle('remediation:remediate-finding', async (_event, detectionType: string, resourceIds: string[], options?: any) => {
    log.info('[IPC] remediation:remediate-finding called', { detectionType, resourceCount: resourceIds.length });
    try {
      const result = await identityRemediator.remediate(detectionType, resourceIds, options);
      return result;
    } catch (error: any) {
      log.error('[IPC] remediation:remediate-finding error', error);
      throw error;
    }
  });
}

