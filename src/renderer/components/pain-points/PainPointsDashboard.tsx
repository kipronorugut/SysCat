import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PainPoint, PainPointCategory, PainPointSummary } from '../../../shared/types/pain-points';

interface PainPointsDashboardProps {
  onRemediate?: (painPoint: PainPoint) => void;
}

const CATEGORY_LABELS: Record<PainPointCategory, string> = {
  licensing: 'Licensing & Cost',
  identity: 'Identity & Access',
  exchange: 'Exchange Online',
  teams: 'Microsoft Teams',
  sharepoint: 'SharePoint & OneDrive',
  security: 'Security & Compliance',
  powershell: 'PowerShell & Automation',
  intune: 'Intune & Endpoint',
  migration: 'Migration & Hybrid',
  reporting: 'Reporting & Monitoring',
  portal_ui: 'Portal & UI Issues',
};

const SEVERITY_COLORS = {
  critical: 'bg-red-500/20 border-red-500/50 text-red-400',
  high: 'bg-orange-500/20 border-orange-500/50 text-orange-400',
  medium: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400',
  low: 'bg-blue-500/20 border-blue-500/50 text-blue-400',
  info: 'bg-gray-500/20 border-gray-500/50 text-gray-400',
};

const SEVERITY_ICONS = {
  critical: '🔴',
  high: '🟠',
  medium: '🟡',
  low: '🔵',
  info: 'ℹ️',
};

export const PainPointsDashboard: React.FC<PainPointsDashboardProps> = ({ onRemediate }) => {
  const [painPoints, setPainPoints] = useState<PainPoint[]>([]);
  const [summary, setSummary] = useState<Record<string, PainPointSummary>>({});
  const [selectedCategory, setSelectedCategory] = useState<PainPointCategory | 'all'>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('[PainPointsDashboard] Loading pain points...');
      const startTime = performance.now();
      
      // Load data in parallel
      const [allPainPoints, summaryData] = await Promise.all([
        (window as any).syscatApi.getAllPainPoints(),
        (window as any).syscatApi.getPainPointSummary(),
      ]);
      
      const loadTime = performance.now() - startTime;
      console.log(`[PainPointsDashboard] Loaded ${allPainPoints?.length || 0} pain points in ${loadTime.toFixed(0)}ms`);
      
      setPainPoints(allPainPoints || []);
      setSummary(summaryData || {});
    } catch (error: any) {
      console.error('[PainPointsDashboard] Error loading data', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleScan = async () => {
    try {
      setIsScanning(true);
      const newPainPoints = await (window as any).syscatApi.scanPainPoints();
      setPainPoints(newPainPoints || []);
      const summaryData = await (window as any).syscatApi.getPainPointSummary();
      setSummary(summaryData || {});
    } catch (error: any) {
      console.error('[PainPointsDashboard] Error scanning', error);
    } finally {
      setIsScanning(false);
    }
  };

  // Memoize filtered results and calculations for better performance
  const filteredPainPoints = useMemo(() => {
    return painPoints.filter((pp) => {
      if (selectedCategory !== 'all' && pp.category !== selectedCategory) return false;
      if (selectedSeverity !== 'all' && pp.severity !== selectedSeverity) return false;
      return true;
    });
  }, [painPoints, selectedCategory, selectedSeverity]);

  const totalImpact = useMemo(() => ({
    cost: painPoints.reduce((sum, p) => sum + (p.impact.cost || 0), 0),
    time: painPoints.reduce((sum, p) => sum + (p.impact.time || 0), 0),
  }), [painPoints]);

  const automatedCount = useMemo(() => 
    painPoints.filter((p) => p.remediation.automated).length,
    [painPoints]
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="relative mx-auto w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-slate-800/50"></div>
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-syscat-orange animate-spin"></div>
          <div className="absolute inset-2 rounded-full bg-slate-900/50 backdrop-blur-sm"></div>
        </div>
        <div className="text-slate-400">Loading pain points...</div>
        <div className="text-slate-500 text-sm">This may take a moment</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-100">Pain Points Analysis</h2>
          <p className="text-slate-400 mt-1">
            Comprehensive detection of {painPoints.length} M365 administration issues
          </p>
        </div>
        <button
          onClick={handleScan}
          disabled={isScanning}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isScanning ? 'Scanning...' : 'Scan for Issues'}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="text-slate-400 text-sm mb-1">Total Issues</div>
          <div className="text-3xl font-bold text-slate-100">{painPoints.length}</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="text-slate-400 text-sm mb-1">Monthly Cost Impact</div>
          <div className="text-3xl font-bold text-orange-400">
            ${totalImpact.cost.toFixed(0)}
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="text-slate-400 text-sm mb-1">Time Wasted</div>
          <div className="text-3xl font-bold text-blue-400">
            {Math.round(totalImpact.time)}h
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <div className="text-slate-400 text-sm mb-1">Auto-Fixable</div>
          <div className="text-3xl font-bold text-green-400">{automatedCount}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value as PainPointCategory | 'all')}
          className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100"
        >
          <option value="all">All Categories</option>
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={selectedSeverity}
          onChange={(e) => setSelectedSeverity(e.target.value)}
          className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Category Summary */}
      {Object.keys(summary).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Object.entries(summary).map(([category, data]) => (
            <div
              key={category}
              className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 cursor-pointer hover:border-slate-600 transition-colors"
              onClick={() => setSelectedCategory(category as PainPointCategory)}
            >
              <div className="text-slate-300 font-medium mb-2">
                {CATEGORY_LABELS[category as PainPointCategory] || category}
              </div>
              <div className="text-2xl font-bold text-slate-100 mb-2">{data.total}</div>
              <div className="flex gap-2 text-xs">
                <span className="text-red-400">{data.bySeverity.critical}C</span>
                <span className="text-orange-400">{data.bySeverity.high}H</span>
                <span className="text-yellow-400">{data.bySeverity.medium}M</span>
                <span className="text-blue-400">{data.bySeverity.low}L</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pain Points List */}
      <div className="space-y-3">
        {filteredPainPoints.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            {painPoints.length === 0
              ? 'No pain points detected. Click "Scan for Issues" to start.'
              : 'No pain points match the selected filters.'}
          </div>
        ) : (
          filteredPainPoints.map((painPoint) => (
            <PainPointCard
              key={painPoint.id}
              painPoint={painPoint}
              onRemediate={onRemediate}
            />
          ))
        )}
      </div>
    </div>
  );
};

