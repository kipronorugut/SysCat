import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import SetupWizard from './components/setup/SetupWizard';
import Dashboard from './components/dashboard/Dashboard';

const App: React.FC = () => {
  const [apiReady, setApiReady] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  
  // Always call useAuth - it handles syscatApi not being available yet
  const { authStatus } = useAuth();
  
  const [isSetupComplete, setIsSetupComplete] = useState(false);

  useEffect(() => {
    console.log('[App] Component mounted, checking for syscatApi...');
    
    // Check for syscatApi - preload script should have already executed
    const api = (window as any).syscatApi;
    
    let timeoutId: NodeJS.Timeout | null = null;
    
    if (api && typeof api.getAuthStatus === 'function') {
      console.log('[App] syscatApi found and valid');
      setApiReady(true);
      setApiError(null);
    } else {
      console.warn('[App] syscatApi not immediately available, will retry...');
      
      // Retry after a short delay - preload might still be loading
      timeoutId = setTimeout(() => {
        const apiRetry = (window as any).syscatApi;
        if (apiRetry && typeof apiRetry.getAuthStatus === 'function') {
          console.log('[App] syscatApi found on retry');
          setApiReady(true);
          setApiError(null);
        } else {
          console.error('[App] syscatApi still not available after retry');
          console.error('[App] Check main process logs - preload script should have executed');
          setApiError('syscatApi not available. Preload script may not have loaded.');
          setApiReady(false);
        }
      }, 500);
    }
    
    // Cleanup function - always return it
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []); // Empty deps - only run once on mount

  useEffect(() => {
    // Check if setup is complete - only when actually authenticated
    // Status 'READY' means configured but not authenticated yet - user still needs to login
    console.log('[App] Auth status changed:', authStatus);
    if (authStatus?.status === 'AUTHENTICATED') {
      console.log('[App] User is authenticated, setup complete');
      setIsSetupComplete(true);
    } else {
      console.log('[App] User not authenticated, showing setup wizard. Status:', authStatus?.status);
      setIsSetupComplete(false);
    }
  }, [authStatus]);

  // Show loading state while API initializes
  if (!apiReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-syscat-dark via-slate-900 to-syscat-dark">
        <div className="text-center space-y-8 animate-fade-in">
          {/* Sophisticated loading indicator */}
          <div className="relative mx-auto w-20 h-20">
            <div className="absolute inset-0 rounded-full border-4 border-slate-800/50"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-syscat-orange animate-spin"></div>
            <div className="absolute inset-2 rounded-full bg-slate-900/50 backdrop-blur-sm border border-slate-800/30 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-syscat-orange animate-pulse-glow"></div>
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-slate-100 tracking-tight">Initializing SysCat</h1>
            <p className="text-slate-400 text-sm">Preparing your workspace...</p>
          </div>

          {apiError && (
            <div className="mt-8 max-w-md mx-auto glass-card-elevated p-6 border-red-500/30 animate-slide-in">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-red-500/20 border border-red-500/50 flex items-center justify-center">
                  <span className="text-red-400 text-xs">!</span>
                </div>
                <div className="flex-1 text-left">
                  <p className="text-red-400 font-medium mb-1">Initialization Error</p>
                  <p className="text-slate-300 text-sm mb-2">{apiError}</p>
                  <p className="text-slate-500 text-xs">
                    Check the console (F12) for detailed error information
                  </p>
                </div>
              </div>
            </div>
          )}
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

