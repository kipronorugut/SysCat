import { IpcMain } from 'electron';
import log from 'electron-log';
import { settingsService } from '../services/settings.service';

export function registerSettingsHandlers(ipcMain: IpcMain): void {
  log.info('[IPC] Registering settings handlers');

  ipcMain.handle('settings:get', async () => {
    log.debug('[IPC] settings:get');
    return settingsService.getSettings();
  });

  ipcMain.handle('settings:update', async (_event, settings: any) => {
    log.info('[IPC] settings:update', settings);
    try {
      settingsService.updateSettings(settings);
      return { success: true };
    } catch (error: any) {
      log.error('[IPC] settings:update error', error);
      throw error;
    }
  });

  ipcMain.handle('settings:storage-path', async () => {
    log.debug('[IPC] settings:storage-path');
    return settingsService.getStoragePath();
  });
}

