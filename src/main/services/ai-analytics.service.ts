import log from 'electron-log';
import { DetectionResult } from './detection/base-detector.service';
import { PainPoint } from '../../shared/types/pain-points';
import { EnhancedRecommendation } from '../../shared/types/pain-points';

/**
 * AI Analytics Service
 * Provides AI-powered analytics, trend analysis, risk prediction, and intelligent prioritization
 * Uses Azure OpenAI for intelligent insights
 * Similar to Griffin31's "AI-Driven Efficiency" and "Actionable Insights" features
 */

interface AzureAIConfig {
  endpoint: string;
  apiKey: string;
  deployment?: string;
  apiVersion?: string;
}

interface AIInsight {
  type: 'trend' | 'risk' | 'recommendation' | 'anomaly';
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  confidence: number; // 0-100
  actionable: boolean;
  metadata?: Record<string, any>;
}

interface TrendAnalysis {
  metric: string;
  direction: 'increasing' | 'decreasing' | 'stable';
  change: number; // Percentage
  timeframe: string;
  prediction?: string;
}

interface RiskPrediction {
  riskType: string;
  probability: number; // 0-100
  impact: 'critical' | 'high' | 'medium' | 'low';
  timeframe: string; // e.g., "30 days"
  mitigation: string[];
}

export class AIAnalyticsService {
  private config: AzureAIConfig;
  private insightsCache: Map<string, AIInsight[]> = new Map();
  private readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour

  constructor() {
    // Azure OpenAI configuration
    // API key should be set via environment variable AZURE_OPENAI_API_KEY
    // Endpoint should be set via environment variable AZURE_OPENAI_ENDPOINT
    const apiKey = process.env.AZURE_OPENAI_API_KEY || '';
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT || 'https://ak-n8n-demo.openai.azure.com/';
    
    this.config = {
      endpoint: endpoint.endsWith('/') ? endpoint : `${endpoint}/`,
      apiKey: apiKey,
      deployment: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4',
      apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview',
    };

    if (!apiKey) {
      log.warn('[AIAnalyticsService] Azure OpenAI API key not configured. AI features will be limited.');
    } else {
      log.info('[AIAnalyticsService] Initialized with Azure OpenAI');
    }
  }

  /**
   * Analyze security findings and generate AI insights
   */
  async analyzeFindings(findings: DetectionResult[]): Promise<AIInsight[]> {
    log.info('[AIAnalyticsService] Analyzing findings with AI', { count: findings.length });

    try {
      const prompt = this.buildAnalysisPrompt(findings);
      const insights = await this.callAzureOpenAI(prompt);
      
      // Cache insights
      const cacheKey = `findings-${Date.now()}`;
      this.insightsCache.set(cacheKey, insights);

      return insights;
    } catch (error: any) {
      log.error('[AIAnalyticsService] Error analyzing findings', error);
      // Return fallback insights if AI fails
      return this.generateFallbackInsights(findings);
    }
  }

  /**
   * Analyze pain points and generate prioritized recommendations
   */
  async analyzePainPoints(painPoints: PainPoint[]): Promise<AIInsight[]> {
    log.info('[AIAnalyticsService] Analyzing pain points with AI', { count: painPoints.length });

    try {
      const prompt = this.buildPainPointAnalysisPrompt(painPoints);
      const insights = await this.callAzureOpenAI(prompt);
      
      return insights;
    } catch (error: any) {
      log.error('[AIAnalyticsService] Error analyzing pain points', error);
      return this.generateFallbackPainPointInsights(painPoints);
    }
  }

  /**
   * Predict security risks based on current state
   */
  async predictRisks(findings: DetectionResult[], historicalData?: any): Promise<RiskPrediction[]> {
    log.info('[AIAnalyticsService] Predicting security risks');

    try {
      const prompt = this.buildRiskPredictionPrompt(findings, historicalData);
      const response = await this.callAzureOpenAI(prompt);
      
      // Parse AI response into risk predictions
      return this.parseRiskPredictions(response);
    } catch (error: any) {
      log.error('[AIAnalyticsService] Error predicting risks', error);
      return [];
    }
  }

  /**
   * Analyze trends in security posture
   */
  async analyzeTrends(historicalFindings: DetectionResult[][]): Promise<TrendAnalysis[]> {
    log.info('[AIAnalyticsService] Analyzing security trends');

    try {
      const prompt = this.buildTrendAnalysisPrompt(historicalFindings);
      const response = await this.callAzureOpenAI(prompt);
      
      return this.parseTrendAnalysis(response);
    } catch (error: any) {
      log.error('[AIAnalyticsService] Error analyzing trends', error);
      return [];
    }
  }

