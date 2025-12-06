import log from 'electron-log';

/**
 * Base interface for all security detections
 * This pattern allows us to scale to 150+ capabilities
 */
export interface DetectionResult {
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
  metadata?: Record<string, any>;
}

/**
 * Base detector class - all security detectors extend this
 * Provides consistent structure for 150+ detection capabilities
 */
export abstract class BaseDetector {
  protected abstract detectorName: string;

  /**
   * Run the detection - implemented by each specific detector
   */
  abstract detect(): Promise<DetectionResult[]>;

  /**
   * Get detection summary for dashboard
   */
  async getSummary(): Promise<{
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  }> {
    const results = await this.detect();
    
    return {
      total: results.length,
      critical: results.filter(r => r.severity === 'critical').length,
      high: results.filter(r => r.severity === 'high').length,
      medium: results.filter(r => r.severity === 'medium').length,
      low: results.filter(r => r.severity === 'low').length,
    };
  }

  /**
   * Log detection results for audit trail
   */
  protected logDetection(result: DetectionResult): void {
    log.info(`[${this.detectorName}] Detection found`, {
      type: result.type,
      severity: result.severity,
      count: result.affectedResources.length,
    });
  }

  /**
   * Create a standardized detection result
   */
  protected createResult(params: {
    type: string;
    severity: DetectionResult['severity'];
    title: string;
    description: string;
    affectedResources: DetectionResult['affectedResources'];
    recommendation: string;
    remediation?: DetectionResult['remediation'];
    metadata?: Record<string, any>;
  }): DetectionResult {
    const id = `${params.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id,
      ...params,
    };
  }
}

