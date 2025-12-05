import React from 'react';

interface StepCompleteProps {
  scanResult: any;
  onComplete: () => void;
}

const StepComplete: React.FC<StepCompleteProps> = ({ scanResult, onComplete }) => {
  const savings = scanResult?.savingsOpportunity || { estimatedMonthlySavings: 0 };

  return (
    <div className="glass-card p-12 space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-heading font-bold text-syscat-orange">🎉 You're All Set!</h2>
        <p className="text-xl text-slate-300">SysCat is now monitoring your M365 tenant</p>
      </div>

      {scanResult && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-800/50 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-slate-100">{scanResult.userCount || 0}</p>
              <p className="text-sm text-slate-400 mt-1">Total Users</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-slate-100">{scanResult.licensedUserCount || 0}</p>
              <p className="text-sm text-slate-400 mt-1">Licensed Users</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-slate-100">{scanResult.guestUserCount || 0}</p>
              <p className="text-sm text-slate-400 mt-1">Guest Users</p>
            </div>
          </div>

          {savings.estimatedMonthlySavings > 0 && (
            <div className="bg-emerald-900/20 border border-emerald-800 rounded-xl p-6">
              <p className="text-lg font-semibold text-emerald-400 mb-2">💰 Savings Opportunity</p>
              <p className="text-3xl font-bold text-emerald-300">
                ${savings.estimatedMonthlySavings.toFixed(0)}/month
              </p>
              <p className="text-sm text-slate-400 mt-1">
                ${(savings.estimatedMonthlySavings * 12).toFixed(0)}/year potential savings
              </p>
            </div>
          )}
        </div>
      )}

      <button onClick={onComplete} className="btn-primary w-full text-lg py-4">
        View Dashboard →
      </button>
    </div>
  );
};

export default StepComplete;

