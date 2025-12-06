import React from 'react';

interface StepWelcomeProps {
  onContinue: () => void;
}

const StepWelcome: React.FC<StepWelcomeProps> = ({ onContinue }) => {
  const features = [
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
      title: "We'll scan your tenant",
      description: "Find unused licenses, inactive accounts, and security gaps",
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: "Show where you're wasting money",
      description: "See exactly how much you could save each month",
    },
    {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      title: "You decide what to fix",
      description: "One button to fix safe issues, or review everything first",
    },
  ];

  return (
    <div className="glass-card p-12 text-center space-y-10 animate-fade-in">
      <div className="space-y-4">
        <h1 className="text-5xl font-semibold text-syscat-orange tracking-tight">SysCat</h1>
        <p className="text-xl text-slate-300 font-normal">
          The lazy sysadmin's M365 automation sidekick
        </p>
      </div>

      <div className="space-y-8 text-left max-w-2xl mx-auto">
        <p className="text-slate-200 text-lg leading-relaxed text-center">
          We'll scan your tenant, show where you're wasting licenses and at risk, and you decide
          what to fix.
        </p>

        <div className="space-y-4">
          {features.map((feature, index) => (
            <div
              key={index}
              className="flex items-start gap-4 p-4 rounded-xl bg-slate-800/30 border border-slate-800/50 hover:border-slate-700/50 transition-all duration-300"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-syscat-orange/10 border border-syscat-orange/30 flex items-center justify-center text-syscat-orange">
                {feature.icon}
              </div>
              <div className="flex-1">
                <p className="font-medium text-slate-100 mb-1">{feature.title}</p>
                <p className="text-sm text-slate-400 leading-relaxed">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-6 border-t border-slate-800/50">
          <div className="flex items-center justify-center gap-6 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>100% self-hosted</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Zero telemetry</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Data stays local</span>
            </div>
          </div>
        </div>
      </div>

      <button onClick={onContinue} className="btn-primary text-lg px-8 py-4">
        <span className="flex items-center gap-2">
          Let's Get You Some Time Back
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </span>
      </button>
    </div>
  );
};

export default StepWelcome;

