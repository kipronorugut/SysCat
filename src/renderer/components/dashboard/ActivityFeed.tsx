import React from 'react';

const ActivityFeed: React.FC = () => {
  // TODO: Load from database
  const activities = [
    { time: '14:32', action: 'User onboarded', details: 'Jane Smith (Marketing)', status: 'success' },
    { time: '13:15', action: 'License reclaimed', details: 'unused E3 license', status: 'success' },
    { time: '11:47', action: 'Security review', details: 'Blocked suspicious login', status: 'security' },
  ];

  return (
    <div className="glass-card p-6">
      <h2 className="text-xl font-heading font-bold mb-4">📝 Recent Activity</h2>
      <div className="space-y-3">
        {activities.map((activity, idx) => (
          <div key={idx} className="flex items-start gap-3 text-sm">
            <span className="text-slate-500">{activity.time}</span>
            <span
              className={
                activity.status === 'success'
                  ? 'text-emerald-400'
                  : activity.status === 'security'
                  ? 'text-red-400'
                  : 'text-slate-300'
              }
            >
              {activity.status === 'success' ? '✅' : activity.status === 'security' ? '🔒' : '⚠️'}
            </span>
            <div>
              <span className="text-slate-200">{activity.action}:</span>
              <span className="text-slate-400 ml-2">{activity.details}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivityFeed;

