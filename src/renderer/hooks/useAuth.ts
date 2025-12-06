import { useEffect, useState } from 'react';

interface AuthStatus {
  status: string;
  hasAccount: boolean;
  lastError: string | null;
  tenantId: string | null;
  clientId: string | null;
}

export function useAuth() {
  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [deviceCodeMessage, setDeviceCodeMessage] = useState<string | null>(null);

  useEffect(() => {
    // Wait for syscatApi to be available before calling refreshStatus
    if (window.syscatApi) {
      refreshStatus();
      
      // Listen for device code events
      if (window.syscatApi.onDeviceCode) {
        window.syscatApi.onDeviceCode((code: { userCode: string; verificationUri: string; message: string }) => {
          console.log('[useAuth] Device code received via IPC event:', code);
          setDeviceCodeMessage(code.message);
        });
      }
      
      return undefined; // Explicit return for TypeScript
    } else {
      // Retry when syscatApi becomes available
      const checkApi = setInterval(() => {
        if (window.syscatApi) {
          clearInterval(checkApi);
          refreshStatus();
          
          // Listen for device code events
          if (window.syscatApi.onDeviceCode) {
            window.syscatApi.onDeviceCode((code: { userCode: string; verificationUri: string; message: string }) => {
              console.log('[useAuth] Device code received via IPC event:', code);
              setDeviceCodeMessage(code.message);
            });
          }
        }
      }, 100);
      
      // Cleanup after 5 seconds
      setTimeout(() => clearInterval(checkApi), 5000);
      
      return () => clearInterval(checkApi);
    }
  }, []);

  async function refreshStatus() {
    if (!window.syscatApi) {
      console.warn('[useAuth] syscatApi not available, skipping refreshStatus');
      return;
    }
    
    setLoading(true);
    try {
      const status = await window.syscatApi.getAuthStatus();
      setAuthStatus(status);
    } catch (error: any) {
      if (window.syscatApi) {
        window.syscatApi.logError('Failed to get auth status', error);
      } else {
        console.error('[useAuth] Failed to get auth status:', error);
      }
    } finally {
      setLoading(false);
    }
  }

  async function configureAuth(tenantId: string, clientId: string) {
    if (!window.syscatApi) {
      throw new Error('syscatApi not available');
    }
    
    setLoading(true);
    try {
      const status = await window.syscatApi.configureAuth({ tenantId, clientId });
      setAuthStatus(status);
      return status;
    } catch (error: any) {
      if (window.syscatApi) {
        window.syscatApi.logError('Failed to configure auth', error);
      } else {
        console.error('[useAuth] Failed to configure auth:', error);
      }
      throw error;
    } finally {
      setLoading(false);
    }
  }

  async function loginDeviceCode() {
    if (!window.syscatApi) {
      throw new Error('syscatApi not available');
    }
    
    setLoading(true);
    setDeviceCodeMessage(null);
    try {
      console.log('[useAuth] Initiating device code login...');
      const result = await window.syscatApi.loginWithDeviceCode();
      console.log('[useAuth] Device code login result:', result);
      
      if (result.code?.message) {
        setDeviceCodeMessage(result.code.message);
      }
      
      // Update status - the IPC call waits for authentication to complete
      // So when it returns, status should be AUTHENTICATED (or ERROR)
      if (result.status) {
        setAuthStatus(result.status);
        console.log('[useAuth] Auth status updated:', result.status.status);
      }
      
      return result;
    } catch (error: any) {
      console.error('[useAuth] Device code login failed:', error);
      if (window.syscatApi) {
        window.syscatApi.logError('Device code login failed', error);
      }
      // Refresh status to get error state
      await refreshStatus();
      throw error;
    } finally {
      setLoading(false);
    }
  }

  return {
    authStatus,
    loading,
    deviceCodeMessage,
    configureAuth,
    loginDeviceCode,
    refreshStatus,
  };
}

