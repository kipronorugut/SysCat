import { ipcMain } from 'electron';
import log from 'electron-log';
import { quickWinsService } from '../services/quick-wins.service';
import { PainPoint } from '../../shared/types/pain-points';

/**
 * IPC Handler for Quick Wins Service
 * Exposes quick wins functionality to renderer process
 */
export function registerQuickWinsHandlers(): void {
  log.info('[QuickWinsHandler] Registering quick wins IPC handlers');

  // Get prioritized quick wins
  ipcMain.handle('quick-wins:getPrioritized', async (_event, painPoints: PainPoint[]) => {
    try {
      return await quickWinsService.getPrioritizedQuickWins(painPoints);
    } catch (error: any) {
      log.error('[QuickWinsHandler] Error getting prioritized quick wins', error);
      throw error;
    }
  });

  // Get quick win metrics
  ipcMain.handle('quick-wins:getMetrics', async (_event, painPoints: PainPoint[]) => {
    try {
      return await quickWinsService.getQuickWinMetrics(painPoints);
    } catch (error: any) {
      log.error('[QuickWinsHandler] Error getting quick win metrics', error);
      throw error;
    }
  });

  // Batch apply quick wins
  ipcMain.handle('quick-wins:batchApply', async (_event, quickWins: any[]) => {
    try {
      return await quickWinsService.batchApplyQuickWins(quickWins);
    } catch (error: any) {
      log.error('[QuickWinsHandler] Error batch applying quick wins', error);
      throw error;
    }
  });
}

