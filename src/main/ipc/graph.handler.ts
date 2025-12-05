import { IpcMain } from 'electron';
import log from 'electron-log';
import { graphApiService } from '../services/graph-api.service';

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
}

