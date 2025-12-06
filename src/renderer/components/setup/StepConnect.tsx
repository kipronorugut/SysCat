import React, { useState, useEffect, useRef } from 'react';

interface StepConnectProps {
  onConnect: (tenantId: string, clientId: string) => Promise<void>;
  onLogin: () => Promise<void>;
  deviceCodeMessage: string | null;
  authStatus: any;
}

const StepConnect: React.FC<StepConnectProps> = ({ onConnect, onLogin, deviceCodeMessage, authStatus }) => {
  // Pre-populate from authStatus if available
  const [tenantId, setTenantId] = useState(authStatus?.tenantId || '');
  const [clientId, setClientId] = useState(authStatus?.clientId || '');
  const [loading, setLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [editing, setEditing] = useState(!authStatus?.tenantId || !authStatus?.clientId);
  const statusCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Compute these values before using them in useEffect
  const isConfigured = (authStatus?.tenantId && authStatus?.clientId) || authStatus?.status === 'READY' || authStatus?.status === 'AUTHENTICATED';
  const isAuthenticated = authStatus?.status === 'AUTHENTICATED';
  const isAuthenticating = authStatus?.status === 'AUTHENTICATING';

  // Update local state when authStatus changes
  useEffect(() => {
    if (authStatus?.tenantId && !tenantId) {
      setTenantId(authStatus.tenantId);
    }
    if (authStatus?.clientId && !clientId) {
      setClientId(authStatus.clientId);
    }
  }, [authStatus?.tenantId, authStatus?.clientId]);

  // Poll for authentication status if there was an error but device code was shown
  useEffect(() => {
    if (authStatus?.lastError && deviceCodeMessage && !isAuthenticated && !isAuthenticating) {
      // Start polling to check if user authenticated successfully despite the error
      console.log('[StepConnect] Starting status polling after error...');
      statusCheckIntervalRef.current = setInterval(async () => {
        if (window.syscatApi) {
          try {
            const status = await window.syscatApi.getAuthStatus();
            console.log('[StepConnect] Status check:', status.status);
            if (status.status === 'AUTHENTICATED') {
              console.log('[StepConnect] Authentication detected! Stopping polling.');
              if (statusCheckIntervalRef.current) {
                clearInterval(statusCheckIntervalRef.current);
                statusCheckIntervalRef.current = null;
              }
              // Force UI update by refreshing status
              window.location.reload();
            }
          } catch (error) {
            console.error('[StepConnect] Error checking status:', error);
          }
        }
      }, 3000); // Check every 3 seconds

      // Stop polling after 5 minutes
      setTimeout(() => {
        if (statusCheckIntervalRef.current) {
          clearInterval(statusCheckIntervalRef.current);
          statusCheckIntervalRef.current = null;
        }
      }, 300000);
    }

    return () => {
      if (statusCheckIntervalRef.current) {
        clearInterval(statusCheckIntervalRef.current);
        statusCheckIntervalRef.current = null;
      }
    };
  }, [authStatus?.lastError, deviceCodeMessage, isAuthenticated, isAuthenticating]);

  // Only disable inputs when actively authenticating
  const inputsDisabled = isAuthenticating || (!editing && isConfigured);

  const handleConfigure = async () => {
    if (!tenantId.trim() || !clientId.trim()) {
      alert('Please enter both Tenant ID and Client ID');
      return;
    }

    setLoading(true);
    try {
      await onConnect(tenantId.trim(), clientId.trim());
      setEditing(false); // Stop editing after successful configuration
    } catch (error: any) {
      alert('Configuration failed: ' + (error?.message || error));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      await onLogin();
    } catch (error: any) {
      alert('Login failed: ' + (error?.message || error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card p-8 space-y-8 animate-fade-in">
      <div>
        <h2 className="text-3xl font-semibold text-slate-100 mb-2 tracking-tight">Connect Your M365 Tenant</h2>
        <p className="text-slate-400 text-sm">We only connect to Microsoft's Graph API - no third parties</p>
      </div>

      <div className="space-y-4">
        {isConfigured && !editing && (
          <div className="glass-card-elevated p-4 flex items-center justify-between border-emerald-500/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-200 mb-0.5">Configuration saved</p>
                <p className="text-xs text-slate-500">Tenant: {authStatus?.tenantId}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-sm text-syscat-orange hover:text-orange-500 font-medium transition-colors"
            >
              Edit
            </button>
          </div>
        )}

        {(editing || !isConfigured) && (
          <>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Tenant ID</label>
              <input
                type="text"
                className="input-field"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                disabled={inputsDisabled}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Client ID</label>
              <input
                type="text"
                className="input-field"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                disabled={inputsDisabled}
              />
            </div>
          </>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className="text-sm text-syscat-orange hover:underline"
          >
            {showHelp ? 'Hide' : 'Show'} setup instructions
          </button>
        </div>

        {showHelp && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-sm space-y-2">
            <p className="font-medium text-slate-200">How to get your Tenant ID and Client ID:</p>
            <ol className="list-decimal list-inside space-y-1 text-slate-400">
              <li>Go to Azure Portal → Azure Active Directory</li>
              <li>Copy your Tenant ID from the Overview page</li>
              <li>Go to App registrations → New registration</li>
              <li>Name it "SysCat" and register</li>
              <li>Copy the Application (client) ID</li>
              <li>Add API permissions: Microsoft Graph → Delegated → Directory.Read.All</li>
            </ol>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        {(editing || !isConfigured) && (
          <button onClick={handleConfigure} disabled={loading || inputsDisabled} className="btn-primary">
            {loading ? 'Saving...' : 'Save Configuration'}
          </button>
        )}

        {isConfigured && editing && (
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              // Restore original values
              setTenantId(authStatus?.tenantId || '');
              setClientId(authStatus?.clientId || '');
            }}
            disabled={loading}
            className="btn-secondary"
          >
            Cancel
          </button>
        )}

        {isConfigured && !isAuthenticated && !isAuthenticating && (
          <div className="space-y-3">
            <button 
              onClick={async () => {
                setLoading(true);
                try {
                  console.log('[StepConnect] Initiating SSO login...');
                  const result = await (window as any).syscatApi.loginWithSSO();
                  console.log('[StepConnect] SSO login result:', result);
                  
                  if (result.status?.status === 'AUTHENTICATED') {
                    // Small delay to show success, then reload
                    setTimeout(() => {
                      window.location.reload();
                    }, 1500);
                  } else {
                    throw new Error('Authentication did not complete successfully');
                  }
                } catch (error: any) {
                  console.error('[StepConnect] SSO login error:', error);
                  const errorMessage = error?.message || String(error);
                  
                  // Show detailed error if it's a permission issue
                  if (errorMessage.includes('required permissions') || errorMessage.includes('Global')) {
                    alert(`⚠️ Permission Required\n\n${errorMessage}\n\nPlease sign in with an account that has Global Administrator or Global Reader permissions.`);
                  } else {
                    alert(`SSO Login failed: ${errorMessage}`);
                  }
                } finally {
                  setLoading(false);
                }
              }} 
              disabled={loading} 
              className="btn-primary w-full"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Signing in with Microsoft...</span>
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>Sign in with Microsoft SSO</span>
                </span>
              )}
            </button>
            
            <div className="text-center">
              <button 
                onClick={handleLogin} 
                disabled={loading} 
                className="text-sm text-slate-400 hover:text-slate-300 transition-colors underline"
              >
                Use Device Code instead
              </button>
            </div>
          </div>
        )}

        {isAuthenticating && (
          <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="flex-shrink-0 w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-blue-300 text-sm font-medium">Waiting for authentication...</span>
          </div>
        )}

        {isAuthenticated && (
          <div className="flex items-center gap-3 px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
            <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-emerald-400 text-sm font-medium">Authenticated successfully!</span>
          </div>
        )}
      </div>

      {deviceCodeMessage && (
        <div className="glass-card-elevated border-2 border-syscat-orange/40 rounded-xl p-6 space-y-4 animate-slide-in">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-syscat-orange/10 border border-syscat-orange/30 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-syscat-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-100 mb-2">Device Code Authentication</h3>
                <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-4 font-mono text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {deviceCodeMessage}
                </div>
              </div>
              <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-4">
                <p className="text-xs font-medium text-slate-300 mb-3">Instructions:</p>
                <ol className="text-xs text-slate-400 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-syscat-orange/10 border border-syscat-orange/30 flex items-center justify-center text-syscat-orange text-xs font-medium mt-0.5">1</span>
                    <span>Open the URL shown above in your browser</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-syscat-orange/10 border border-syscat-orange/30 flex items-center justify-center text-syscat-orange text-xs font-medium mt-0.5">2</span>
                    <span>Enter the code shown above when prompted</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-syscat-orange/10 border border-syscat-orange/30 flex items-center justify-center text-syscat-orange text-xs font-medium mt-0.5">3</span>
                    <span>Sign in with your Microsoft account</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-syscat-orange/10 border border-syscat-orange/30 flex items-center justify-center text-syscat-orange text-xs font-medium mt-0.5">4</span>
                    <span>Wait for this app to detect your authentication</span>
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {authStatus?.lastError && (
        <div className="glass-card-elevated border-red-500/30 rounded-xl p-5 space-y-4 animate-slide-in">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-400 mb-1">Authentication Error</p>
              <p className="text-xs text-red-300 leading-relaxed">{authStatus.lastError}</p>
            </div>
          </div>
          {authStatus.lastError.includes('invalid_client') && (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 mt-2">
              <p className="text-xs font-medium text-slate-300 mb-3">Invalid Client Error - Common Fixes:</p>
              <ul className="text-xs text-slate-400 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">•</span>
                  <span>Verify your Client ID is correct in Azure Portal</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">•</span>
                  <span>Ensure the app registration allows "Public client flows" (Authentication → Advanced settings → Allow public client flows: Yes)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">•</span>
                  <span>Check that the app registration exists in the correct tenant</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">•</span>
                  <span>Verify API permissions are configured (Microsoft Graph → Delegated permissions)</span>
                </li>
              </ul>
              <button
                onClick={async () => {
                  if (window.syscatApi) {
                    const status = await window.syscatApi.getAuthStatus();
                    if (status.status === 'AUTHENTICATED') {
                      window.location.reload();
                    }
                  }
                }}
                className="mt-4 text-xs text-syscat-orange hover:text-orange-500 font-medium transition-colors"
              >
                Check Authentication Status →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StepConnect;

