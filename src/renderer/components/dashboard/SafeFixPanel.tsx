import React, { useState, useEffect } from 'react';

interface SafeFixPanelProps {
  onFixComplete: () => void;
}

const SafeFixPanel: React.FC<SafeFixPanelProps> = ({ onFixComplete }) => {
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState<string | null>(null); // Track which category is being applied
  const [progress, setProgress] = useState<{ category: string; message: string } | null>(null);

  useEffect(() => {
    loadPlan();
  }, []);

  const loadPlan = async () => {
    setLoading(true);
    try {
      const data = await window.syscatApi.getSafeFixPlan();
      setPlan(data);
    } catch (error: any) {
      window.syscatApi.logError('Failed to load fix plan', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFixCategory = async (category: 'licenseWaste' | 'inactiveAccounts') => {
    if (!plan) return;

    const categoryNames = {
      licenseWaste: 'License Waste',
      inactiveAccounts: 'Inactive Accounts',
    };

    const categoryDetails = {
      licenseWaste: {
        title: 'Reclaim Unused Licenses',
        message: `This will remove licenses from ${plan.licenseWaste.targets.length} disabled account(s). This is safe - the accounts are already disabled.`,
      },
      inactiveAccounts: {
        title: 'Process Inactive Accounts',
        message: `This will process ${plan.inactiveAccounts.targets.length} inactive account(s) and reclaim their licenses. This is reversible for 30 days.`,
      },
    };

    const details = categoryDetails[category];
    if (!confirm(`${details.title}\n\n${details.message}\n\nContinue?`)) {
      return;
    }

    setApplying(category);
    setProgress({ category, message: 'Processing...' });
    
    try {
      const result = await window.syscatApi.applyCategoryFixes(plan, category);
      window.syscatApi.logInfo(`${categoryNames[category]} fixes applied`, result);
      
      setProgress({
        category,
        message: `✅ Success! ${result.actionsTaken} action(s) taken. Estimated savings: $${result.savings.estimatedMonthlySavings}/month`,
      });
      
      setTimeout(() => {
        setProgress(null);
        onFixComplete();
        loadPlan(); // Refresh plan
      }, 2000);
    } catch (error: any) {
      window.syscatApi.logError(`Failed to apply ${category} fixes`, error);
      setProgress({
        category,
        message: `❌ Error: ${error?.message || error}`,
      });
      setTimeout(() => setProgress(null), 3000);
    } finally {
      setApplying(null);
    }
  };

  const handleFixAll = async () => {
    if (!plan) return;

    const totalIssues = 
      plan.licenseWaste.targets.length + 
      plan.inactiveAccounts.targets.length;

    if (totalIssues === 0) {
      alert('No issues to fix!');
      return;
    }

    if (!confirm(
      `Apply all safe fixes?\n\n` +
      `• ${plan.licenseWaste.targets.length} unused license(s) to reclaim\n` +
      `• ${plan.inactiveAccounts.targets.length} inactive account(s) to process\n\n` +
      `This will reclaim licenses and process inactive accounts. All operations are safe and reversible.`
    )) {
      return;
    }

    setApplying('all');
    setProgress({ category: 'all', message: 'Applying all fixes...' });
    
    try {
      const result = await window.syscatApi.applySafeFixes(plan);
      window.syscatApi.logInfo('Safe fixes applied', result);
      
      setProgress({
        category: 'all',
        message: `✅ Success! ${result.actionsTaken} action(s) taken. Estimated savings: $${result.savings.estimatedMonthlySavings}/month`,
      });
      
      setTimeout(() => {
        setProgress(null);
        onFixComplete();
        loadPlan(); // Refresh plan
      }, 2000);
    } catch (error: any) {
      window.syscatApi.logError('Failed to apply fixes', error);
      setProgress({
        category: 'all',
        message: `❌ Error: ${error?.message || error}`,
      });
      setTimeout(() => setProgress(null), 3000);
    } finally {
      setApplying(null);
    }
  };

  if (loading) {
    return (
      <div className="glass-card p-8">
        <div className="space-y-4">
          <div className="h-6 skeleton w-1/3 rounded-lg"></div>
          <div className="h-32 skeleton rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (!plan) {
    return null;
  }

  const hasIssues =
    plan.licenseWaste.targets.length > 0 ||
    plan.inactiveAccounts.targets.length > 0 ||
    plan.mfaGaps.count > 0;

  if (!hasIssues) {
    return (
      <div className="glass-card p-12 text-center animate-fade-in">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 mb-4">
          <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-slate-200 text-lg font-medium mb-1">All Clear</p>
        <p className="text-slate-400 text-sm">No issues found. Your tenant is looking good.</p>
      </div>
    );
  }

  const getProgressStatus = () => {
    if (!progress) return null;
    const isSuccess = progress.message.includes('✅') || progress.message.includes('Success');
    const isError = progress.message.includes('❌') || progress.message.includes('Error');
    const isProcessing = !isSuccess && !isError;
    
    return { isSuccess, isError, isProcessing };
  };

  const progressStatus = getProgressStatus();

  return (
    <div className="glass-card p-8 space-y-8 animate-fade-in">
      <div>
        <h2 className="text-2xl font-semibold text-slate-100 mb-2">Autopilot Recommendations</h2>
        <p className="text-slate-400 text-sm">We've analyzed your tenant. Here's what we found:</p>
      </div>

      {progress && progressStatus && (
        <div className={`p-4 rounded-xl border backdrop-blur-sm ${
          progressStatus.isSuccess
            ? 'bg-emerald-500/10 border-emerald-500/30' 
            : progressStatus.isError
            ? 'bg-red-500/10 border-red-500/30'
            : 'bg-blue-500/10 border-blue-500/30'
        } animate-slide-in`}>
          <div className="flex items-center gap-3">
            {progressStatus.isSuccess && (
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center">
                <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            {progressStatus.isError && (
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-red-500/20 border border-red-500/50 flex items-center justify-center">
                <svg className="w-3 h-3 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}
            {progressStatus.isProcessing && (
              <div className="flex-shrink-0 w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
            )}
            <span className={`text-sm font-medium ${
              progressStatus.isSuccess ? 'text-emerald-300' :
              progressStatus.isError ? 'text-red-300' :
              'text-blue-300'
            }`}>
              {progress.message.replace(/✅|❌/g, '').trim()}
            </span>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {plan.licenseWaste.targets.length > 0 && (
          <div className="glass-card-elevated p-6 hover:border-emerald-500/30 transition-all duration-300 group">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                    <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-100">License Waste</h3>
                    <p className="text-sm text-slate-400 mt-0.5">
                      {plan.licenseWaste.targets.length} unused license{plan.licenseWaste.targets.length !== 1 ? 's' : ''} • ${plan.licenseWaste.estimatedSavings}/year wasted
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleFixCategory('licenseWaste')}
                disabled={applying !== null}
                className="px-5 py-2.5 bg-emerald-600/90 hover:bg-emerald-600 disabled:bg-slate-700/50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-all duration-300 disabled:opacity-50 hover:shadow-lg hover:shadow-emerald-500/20"
              >
                {applying === 'licenseWaste' ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Processing
                  </span>
                ) : 'Fix This'}
              </button>
            </div>
            <div className="space-y-2 pt-4 border-t border-slate-800/50">
              <p className="text-sm text-slate-300">
                Reclaim unused licenses from disabled accounts. No access revoked, just freeing SKU.
              </p>
              {plan.licenseWaste.targets.length > 0 && (
                <details className="mt-3 group/details">
                  <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-300 transition-colors list-none flex items-center gap-2">
                    <svg className="w-4 h-4 transition-transform group-open/details:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    View affected accounts ({plan.licenseWaste.targets.length})
                  </summary>
                  <ul className="mt-3 ml-6 space-y-1.5 text-xs text-slate-400">
                    {plan.licenseWaste.targets.slice(0, 5).map((target: any, idx: number) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-slate-500"></span>
                        {target.userName}
                      </li>
                    ))}
                    {plan.licenseWaste.targets.length > 5 && (
                      <li className="text-slate-500 italic">... and {plan.licenseWaste.targets.length - 5} more</li>
                    )}
                  </ul>
                </details>
              )}
            </div>
          </div>
        )}

        {plan.inactiveAccounts.targets.length > 0 && (
          <div className="glass-card-elevated p-6 hover:border-amber-500/30 transition-all duration-300 group">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                    <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-100">Inactive Accounts</h3>
                    <p className="text-sm text-slate-400 mt-0.5">
                      {plan.inactiveAccounts.targets.length} user{plan.inactiveAccounts.targets.length !== 1 ? 's' : ''} inactive for 90+ days
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleFixCategory('inactiveAccounts')}
                disabled={applying !== null}
                className="px-5 py-2.5 bg-amber-600/90 hover:bg-amber-600 disabled:bg-slate-700/50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-all duration-300 disabled:opacity-50 hover:shadow-lg hover:shadow-amber-500/20"
              >
                {applying === 'inactiveAccounts' ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Processing
                  </span>
                ) : 'Fix This'}
              </button>
            </div>
            <div className="space-y-2 pt-4 border-t border-slate-800/50">
              <p className="text-sm text-slate-300">
                Review and remove licenses from inactive accounts. Reversible for 30 days.
              </p>
              {plan.inactiveAccounts.targets.length > 0 && (
                <details className="mt-3 group/details">
                  <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-300 transition-colors list-none flex items-center gap-2">
                    <svg className="w-4 h-4 transition-transform group-open/details:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    View affected accounts ({plan.inactiveAccounts.targets.length})
                  </summary>
                  <ul className="mt-3 ml-6 space-y-1.5 text-xs text-slate-400">
                    {plan.inactiveAccounts.targets.slice(0, 5).map((target: any, idx: number) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-slate-500"></span>
                        {target.userName} <span className="text-slate-500">({target.daysInactive} days)</span>
                      </li>
                    ))}
                    {plan.inactiveAccounts.targets.length > 5 && (
                      <li className="text-slate-500 italic">... and {plan.inactiveAccounts.targets.length - 5} more</li>
                    )}
                  </ul>
                </details>
              )}
            </div>
          </div>
        )}

        {plan.mfaGaps.count > 0 && (
          <div className="glass-card-elevated p-6 opacity-75 border-slate-800/30">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-slate-700/30 border border-slate-700/50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-100">Security Gaps</h3>
                    <p className="text-sm text-slate-400 mt-0.5">{plan.mfaGaps.count} active user{plan.mfaGaps.count !== 1 ? 's' : ''} without MFA</p>
                  </div>
                </div>
              </div>
              <button
                disabled
                className="px-5 py-2.5 bg-slate-700/50 text-slate-500 rounded-lg text-sm font-medium cursor-not-allowed"
                title="MFA enforcement coming soon"
              >
                Coming Soon
              </button>
            </div>
            <div className="space-y-2 pt-4 border-t border-slate-800/50">
              <p className="text-sm text-slate-300">
                Enforce MFA registration for these users. Next login will require MFA setup.
              </p>
            </div>
          </div>
        )}
      </div>

      {hasIssues && (
        <div className="pt-6 border-t border-slate-800/50">
          <button
            onClick={handleFixAll}
            disabled={applying !== null}
            className="btn-primary w-full text-base py-4 px-6"
          >
            {applying === 'all' ? (
              <span className="flex items-center justify-center gap-3">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Applying fixes...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Fix All Safe Issues
              </span>
            )}
          </button>
          <p className="text-xs text-slate-500 text-center mt-3">
            This will apply fixes to {plan.licenseWaste.targets.length + plan.inactiveAccounts.targets.length} categor{plan.licenseWaste.targets.length + plan.inactiveAccounts.targets.length !== 1 ? 'ies' : 'y'} automatically
          </p>
        </div>
      )}
    </div>
  );
};

export default SafeFixPanel;

