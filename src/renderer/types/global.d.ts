// Type declarations for renderer process
// This extends the Window interface to include syscatApi

export {};

declare global {
  interface Window {
    syscatApi: {
      // Auth
      configureAuth: (config: { tenantId: string; clientId: string }) => Promise<any>;
      getAuthStatus: () => Promise<any>;
      loginWithSSO: () => Promise<{ status: any; userRoles: string[]; message: string }>;
      loginWithDeviceCode: () => Promise<{ code: any; status: any }>;
      
      // Graph API
      getTenantSummary: () => Promise<any>;
      getUsers: (params?: { top?: number; filter?: string }) => Promise<any>;
      getLicenses: () => Promise<any>;
      
      // Cache Management
      invalidateCache: (cacheType?: string) => Promise<any>;
      forceRefreshCache: () => Promise<any>;
      getCacheStats: () => Promise<any>;
      
      // Automation
      getSafeFixPlan: () => Promise<any>;
      applySafeFixes: (plan: any) => Promise<any>;
      applyCategoryFixes: (plan: any, category: string) => Promise<any>;
      applyIndividualFix: (category: string, userId: string, details?: any) => Promise<any>;
      getActivityLog: (limit?: number) => Promise<any[]>;
      runAutomation: (module: string, action: string, params?: any) => Promise<any>;
      
      // Security Scanner
      runFullSecurityScan: () => Promise<any>;
      getSecurityScore: () => Promise<any>;
      
      // Remediation
      remediateFinding: (detectionType: string, resourceIds: string[], options?: any) => Promise<any>;
      
      // Settings
      getSettings: () => Promise<any>;
      updateSettings: (settings: any) => Promise<any>;
      getStoragePath: () => Promise<string>;
      
      // Pain Points
      scanPainPoints: () => Promise<any>;
      getPainPointSummary: () => Promise<any>;
      getPainPointsByCategory: (category: string) => Promise<any>;
      getAllPainPoints: () => Promise<any>;
      getPainPointById: (id: string) => Promise<any>;
      
      // Security Stories
      getAllSecurityStories: () => Promise<any>;
      getSecurityStoryById: (id: string) => Promise<any>;
      
      // Recommendations
      getRecommendationByPainPoint: (painPointId: string) => Promise<any>;
      getQuickWins: () => Promise<any>;
      getRecommendationsByPriority: () => Promise<any>;
      
      // Sprints and Projects
      getAllSprints: () => Promise<any>;
      createSprint: (sprint: any) => Promise<any>;
      createQuickWinSprint: () => Promise<any>;
      getAllProjects: () => Promise<any>;
      createProject: (project: any) => Promise<any>;
      
      // Task Management
      assignTask: (assignment: any) => Promise<any>;
      getAllTaskAssignments: () => Promise<any>;
      createExemption: (exemption: any) => Promise<any>;
      getAllExemptions: () => Promise<any>;
      checkExemption: (painPointId: string) => Promise<any>;
      
      // Alerts
      getAllAlerts: (includeAcknowledged?: boolean) => Promise<any>;
      getUnacknowledgedAlerts: () => Promise<any>;
      acknowledgeAlert: (alertId: string, acknowledgedBy: string) => Promise<any>;
      createAlertFromDetection: (detection: any) => Promise<any>;
      getAlertStats: () => Promise<any>;
      getAlertConfig: () => Promise<any>;
      updateAlertConfig: (config: any) => Promise<any>;
      
      // AI Analytics
      analyzeFindings: (findings: any[]) => Promise<any>;
      analyzePainPoints: (painPoints: any[]) => Promise<any>;
      predictRisks: (findings: any[], historicalData?: any) => Promise<any>;
      analyzeTrends: (historicalFindings: any[][]) => Promise<any>;
      prioritizeRecommendations: (recommendations: any[]) => Promise<any>;
      detectAnomalies: (currentFindings: any[], baseline?: any[]) => Promise<any>;
      getAIConfig: () => Promise<any>;
      
      // Quick Wins
      getPrioritizedQuickWins: (painPoints: any[]) => Promise<any>;
      getQuickWinMetrics: (painPoints: any[]) => Promise<any>;
      batchApplyQuickWins: (quickWins: any[]) => Promise<any>;
      
      // Recommendation Registry
      searchRecommendations: (filters: any) => Promise<any>;
      getRegistryRecommendation: (registryId: string) => Promise<any>;
      getAllRegistryRecommendations: () => Promise<any>;
      getRegistryRecommendationsByCategory: (category: string) => Promise<any>;
      getRegistryQuickWins: () => Promise<any>;
      getRegistryCount: () => Promise<any>;
      initializeRegistrySamples: () => Promise<any>;
      
      // Recommendation Linker
      findMatchingRecommendations: (painPoint: any) => Promise<any>;
      linkPainPointToRegistry: (painPoint: any) => Promise<any>;
      linkPainPoints: (painPoints: any[]) => Promise<any>;
      getEnhancedRecommendation: (painPoint: any) => Promise<any>;
      
      // Logging
      logDebug: (message: string, data?: any) => void;
      logInfo: (message: string, data?: any) => void;
      logError: (message: string, error?: any) => void;
      
      // Navigation
      onNavigate: (callback: (path: string) => void) => void;
      
      // Device code event listener
      onDeviceCode: (callback: (code: { userCode: string; verificationUri: string; message: string }) => void) => void;
    };
  }
}

