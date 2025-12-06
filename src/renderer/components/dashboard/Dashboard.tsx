import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import SafeFixPanel from './SafeFixPanel';
import TenantStats from './TenantStats';
import ActivityFeed from './ActivityFeed';
import SecurityFindingsPanel from './SecurityFindingsPanel';
import { SecurityStoriesPanel } from './SecurityStoriesPanel';
import { QuickWinsPanel } from './QuickWinsPanel';
import Sidebar from './Sidebar';
import { RecommendationsBrowser } from '../recommendations/RecommendationsBrowser';

// Lazy load heavy components for code splitting
const PainPointsDashboard = lazy(() => import('../pain-points/PainPointsDashboard').then(m => ({ default: m.PainPointsDashboard })));

const Dashboard: React.FC = () => {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'stories' | 'quick-wins' | 'pain-points' | 'recommendations'>('overview');

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const data = await window.syscatApi.getTenantSummary();
      setSummary(data);
    } catch (error: any) {
      window.syscatApi.logError('Failed to load summary', error);
    } finally {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-syscat-dark via-slate-900 to-syscat-dark">
        <div className="text-center space-y-4">
          <div className="relative mx-auto w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-slate-800/50"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-syscat-orange animate-spin"></div>
            <div className="absolute inset-2 rounded-full bg-slate-900/50 backdrop-blur-sm"></div>
          </div>
          <p className="text-slate-400 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-syscat-dark via-slate-900 to-syscat-dark overflow-hidden">
      {/* Sidebar */}
      <Sidebar activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab as any)} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="px-8 py-6 border-b border-slate-800/50 bg-slate-900/40 backdrop-blur-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-slate-100 tracking-tight">
                {activeTab === 'overview' && 'Dashboard'}
                {activeTab === 'stories' && 'Security Stories'}
                {activeTab === 'quick-wins' && 'Quick Wins'}
                {activeTab === 'pain-points' && 'Pain Points'}
                {activeTab === 'recommendations' && 'Recommendations Repository'}
              </h1>
              <p className="text-slate-400 text-sm">
                {activeTab === 'overview' && 'Monitor and manage your Microsoft 365 tenant'}
                {activeTab === 'stories' && 'Curated security recommendations by domain'}
                {activeTab === 'quick-wins' && 'Easy fixes with minimal effort'}
                {activeTab === 'pain-points' && 'Actionable recommendations for your tenant'}
                {activeTab === 'recommendations' && 'Browse comprehensive security recommendations'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2.5 px-4 py-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl backdrop-blur-sm">
                <span className="relative w-2 h-2">
                  <span className="absolute inset-0 bg-emerald-400 rounded-full animate-pulse"></span>
                  <span className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-75"></span>
                </span>
                <span className="text-sm text-emerald-400 font-medium">Operational</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-8 py-6 space-y-6">

        {/* Tab Content */}
        {activeTab === 'overview' ? (
          <>
            <TenantStats summary={summary} />

            <QuickWinsPanel />

            <SecurityStoriesPanel 
              onViewRecommendations={() => {
                console.log('[Dashboard] Navigating to recommendations tab');
                setActiveTab('pain-points');
              }}
            />

            <SecurityFindingsPanel />

            <SafeFixPanel onFixComplete={() => {
              loadSummary();
              // Activity feed will auto-refresh via its interval
            }} />

            <ActivityFeed />
          </>
        ) : activeTab === 'stories' ? (
          <SecurityStoriesPanel 
            onViewRecommendations={() => {
              console.log('[Dashboard] Navigating to recommendations tab from stories view');
              setActiveTab('pain-points');
            }}
          />
        ) : activeTab === 'quick-wins' ? (
          <QuickWinsPanel />
        ) : activeTab === 'recommendations' ? (
          <RecommendationsBrowser />
        ) : (
          <Suspense fallback={
            <div className="glass-card p-8 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-syscat-orange"></div>
            </div>
          }>
            <PainPointsDashboard
              onRemediate={async (painPoint) => {
                console.log('[Dashboard] Remediating pain point', painPoint);
                // Integrate with existing automation service
                if (painPoint.remediation.automated && painPoint.remediation.action) {
                  try {
                    await window.syscatApi.runAutomation(
                      painPoint.category,
                      painPoint.remediation.action,
                      { painPointId: painPoint.id }
                    );
                    // Reload pain points after remediation - trigger refresh
                    // The PainPointsDashboard component will handle the refresh
                  } catch (error: any) {
                    console.error('[Dashboard] Error remediating pain point', error);
                  }
                }
              }}
            />
          </Suspense>
        )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

