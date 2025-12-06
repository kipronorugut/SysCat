import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import StepWelcome from './StepWelcome';
import StepConnect from './StepConnect';
import StepScan from './StepScan';
import StepComplete from './StepComplete';

interface SetupWizardProps {
  onComplete: () => void;
}

const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete }) => {
  const { authStatus, configureAuth, loginDeviceCode, deviceCodeMessage } = useAuth();
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanning, setScanning] = useState(false);
  
  // Determine initial step based on auth status
  // If already configured (READY), skip to connect step (2)
  // If authenticated but needs scan, go to scan step (3)
  const getInitialStep = (): number => {
    if (!authStatus) return 1; // No status yet, show welcome
    if (authStatus.status === 'READY') return 2; // Configured but not authenticated
    if (authStatus.status === 'AUTHENTICATED') return 3; // Authenticated, ready for scan
    return 1; // Default to welcome
  };
  
  const [currentStep, setCurrentStep] = useState(getInitialStep());
  
  // Update step when auth status changes
  useEffect(() => {
    if (!authStatus) {
      // Still loading, keep current step
      return;
    }
    
    const newStep = getInitialStep();
    setCurrentStep((prevStep) => {
      if (newStep !== prevStep) {
        console.log('[SetupWizard] Auth status changed, updating step from', prevStep, 'to', newStep, 'Status:', authStatus.status);
        return newStep;
      }
      return prevStep;
    });
  }, [authStatus]);

  const handleConnect = async (tenantId: string, clientId: string) => {
    await configureAuth(tenantId, clientId);
    // Stay on step 2 (connect) - user can now login
    console.log('[SetupWizard] Auth configured, ready for login');
  };

  const handleLogin = async () => {
    const result = await loginDeviceCode();
    console.log('[SetupWizard] Login result:', result);
    // Wait for auth status to update, then auto-advance to scan
    // The useEffect will handle the step change when status becomes AUTHENTICATED
    // Don't call handleScan directly - let StepScan trigger it automatically
    // This ensures StepScan's error handling works properly
    setTimeout(() => {
      if (authStatus?.status === 'AUTHENTICATED' || result?.status?.status === 'AUTHENTICATED') {
        console.log('[SetupWizard] Authenticated, moving to scan step');
        setCurrentStep(3);
        // StepScan will automatically trigger scan when it mounts/sees status change
      }
    }, 2000);
  };

  const handleScan = async () => {
    setScanning(true);
    try {
      const summary = await window.syscatApi.getTenantSummary();
      setScanResult(summary);
      setCurrentStep(4);
    } catch (error: any) {
      console.error('[SetupWizard] Scan failed:', error);
      window.syscatApi.logError('Scan failed', error);
      // Don't advance to step 4, stay on step 3 so StepScan can show the error
      // Re-throw so StepScan can catch and display it
      throw error;
    } finally {
      setScanning(false);
    }
  };

  const handleComplete = () => {
    onComplete();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-syscat-dark via-slate-900 to-syscat-dark flex items-center justify-center p-8">
      <div className="w-full max-w-4xl">
        {currentStep === 1 && <StepWelcome onContinue={() => setCurrentStep(2)} />}
        {currentStep === 2 && (
          <StepConnect
            onConnect={handleConnect}
            onLogin={handleLogin}
            deviceCodeMessage={deviceCodeMessage}
            authStatus={authStatus}
          />
        )}
        {currentStep === 3 && (
          <StepScan 
            scanning={scanning} 
            onScan={async () => {
              // Wrap handleScan to ensure errors are caught and don't become uncaught promise rejections
              try {
                await handleScan();
              } catch (error: any) {
                // Error is logged in handleScan, but we need to re-throw it
                // so StepScan can catch and display it
                throw error;
              }
            }} 
            scanResult={scanResult} 
          />
        )}
        {currentStep === 4 && <StepComplete scanResult={scanResult} onComplete={handleComplete} />}
      </div>
    </div>
  );
};

export default SetupWizard;

