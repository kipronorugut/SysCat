import { ipcMain } from 'electron';
import log from 'electron-log';
import { aiAnalyticsService } from '../services/ai-analytics.service';
import { DetectionResult } from '../services/detection/base-detector.service';
import { PainPoint, EnhancedRecommendation } from '../../shared/types/pain-points';

/**
 * IPC Handler for AI Analytics Service
 * Exposes AI-powered analytics to renderer process
 */
export function registerAIAnalyticsHandlers(): void {
  log.info('[AIAnalyticsHandler] Registering AI analytics IPC handlers');

  // Analyze findings
  ipcMain.handle('ai:analyzeFindings', async (_event, findings: DetectionResult[]) => {
    try {
      return await aiAnalyticsService.analyzeFindings(findings);
    } catch (error: any) {
      log.error('[AIAnalyticsHandler] Error analyzing findings', error);
      throw error;
    }
  });

  // Analyze pain points
  ipcMain.handle('ai:analyzePainPoints', async (_event, painPoints: PainPoint[]) => {
    try {
      return await aiAnalyticsService.analyzePainPoints(painPoints);
    } catch (error: any) {
      log.error('[AIAnalyticsHandler] Error analyzing pain points', error);
      throw error;
    }
  });

  // Predict risks
  ipcMain.handle('ai:predictRisks', async (_event, findings: DetectionResult[], historicalData?: any) => {
    try {
      return await aiAnalyticsService.predictRisks(findings, historicalData);
    } catch (error: any) {
      log.error('[AIAnalyticsHandler] Error predicting risks', error);
      throw error;
    }
  });

  // Analyze trends
  ipcMain.handle('ai:analyzeTrends', async (_event, historicalFindings: DetectionResult[][]) => {
    try {
      return await aiAnalyticsService.analyzeTrends(historicalFindings);
    } catch (error: any) {
      log.error('[AIAnalyticsHandler] Error analyzing trends', error);
      throw error;
    }
  });

  // Prioritize recommendations
  ipcMain.handle('ai:prioritizeRecommendations', async (_event, recommendations: EnhancedRecommendation[]) => {
    try {
      return await aiAnalyticsService.prioritizeRecommendations(recommendations);
    } catch (error: any) {
      log.error('[AIAnalyticsHandler] Error prioritizing recommendations', error);
      throw error;
    }
  });

  // Detect anomalies
  ipcMain.handle('ai:detectAnomalies', async (_event, currentFindings: DetectionResult[], baseline?: DetectionResult[]) => {
    try {
      return await aiAnalyticsService.detectAnomalies(currentFindings, baseline);
    } catch (error: any) {
      log.error('[AIAnalyticsHandler] Error detecting anomalies', error);
      throw error;
    }
  });

  // Get AI configuration
  ipcMain.handle('ai:getConfig', async () => {
    try {
      return aiAnalyticsService.getConfig();
    } catch (error: any) {
      log.error('[AIAnalyticsHandler] Error getting AI config', error);
      throw error;
    }
  });
}

