import React, { useMemo } from 'react';
import RadialChart from './RadialChart';

interface TenantStatsProps {
  summary: any;
}

const TenantStats: React.FC<TenantStatsProps> = React.memo(({ summary }) => {
  if (!summary) return null;

  const totalUsers = summary.userCount || 0;
  const licensedUsers = summary.licensedUserCount || 0;
  const guestUsers = summary.guestUserCount || 0;
  const savings = summary.savingsOpportunity?.estimatedMonthlySavings || 0;

  // Calculate percentages for radial chart - memoized
  const maxUsers = Math.max(totalUsers, 1000); // Use a reasonable max for visualization
  const userDistribution = useMemo(() => [
    {
      label: 'Licensed',
      value: licensedUsers,
      max: maxUsers,
      color: '#3B82F6',
    },
    {
      label: 'Guest',
      value: guestUsers,
      max: maxUsers,
      color: '#8B5CF6',
    },
  ], [licensedUsers, guestUsers, maxUsers]);

  const stats = useMemo(() => [
    {
      label: 'Total Users',
      value: totalUsers,
      color: 'text-slate-100',
      bgGradient: 'from-slate-800/50 to-slate-900/50',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      label: 'Licensed Users',
      value: licensedUsers,
      color: 'text-blue-400',
      bgGradient: 'from-blue-900/30 to-blue-800/20',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      label: 'Guest Users',
      value: guestUsers,
      color: 'text-purple-400',
      bgGradient: 'from-purple-900/30 to-purple-800/20',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      label: 'Monthly Savings',
      value: `$${savings.toFixed(0)}`,
      color: 'text-emerald-400',
      bgGradient: 'from-emerald-900/30 to-emerald-800/20',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ], []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
      {/* Stats Grid */}
      <div className="lg:col-span-2 grid grid-cols-2 gap-4">
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            className={`relative overflow-hidden rounded-xl p-6 bg-gradient-to-br ${stat.bgGradient} border border-slate-800/50 hover:border-slate-700/60 transition-all duration-300 hover-lift glass-card-elevated`}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg bg-slate-800/50 border border-slate-700/50 flex items-center justify-center ${stat.color.replace('text-', 'text-')}`}>
                  {stat.icon}
                </div>
              </div>
              <p className={`text-3xl font-bold ${stat.color} mb-1 tracking-tight`}>
                {stat.value}
              </p>
              <p className="text-slate-400 text-sm font-medium">{stat.label}</p>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-full -mr-16 -mt-16"></div>
          </div>
        ))}
      </div>

      {/* Radial Chart */}
      <div className="glass-card p-6 flex flex-col items-center justify-center">
        <h3 className="text-sm font-medium text-slate-400 mb-4">User Distribution</h3>
        <RadialChart
          data={userDistribution}
          size={180}
          strokeWidth={12}
          centerContent={
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-100">{totalUsers}</p>
              <p className="text-xs text-slate-400">Total Users</p>
            </div>
          }
        />
      </div>
    </div>
  );
});

TenantStats.displayName = 'TenantStats';

export default TenantStats;