  /**
   * Intelligently prioritize recommendations
   */
  async prioritizeRecommendations(
    recommendations: EnhancedRecommendation[]
  ): Promise<EnhancedRecommendation[]> {
    log.info('[AIAnalyticsService] Prioritizing recommendations with AI', { count: recommendations.length });

    try {
      const prompt = this.buildPrioritizationPrompt(recommendations);
      const response = await this.callAzureOpenAI(prompt);
      
      // Parse prioritized order
      const priorityOrder = this.parsePriorityOrder(response, recommendations);
      
      // Reorder recommendations
      return priorityOrder.map(id => recommendations.find(r => r.id === id)!).filter(Boolean);
    } catch (error: any) {
      log.error('[AIAnalyticsService] Error prioritizing recommendations', error);
      // Fallback to default prioritization
      return this.defaultPrioritization(recommendations);
    }
  }

  /**
   * Detect anomalies in security configuration
   */
  async detectAnomalies(currentFindings: DetectionResult[], baseline?: DetectionResult[]): Promise<AIInsight[]> {
    log.info('[AIAnalyticsService] Detecting anomalies');

    try {
      const prompt = this.buildAnomalyDetectionPrompt(currentFindings, baseline);
      const insights = await this.callAzureOpenAI(prompt);
      
      return insights.filter(i => i.type === 'anomaly');
    } catch (error: any) {
      log.error('[AIAnalyticsService] Error detecting anomalies', error);
      return [];
    }
  }

  /**
   * Call Azure OpenAI API
   */
  private async callAzureOpenAI(prompt: string): Promise<any> {
    const url = `${this.config.endpoint}openai/deployments/${this.config.deployment}/chat/completions?api-version=${this.config.apiVersion}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.config.apiKey,
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'You are a Microsoft 365 security expert. Analyze security findings and provide actionable insights. Respond in JSON format.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        log.error('[AIAnalyticsService] Azure OpenAI API error', { status: response.status, error: errorText });
        throw new Error(`Azure OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No content in AI response');
      }

