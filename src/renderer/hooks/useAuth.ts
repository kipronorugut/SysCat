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
    refreshStatus();
  }, []);

  async function refreshStatus() {
    setLoading(true);
    try {
      const status = await window.syscatApi.getAuthStatus();
      setAuthStatus(status);
    } catch (error: any) {
      window.syscatApi.logError('Failed to get auth status', error);
    } finally {
      setLoading(false);
    }
  }

  async function configureAuth(tenantId: string, clientId: string) {
    setLoading(true);
    try {
      const status = await window.syscatApi.configureAuth({ tenantId, clientId });
      setAuthStatus(status);
      return status;
    } catch (error: any) {
      window.syscatApi.logError('Failed to configure auth', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }

  async function loginDeviceCode() {
    setLoading(true);
    setDeviceCodeMessage(null);
    try {
      const result = await window.syscatApi.loginWithDeviceCode();
      if (result.code?.message) {
        setDeviceCodeMessage(result.code.message);
      }
      setAuthStatus(result.status);
      return result;
    } catch (error: any) {
      window.syscatApi.logError('Device code login failed', error);
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

