import React from 'react';

interface StepWelcomeProps {
  onContinue: () => void;
}

const StepWelcome: React.FC<StepWelcomeProps> = ({ onContinue }) => {
  return (
    <div className="glass-card p-12 text-center space-y-8">
      <div className="space-y-4">
        <h1 className="text-5xl font-heading font-bold text-syscat-orange">SysCat</h1>
        <p className="text-xl text-slate-300 font-secondary">
          The lazy sysadmin's M365 automation sidekick
        </p>
      </div>

      <div className="space-y-6 text-left max-w-2xl mx-auto">
        <p className="text-slate-200 text-lg leading-relaxed">
          We'll scan your tenant, show where you're wasting licenses and at risk, and you decide
          what to fix.
        </p>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🔍</span>
            <div>
              <p className="font-medium text-slate-100">We'll scan your tenant</p>
              <p className="text-sm text-slate-400">Find unused licenses, inactive accounts, and security gaps</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-2xl">💰</span>
            <div>
              <p className="font-medium text-slate-100">Show where you're wasting money</p>
              <p className="text-sm text-slate-400">See exactly how much you could save each month</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-2xl">🛠️</span>
            <div>
              <p className="font-medium text-slate-100">You decide what to fix</p>
              <p className="text-sm text-slate-400">One button to fix safe issues, or review everything first</p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800">
          <p className="text-sm text-slate-500">
            ✓ 100% self-hosted • Zero telemetry • All data stays on your machine
          </p>
        </div>
      </div>

      <button onClick={onContinue} className="btn-primary text-lg px-8 py-4">
        Let's Get You Some Time Back →
      </button>
    </div>
  );
};

export default StepWelcome;

