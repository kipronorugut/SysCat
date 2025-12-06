import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { RegistryRecommendation } from '../../../main/services/recommendation-registry.service';

interface RecommendationsBrowserProps {
  onSelectRecommendation?: (recommendation: RegistryRecommendation) => void;
  initialCategory?: string;
  initialSearch?: string;
}

export const RecommendationsBrowser: React.FC<RecommendationsBrowserProps> = ({
  onSelectRecommendation,
  initialCategory,
  initialSearch,
}) => {
  const [recommendations, setRecommendations] = useState<RegistryRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecommendation, setSelectedRecommendation] = useState<RegistryRecommendation | null>(null);
  const [searchText, setSearchText] = useState(initialSearch || '');
  const [selectedCategory, setSelectedCategory] = useState(initialCategory || 'all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [quickWinOnly, setQuickWinOnly] = useState(false);
  const [registryCount, setRegistryCount] = useState(0);

  const categories = ['all', 'identity', 'exchange', 'sharepoint', 'teams', 'intune', 'defender', 'copilot', 'security', 'licensing'];

  useEffect(() => {
    loadRecommendations();
    loadRegistryCount();
  }, []);

  useEffect(() => {
    loadRecommendations();
  }, [searchText, selectedCategory, selectedSeverity, quickWinOnly]);

  const loadRegistryCount = useCallback(async () => {
    try {
      const count = await window.syscatApi.getRegistryCount();
      setRegistryCount(count || 0);
    } catch (error: any) {
      console.error('[RecommendationsBrowser] Error loading registry count', error);
    }
  }, []);

  const loadRecommendations = useCallback(async () => {
    try {
      setLoading(true);
      const filters: any = {};
      
      if (selectedCategory !== 'all') {
        filters.category = selectedCategory;
      }
      
      if (selectedSeverity !== 'all') {
        filters.severity = selectedSeverity;
      }
      
      if (quickWinOnly) {
        filters.quickWin = true;
      }
      
      if (searchText) {
        filters.searchText = searchText;
      }

      const data = await window.syscatApi.searchRecommendations(filters);
      setRecommendations(data || []);
    } catch (error: any) {
      console.error('[RecommendationsBrowser] Error loading recommendations', error);
    } finally {
      setLoading(false);
    }
  }, [searchText, selectedCategory, selectedSeverity, quickWinOnly]);

  const filteredRecommendations = useMemo(() => {
    return recommendations;
  }, [recommendations]);

  const handleSelectRecommendation = (rec: RegistryRecommendation) => {
    setSelectedRecommendation(rec);
    if (onSelectRecommendation) {
      onSelectRecommendation(rec);
    }
  };

  if (loading && recommendations.length === 0) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-syscat-orange"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-heading font-semibold text-slate-100">Recommendations Repository</h2>
            <p className="text-slate-400 mt-1">
              {registryCount > 0 ? `${registryCount} security recommendations available` : 'Browse security recommendations'}
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search recommendations..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-syscat-orange/50 focus:border-syscat-orange/50 transition-all"
            />
            <svg
              className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-syscat-orange/50"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>

            {/* Severity Filter */}
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-syscat-orange/50"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {/* Quick Win Filter */}
            <label className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg cursor-pointer hover:bg-slate-800/70 transition-colors">
              <input
                type="checkbox"
                checked={quickWinOnly}
                onChange={(e) => setQuickWinOnly(e.target.checked)}
                className="w-4 h-4 text-syscat-orange bg-slate-700 border-slate-600 rounded focus:ring-syscat-orange"
              />
              <span className="text-slate-100 text-sm">Quick Wins Only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-100">
            {filteredRecommendations.length} Recommendation{filteredRecommendations.length !== 1 ? 's' : ''}
          </h3>
        </div>

        {filteredRecommendations.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800/50 border border-slate-700/50 mb-4">
              <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-slate-300 font-medium mb-1">No recommendations found</p>
            <p className="text-slate-500 text-sm">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRecommendations.map((rec, index) => (
              <div
                key={rec.registryId}
                onClick={() => handleSelectRecommendation(rec)}
                className="glass-card-elevated p-5 cursor-pointer hover:border-syscat-orange/40 transition-all duration-300 group card-interactive"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-syscat-orange/10 border border-syscat-orange/30 flex items-center justify-center group-hover:bg-syscat-orange/20 transition-colors">
                    <svg className="w-5 h-5 text-syscat-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  {rec.quickWin && (
                    <span className="text-xs px-2.5 py-1 bg-emerald-500/20 text-emerald-400 rounded-full font-medium border border-emerald-500/30">
                      Quick Win
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-slate-100 mb-2 group-hover:text-syscat-orange transition-colors">
                  {rec.title}
                </h3>
                <p className="text-sm text-slate-400 line-clamp-2 mb-4 leading-relaxed">{rec.description}</p>
                <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-800/50">
                  <span className="capitalize">{rec.category}</span>
                  <span>Impact: {rec.impactScore}/10</span>
                  <span>Effort: {rec.effortScore}/10</span>
                </div>
                {rec.tags && rec.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {rec.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-0.5 bg-slate-800/50 text-slate-400 rounded border border-slate-700/50"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedRecommendation && (
        <RecommendationDetailModal
          recommendation={selectedRecommendation}
          onClose={() => setSelectedRecommendation(null)}
        />
      )}
    </div>
  );
};

interface RecommendationDetailModalProps {
  recommendation: RegistryRecommendation;
  onClose: () => void;
}

const RecommendationDetailModal: React.FC<RecommendationDetailModalProps> = ({ recommendation, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="glass-card max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8 space-y-6 animate-slide-in">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-lg bg-syscat-orange/10 border border-syscat-orange/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-syscat-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              {recommendation.quickWin && (
                <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-full text-sm font-medium border border-emerald-500/30">
                  Quick Win
                </span>
              )}
              <span className="px-3 py-1.5 bg-slate-800/50 text-slate-400 rounded-full text-sm font-medium border border-slate-700/50 capitalize">
                {recommendation.category}
              </span>
            </div>
            <h2 className="text-3xl font-semibold text-slate-100 mb-2">{recommendation.title}</h2>
            <p className="text-slate-400 leading-relaxed">{recommendation.description}</p>
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

        {/* Metrics */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <div className="text-sm text-slate-400 mb-1">Impact Score</div>
            <div className="text-2xl font-bold text-slate-100">{recommendation.impactScore}/10</div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <div className="text-sm text-slate-400 mb-1">Effort Score</div>
            <div className="text-2xl font-bold text-slate-100">{recommendation.effortScore}/10</div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <div className="text-sm text-slate-400 mb-1">Time Required</div>
            <div className="text-2xl font-bold text-slate-100">~{recommendation.estimatedWork.time} min</div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <div className="text-sm text-slate-400 mb-1">Complexity</div>
            <div className="text-2xl font-bold text-slate-100 capitalize">{recommendation.estimatedWork.complexity}</div>
          </div>
        </div>

        {/* License Requirements */}
        {recommendation.licenseRequirements && recommendation.licenseRequirements.length > 0 && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <div className="text-sm font-medium text-slate-300 mb-3">License Requirements</div>
            <div className="space-y-2">
              {recommendation.licenseRequirements.map((license, idx) => (
                <div key={idx} className="flex items-center gap-2 text-slate-400 text-sm">
                  <svg className="w-4 h-4 text-syscat-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {license}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* User Impact */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="text-sm font-medium text-slate-300 mb-3">User Impact</div>
          <div className="text-slate-400 text-sm">{recommendation.userImpact.description}</div>
          {recommendation.userImpact.affectedUsers !== undefined && (
            <div className="text-slate-500 text-xs mt-2">
              Affected Users: {recommendation.userImpact.affectedUsers} | Downtime: {recommendation.userImpact.downtime}
            </div>
          )}
        </div>

        {/* Step-by-Step Guide */}
        {recommendation.stepByStepGuide && recommendation.stepByStepGuide.length > 0 && (
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
            <div className="text-sm font-medium text-slate-300 mb-3">Step-by-Step Guide</div>
            <div className="space-y-3">
              {recommendation.stepByStepGuide.map((step, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-syscat-orange/20 text-syscat-orange flex items-center justify-center font-semibold text-sm">
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

        {/* Tags */}
        {recommendation.tags && recommendation.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {recommendation.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-slate-800/50 text-slate-400 rounded-full text-sm border border-slate-700/50"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-slate-800/50">
          <button className="btn-primary flex-1">Assign Task</button>
          <button className="btn-secondary">Exempt</button>
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

