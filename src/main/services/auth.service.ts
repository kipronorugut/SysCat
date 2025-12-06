import {
  PublicClientApplication,
  DeviceCodeRequest,
  AuthenticationResult,
  AccountInfo,
  AuthorizationCodeRequest,
  AuthorizationUrlRequest,
} from '@azure/msal-node';
import { BrowserWindow, shell } from 'electron';
import * as crypto from 'crypto';
import * as http from 'http';
import log from 'electron-log';
import { settingsService } from './settings.service';

export type AuthStatus = 'NOT_CONFIGURED' | 'READY' | 'AUTHENTICATING' | 'AUTHENTICATED' | 'ERROR';

export interface AuthConfig {
  tenantId: string;
  clientId: string;
}

// Required Microsoft Graph API scopes for SysCat
// These will be requested during authentication
export const REQUIRED_SCOPES = [
  'https://graph.microsoft.com/User.Read',
  'https://graph.microsoft.com/Directory.Read.All',
  'https://graph.microsoft.com/User.Read.All',
  'https://graph.microsoft.com/Organization.Read.All',
  'https://graph.microsoft.com/Directory.ReadWrite.All', // For license/user management
  'https://graph.microsoft.com/User.ReadWrite.All', // For updating user properties
  'https://graph.microsoft.com/AuditLog.Read.All', // For sign-in logs and legacy auth detection
  'https://graph.microsoft.com/DeviceManagementConfiguration.Read.All', // For Intune policies
  'https://graph.microsoft.com/DeviceManagementApps.Read.All', // For Intune app protection
  'https://graph.microsoft.com/DeviceManagementServiceConfig.Read.All', // For Intune enrollment
  'https://graph.microsoft.com/Policy.Read.All', // For Conditional Access policies
  'openid',
  'profile',
  'email',
];

