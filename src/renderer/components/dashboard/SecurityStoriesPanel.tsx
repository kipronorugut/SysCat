import React, { useState, useEffect, useCallback, memo } from 'react';
import { SecurityStory } from '../../../shared/types/pain-points';

const PRIORITY_COLORS = {
  critical: 'bg-red-500/20 border-red-500/50 text-red-400',
  high: 'bg-orange-500/20 border-orange-500/50 text-orange-400',
  medium: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400',
  low: 'bg-blue-500/20 border-blue-500/50 text-blue-400',
};

interface SecurityStoriesPanelProps {
  onViewRecommendations?: () => void;
}

export const SecurityStoriesPanel: React.FC<SecurityStoriesPanelProps> = memo(({ onViewRecommendations }) => {
  const [stories, setStories] = useState<SecurityStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStory, setSelectedStory] = useState<SecurityStory | null>(null);

  const loadStories = useCallback(async () => {
    try {
      setLoading(true);
      const data = await window.syscatApi.getAllSecurityStories();
      setStories(data || []);
    } catch (error: any) {
      console.error('[SecurityStoriesPanel] Error loading stories', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStories();
  }, [loadStories]);

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
          <h2 className="text-2xl font-heading font-semibold text-slate-100">Security Stories</h2>
          <p className="text-slate-400 mt-1">
            Curated collections of related recommendations organized by domain
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stories.map((story, index) => (
          <div
            key={story.id}
            onClick={() => setSelectedStory(story)}
            className="glass-card-elevated p-5 cursor-pointer hover:border-syscat-orange/40 transition-all duration-300 group card-interactive"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-slate-800/50 border border-slate-700/50 flex items-center justify-center group-hover:bg-slate-800/70 transition-colors">
                {story.icon ? (
                  <span className="text-2xl">{story.icon}</span>
                ) : (
                  <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${PRIORITY_COLORS[story.priority]}`}>
                {story.priority}
              </span>
            </div>
            <h3 className="font-semibold text-slate-100 mb-2 group-hover:text-syscat-orange transition-colors">
              {story.title}
            </h3>
            <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed mb-4">{story.description}</p>
            <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-800/50">
              <span>{story.painPointIds.length} recommendation{story.painPointIds.length !== 1 ? 's' : ''}</span>
              {story.estimatedCompletionTime && (
                <span>~{story.estimatedCompletionTime}m</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {selectedStory && (
        <StoryDetailModal 
          story={selectedStory} 
          onClose={() => setSelectedStory(null)}
          onViewRecommendations={onViewRecommendations}
        />
      )}
    </div>
  );
});

SecurityStoriesPanel.displayName = 'SecurityStoriesPanel';

interface StoryDetailModalProps {
  story: SecurityStory;
  onClose: () => void;
  onViewRecommendations?: () => void;
}

const StoryDetailModal: React.FC<StoryDetailModalProps> = ({ story, onClose, onViewRecommendations }) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="glass-card max-w-3xl w-full max-h-[90vh] overflow-y-auto p-8 space-y-6 animate-slide-in">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4 flex-1">
            <div className="w-16 h-16 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center flex-shrink-0">
              {story.icon ? (
                <span className="text-4xl">{story.icon}</span>
              ) : (
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-3xl font-semibold text-slate-100 mb-2">{story.title}</h2>
              <p className="text-slate-400 leading-relaxed">{story.description}</p>
            </div>
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

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <div className="text-sm text-slate-400 mb-1">Recommendations</div>
            <div className="text-2xl font-bold text-slate-100">{story.painPointIds.length}</div>
          </div>
          {story.estimatedCompletionTime && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <div className="text-sm text-slate-400 mb-1">Estimated Time</div>
              <div className="text-2xl font-bold text-slate-100">~{story.estimatedCompletionTime} min</div>
            </div>
          )}
        </div>

        {story.estimatedImpact && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <div className="text-sm font-medium text-slate-300 mb-2">Estimated Impact</div>
            {story.estimatedImpact.security && (
              <div className="text-slate-400 text-sm">{story.estimatedImpact.security}</div>
            )}
            {story.estimatedImpact.cost !== undefined && (
              <div className="text-slate-400 text-sm mt-1">
                Cost Impact: ${story.estimatedImpact.cost.toFixed(0)}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <button 
            className="btn-primary flex-1"
            onClick={() => {
              console.log('[SecurityStoriesPanel] View Recommendations clicked for story:', story.id);
              if (onViewRecommendations) {
                onViewRecommendations();
                onClose(); // Close modal when navigating
              } else {
                console.warn('[SecurityStoriesPanel] onViewRecommendations callback not provided');
              }
            }}
          >
            View Recommendations
          </button>
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

