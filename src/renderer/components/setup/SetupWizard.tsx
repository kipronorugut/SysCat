import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import StepWelcome from './StepWelcome';
import StepConnect from './StepConnect';
import StepScan from './StepScan';
import StepComplete from './StepComplete';

interface SetupWizardProps {
  onComplete: () => void;
}

const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const { authStatus, configureAuth, loginDeviceCode, deviceCodeMessage } = useAuth();
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanning, setScanning] = useState(false);

  const handleConnect = async (tenantId: string, clientId: string) => {
    await configureAuth(tenantId, clientId);
    setCurrentStep(2);
  };

  const handleLogin = async () => {
    await loginDeviceCode();
    // Auto-advance to scan after successful login
    setTimeout(() => {
      setCurrentStep(3);
      handleScan();
    }, 2000);
  };

  const handleScan = async () => {
    setScanning(true);
    try {
      const summary = await window.syscatApi.getTenantSummary();
      setScanResult(summary);
      setCurrentStep(4);
    } catch (error: any) {
      window.syscatApi.logError('Scan failed', error);
      alert('Scan failed: ' + (error?.message || error));
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
          <StepScan scanning={scanning} onScan={handleScan} scanResult={scanResult} />
        )}
        {currentStep === 4 && <StepComplete scanResult={scanResult} onComplete={handleComplete} />}
      </div>
    </div>
  );
};

export default SetupWizard;

