import { IpcMain } from 'electron';
import log from 'electron-log';
import { authService, AuthConfig } from '../services/auth.service';

export function registerAuthHandlers(ipcMain: IpcMain): void {
  log.info('[IPC] Registering auth handlers');

  ipcMain.handle('auth:configure', async (_event, config: AuthConfig) => {
    log.info('[IPC] auth:configure', { tenantId: config.tenantId });
    try {
      authService.configure(config);
      return authService.getStatus();
    } catch (error: any) {
      log.error('[IPC] auth:configure error', error);
      throw error;
    }
  });

  ipcMain.handle('auth:status', async () => {
    log.debug('[IPC] auth:status');
    return authService.getStatus();
  });

  ipcMain.handle('auth:login-device-code', async (_event) => {
    log.info('[IPC] auth:login-device-code');

    let codePayload: any = null;

    try {
      await authService.loginWithDeviceCode(
        ['https://graph.microsoft.com/.default'],
        (info) => {
          codePayload = info;
          log.info('[IPC] Device code issued', { userCode: info.userCode });
        }
      );

      return {
        code: codePayload,
        status: authService.getStatus(),
      };
    } catch (error: any) {
      log.error('[IPC] auth:login-device-code error', error);
      throw error;
    }
  });
}

