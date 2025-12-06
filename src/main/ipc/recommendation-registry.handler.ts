import { ipcMain } from 'electron';
import log from 'electron-log';
import { recommendationRegistryService, RecommendationSearchFilters } from '../services/recommendation-registry.service';

/**
 * IPC Handler for Recommendation Registry Service
 * Exposes recommendation registry functionality to renderer process
 */
export function registerRecommendationRegistryHandlers(): void {
  log.info('[RecommendationRegistryHandler] Registering recommendation registry IPC handlers');

  // Search recommendations
  ipcMain.handle('recommendation-registry:search', async (_event, filters: RecommendationSearchFilters) => {
    try {
      return await recommendationRegistryService.searchRecommendations(filters);
    } catch (error: any) {
      log.error('[RecommendationRegistryHandler] Error searching recommendations', error);
      throw error;
    }
  });

  // Get recommendation by ID
  ipcMain.handle('recommendation-registry:getById', async (_event, registryId: string) => {
    try {
      return recommendationRegistryService.getRecommendation(registryId);
    } catch (error: any) {
      log.error('[RecommendationRegistryHandler] Error getting recommendation', error);
      throw error;
    }
  });

  // Get all recommendations
  ipcMain.handle('recommendation-registry:getAll', async () => {
    try {
      return recommendationRegistryService.getAllRecommendations();
    } catch (error: any) {
      log.error('[RecommendationRegistryHandler] Error getting all recommendations', error);
      throw error;
    }
  });

  // Get recommendations by category
  ipcMain.handle('recommendation-registry:getByCategory', async (_event, category: string) => {
    try {
      return recommendationRegistryService.getRecommendationsByCategory(category);
    } catch (error: any) {
      log.error('[RecommendationRegistryHandler] Error getting recommendations by category', error);
      throw error;
    }
  });

  // Get quick wins from registry
  ipcMain.handle('recommendation-registry:getQuickWins', async () => {
    try {
      return recommendationRegistryService.getQuickWins();
    } catch (error: any) {
      log.error('[RecommendationRegistryHandler] Error getting quick wins', error);
      throw error;
    }
  });

  // Get registry count
  ipcMain.handle('recommendation-registry:getCount', async () => {
    try {
      return recommendationRegistryService.getCount();
    } catch (error: any) {
      log.error('[RecommendationRegistryHandler] Error getting count', error);
      throw error;
    }
  });

  // Initialize sample recommendations
  ipcMain.handle('recommendation-registry:initializeSamples', async () => {
    try {
      await recommendationRegistryService.initializeSampleRecommendations();
      return { success: true };
    } catch (error: any) {
      log.error('[RecommendationRegistryHandler] Error initializing samples', error);
      throw error;
    }
  });
}

