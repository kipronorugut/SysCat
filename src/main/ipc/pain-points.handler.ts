import { IpcMain } from 'electron';
import log from 'electron-log';
import { painPointManager } from '../services/pain-point-manager.service';
import { securityStoriesService } from '../services/security-stories.service';
import { recommendationsService } from '../services/recommendations.service';
import { sprintsProjectsService } from '../services/sprints-projects.service';
import { taskManagementService } from '../services/task-management.service';
import { PainPoint, PainPointCategory, PainPointSummary, SecurityStory, EnhancedRecommendation, Sprint, Project, TaskAssignment, Exemption } from '../../shared/types/pain-points';

/**
 * IPC Handlers for Pain Point Management
 * Provides renderer process access to pain point detection and management
 */
export function registerPainPointHandlers(ipcMain: IpcMain): void {
  log.info('[PainPointHandlers] Registering pain point IPC handlers');

  /**
   * Scan for all pain points
   */
  ipcMain.handle('pain-points:scan', async (): Promise<PainPoint[]> => {
    log.info('[PainPointHandlers] Scanning for pain points');
    try {
      const painPoints = await painPointManager.scanAll();
      log.info('[PainPointHandlers] Scan complete', { count: painPoints.length });
      return painPoints;
    } catch (error: any) {
      log.error('[PainPointHandlers] Error scanning pain points', error);
      throw error;
    }
  });

  /**
   * Get summary statistics
   */
  ipcMain.handle('pain-points:summary', async (): Promise<Map<string, PainPointSummary>> => {
    log.info('[PainPointHandlers] Getting pain point summary');
    try {
      const summary = await painPointManager.getSummary();
      // Convert Map to object for IPC serialization
      const summaryObj: Record<string, PainPointSummary> = {};
      for (const [category, data] of summary.entries()) {
        summaryObj[category] = data;
      }
      return summaryObj as any;
    } catch (error: any) {
      log.error('[PainPointHandlers] Error getting summary', error);
      throw error;
    }
  });

  /**
   * Get pain points by category
   */
  ipcMain.handle(
    'pain-points:getByCategory',
    async (_event, category: PainPointCategory): Promise<PainPoint[]> => {
      log.info('[PainPointHandlers] Getting pain points by category', { category });
      try {
        const painPoints = await painPointManager.getPainPointsByCategory(category);
        return painPoints;
      } catch (error: any) {
        log.error('[PainPointHandlers] Error getting pain points by category', error);
        throw error;
      }
    }
  );

  /**
   * Get all pain points
   */
  ipcMain.handle('pain-points:getAll', async (): Promise<PainPoint[]> => {
    log.info('[PainPointHandlers] Getting all pain points');
    try {
      const painPoints = await painPointManager.getAllPainPoints();
      return painPoints;
    } catch (error: any) {
      log.error('[PainPointHandlers] Error getting all pain points', error);
      throw error;
    }
  });

  /**
   * Get pain point by ID
   */
  ipcMain.handle('pain-points:getById', async (_event, id: string): Promise<PainPoint | null> => {
    log.info('[PainPointHandlers] Getting pain point by ID', { id });
    try {
      const allPainPoints = await painPointManager.getAllPainPoints();
      return allPainPoints.find(p => p.id === id) || null;
    } catch (error: any) {
      log.error('[PainPointHandlers] Error getting pain point by ID', error);
      throw error;
    }
  });

  /**
   * Security Stories Handlers
   */
  ipcMain.handle('security-stories:getAll', async (): Promise<SecurityStory[]> => {
    log.info('[PainPointHandlers] Getting all security stories');
    try {
      // Auto-assign pain points to stories
      const painPoints = await painPointManager.getAllPainPoints();
      securityStoriesService.autoAssignPainPointsToStories(painPoints);
      return securityStoriesService.getAllStories();
    } catch (error: any) {
      log.error('[PainPointHandlers] Error getting security stories', error);
      throw error;
    }
  });

  ipcMain.handle('security-stories:getById', async (_event, id: string): Promise<SecurityStory | null> => {
    log.info('[PainPointHandlers] Getting security story by ID', { id });
    try {
      return securityStoriesService.getStoryById(id);
    } catch (error: any) {
      log.error('[PainPointHandlers] Error getting security story', error);
      throw error;
    }
  });

  /**
   * Recommendations Handlers
   */
  ipcMain.handle('recommendations:getByPainPoint', async (_event, painPointId: string): Promise<EnhancedRecommendation | null> => {
    log.info('[PainPointHandlers] Getting recommendation for pain point', { painPointId });
    try {
      const painPoint = await painPointManager.getAllPainPoints().then(pps => pps.find(p => p.id === painPointId));
      if (!painPoint) return null;
      return recommendationsService.generateRecommendation(painPoint);
    } catch (error: any) {
      log.error('[PainPointHandlers] Error getting recommendation', error);
      throw error;
    }
  });

  ipcMain.handle('recommendations:getQuickWins', async (): Promise<EnhancedRecommendation[]> => {
    log.info('[PainPointHandlers] Getting quick wins');
    try {
      const painPoints = await painPointManager.getAllPainPoints();
      // Generate recommendations for all pain points
      painPoints.forEach(pp => recommendationsService.generateRecommendation(pp));
      return recommendationsService.getQuickWins();
    } catch (error: any) {
      log.error('[PainPointHandlers] Error getting quick wins', error);
      throw error;
    }
  });

  ipcMain.handle('recommendations:getByPriority', async (): Promise<{
    highImpactLowEffort: EnhancedRecommendation[];
    highImpactHighEffort: EnhancedRecommendation[];
    lowImpactLowEffort: EnhancedRecommendation[];
    lowImpactHighEffort: EnhancedRecommendation[];
  }> => {
    log.info('[PainPointHandlers] Getting recommendations by priority');
    try {
      const painPoints = await painPointManager.getAllPainPoints();
      // Generate recommendations for all pain points
      painPoints.forEach(pp => recommendationsService.generateRecommendation(pp));
      return recommendationsService.getRecommendationsByPriority();
    } catch (error: any) {
      log.error('[PainPointHandlers] Error getting recommendations by priority', error);
      throw error;
    }
  });

  /**
   * Sprints and Projects Handlers
   */
  ipcMain.handle('sprints:getAll', async (): Promise<Sprint[]> => {
    log.info('[PainPointHandlers] Getting all sprints');
    try {
      return await sprintsProjectsService.getAllSprints();
    } catch (error: any) {
      log.error('[PainPointHandlers] Error getting sprints', error);
      throw error;
    }
  });

  ipcMain.handle('sprints:create', async (_event, sprint: Omit<Sprint, 'id' | 'createdAt' | 'updatedAt'>): Promise<Sprint> => {
    log.info('[PainPointHandlers] Creating sprint');
    try {
      return await sprintsProjectsService.createSprint(sprint);
    } catch (error: any) {
      log.error('[PainPointHandlers] Error creating sprint', error);
      throw error;
    }
  });

  ipcMain.handle('sprints:createQuickWin', async (): Promise<Sprint> => {
    log.info('[PainPointHandlers] Creating quick win sprint');
    try {
      const painPoints = await painPointManager.getAllPainPoints();
      return await sprintsProjectsService.createQuickWinSprint(painPoints);
    } catch (error: any) {
      log.error('[PainPointHandlers] Error creating quick win sprint', error);
      throw error;
    }
  });

  ipcMain.handle('projects:getAll', async (): Promise<Project[]> => {
    log.info('[PainPointHandlers] Getting all projects');
    try {
      return await sprintsProjectsService.getAllProjects();
    } catch (error: any) {
      log.error('[PainPointHandlers] Error getting projects', error);
      throw error;
    }
  });

  ipcMain.handle('projects:create', async (_event, project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> => {
    log.info('[PainPointHandlers] Creating project');
    try {
      return await sprintsProjectsService.createProject(project);
    } catch (error: any) {
      log.error('[PainPointHandlers] Error creating project', error);
      throw error;
    }
  });

  /**
   * Task Management Handlers
   */
  ipcMain.handle('tasks:assign', async (_event, assignment: Omit<TaskAssignment, 'id' | 'assignedAt'>): Promise<TaskAssignment> => {
    log.info('[PainPointHandlers] Assigning task');
    try {
      return await taskManagementService.assignTask(assignment);
    } catch (error: any) {
      log.error('[PainPointHandlers] Error assigning task', error);
      throw error;
    }
  });

  ipcMain.handle('tasks:getAll', async (): Promise<TaskAssignment[]> => {
    log.info('[PainPointHandlers] Getting all task assignments');
    try {
      return await taskManagementService.getAllAssignments();
    } catch (error: any) {
      log.error('[PainPointHandlers] Error getting task assignments', error);
      throw error;
    }
  });

  ipcMain.handle('exemptions:create', async (_event, exemption: Omit<Exemption, 'id' | 'exemptedAt'>): Promise<Exemption> => {
    log.info('[PainPointHandlers] Creating exemption');
    try {
      return await taskManagementService.createExemption(exemption);
    } catch (error: any) {
      log.error('[PainPointHandlers] Error creating exemption', error);
      throw error;
    }
  });

  ipcMain.handle('exemptions:getAll', async (): Promise<Exemption[]> => {
    log.info('[PainPointHandlers] Getting all exemptions');
    try {
      return await taskManagementService.getAllExemptions();
    } catch (error: any) {
      log.error('[PainPointHandlers] Error getting exemptions', error);
      throw error;
    }
  });

  ipcMain.handle('exemptions:check', async (_event, painPointId: string): Promise<Exemption | null> => {
    log.info('[PainPointHandlers] Checking exemption', { painPointId });
    try {
      return await taskManagementService.isExempted(painPointId);
    } catch (error: any) {
      log.error('[PainPointHandlers] Error checking exemption', error);
      throw error;
    }
  });
}

