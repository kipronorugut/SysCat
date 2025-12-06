import { IpcMain, BrowserWindow } from 'electron';
import log from 'electron-log';
import { authService, AuthConfig, REQUIRED_SCOPES } from '../services/auth.service';

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

  /**
   * Interactive SSO login - opens Microsoft login page
   * Verifies user has Global Admin or Global Reader permissions
   */
  ipcMain.handle('auth:login-sso', async (event) => {
    log.info('[IPC] auth:login-sso');

    try {
      // Get the main window for parent reference
      const mainWindow = BrowserWindow.fromWebContents(event.sender);
      
      // Request all required permissions during authentication
      log.info('[IPC] Requesting scopes:', REQUIRED_SCOPES);
      const { hasRequiredPermissions, userRoles } = await authService.loginWithSSO(
        REQUIRED_SCOPES,
        mainWindow || undefined
      );

      if (!hasRequiredPermissions) {
        throw new Error(`User does not have required permissions. Required: Global Administrator or Global Reader. Current roles: ${userRoles.join(', ') || 'None'}`);
      }

      return {
        status: authService.getStatus(),
        userRoles,
        message: `Authenticated successfully as ${userRoles.join(' or ')}`,
      };
    } catch (error: any) {
      log.error('[IPC] auth:login-sso error', error);
      throw error;
    }
  });

  /**
   * Device code login - fallback method
   */
  ipcMain.handle('auth:login-device-code', async (event) => {
    log.info('[IPC] auth:login-device-code');

    let codePayload: any = null;
    const webContents = event.sender;

    try {
      // Request all required permissions during authentication
      log.info('[IPC] Requesting scopes:', REQUIRED_SCOPES);
      await authService.loginWithDeviceCode(
        REQUIRED_SCOPES,
        (info) => {
          codePayload = info;
          log.info('[IPC] Device code issued', { userCode: info.userCode });
          
          // Send device code immediately to renderer via IPC event
          webContents.send('auth:device-code', {
            userCode: info.userCode,
            verificationUri: info.verificationUri,
            message: info.message,
          });
          log.debug('[IPC] Device code sent to renderer via event');
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

