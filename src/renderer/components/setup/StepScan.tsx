import React, { useState } from 'react';

interface StepScanProps {
  scanning: boolean;
  onScan: () => Promise<void>;
  scanResult: any;
}

const StepScan: React.FC<StepScanProps> = ({ scanning, onScan, scanResult }) => {
  const [scanError, setScanError] = useState<string | null>(null);
  const [hasAttemptedScan, setHasAttemptedScan] = useState(false);

  const handleScanError = React.useCallback((error: any) => {
    console.error('[StepScan] Scan error:', error);
    
    // Extract meaningful error message
    let errorMessage = 'Scan failed';
    if (error?.message) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    
    // Check for specific error patterns
    if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
      errorMessage = 'Access denied (403 Forbidden). Missing required API permissions.';
    } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
      errorMessage = 'Authentication failed. Please log in again.';
    }
    
    setScanError(errorMessage);
  }, []);

  // Monitor for errors when scanning state changes
  React.useEffect(() => {
    let timeoutId: NodeJS.Timeout | undefined;
    
    // When scanning completes and there's no result, check if we need to show an error
    // This handles the case where SetupWizard's handleScan was called directly
    if (!scanning && !scanResult && hasAttemptedScan && !scanError) {
      // Check after a brief delay to see if an error occurred
      // If scanning finished without result and no error was caught, there might be an uncaught error
      timeoutId = setTimeout(() => {
        // If still no result and no error after a delay, show a generic error
        // This shouldn't normally happen, but acts as a safety net
        if (!scanResult && !scanError) {
          console.warn('[StepScan] Scan completed without result or error - this may indicate an uncaught error');
        }
      }, 500);
    }
    
    // Clear error when scanning starts (retry)
    if (scanning && scanError) {
      setScanError(null);
    }
    
    // Return cleanup function (always return something, even if undefined)
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [scanning, scanResult, hasAttemptedScan, scanError]);

  React.useEffect(() => {
    // Trigger initial scan if we haven't attempted it yet
    // Only trigger when scanning is false, meaning no active scan is running
    if (!scanning && !scanResult && !hasAttemptedScan && !scanError) {
      console.log('[StepScan] Triggering initial scan...');
      setHasAttemptedScan(true);
      // Initial scan - wrap to catch errors
      onScan().catch((error: any) => {
        console.error('[StepScan] Initial scan error caught:', error);
        handleScanError(error);
      });
    }
  }, [scanning, scanResult, hasAttemptedScan, scanError, onScan, handleScanError]);

  const handleRetry = async () => {
    setScanError(null);
    setHasAttemptedScan(false);
    try {
      await onScan();
    } catch (error: any) {
      handleScanError(error);
    }
  };

  const isPermissionError = scanError?.includes('403') || scanError?.includes('Forbidden') || scanError?.includes('permission');

  const scanSteps = [
    'Fetched users',
    'Fetched licenses',
    'Checked last sign-ins',
    'Looked for stale accounts',
    'Looked for unused licenses',
  ];

  return (
    <div className="glass-card p-12 text-center space-y-10 animate-fade-in">
      <div className="space-y-3">
        <h2 className="text-3xl font-semibold text-slate-100 tracking-tight">First Scan</h2>
        <p className="text-slate-400 text-sm">Sit back a sec, we're looking for things to clean up</p>
      </div>

      {scanning && !scanError && (
        <div className="space-y-6">
          <div className="flex justify-center">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 rounded-full border-4 border-slate-800/50"></div>
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-syscat-orange animate-spin"></div>
              <div className="absolute inset-2 rounded-full bg-slate-900/50 backdrop-blur-sm border border-slate-800/30 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-syscat-orange animate-pulse-glow"></div>
              </div>
            </div>
          </div>
          <div className="space-y-2.5 text-sm text-slate-400 max-w-md mx-auto">
            {scanSteps.map((step, index) => (
              <div key={index} className="flex items-center gap-3 justify-center animate-fade-in" style={{ animationDelay: `${index * 0.2}s` }}>
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {scanError && (
        <div className="glass-card-elevated border-red-500/30 rounded-xl p-8 space-y-6 text-left animate-slide-in">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-red-400 mb-2">Scan Failed</h3>
                <p className="text-sm text-red-300 leading-relaxed">{scanError}</p>
              </div>
              
              {isPermissionError && (
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-5 mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-sm font-medium text-slate-300">Missing API Permissions - Fix This:</p>
                  </div>
                  <ol className="text-xs text-slate-400 space-y-2.5">
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-xs font-medium mt-0.5">1</span>
                      <span>Go to Azure Portal → Azure Active Directory → App registrations</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-xs font-medium mt-0.5">2</span>
                      <span>Select your SysCat app registration</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-xs font-medium mt-0.5">3</span>
                      <span>Go to <strong className="text-slate-300">API permissions</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-xs font-medium mt-0.5">4</span>
                      <span>Click <strong className="text-slate-300">"Add a permission"</strong> → <strong className="text-slate-300">Microsoft Graph</strong> → <strong className="text-slate-300">Delegated permissions</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-xs font-medium mt-0.5">5</span>
                      <span>Add these permissions:
                        <ul className="list-none ml-4 mt-2 space-y-1.5">
                          <li className="flex items-start gap-2">
                            <span className="text-amber-400 mt-0.5">•</span>
                            <span><strong className="text-slate-300">Directory.Read.All</strong> (required to read all users)</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-amber-400 mt-0.5">•</span>
                            <span><strong className="text-slate-300">User.Read.All</strong> (optional, for user details)</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-amber-400 mt-0.5">•</span>
                            <span><strong className="text-slate-300">Organization.Read.All</strong> (optional, for organization info)</span>
                          </li>
                        </ul>
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-xs font-medium mt-0.5">6</span>
                      <span>Click <strong className="text-slate-300">"Grant admin consent"</strong> (if you have admin rights)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-xs font-medium mt-0.5">7</span>
                      <span>Come back here and click <strong className="text-slate-300">"Retry Scan"</strong> below</span>
                    </li>
                  </ol>
                </div>
              )}
              
              <button
                onClick={handleRetry}
                disabled={scanning}
                className="btn-primary mt-4"
              >
                {scanning ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Retrying...
                  </span>
                ) : 'Retry Scan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {scanResult && !scanError && (
        <div className="space-y-4 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 mb-2">
            <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-emerald-400 font-medium text-lg">Scan complete!</p>
          <p className="text-slate-400 text-sm">Your tenant has been analyzed successfully</p>
        </div>
      )}
    </div>
  );
};

export default StepScan;