      // Parse JSON response
      try {
        return JSON.parse(content);
      } catch {
        // If not JSON, return as text
        return { text: content };
      }
    } catch (error: any) {
      log.error('[AIAnalyticsService] Error calling Azure OpenAI', error);
      throw error;
    }
  }

  /**
   * Build analysis prompt for findings
   */
  private buildAnalysisPrompt(findings: DetectionResult[]): string {
    const summary = {
      total: findings.length,
      critical: findings.filter(f => f.severity === 'critical').length,
      high: findings.filter(f => f.severity === 'high').length,
      types: [...new Set(findings.map(f => f.type))],
    };

    return `Analyze these Microsoft 365 security findings and provide insights:

Summary:
- Total findings: ${summary.total}
- Critical: ${summary.critical}
- High: ${summary.high}
- Types: ${summary.types.join(', ')}

Findings:
${findings.slice(0, 10).map(f => `- ${f.title} (${f.severity}): ${f.description}`).join('\n')}

Provide insights in JSON format:
{
  "insights": [
    {
      "type": "trend|risk|recommendation|anomaly",
      "title": "Insight title",
      "description": "Detailed description",
      "severity": "critical|high|medium|low",
      "confidence": 0-100,
      "actionable": true/false
    }
  ]
}`;
  }

  /**
   * Build pain point analysis prompt
   */
  private buildPainPointAnalysisPrompt(painPoints: PainPoint[]): string {
    const summary = {
      total: painPoints.length,
      byCategory: {} as Record<string, number>,
      automated: painPoints.filter(p => p.remediation.automated).length,
    };

    for (const pp of painPoints) {
      summary.byCategory[pp.category] = (summary.byCategory[pp.category] || 0) + 1;
    }

    return `Analyze these Microsoft 365 pain points and provide prioritized recommendations:

Summary:
- Total pain points: ${summary.total}
- Automated fixes available: ${summary.automated}
- By category: ${JSON.stringify(summary.byCategory)}

Pain Points:
${painPoints.slice(0, 10).map(p => `- ${p.title} (${p.category}, ${p.severity})`).join('\n')}

Provide insights in JSON format with prioritization recommendations.`;
  }

  /**
   * Build risk prediction prompt
   */
  private buildRiskPredictionPrompt(findings: DetectionResult[], historicalData?: any): string {
    return `Based on these security findings, predict potential security risks:

Current Findings:
${findings.filter(f => f.severity === 'critical' || f.severity === 'high').map(f => `- ${f.title}`).join('\n')}

${historicalData ? `Historical Context:\n${JSON.stringify(historicalData)}` : ''}

Provide risk predictions in JSON format:
{
  "risks": [
    {
      "riskType": "Type of risk",
      "probability": 0-100,
      "impact": "critical|high|medium|low",
      "timeframe": "e.g., 30 days",
      "mitigation": ["action 1", "action 2"]
    }
  ]
}`;
  }

  /**
   * Build trend analysis prompt
   */
  private buildTrendAnalysisPrompt(historicalFindings: DetectionResult[][]): string {
    return `Analyze security trends over time:

Historical Data:
${historicalFindings.map((findings, index) => 
  `Period ${index + 1}: ${findings.length} findings (${findings.filter(f => f.severity === 'critical').length} critical)`
).join('\n')}

Provide trend analysis in JSON format.`;
  }

  /**
   * Build prioritization prompt
   */
  private buildPrioritizationPrompt(recommendations: EnhancedRecommendation[]): string {
    return `Prioritize these security recommendations based on impact, effort, and risk:

Recommendations:
${recommendations.map(r => 
  `- ${r.title}: Impact ${r.impactScore}/10, Effort ${r.effortScore}/10, Quick Win: ${r.quickWin}`
).join('\n')}

Return prioritized list of recommendation IDs in order of priority.`;
  }

  /**
   * Build anomaly detection prompt
   */
  private buildAnomalyDetectionPrompt(currentFindings: DetectionResult[], baseline?: DetectionResult[]): string {
    return `Detect anomalies in current security findings:

Current Findings:
${currentFindings.map(f => `- ${f.type}: ${f.title}`).join('\n')}

${baseline ? `Baseline:\n${baseline.map(f => `- ${f.type}: ${f.title}`).join('\n')}` : ''}

Identify any anomalies or unusual patterns.`;
  }

  /**
   * Parse risk predictions from AI response
   */
  private parseRiskPredictions(response: any): RiskPrediction[] {
    if (response.risks && Array.isArray(response.risks)) {
      return response.risks;
    }
    return [];
  }

  /**
   * Parse trend analysis from AI response
   */
  private parseTrendAnalysis(response: any): TrendAnalysis[] {
    if (response.trends && Array.isArray(response.trends)) {
      return response.trends;
    }
    return [];
  }

  /**
   * Parse priority order from AI response
   */
  private parsePriorityOrder(response: any, recommendations: EnhancedRecommendation[]): string[] {
    if (response.prioritized && Array.isArray(response.prioritized)) {
      return response.prioritized;
    }
    
    // Fallback: extract IDs from text response
    const ids = recommendations.map(r => r.id);
    return ids;
  }

  /**
   * Generate fallback insights when AI is unavailable
   */
  private generateFallbackInsights(findings: DetectionResult[]): AIInsight[] {
    const criticalCount = findings.filter(f => f.severity === 'critical').length;
    const highCount = findings.filter(f => f.severity === 'high').length;

    const insights: AIInsight[] = [];

    if (criticalCount > 0) {
      insights.push({
        type: 'risk',
        title: 'Critical Security Issues Detected',
        description: `${criticalCount} critical security issue(s) require immediate attention.`,
        severity: 'critical',
        confidence: 95,
        actionable: true,
      });
    }

    if (highCount > 5) {
      insights.push({
        type: 'trend',
        title: 'High Number of High-Severity Findings',
        description: `${highCount} high-severity findings detected. Consider a comprehensive security review.`,
        severity: 'high',
        confidence: 85,
        actionable: true,
      });
    }

    return insights;
  }

  /**
   * Generate fallback pain point insights
   */
  private generateFallbackPainPointInsights(painPoints: PainPoint[]): AIInsight[] {
    const quickWins = painPoints.filter(p => 
      p.remediation.automated && 
      p.severity !== 'critical' && 
      (p.remediation.estimatedTime || 0) <= 15
    );

    if (quickWins.length > 0) {
      return [{
        type: 'recommendation',
        title: 'Quick Wins Available',
        description: `${quickWins.length} quick win(s) available for immediate remediation.`,
        severity: 'medium',
        confidence: 90,
        actionable: true,
        metadata: { quickWinCount: quickWins.length },
      }];
    }

    return [];
  }

  /**
   * Default prioritization when AI is unavailable
   */
  private defaultPrioritization(recommendations: EnhancedRecommendation[]): EnhancedRecommendation[] {
    return [...recommendations].sort((a, b) => {
      // Prioritize by: quick wins first, then impact/effort ratio
      if (a.quickWin && !b.quickWin) return -1;
      if (!a.quickWin && b.quickWin) return 1;
      
      const ratioA = a.impactScore / a.effortScore;
      const ratioB = b.impactScore / b.effortScore;
      
      return ratioB - ratioA;
    });
  }

  /**
   * Update Azure OpenAI configuration
   */
  updateConfig(config: Partial<AzureAIConfig>): void {
    this.config = { ...this.config, ...config };
    log.info('[AIAnalyticsService] Updated configuration');
  }

  /**
   * Get current configuration (without sensitive data)
   */
  getConfig(): Omit<AzureAIConfig, 'apiKey'> {
    return {
      endpoint: this.config.endpoint,
      deployment: this.config.deployment,
      apiVersion: this.config.apiVersion,
    };
  }
}

export const aiAnalyticsService = new AIAnalyticsService();

