import { IpcMain } from 'electron';
import log from 'electron-log';
import { graphApiService } from '../services/graph-api.service';
import { configCacheService } from '../services/config-cache.service';

export function registerGraphHandlers(ipcMain: IpcMain): void {
  log.info('[IPC] Registering graph handlers');

  ipcMain.handle('graph:tenant-summary', async () => {
    log.info('[IPC] graph:tenant-summary called');
    try {
      const summary = await graphApiService.getTenantSummary();
      return summary;
    } catch (error: any) {
      log.error('[IPC] graph:tenant-summary error', error);
      throw error;
    }
  });

  ipcMain.handle('graph:users', async (_event, params?: { top?: number; filter?: string }) => {
    log.info('[IPC] graph:users called', params);
    try {
      const users = await graphApiService.getUsers(params);
      return users;
    } catch (error: any) {
      log.error('[IPC] graph:users error', error);
      throw error;
    }
  });

  ipcMain.handle('graph:licenses', async () => {
    log.info('[IPC] graph:licenses called');
    try {
      const licenses = await graphApiService.getLicenses();
      return licenses;
    } catch (error: any) {
      log.error('[IPC] graph:licenses error', error);
      throw error;
    }
  });

  /**
   * Cache Management Handlers
   */
  ipcMain.handle('cache:invalidate', async (_event, cacheType?: string) => {
    log.info('[IPC] cache:invalidate called', { cacheType });
    try {
      await configCacheService.invalidate(undefined, cacheType);
      return { success: true };
    } catch (error: any) {
      log.error('[IPC] cache:invalidate error', error);
      throw error;
    }
  });

  ipcMain.handle('cache:forceRefresh', async () => {
    log.info('[IPC] cache:forceRefresh called');
    try {
      await configCacheService.forceRefreshAll();
      return { success: true };
    } catch (error: any) {
      log.error('[IPC] cache:forceRefresh error', error);
      throw error;
    }
  });

  ipcMain.handle('cache:stats', async () => {
    log.info('[IPC] cache:stats called');
    try {
      return await configCacheService.getCacheStats();
    } catch (error: any) {
      log.error('[IPC] cache:stats error', error);
      throw error;
    }
  });
}

