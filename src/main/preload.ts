import { contextBridge, ipcRenderer } from 'electron';

// Log to both console and try to send to renderer for debugging
try {
  console.log('[Preload] Preload script executing...');
  
  // Expose protected methods that allow the renderer process to use
  // the ipcRenderer without exposing the entire object
  const api = {
  // Auth
  configureAuth: (config: { tenantId: string; clientId: string }) =>
    ipcRenderer.invoke('auth:configure', config),
  getAuthStatus: () => ipcRenderer.invoke('auth:status'),
  loginWithSSO: () => ipcRenderer.invoke('auth:login-sso'),
  loginWithDeviceCode: () => ipcRenderer.invoke('auth:login-device-code'),

  // Graph API
  getTenantSummary: () => ipcRenderer.invoke('graph:tenant-summary'),
  getUsers: (params?: { top?: number; filter?: string }) =>
    ipcRenderer.invoke('graph:users', params),
  getLicenses: () => ipcRenderer.invoke('graph:licenses'),

  // Cache Management
  invalidateCache: (cacheType?: string) => ipcRenderer.invoke('cache:invalidate', cacheType),
  forceRefreshCache: () => ipcRenderer.invoke('cache:forceRefresh'),
  getCacheStats: () => ipcRenderer.invoke('cache:stats'),

  // Automation
  getSafeFixPlan: () => ipcRenderer.invoke('automation:safe-fix-plan'),
  applySafeFixes: (plan: any) => ipcRenderer.invoke('automation:apply-safe-fixes', plan),
  applyCategoryFixes: (plan: any, category: string) => ipcRenderer.invoke('automation:apply-category-fixes', plan, category),
  applyIndividualFix: (category: string, userId: string, details?: any) => 
    ipcRenderer.invoke('automation:apply-individual-fix', category, userId, details),
  getActivityLog: (limit?: number) => ipcRenderer.invoke('automation:get-activity-log', limit),
  runAutomation: (module: string, action: string, params?: any) =>
    ipcRenderer.invoke('automation:run', module, action, params),

  // Security Scanner
  runFullSecurityScan: () => ipcRenderer.invoke('security:run-full-scan'),
  getSecurityScore: () => ipcRenderer.invoke('security:get-security-score'),

  // Remediation
  remediateFinding: (detectionType: string, resourceIds: string[], options?: any) =>
    ipcRenderer.invoke('remediation:remediate-finding', detectionType, resourceIds, options),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (settings: any) => ipcRenderer.invoke('settings:update', settings),
  getStoragePath: () => ipcRenderer.invoke('settings:storage-path'),

  // Pain Points
  scanPainPoints: () => ipcRenderer.invoke('pain-points:scan'),
  getPainPointSummary: () => ipcRenderer.invoke('pain-points:summary'),
  getPainPointsByCategory: (category: string) => ipcRenderer.invoke('pain-points:getByCategory', category),
  getAllPainPoints: () => ipcRenderer.invoke('pain-points:getAll'),
  getPainPointById: (id: string) => ipcRenderer.invoke('pain-points:getById', id),

  // Security Stories
  getAllSecurityStories: () => ipcRenderer.invoke('security-stories:getAll'),
  getSecurityStoryById: (id: string) => ipcRenderer.invoke('security-stories:getById', id),

  // Recommendations
  getRecommendationByPainPoint: (painPointId: string) => ipcRenderer.invoke('recommendations:getByPainPoint', painPointId),
  getQuickWins: () => ipcRenderer.invoke('recommendations:getQuickWins'),
  getRecommendationsByPriority: () => ipcRenderer.invoke('recommendations:getByPriority'),

  // Sprints and Projects
  getAllSprints: () => ipcRenderer.invoke('sprints:getAll'),
  createSprint: (sprint: any) => ipcRenderer.invoke('sprints:create', sprint),
  createQuickWinSprint: () => ipcRenderer.invoke('sprints:createQuickWin'),
  getAllProjects: () => ipcRenderer.invoke('projects:getAll'),
  createProject: (project: any) => ipcRenderer.invoke('projects:create', project),

  // Task Management
  assignTask: (assignment: any) => ipcRenderer.invoke('tasks:assign', assignment),
  getAllTaskAssignments: () => ipcRenderer.invoke('tasks:getAll'),
  createExemption: (exemption: any) => ipcRenderer.invoke('exemptions:create', exemption),
  getAllExemptions: () => ipcRenderer.invoke('exemptions:getAll'),
  checkExemption: (painPointId: string) => ipcRenderer.invoke('exemptions:check', painPointId),

  // Alerts
  getAllAlerts: (includeAcknowledged?: boolean) => ipcRenderer.invoke('alerts:getAll', includeAcknowledged),
  getUnacknowledgedAlerts: () => ipcRenderer.invoke('alerts:getUnacknowledged'),
  acknowledgeAlert: (alertId: string, acknowledgedBy: string) => ipcRenderer.invoke('alerts:acknowledge', alertId, acknowledgedBy),
  createAlertFromDetection: (detection: any) => ipcRenderer.invoke('alerts:createFromDetection', detection),
  getAlertStats: () => ipcRenderer.invoke('alerts:getStats'),
  getAlertConfig: () => ipcRenderer.invoke('alerts:getConfig'),
  updateAlertConfig: (config: any) => ipcRenderer.invoke('alerts:updateConfig', config),

  // AI Analytics
  analyzeFindings: (findings: any[]) => ipcRenderer.invoke('ai:analyzeFindings', findings),
  analyzePainPoints: (painPoints: any[]) => ipcRenderer.invoke('ai:analyzePainPoints', painPoints),
  predictRisks: (findings: any[], historicalData?: any) => ipcRenderer.invoke('ai:predictRisks', findings, historicalData),
  analyzeTrends: (historicalFindings: any[][]) => ipcRenderer.invoke('ai:analyzeTrends', historicalFindings),
  prioritizeRecommendations: (recommendations: any[]) => ipcRenderer.invoke('ai:prioritizeRecommendations', recommendations),
  detectAnomalies: (currentFindings: any[], baseline?: any[]) => ipcRenderer.invoke('ai:detectAnomalies', currentFindings, baseline),
  getAIConfig: () => ipcRenderer.invoke('ai:getConfig'),

  // Quick Wins
  getPrioritizedQuickWins: (painPoints: any[]) => ipcRenderer.invoke('quick-wins:getPrioritized', painPoints),
  getQuickWinMetrics: (painPoints: any[]) => ipcRenderer.invoke('quick-wins:getMetrics', painPoints),
  batchApplyQuickWins: (quickWins: any[]) => ipcRenderer.invoke('quick-wins:batchApply', quickWins),

  // Recommendation Registry
  searchRecommendations: (filters: any) => ipcRenderer.invoke('recommendation-registry:search', filters),
  getRegistryRecommendation: (registryId: string) => ipcRenderer.invoke('recommendation-registry:getById', registryId),
  getAllRegistryRecommendations: () => ipcRenderer.invoke('recommendation-registry:getAll'),
  getRegistryRecommendationsByCategory: (category: string) => ipcRenderer.invoke('recommendation-registry:getByCategory', category),
  getRegistryQuickWins: () => ipcRenderer.invoke('recommendation-registry:getQuickWins'),
  getRegistryCount: () => ipcRenderer.invoke('recommendation-registry:getCount'),
  initializeRegistrySamples: () => ipcRenderer.invoke('recommendation-registry:initializeSamples'),

  // Recommendation Linker
  findMatchingRecommendations: (painPoint: any) => ipcRenderer.invoke('recommendation-linker:findMatches', painPoint),
  linkPainPointToRegistry: (painPoint: any) => ipcRenderer.invoke('recommendation-linker:linkPainPoint', painPoint),
  linkPainPoints: (painPoints: any[]) => ipcRenderer.invoke('recommendation-linker:linkPainPoints', painPoints),
  getEnhancedRecommendation: (painPoint: any) => ipcRenderer.invoke('recommendation-linker:getEnhanced', painPoint),

  // Logging (for renderer debug messages)
  logDebug: (message: string, data?: any) => ipcRenderer.send('log:debug', message, data),
  logInfo: (message: string, data?: any) => ipcRenderer.send('log:info', message, data),
  logError: (message: string, error?: any) => ipcRenderer.send('log:error', message, error),

  // Navigation
  onNavigate: (callback: (path: string) => void) => {
    ipcRenderer.on('navigate', (_event, path) => callback(path));
  },

  // Device code event listener
  onDeviceCode: (callback: (code: { userCode: string; verificationUri: string; message: string }) => void) => {
    ipcRenderer.on('auth:device-code', (_event, code) => callback(code));
  },
  };

  // Expose the API to the renderer
  // Note: contextBridge.exposeInMainWorld is synchronous and should make the API
  // available immediately in the main world context after this call
  contextBridge.exposeInMainWorld('syscatApi', api);
  
  console.log('[Preload] syscatApi exposed to window object successfully');
  console.log('[Preload] Available methods:', Object.keys(api).join(','));
  
  // Verify the API was exposed by checking if we can access it
  // This is just for debugging - the actual check happens in the renderer
  try {
    // Note: We can't actually check window.syscatApi from here because
    // we're in the isolated preload context, not the main world context
    console.log('[Preload] contextBridge.exposeInMainWorld completed');
  } catch (e) {
    console.error('[Preload] Error after exposing API:', e);
  }
} catch (error) {
  console.error('[Preload] Failed to expose syscatApi:', error);
  // Try to expose an error indicator
  try {
    contextBridge.exposeInMainWorld('syscatApi', {
      error: 'Preload script failed to initialize',
      details: error instanceof Error ? error.message : String(error),
    });
  } catch (e) {
    console.error('[Preload] Failed to expose error indicator:', e);
  }
}

