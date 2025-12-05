import { IpcMain } from 'electron';
import log from 'electron-log';
import { automationService } from '../services/automation.service';

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
}

