import React from 'react';

interface StepCompleteProps {
  scanResult: any;
  onComplete: () => void;
}

const StepComplete: React.FC<StepCompleteProps> = ({ scanResult, onComplete }) => {
  const savings = scanResult?.savingsOpportunity || { estimatedMonthlySavings: 0 };

  return (
    <div className="glass-card p-12 space-y-10 animate-fade-in">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 mb-4">
          <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-4xl font-semibold text-slate-100 tracking-tight">You're All Set!</h2>
        <p className="text-lg text-slate-400">SysCat is now monitoring your M365 tenant</p>
      </div>

      {scanResult && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="glass-card-elevated rounded-xl p-6 text-center hover:border-slate-700/60 transition-all duration-300">
              <p className="text-3xl font-bold text-slate-100 mb-2">{scanResult.userCount || 0}</p>
              <p className="text-sm text-slate-400 font-medium">Total Users</p>
            </div>
            <div className="glass-card-elevated rounded-xl p-6 text-center hover:border-slate-700/60 transition-all duration-300">
              <p className="text-3xl font-bold text-slate-100 mb-2">{scanResult.licensedUserCount || 0}</p>
              <p className="text-sm text-slate-400 font-medium">Licensed Users</p>
            </div>
            <div className="glass-card-elevated rounded-xl p-6 text-center hover:border-slate-700/60 transition-all duration-300">
              <p className="text-3xl font-bold text-slate-100 mb-2">{scanResult.guestUserCount || 0}</p>
              <p className="text-sm text-slate-400 font-medium">Guest Users</p>
            </div>
          </div>

          {savings.estimatedMonthlySavings > 0 && (
            <div className="glass-card-elevated border-emerald-500/30 rounded-xl p-6 bg-gradient-to-br from-emerald-900/20 to-emerald-800/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-lg font-semibold text-emerald-400">Savings Opportunity</p>
              </div>
              <p className="text-4xl font-bold text-emerald-300 mb-2">
                ${savings.estimatedMonthlySavings.toFixed(0)}<span className="text-xl text-emerald-400">/month</span>
              </p>
              <p className="text-sm text-slate-400">
                ${(savings.estimatedMonthlySavings * 12).toFixed(0)}/year potential savings
              </p>
            </div>
          )}
        </div>
      )}

      <button onClick={onComplete} className="btn-primary w-full text-lg py-4">
        <span className="flex items-center justify-center gap-2">
          View Dashboard
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>
    </div>
  );
};

export default StepComplete;

