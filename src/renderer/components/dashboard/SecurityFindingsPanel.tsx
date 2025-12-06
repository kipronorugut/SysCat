import React, { useState, useEffect } from 'react';

interface DetectionResult {
  id: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedResources: Array<{
    id: string;
    name: string;
    details?: any;
  }>;
  recommendation: string;
  remediation?: {
    automated: boolean;
    action: string;
    estimatedTime?: number;
  };
}

interface SecurityScanResult {
  totalFindings: number;
  findings: DetectionResult[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    byCategory: Record<string, number>;
  };
}

const SecurityFindingsPanel: React.FC = () => {
  const [scanResult, setScanResult] = useState<SecurityScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [remediating, setRemediating] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadScanResults();
  }, []);

  const loadScanResults = async () => {
    setLoading(true);
    try {
      const result = await window.syscatApi.runFullSecurityScan();
      setScanResult(result);
    } catch (error: any) {
      window.syscatApi.logError('Failed to load security scan', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRunScan = async () => {
    setScanning(true);
    try {
      const result = await window.syscatApi.runFullSecurityScan();
      setScanResult(result);
      window.syscatApi.logInfo('Security scan completed', { totalFindings: result.totalFindings });
    } catch (error: any) {
      window.syscatApi.logError('Failed to run security scan', error);
      alert('Failed to run security scan: ' + (error?.message || error));
    } finally {
      setScanning(false);
    }
  };

  const getSeverityColor = (severity: DetectionResult['severity']) => {
    switch (severity) {
      case 'critical':
        return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'high':
        return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
      case 'medium':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'low':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/30';
    }
  };

  const getSeverityIcon = (severity: DetectionResult['severity']) => {
    switch (severity) {
      case 'critical':
        return '🔴';
      case 'high':
        return '🟠';
      case 'medium':
        return '🟡';
      case 'low':
        return '🔵';
      default:
        return '⚪';
    }
  };

  if (loading && !scanResult) {
    return (
      <div className="glass-card p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-700 rounded w-1/3"></div>
          <div className="h-32 bg-slate-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!scanResult) {
    return (
      <div className="glass-card p-8 text-center">
        <h2 className="text-2xl font-heading font-bold mb-4">🛡️ Security Findings</h2>
        <p className="text-slate-400 mb-6">Run a security scan to discover issues in your tenant.</p>
        <button
          onClick={handleRunScan}
          disabled={scanning}
          className="btn-primary px-6 py-3"
        >
          {scanning ? 'Scanning...' : 'Run Security Scan'}
        </button>
      </div>
    );
  }

  const criticalFindings = scanResult.findings.filter(f => f.severity === 'critical');
  const highFindings = scanResult.findings.filter(f => f.severity === 'high');
  const otherFindings = scanResult.findings.filter(f => f.severity !== 'critical' && f.severity !== 'high');

  return (
    <div className="glass-card p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-heading font-bold mb-2">🛡️ Security Findings</h2>
          <p className="text-slate-400">
            {scanResult.totalFindings} security issue(s) detected
          </p>
        </div>
        <button
          onClick={handleRunScan}
          disabled={scanning}
          className="px-4 py-2 bg-syscat-orange hover:bg-orange-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
        >
          {scanning ? '🔄 Scanning...' : '🔄 Refresh Scan'}
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <div className="text-3xl font-bold text-red-400">{scanResult.summary.critical}</div>
          <div className="text-sm text-slate-400 mt-1">Critical</div>
        </div>
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
          <div className="text-3xl font-bold text-orange-400">{scanResult.summary.high}</div>
          <div className="text-sm text-slate-400 mt-1">High</div>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
          <div className="text-3xl font-bold text-amber-400">{scanResult.summary.medium}</div>
          <div className="text-sm text-slate-400 mt-1">Medium</div>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <div className="text-3xl font-bold text-blue-400">{scanResult.summary.low}</div>
          <div className="text-sm text-slate-400 mt-1">Low</div>
        </div>
      </div>

      {/* Findings List */}
      <div className="space-y-4 max-h-[600px] overflow-y-auto">
        {/* Critical Findings */}
        {criticalFindings.map((finding) => (
          <div
            key={finding.id}
            className={`border rounded-xl p-6 ${getSeverityColor(finding.severity)}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{getSeverityIcon(finding.severity)}</span>
                <div>
                  <h3 className="text-lg font-semibold">{finding.title}</h3>
                  <p className="text-sm opacity-80 mt-1">{finding.description}</p>
                </div>
              </div>
              <span className="text-xs px-2 py-1 bg-white/10 rounded uppercase">
                {finding.severity}
              </span>
            </div>

            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium">Recommendation:</p>
              <p className="text-sm opacity-90">{finding.recommendation}</p>
            </div>

            {finding.affectedResources.length > 0 && (
              <details className="mt-4">
                <summary className="text-sm cursor-pointer hover:opacity-80">
                  View affected resources ({finding.affectedResources.length})
                </summary>
                <ul className="mt-2 space-y-1 text-sm opacity-80 pl-4">
                  {finding.affectedResources.slice(0, 10).map((resource, idx) => (
                    <li key={idx}>• {resource.name}</li>
                  ))}
                  {finding.affectedResources.length > 10 && (
                    <li className="text-slate-500">... and {finding.affectedResources.length - 10} more</li>
                  )}
                </ul>
              </details>
            )}

            {finding.remediation && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs opacity-70">
                      {finding.remediation.automated ? '✅ Automated' : '⚠️ Manual'} remediation available
                    </span>
                    {finding.remediation.estimatedTime && (
                      <span className="text-xs opacity-70 ml-2">
                        (~{finding.remediation.estimatedTime} min)
                      </span>
                    )}
                  </div>
                  <button
                    className="text-xs px-3 py-1 bg-white/20 hover:bg-white/30 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={remediating[finding.id]}
                    onClick={async () => {
                      if (!confirm(`Remediate this finding?\n\n${finding.title}\n\nThis will affect ${finding.affectedResources.length} resource(s).`)) {
                        return;
                      }

                      setRemediating(prev => ({ ...prev, [finding.id]: true }));

                      try {
                        const resourceIds = finding.affectedResources.map(r => r.id);
                        const result = await window.syscatApi.remediateFinding(finding.type, resourceIds);

                        if (result.success) {
                          alert(`✅ Remediation complete!\n\nActions taken: ${result.actionsTaken}\n\n${result.errors.length > 0 ? `\nNote: ${result.errors.length} error(s) occurred.` : ''}`);
                          // Refresh scan results
                          await loadScanResults();
                        } else {
                          alert(`❌ Remediation failed:\n\n${result.errors.join('\n')}`);
                        }
                      } catch (error: any) {
                        window.syscatApi.logError('Remediation failed', error);
                        alert(`Failed to remediate: ${error?.message || error}`);
                      } finally {
                        setRemediating(prev => ({ ...prev, [finding.id]: false }));
                      }
                    }}
                  >
                    {remediating[finding.id] ? 'Remediating...' : 'Remediate'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* High Findings */}
        {highFindings.map((finding) => (
          <div
            key={finding.id}
            className={`border rounded-xl p-6 ${getSeverityColor(finding.severity)}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-start gap-3">
                <span className="text-xl">{getSeverityIcon(finding.severity)}</span>
                <div>
                  <h3 className="font-semibold">{finding.title}</h3>
                  <p className="text-sm opacity-80 mt-1">{finding.description}</p>
                </div>
              </div>
            </div>

            {finding.affectedResources.length > 0 && (
              <details className="mt-3">
                <summary className="text-xs cursor-pointer hover:opacity-80">
                  View affected resources ({finding.affectedResources.length})
                </summary>
                <ul className="mt-2 space-y-1 text-xs opacity-80 pl-4">
                  {finding.affectedResources.slice(0, 5).map((resource, idx) => (
                    <li key={idx}>• {resource.name}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        ))}

        {/* Other Findings (collapsed by default) */}
        {otherFindings.length > 0 && (
          <details className="mt-4">
            <summary className="text-sm text-slate-400 cursor-pointer hover:text-slate-300">
              Show {otherFindings.length} medium/low severity findings
            </summary>
            <div className="mt-4 space-y-3">
              {otherFindings.map((finding) => (
                <div
                  key={finding.id}
                  className={`border rounded-lg p-4 ${getSeverityColor(finding.severity)}`}
                >
                  <div className="flex items-start gap-2">
                    <span>{getSeverityIcon(finding.severity)}</span>
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{finding.title}</h4>
                      <p className="text-xs opacity-80 mt-1">{finding.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
};

export default SecurityFindingsPanel;

