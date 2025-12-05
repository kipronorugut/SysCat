import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('syscatApi', {
  // Auth
  configureAuth: (config: { tenantId: string; clientId: string }) =>
    ipcRenderer.invoke('auth:configure', config),
  getAuthStatus: () => ipcRenderer.invoke('auth:status'),
  loginWithDeviceCode: () => ipcRenderer.invoke('auth:login-device-code'),

  // Graph API
  getTenantSummary: () => ipcRenderer.invoke('graph:tenant-summary'),
  getUsers: (params?: { top?: number; filter?: string }) =>
    ipcRenderer.invoke('graph:users', params),
  getLicenses: () => ipcRenderer.invoke('graph:licenses'),

  // Automation
  getSafeFixPlan: () => ipcRenderer.invoke('automation:safe-fix-plan'),
  applySafeFixes: (plan: any) => ipcRenderer.invoke('automation:apply-safe-fixes', plan),
  runAutomation: (module: string, action: string, params?: any) =>
    ipcRenderer.invoke('automation:run', module, action, params),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (settings: any) => ipcRenderer.invoke('settings:update', settings),
  getStoragePath: () => ipcRenderer.invoke('settings:storage-path'),

  // Logging (for renderer debug messages)
  logDebug: (message: string, data?: any) => ipcRenderer.send('log:debug', message, data),
  logInfo: (message: string, data?: any) => ipcRenderer.send('log:info', message, data),
  logError: (message: string, error?: any) => ipcRenderer.send('log:error', message, error),

  // Navigation
  onNavigate: (callback: (path: string) => void) => {
    ipcRenderer.on('navigate', (_event, path) => callback(path));
  },
});

// Type declaration for TypeScript
declare global {
  interface Window {
    syscatApi: {
      configureAuth: (config: { tenantId: string; clientId: string }) => Promise<any>;
      getAuthStatus: () => Promise<any>;
      loginWithDeviceCode: () => Promise<{ code: any; status: any }>;
      getTenantSummary: () => Promise<any>;
      getUsers: (params?: { top?: number; filter?: string }) => Promise<any>;
      getLicenses: () => Promise<any>;
      getSafeFixPlan: () => Promise<any>;
      applySafeFixes: (plan: any) => Promise<any>;
      runAutomation: (module: string, action: string, params?: any) => Promise<any>;
      getSettings: () => Promise<any>;
      updateSettings: (settings: any) => Promise<any>;
      getStoragePath: () => Promise<string>;
      logDebug: (message: string, data?: any) => void;
      logInfo: (message: string, data?: any) => void;
      logError: (message: string, error?: any) => void;
      onNavigate: (callback: (path: string) => void) => void;
    };
  }
}