// Type declaration for TypeScript
declare global {
  interface Window {
    syscatApi: {
      configureAuth: (config: { tenantId: string; clientId: string }) => Promise<any>;
      getAuthStatus: () => Promise<any>;
      loginWithSSO: () => Promise<{ status: any; userRoles: string[]; message: string }>;
      loginWithDeviceCode: () => Promise<{ code: any; status: any }>;
      getTenantSummary: () => Promise<any>;
      getUsers: (params?: { top?: number; filter?: string }) => Promise<any>;
      getLicenses: () => Promise<any>;
      getSafeFixPlan: () => Promise<any>;
      applySafeFixes: (plan: any) => Promise<any>;
      runAutomation: (module: string, action: string, params?: any) => Promise<any>;
      getSettings: () => Promise<any>;
      updateSettings: (settings: any) => Promise<any>;
      getStoragePath: () => Promise<string>;
      scanPainPoints: () => Promise<any>;
      getPainPointSummary: () => Promise<any>;
      getPainPointsByCategory: (category: string) => Promise<any>;
      getAllPainPoints: () => Promise<any>;
      getPainPointById: (id: string) => Promise<any>;
      getAllSecurityStories: () => Promise<any>;
      getSecurityStoryById: (id: string) => Promise<any>;
      getRecommendationByPainPoint: (painPointId: string) => Promise<any>;
      getQuickWins: () => Promise<any>;
      getRecommendationsByPriority: () => Promise<any>;
      getAllSprints: () => Promise<any>;
      createSprint: (sprint: any) => Promise<any>;
      createQuickWinSprint: () => Promise<any>;
      getAllProjects: () => Promise<any>;
      createProject: (project: any) => Promise<any>;
      assignTask: (assignment: any) => Promise<any>;
      getAllTaskAssignments: () => Promise<any>;
      createExemption: (exemption: any) => Promise<any>;
      getAllExemptions: () => Promise<any>;
      checkExemption: (painPointId: string) => Promise<any>;
      getAllAlerts: (includeAcknowledged?: boolean) => Promise<any>;
      getUnacknowledgedAlerts: () => Promise<any>;
      acknowledgeAlert: (alertId: string, acknowledgedBy: string) => Promise<any>;
      createAlertFromDetection: (detection: any) => Promise<any>;
      getAlertStats: () => Promise<any>;
      getAlertConfig: () => Promise<any>;
      updateAlertConfig: (config: any) => Promise<any>;
      analyzeFindings: (findings: any[]) => Promise<any>;
      analyzePainPoints: (painPoints: any[]) => Promise<any>;
      predictRisks: (findings: any[], historicalData?: any) => Promise<any>;
      analyzeTrends: (historicalFindings: any[][]) => Promise<any>;
      prioritizeRecommendations: (recommendations: any[]) => Promise<any>;
      detectAnomalies: (currentFindings: any[], baseline?: any[]) => Promise<any>;
      getAIConfig: () => Promise<any>;
      getPrioritizedQuickWins: (painPoints: any[]) => Promise<any>;
      getQuickWinMetrics: (painPoints: any[]) => Promise<any>;
      batchApplyQuickWins: (quickWins: any[]) => Promise<any>;
      searchRecommendations: (filters: any) => Promise<any>;
      getRegistryRecommendation: (registryId: string) => Promise<any>;
      getAllRegistryRecommendations: () => Promise<any>;
      getRegistryRecommendationsByCategory: (category: string) => Promise<any>;
      getRegistryQuickWins: () => Promise<any>;
      getRegistryCount: () => Promise<any>;
      initializeRegistrySamples: () => Promise<any>;
      findMatchingRecommendations: (painPoint: any) => Promise<any>;
      linkPainPointToRegistry: (painPoint: any) => Promise<any>;
      linkPainPoints: (painPoints: any[]) => Promise<any>;
      getEnhancedRecommendation: (painPoint: any) => Promise<any>;
      logDebug: (message: string, data?: any) => void;
      logInfo: (message: string, data?: any) => void;
      logError: (message: string, error?: any) => void;
      onNavigate: (callback: (path: string) => void) => void;
      onDeviceCode: (callback: (code: { userCode: string; verificationUri: string; message: string }) => void) => void;
    };
  }
}

