import React from 'react';

interface TenantStatsProps {
  summary: any;
}

const TenantStats: React.FC<TenantStatsProps> = ({ summary }) => {
  if (!summary) return null;

  return (
    <div className="glass-card p-6">
      <h2 className="text-xl font-heading font-bold mb-4">📊 Quick Stats</h2>
      <div className="grid grid-cols-4 gap-4">
        <div>
          <p className="text-2xl font-bold text-slate-100">{summary.userCount || 0}</p>
          <p className="text-sm text-slate-400">Total Users</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-100">{summary.licensedUserCount || 0}</p>
          <p className="text-sm text-slate-400">Licensed Users</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-100">{summary.guestUserCount || 0}</p>
          <p className="text-sm text-slate-400">Guest Users</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-emerald-400">
            ${summary.savingsOpportunity?.estimatedMonthlySavings?.toFixed(0) || 0}
          </p>
          <p className="text-sm text-slate-400">Monthly Savings</p>
        </div>
      </div>
    </div>
  );
};

export default TenantStats;

