import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import SetupWizard from './components/setup/SetupWizard';
import Dashboard from './components/dashboard/Dashboard';

const App: React.FC = () => {
  const { authStatus, refreshStatus } = useAuth();
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [apiReady, setApiReady] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    console.log('[App] Component mounted, checking for syscatApi...');
    let retryCount = 0;
    const maxRetries = 50; // 5 seconds max wait
    
    // Wait for syscatApi to be available
    const checkApi = () => {
      if (window.syscatApi) {
        console.log('[App] syscatApi found, initializing...');
        setApiReady(true);
        setApiError(null);
        try {
          refreshStatus();
        } catch (error) {
          console.error('[App] Error calling refreshStatus:', error);
          setApiError(error instanceof Error ? error.message : 'Unknown error');
        }
      } else {
        retryCount++;
        if (retryCount >= maxRetries) {
          console.error('[App] syscatApi not available after max retries');
          setApiError('syscatApi not available. Preload script may not have loaded.');
        } else {
          console.warn(`[App] syscatApi not available yet, retrying... (${retryCount}/${maxRetries})`);
          setTimeout(checkApi, 100);
        }
      }
    };
    checkApi();
  }, [refreshStatus]);

  useEffect(() => {
    // Check if setup is complete (has auth config and is authenticated)
    if (
      authStatus?.status === 'AUTHENTICATED' ||
      (authStatus?.tenantId && authStatus?.clientId && authStatus?.status === 'READY')
    ) {
      setIsSetupComplete(true);
    } else {
      setIsSetupComplete(false);
    }
  }, [authStatus]);

  // Show loading state while API initializes
  if (!apiReady) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: '#0F172A', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#e2e8f0',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '64px',
            height: '64px',
            border: '4px solid #1e293b',
            borderTop: '4px solid #ea580c',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ color: '#94a3b8', marginBottom: '8px' }}>Loading SysCat...</p>
          {apiError && (
            <div style={{ 
              marginTop: '16px', 
              padding: '12px', 
              backgroundColor: '#7f1d1d', 
              borderRadius: '8px',
              color: '#fca5a5',
              maxWidth: '500px'
            }}>
              <p style={{ margin: 0, fontSize: '14px' }}>Error: {apiError}</p>
              <p style={{ margin: '8px 0 0 0', fontSize: '12px', opacity: 0.8 }}>
                Check the console (F12) for more details
              </p>
            </div>
          )}
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  // Show setup wizard if not configured/authenticated
  if (!isSetupComplete) {
    return <SetupWizard onComplete={() => setIsSetupComplete(true)} />;
  }

  // Show main dashboard
  return <Dashboard />;
};

export default App;

