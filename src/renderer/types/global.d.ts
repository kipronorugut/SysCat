// Type declarations for renderer process
// This extends the Window interface to include syscatApi

export {};

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

