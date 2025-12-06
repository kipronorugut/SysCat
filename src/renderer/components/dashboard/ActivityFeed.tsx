import React, { useState, useEffect, useCallback, useRef } from 'react';

interface Activity {
  id: number;
  action: string;
  module: string;
  user_id?: string;
  details?: any;
  status: string;
  created_at: string;
}

const ActivityFeed: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const lastFetchRef = useRef<number>(0);
  const isFetchingRef = useRef<boolean>(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadActivities = useCallback(async () => {
    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      console.log('[ActivityFeed] Fetch already in progress, skipping');
      return;
    }

    // Throttle: don't fetch more than once per 3 seconds
    const now = Date.now();
    if (now - lastFetchRef.current < 3000) {
      console.log('[ActivityFeed] Throttled: too soon since last fetch');
      return;
    }

    isFetchingRef.current = true;
    lastFetchRef.current = now;

    try {
      const data = await window.syscatApi.getActivityLog(20);
      setActivities(data);
    } catch (error: any) {
      window.syscatApi.logError('Failed to load activity log', error);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    loadActivities();
    // Smart refresh: every 10 seconds (reduced from 5), but pause when tab is not visible
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab hidden - pause polling
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else {
        // Tab visible - resume polling
        if (!intervalRef.current) {
          loadActivities(); // Immediate refresh when tab becomes visible
          intervalRef.current = setInterval(loadActivities, 10000);
        }
      }
    };

    intervalRef.current = setInterval(loadActivities, 10000);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadActivities]);

  const formatTime = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

  const getActionDisplay = useCallback((activity: Activity) => {
    const details = activity.details || {};
    const userName = details.userName || activity.user_id || 'Unknown user';

    switch (activity.action) {
      case 'license_reclaim':
        return {
          label: 'License Reclaimed',
          description: `${userName} - ${details.licenses?.length || 0} license${details.licenses?.length !== 1 ? 's' : ''} removed`,
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          color: 'text-emerald-400',
          bgColor: 'bg-emerald-500/10',
          borderColor: 'border-emerald-500/30',
        };
      case 'account_review':
        return {
          label: 'Account Reviewed',
          description: `${userName}${details.daysInactive ? ` (${details.daysInactive} days inactive)` : ''}`,
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ),
          color: 'text-amber-400',
          bgColor: 'bg-amber-500/10',
          borderColor: 'border-amber-500/30',
        };
      default:
        return {
          label: activity.action.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
          description: JSON.stringify(details),
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
          color: 'text-slate-300',
          bgColor: 'bg-slate-500/10',
          borderColor: 'border-slate-500/30',
        };
    }
  }, []);

  const getStatusIcon = useCallback((status: string) => {
    switch (status) {
      case 'completed':
        return (
          <div className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center">
            <svg className="w-2.5 h-2.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'failed':
        return (
          <div className="w-4 h-4 rounded-full bg-red-500/20 border border-red-500/50 flex items-center justify-center">
            <svg className="w-2.5 h-2.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      case 'pending':
        return (
          <div className="w-4 h-4 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
          </div>
        );
      default:
        return (
          <div className="w-4 h-4 rounded-full bg-slate-500/20 border border-slate-500/50"></div>
        );
    }
  }, []);

  if (loading && activities.length === 0) {
    return (
      <div className="glass-card p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-slate-100 mb-1">Recent Activity</h2>
          <p className="text-slate-400 text-sm">Timeline of actions and changes</p>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-4">
              <div className="skeleton w-16 h-4 rounded"></div>
              <div className="skeleton w-4 h-4 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 rounded w-3/4"></div>
                <div className="skeleton h-3 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="glass-card p-8 text-center animate-fade-in">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-800/50 border border-slate-700/50 mb-4">
          <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-slate-300 font-medium mb-1">No activity yet</p>
        <p className="text-slate-500 text-sm">Actions will appear here as you use the app</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 animate-fade-in">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-100 mb-1">Recent Activity</h2>
        <p className="text-slate-400 text-sm">Timeline of actions and changes</p>
      </div>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {activities.map((activity, index) => {
          const actionDisplay = getActionDisplay(activity);
          return (
            <div
              key={activity.id}
              className="flex items-start gap-4 text-sm p-3 rounded-lg hover:bg-slate-800/30 transition-all duration-300 group"
              style={{ animationDelay: `${index * 0.03}s` }}
            >
              <span className="text-slate-500 text-xs min-w-[70px] font-mono pt-0.5">{formatTime(activity.created_at)}</span>
              <div className="flex-shrink-0 mt-0.5">
                {getStatusIcon(activity.status)}
              </div>
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className={`flex-shrink-0 w-8 h-8 rounded-lg ${actionDisplay.bgColor} border ${actionDisplay.borderColor} flex items-center justify-center ${actionDisplay.color} mt-0.5`}>
                  {actionDisplay.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-slate-200 font-medium">{actionDisplay.label}</span>
                  </div>
                  <p className="text-slate-400 text-sm">{actionDisplay.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActivityFeed;

