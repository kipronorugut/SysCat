import React, { useState, useEffect } from 'react';

interface SafeFixPanelProps {
  onFixComplete: () => void;
}

const SafeFixPanel: React.FC<SafeFixPanelProps> = ({ onFixComplete }) => {
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);

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

  const handleFixAll = async () => {
    if (!plan) return;

    if (!confirm('Apply all safe fixes? This will reclaim unused licenses and review inactive accounts.')) {
      return;
    }

    setApplying(true);
    try {
      const result = await window.syscatApi.applySafeFixes(plan);
      window.syscatApi.logInfo('Safe fixes applied', result);
      alert(`Success! ${result.actionsTaken} actions taken. Estimated savings: $${result.savings.estimatedMonthlySavings}/month`);
      onFixComplete();
      await loadPlan(); // Refresh plan
    } catch (error: any) {
      window.syscatApi.logError('Failed to apply fixes', error);
      alert('Failed to apply fixes: ' + (error?.message || error));
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="glass-card p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-slate-700 rounded w-1/4"></div>
          <div className="h-20 bg-slate-700 rounded"></div>
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
      <div className="glass-card p-8 text-center">
        <p className="text-slate-300 text-lg">🎉 No issues found! Your tenant is looking good.</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-8 space-y-6">
      <div>
        <h2 className="text-2xl font-heading font-bold mb-2">🧠 Autopilot Recommendations</h2>
        <p className="text-slate-400">We've analyzed your tenant. Here's what we found:</p>
      </div>

      <div className="space-y-4">
        {plan.licenseWaste.targets.length > 0 && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-100">💸 License Waste</h3>
                <p className="text-sm text-slate-400 mt-1">
                  {plan.licenseWaste.targets.length} unused licenses → Estimated ${plan.licenseWaste.estimatedSavings}/year wasted
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-300 mb-4">
              Recommended Action: Reclaim unused licenses from disabled accounts.
            </p>
            <p className="text-xs text-slate-500">Impact: No access revoked, just freeing SKU.</p>
          </div>
        )}

        {plan.inactiveAccounts.targets.length > 0 && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-100">🧍 Inactive Accounts</h3>
                <p className="text-sm text-slate-400 mt-1">
                  {plan.inactiveAccounts.targets.length} users inactive for 90+ days
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-300 mb-4">
              Recommended Action: Review and remove licenses from inactive accounts.
            </p>
            <p className="text-xs text-slate-500">Impact: Reversible for 30 days.</p>
          </div>
        )}

        {plan.mfaGaps.count > 0 && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-100">🔒 Security Gaps</h3>
                <p className="text-sm text-slate-400 mt-1">{plan.mfaGaps.count} active users without MFA</p>
              </div>
            </div>
            <p className="text-sm text-slate-300 mb-4">
              Recommended Action: Enforce MFA registration for these users.
            </p>
            <p className="text-xs text-slate-500">Impact: Next login will require MFA setup.</p>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-slate-800">
        <button
          onClick={handleFixAll}
          disabled={applying}
          className="btn-primary w-full text-lg py-4"
        >
          {applying ? 'Applying fixes...' : '🛠️ Fix All Safe Issues'}
        </button>
        <p className="text-xs text-slate-500 text-center mt-2">
          ({plan.licenseWaste.targets.length + plan.inactiveAccounts.targets.length} categories selected)
        </p>
      </div>
    </div>
  );
};

export default SafeFixPanel;

