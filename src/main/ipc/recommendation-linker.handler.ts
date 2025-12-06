import { ipcMain } from 'electron';
import log from 'electron-log';
import { recommendationLinkerService } from '../services/recommendation-linker.service';
import { PainPoint } from '../../shared/types/pain-points';

/**
 * IPC Handler for Recommendation Linker Service
 * Exposes recommendation linking functionality to renderer process
 */
export function registerRecommendationLinkerHandlers(): void {
  log.info('[RecommendationLinkerHandler] Registering recommendation linker IPC handlers');

  // Find matching recommendations for a pain point
  ipcMain.handle('recommendation-linker:findMatches', async (_event, painPoint: PainPoint) => {
    try {
      return await recommendationLinkerService.findMatchingRecommendations(painPoint);
    } catch (error: any) {
      log.error('[RecommendationLinkerHandler] Error finding matches', error);
      throw error;
    }
  });

  // Link pain point to registry
  ipcMain.handle('recommendation-linker:linkPainPoint', async (_event, painPoint: PainPoint) => {
    try {
      return await recommendationLinkerService.linkPainPointToRegistry(painPoint);
    } catch (error: any) {
      log.error('[RecommendationLinkerHandler] Error linking pain point', error);
      throw error;
    }
  });

  // Link multiple pain points
  ipcMain.handle('recommendation-linker:linkPainPoints', async (_event, painPoints: PainPoint[]) => {
    try {
      return await recommendationLinkerService.linkPainPoints(painPoints);
    } catch (error: any) {
      log.error('[RecommendationLinkerHandler] Error linking pain points', error);
      throw error;
    }
  });

  // Get enhanced recommendation
  ipcMain.handle('recommendation-linker:getEnhanced', async (_event, painPoint: PainPoint) => {
    try {
      return await recommendationLinkerService.getEnhancedRecommendation(painPoint);
    } catch (error: any) {
      log.error('[RecommendationLinkerHandler] Error getting enhanced recommendation', error);
      throw error;
    }
  });
}

