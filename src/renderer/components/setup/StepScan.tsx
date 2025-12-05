import React from 'react';

interface StepScanProps {
  scanning: boolean;
  onScan: () => void;
  scanResult: any;
}

const StepScan: React.FC<StepScanProps> = ({ scanning, onScan, scanResult }) => {
  React.useEffect(() => {
    if (!scanning && !scanResult) {
      onScan();
    }
  }, []);

  return (
    <div className="glass-card p-12 text-center space-y-8">
      <div className="space-y-4">
        <h2 className="text-3xl font-heading font-bold">First Scan</h2>
        <p className="text-slate-400">Sit back a sec, we're looking for things to clean up</p>
      </div>

      {scanning && (
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-syscat-orange"></div>
          </div>
          <div className="space-y-2 text-sm text-slate-400">
            <p>✓ Fetched users</p>
            <p>✓ Fetched licenses</p>
            <p>✓ Checked last sign-ins</p>
            <p>✓ Looked for stale accounts</p>
            <p>✓ Looked for unused licenses</p>
          </div>
        </div>
      )}

      {scanResult && (
        <div className="text-left space-y-4">
          <p className="text-emerald-400 font-medium">✓ Scan complete!</p>
        </div>
      )}
    </div>
  );
};

export default StepScan;