export class AuthService {
  private msalApp: PublicClientApplication | null = null;
  private currentAccount: AuthenticationResult | null = null;
  private status: AuthStatus = 'NOT_CONFIGURED';
  private lastError: string | null = null;
  private authConfig: AuthConfig | null = null;
  private authWindow: BrowserWindow | null = null;

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
   * Interactive SSO login - opens Microsoft login page in browser window
   * Verifies user has Global Admin or Global Reader permissions
   */
  async loginWithSSO(
    scopes: string[],
    parentWindow?: BrowserWindow
  ): Promise<{ hasRequiredPermissions: boolean; userRoles: string[] }> {
    if (!this.msalApp || !this.authConfig) {
      throw new Error('AuthService not configured. Please configure tenant and client ID first.');
    }

    log.info('[AuthService] Starting interactive SSO login');

    this.status = 'AUTHENTICATING';
    this.lastError = null;

    // Generate PKCE code verifier and challenge
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    // Generate state for CSRF protection
    const state = crypto.randomBytes(16).toString('base64url');

    // Create local HTTP server to receive callback
    const redirectUri = 'http://localhost:8400/auth/callback';
    let authCode: string | null = null;
    let authError: string | null = null;

    const server = http.createServer((req, res) => {
      if (req.url?.startsWith('/auth/callback')) {
        const url = new URL(req.url, `http://localhost:8400`);
        authCode = url.searchParams.get('code');
        authError = url.searchParams.get('error');
        const receivedState = url.searchParams.get('state');

        // Verify state matches
        if (receivedState !== state) {
          authError = 'State mismatch - possible CSRF attack';
        }

        // Send response to browser
        if (authCode && !authError) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <head><title>Authentication Successful</title></head>
              <body style="font-family: system-ui; display: flex; align-items: center; justify-content: center; height: 100vh; background: #0F172A; color: #fff;">
                <div style="text-align: center;">
                  <h1 style="color: #10b981;">✓ Authentication Successful</h1>
                  <p>You can close this window and return to SysCat.</p>
                </div>
              </body>
            </html>
          `);
        } else {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <head><title>Authentication Error</title></head>
              <body style="font-family: system-ui; display: flex; align-items: center; justify-content: center; height: 100vh; background: #0F172A; color: #fff;">
                <div style="text-align: center;">
                  <h1 style="color: #ef4444;">✗ Authentication Failed</h1>
                  <p>${authError || 'Unknown error'}</p>
                  <p>Please try again or contact support.</p>
                </div>
              </body>
            </html>
          `);
        }

        // Close server after receiving callback
        setTimeout(() => {
          server.close();
        }, 1000);
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    // Start local server
    await new Promise<void>((resolve, reject) => {
      server.listen(8400, 'localhost', () => {
        log.debug('[AuthService] Local callback server started on port 8400');
        resolve();
      });
      server.on('error', reject);
    });

    try {
      // Get authorization URL
      const authUrlRequest: AuthorizationUrlRequest = {
        scopes,
        redirectUri,
        codeChallenge,
        codeChallengeMethod: 'S256',
        state,
      };

      const authUrl = await this.msalApp.getAuthCodeUrl(authUrlRequest);
      
      // Validate URL
      if (!authUrl || !authUrl.startsWith('http')) {
        throw new Error(`Invalid authorization URL generated: ${authUrl}`);
      }
      
      log.info('[AuthService] Generated authorization URL', { 
        url: authUrl.substring(0, 150) + '...',
        length: authUrl.length,
        hasCodeChallenge: authUrl.includes('code_challenge'),
        hasState: authUrl.includes('state='),
      });

      // Use system browser instead of embedded window to avoid CSP issues
      log.info('[AuthService] Opening system browser for authentication');
      await shell.openExternal(authUrl);
      
      // Show a simple window with instructions while waiting for callback
      this.authWindow = new BrowserWindow({
        width: 450,
        height: 200,
        show: true,
        parent: parentWindow || undefined,
        modal: true,
        resizable: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      });

      // Load a simple HTML page with instructions
      const instructionsHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body {
                font-family: system-ui, -apple-system, sans-serif;
                background: #0F172A;
                color: #fff;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
                padding: 20px;
                text-align: center;
              }
              .container {
                max-width: 400px;
              }
              h2 {
                margin: 0 0 16px 0;
                color: #10b981;
              }
              p {
                margin: 8px 0;
                color: #cbd5e1;
                font-size: 14px;
              }
              .spinner {
                border: 3px solid #1e293b;
                border-top: 3px solid #10b981;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                animation: spin 1s linear infinite;
                margin: 20px auto;
              }
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h2>Sign in with Microsoft</h2>
              <p>Please complete the sign-in process in your browser.</p>
              <p>This window will close automatically when authentication is complete.</p>
              <div class="spinner"></div>
            </div>
          </body>
        </html>
      `;
      
      this.authWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(instructionsHtml)}`);

      // Wait for callback
      const callbackPromise = new Promise<{ code: string }>((resolve, reject) => {
        const checkInterval = setInterval(() => {
          if (authCode) {
            clearInterval(checkInterval);
            resolve({ code: authCode });
          } else if (authError) {
            clearInterval(checkInterval);
            reject(new Error(authError));
          }
        }, 100);

        // Timeout after 5 minutes
        setTimeout(() => {
          clearInterval(checkInterval);
          reject(new Error('Authentication timeout - please try again'));
        }, 300000);
      });

      const { code } = await callbackPromise;

      // Exchange authorization code for tokens
      const tokenRequest: AuthorizationCodeRequest = {
        scopes,
        code,
        redirectUri,
        codeVerifier,
      };

      const result = await this.msalApp.acquireTokenByCode(tokenRequest);

      if (!result || !result.account) {
        throw new Error('No auth result returned from code exchange');
      }

      this.currentAccount = result;

      // Close instruction window
      if (this.authWindow && !this.authWindow.isDestroyed()) {
        this.authWindow.close();
        this.authWindow = null;
      }

      // Verify user has required permissions (Global Admin or Global Reader)
      log.info('[AuthService] Verifying user permissions', { username: result.account.username });
      const { hasRequiredPermissions, userRoles } = await this.verifyUserPermissions(result.account);

      if (hasRequiredPermissions) {
        this.status = 'AUTHENTICATED';
        log.info('[AuthService] Authentication successful with required permissions', {
          username: result.account.username,
          roles: userRoles,
        });
      } else {
        this.status = 'ERROR';
        this.lastError = `User does not have required permissions. Required: Global Administrator or Global Reader. Current roles: ${userRoles.join(', ') || 'None'}`;
        this.currentAccount = null;
        throw new Error(this.lastError);
      }

      return { hasRequiredPermissions, userRoles };
    } catch (err: any) {
      log.error('[AuthService] Authentication failed', err);
      this.status = 'ERROR';
      this.lastError = err?.message || 'Unknown auth error';

      // Close instruction window on error
      if (this.authWindow && !this.authWindow.isDestroyed()) {
        this.authWindow.close();
        this.authWindow = null;
      }

      // Close server on error
      try {
        server.close();
      } catch (e) {
        // Server might already be closed
      }

      throw err;
    }
  }

  /**
   * Verify user has Global Admin or Global Reader permissions
   */
  private async verifyUserPermissions(account: AccountInfo): Promise<{
    hasRequiredPermissions: boolean;
    userRoles: string[];
  }> {
    try {
      // Import graphApiService dynamically to avoid circular dependency
      const { graphApiService } = await import('./graph-api.service');
      
      // Get directory roles
      const roles = await graphApiService.getDirectoryRoles();
      const requiredRoles = ['Global Administrator', 'Global Reader'];
      
      const userRoles: string[] = [];
      
      // Check each required role
      for (const requiredRole of requiredRoles) {
        const role = roles.find(r => r.displayName === requiredRole);
        if (role) {
          const members = await graphApiService.getRoleMembers(role.id);
          const isMember = members.some(m => m.id === account.localAccountId || m.userPrincipalName === account.username);
          if (isMember) {
            userRoles.push(requiredRole);
          }
        }
      }

      const hasRequiredPermissions = userRoles.length > 0;
      
      log.info('[AuthService] Permission verification complete', {
        hasRequiredPermissions,
        userRoles,
        userId: account.localAccountId,
      });

      return { hasRequiredPermissions, userRoles };
    } catch (error: any) {
      log.error('[AuthService] Error verifying user permissions', error);
      // If we can't verify, allow authentication but log warning
      log.warn('[AuthService] Could not verify permissions, allowing authentication');
      return { hasRequiredPermissions: true, userRoles: [] };
    }
  }

  /**
   * Device code login - fallback method
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

