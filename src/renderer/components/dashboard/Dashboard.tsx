import React, { useState, useEffect } from 'react';
import SafeFixPanel from './SafeFixPanel';
import TenantStats from './TenantStats';
import ActivityFeed from './ActivityFeed';

const Dashboard: React.FC = () => {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    setLoading(true);
    try {
      const data = await window.syscatApi.getTenantSummary();
      setSummary(data);
    } catch (error: any) {
      window.syscatApi.logError('Failed to load summary', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-syscat-orange"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-syscat-dark p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-heading font-bold text-syscat-orange">SysCat</h1>
            <p className="text-slate-400 mt-1">M365 Admin Autopilot</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
            <span>All systems operational</span>
          </div>
        </div>

        <TenantStats summary={summary} />

        <SafeFixPanel onFixComplete={loadSummary} />

        <ActivityFeed />
      </div>
    </div>
  );
};

export default Dashboard;

