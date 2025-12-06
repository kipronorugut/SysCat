import React, { useState, useEffect, useCallback } from 'react';
import { EnhancedRecommendation } from '../../../shared/types/pain-points';

export const QuickWinsPanel: React.FC = React.memo(() => {
  const [quickWins, setQuickWins] = useState<EnhancedRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWin, setSelectedWin] = useState<EnhancedRecommendation | null>(null);

  const loadQuickWins = useCallback(async () => {
    try {
      setLoading(true);
      // Try to get prioritized quick wins first (requires pain points)
      // Fallback to regular quick wins if pain points not available
      try {
        const painPoints = await window.syscatApi.getAllPainPoints();
        if (painPoints && painPoints.length > 0) {
          const prioritized = await window.syscatApi.getPrioritizedQuickWins(painPoints);
          if (prioritized && prioritized.length > 0) {
            setQuickWins(prioritized.map((qw: any) => qw.recommendation));
            return;
          }
        }
      } catch (err) {
        console.debug('[QuickWinsPanel] Prioritized quick wins unavailable, using fallback');
      }
      
      // Fallback to regular quick wins
      const data = await window.syscatApi.getQuickWins();
      setQuickWins(data || []);
    } catch (error: any) {
      console.error('[QuickWinsPanel] Error loading quick wins', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQuickWins();
  }, [loadQuickWins]);

  if (loading) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-syscat-orange"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-heading font-semibold text-slate-100">Quick Wins</h2>
          <p className="text-slate-400 mt-1">
            Easy fixes with minimal effort and no user impact
          </p>
        </div>
        <div className="text-sm text-slate-400">
          {quickWins.length} available
        </div>
      </div>

      {quickWins.length === 0 ? (
        <div className="text-center py-12 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800/50 border border-slate-700/50 mb-4">
            <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <p className="text-slate-300 font-medium mb-1">No quick wins available</p>
          <p className="text-slate-500 text-sm">Run a scan to discover quick win opportunities</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickWins.map((win, index) => (
            <div
              key={win.id}
              onClick={() => setSelectedWin(win)}
              className="glass-card-elevated p-5 cursor-pointer hover:border-emerald-500/40 transition-all duration-300 group card-interactive"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="text-xs px-2.5 py-1 bg-emerald-500/20 text-emerald-400 rounded-full font-medium border border-emerald-500/30">
                  Quick Win
                </span>
              </div>
              <h3 className="font-semibold text-slate-100 mb-2 group-hover:text-emerald-400 transition-colors">
                {win.title}
              </h3>
              <p className="text-sm text-slate-400 line-clamp-2 mb-4 leading-relaxed">{win.description}</p>
              <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-800/50">
                <span>Impact: {win.impactScore}/10</span>
                <span>Effort: {win.effortScore}/10</span>
                <span>~{win.estimatedWork.time}m</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedWin && (
        <QuickWinDetailModal win={selectedWin} onClose={() => setSelectedWin(null)} />
      )}
    </div>
  );
});

QuickWinsPanel.displayName = 'QuickWinsPanel';

interface QuickWinDetailModalProps {
  win: EnhancedRecommendation;
  onClose: () => void;
}

const QuickWinDetailModal: React.FC<QuickWinDetailModalProps> = ({ win, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="glass-card max-w-3xl w-full max-h-[90vh] overflow-y-auto p-8 space-y-6 animate-slide-in">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-full text-sm font-medium border border-emerald-500/30">
                Quick Win
              </span>
            </div>
            <h2 className="text-3xl font-semibold text-slate-100 mb-2">{win.title}</h2>
            <p className="text-slate-400 leading-relaxed">{win.description}</p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-slate-200 hover:bg-slate-800/70 transition-all duration-300 flex items-center justify-center ml-4"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <div className="text-sm text-slate-400 mb-1">Impact Score</div>
            <div className="text-2xl font-bold text-slate-100">{win.impactScore}/10</div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <div className="text-sm text-slate-400 mb-1">Effort Score</div>
            <div className="text-2xl font-bold text-slate-100">{win.effortScore}/10</div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <div className="text-sm text-slate-400 mb-1">Time Required</div>
            <div className="text-2xl font-bold text-slate-100">~{win.estimatedWork.time} min</div>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="text-sm font-medium text-slate-300 mb-3">User Impact</div>
          <div className="text-slate-400 text-sm">{win.userImpact.description}</div>
          {win.userImpact.affectedUsers !== undefined && (
            <div className="text-slate-500 text-xs mt-2">
              Affected Users: {win.userImpact.affectedUsers}
            </div>
          )}
        </div>

        {win.stepByStepGuide.length > 0 && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <div className="text-sm font-medium text-slate-300 mb-3">Step-by-Step Guide</div>
            <div className="space-y-3">
              {win.stepByStepGuide.map((step, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-syscat-orange/20 text-syscat-orange 
                                flex items-center justify-center font-semibold text-sm">
                    {step.step}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-slate-200 mb-1">{step.title}</div>
                    <div className="text-sm text-slate-400">{step.description}</div>
                    {step.action && (
                      <div className="mt-2 p-2 bg-slate-900/50 rounded text-xs font-mono text-slate-300">
                        {step.action}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button className="btn-primary flex-1">Apply Fix</button>
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