interface PainPointCardProps {
  painPoint: PainPoint;
  onRemediate?: (painPoint: PainPoint) => void;
}

const PainPointCard: React.FC<PainPointCardProps> = ({ painPoint, onRemediate }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`bg-slate-800/50 border rounded-lg p-4 transition-all ${
        SEVERITY_COLORS[painPoint.severity]
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">{SEVERITY_ICONS[painPoint.severity]}</span>
            <h3 className="font-semibold text-slate-100">{painPoint.title}</h3>
            <span className="text-xs px-2 py-1 bg-slate-700/50 rounded text-slate-300">
              {CATEGORY_LABELS[painPoint.category]}
            </span>
            {painPoint.painPointNumber && (
              <span className="text-xs text-slate-500">#{painPoint.painPointNumber}</span>
            )}
          </div>
          <p className="text-slate-300 mb-3">{painPoint.description}</p>
          <div className="flex gap-4 text-sm text-slate-400">
            <span>
              {painPoint.affectedResources.length} affected resource
              {painPoint.affectedResources.length !== 1 ? 's' : ''}
            </span>
            {painPoint.impact.cost && (
              <span>${painPoint.impact.cost.toFixed(0)}/month impact</span>
            )}
            {painPoint.impact.time && (
              <span>{painPoint.impact.time} min to fix</span>
            )}
          </div>
        </div>
        <div className="flex gap-2 ml-4">
          {painPoint.remediation.automated && (
            <button
              onClick={() => onRemediate?.(painPoint)}
              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
            >
              Auto-Fix
            </button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded transition-colors"
          >
            {expanded ? 'Less' : 'Details'}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-slate-700 space-y-3">
          <div>
            <div className="text-sm font-medium text-slate-300 mb-1">Recommendation</div>
            <div className="text-slate-400 text-sm">{painPoint.recommendation}</div>
          </div>
          {painPoint.affectedResources.length > 0 && (
            <div>
              <div className="text-sm font-medium text-slate-300 mb-2">Affected Resources</div>
              <div className="space-y-1">
                {painPoint.affectedResources.slice(0, 5).map((resource, idx) => (
                  <div key={idx} className="text-sm text-slate-400">
                    • {resource.name}
                  </div>
                ))}
                {painPoint.affectedResources.length > 5 && (
                  <div className="text-sm text-slate-500">
                    +{painPoint.affectedResources.length - 5} more
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="flex gap-4 text-sm">
            <div>
              <span className="text-slate-400">Remediation: </span>
              <span className="text-slate-300">
                {painPoint.remediation.automated ? 'Automated' : 'Manual'}
              </span>
            </div>
            {painPoint.remediation.estimatedTime && (
              <div>
                <span className="text-slate-400">Estimated time: </span>
                <span className="text-slate-300">{painPoint.remediation.estimatedTime} min</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

