import {
  PublicClientApplication,
  DeviceCodeRequest,
  AuthenticationResult,
  AccountInfo,
} from '@azure/msal-node';
import log from 'electron-log';
import { settingsService } from './settings.service';

export type AuthStatus = 'NOT_CONFIGURED' | 'READY' | 'AUTHENTICATING' | 'AUTHENTICATED' | 'ERROR';

export interface AuthConfig {
  tenantId: string;
  clientId: string;
}

export class AuthService {
  private msalApp: PublicClientApplication | null = null;
  private currentAccount: AuthenticationResult | null = null;
  private status: AuthStatus = 'NOT_CONFIGURED';
  private lastError: string | null = null;
  private authConfig: AuthConfig | null = null;

  constructor() {
    log.info('[AuthService] Initialized');
    this.loadConfig();
  }

  private loadConfig(): void {
    const settings = settingsService.getSettings();
    if (settings.auth?.tenantId && settings.auth?.clientId) {
      this.configure({
        tenantId: settings.auth.tenantId,
        clientId: settings.auth.clientId,
      });
    }
  }

  configure(config: AuthConfig): void {
    log.info('[AuthService] Configuring MSAL', { tenantId: config.tenantId });

    this.authConfig = config;

    this.msalApp = new PublicClientApplication({
      auth: {
        clientId: config.clientId,
        authority: `https://login.microsoftonline.com/${config.tenantId}`,
      },
      system: {
        loggerOptions: {
        loggerCallback: (_level, message, containsPii) => {
          if (containsPii) return;
          log.debug(`[MSAL] ${message}`);
        },
          piiLoggingEnabled: false,
          logLevel: 2, // Info
        },
      },
    });

    // Save to settings
    settingsService.updateSettings({
      auth: {
        tenantId: config.tenantId,
        clientId: config.clientId,
      },
    });

    this.status = 'READY';
    this.lastError = null;
  }

  getStatus() {
    return {
      status: this.status,
      hasAccount: !!this.currentAccount,
      lastError: this.lastError,
      tenantId: this.authConfig?.tenantId ?? null,
      clientId: this.authConfig?.clientId ?? null,
    };
  }

  /**
   * Device code login - the lazy sysadmin's preferred method
   * No secrets required, just click and authenticate
   */
  async loginWithDeviceCode(
    scopes: string[],
    onCode: (info: { userCode: string; verificationUri: string; message: string }) => void
  ): Promise<void> {
    if (!this.msalApp || !this.authConfig) {
      throw new Error('AuthService not configured. Please configure tenant and client ID first.');
    }

    log.info('[AuthService] Starting device code login');

    this.status = 'AUTHENTICATING';
    this.lastError = null;

    const deviceCodeRequest: DeviceCodeRequest = {
      scopes,
      deviceCodeCallback: (response) => {
        log.info('[AuthService] Device code issued', { userCode: response.userCode });
        onCode({
          userCode: response.userCode,
          verificationUri: response.verificationUri,
          message: response.message,
        });
      },
    };

    try {
      const result = await this.msalApp.acquireTokenByDeviceCode(deviceCodeRequest);
      if (!result) {
        throw new Error('No auth result returned from device code flow');
      }

      this.currentAccount = result;
      this.status = 'AUTHENTICATED';
      log.info('[AuthService] Authentication successful', {
        username: result.account?.username,
      });
    } catch (err: any) {
      log.error('[AuthService] Authentication failed', err);
      this.status = 'ERROR';
      this.lastError = err?.message || 'Unknown auth error';
      throw err;
    }
  }

  async getAccessToken(scopes: string[]): Promise<string> {
    if (!this.msalApp || !this.authConfig) {
      throw new Error('AuthService not configured');
    }

    // Try silent first if we have an account
    if (this.currentAccount?.account) {
      try {
        log.debug('[AuthService] Trying silent token acquisition');
        const result = await this.msalApp.acquireTokenSilent({
          scopes,
          account: this.currentAccount.account,
        });
        if (result && result.accessToken) {
          return result.accessToken;
        }
      } catch (err: any) {
        log.warn('[AuthService] Silent token acquisition failed', err?.message);
      }
    }

    // If we're here, user must re-authenticate
    this.status = 'READY';
    throw new Error('No valid token. User needs to authenticate again via device code.');
  }

  getCurrentAccount(): AccountInfo | null {
    return this.currentAccount?.account ?? null;
  }
}

export const authService = new AuthService();

