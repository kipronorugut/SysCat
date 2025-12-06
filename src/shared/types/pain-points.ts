/**
 * Comprehensive pain point type definitions
 * Organized by category to match the 300+ pain points list
 */

export type PainPointCategory =
  | 'licensing'
  | 'identity'
  | 'exchange'
  | 'teams'
  | 'sharepoint'
  | 'security'
  | 'powershell'
  | 'intune'
  | 'migration'
  | 'reporting'
  | 'portal_ui';

export type PainPointSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type RemediationType = 'automated' | 'semi_automated' | 'manual' | 'not_applicable';

export interface PainPoint {
  id: string;
  category: PainPointCategory;
  severity: PainPointSeverity;
  title: string;
  description: string;
  painPointNumber?: number; // Reference to the original list
  affectedResources: Array<{
    id: string;
    name: string;
    type: string;
    details?: Record<string, any>;
  }>;
  impact: {
    cost?: number; // Estimated monthly cost impact
    time?: number; // Estimated time wasted per month (hours)
    risk?: string; // Security/compliance risk description
  };
  recommendation: string;
  remediation: {
    type: RemediationType;
    automated: boolean;
    action?: string;
    estimatedTime?: number; // Minutes
    requiresApproval?: boolean;
    rollbackAvailable?: boolean;
  };
  metadata?: Record<string, any>;
  detectedAt: Date;
  lastChecked?: Date;
}

export interface PainPointSummary {
  category: PainPointCategory;
  total: number;
  bySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  estimatedImpact: {
    monthlyCost: number;
    monthlyTimeWasted: number;
  };
  automatedFixes: number;
  manualFixes: number;
}

export interface PainPointRegistry {
  [key: string]: {
    id: string;
    category: PainPointCategory;
    title: string;
    description: string;
    defaultSeverity: PainPointSeverity;
    detector: string; // Service that detects this
    remediator?: string; // Service that fixes this
  };
}

/**
 * Security Story - Curated collection of related recommendations
 * Similar to Griffin31's "Security Stories" feature
 */
export type SecurityStoryDomain =
  | 'protect-services'
  | 'protect-users'
  | 'conditional-access'
  | 'identity-protection'
  | 'm365-copilot'
  | 'secure-collaboration'
  | 'emerging-threats'
  | 'license-step-up';

export interface SecurityStory {
  id: string;
  domain: SecurityStoryDomain;
  title: string;
  description: string;
  icon?: string;
  painPointIds: string[]; // Related pain points
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedCompletionTime?: number; // Minutes
  estimatedImpact?: {
    cost?: number;
    security?: string;
    compliance?: string[];
  };
}

/**
 * Enhanced Recommendation with step-by-step guidance
 * Similar to Griffin31's recommendations repository
 */
export interface EnhancedRecommendation {
  id: string;
  painPointId: string;
  title: string;
  description: string;
  stepByStepGuide: Array<{
    step: number;
    title: string;
    description: string;
    action?: string; // PowerShell command or UI action
    screenshot?: string;
  }>;
  licenseRequirements?: string[]; // Required licenses (e.g., "Microsoft 365 E5", "Azure AD P2")
  userImpact: {
    description: string;
    affectedUsers?: number;
    downtime?: string;
    changeType: 'none' | 'low' | 'medium' | 'high';
  };
  estimatedWork: {
    time: number; // Minutes
    complexity: 'low' | 'medium' | 'high';
    requiresApproval: boolean;
  };
  relatedRecommendations?: string[]; // IDs of related recommendations
  relatedStories?: string[]; // IDs of related security stories
  quickWin: boolean; // Easy fix with minimal effort and no user impact
  impactScore: number; // 1-10
  effortScore: number; // 1-10 (1 = low effort, 10 = high effort)
}

/**
 * Sprint - Focused remediation period
 */
export interface Sprint {
  id: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  painPointIds: string[];
  status: 'planned' | 'active' | 'completed' | 'cancelled';
  progress: number; // 0-100
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Project - Higher-level organization of sprints
 */
export interface Project {
  id: string;
  name: string;
  description?: string;
  sprintIds: string[];
  storyIds?: string[]; // Related security stories
  status: 'planning' | 'active' | 'completed' | 'on-hold';
  progress: number; // 0-100
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Task Assignment - Assign pain points to team members
 */
export interface TaskAssignment {
  id: string;
  painPointId: string;
  assignedTo?: string; // User ID or email
  assignedBy: string;
  assignedAt: Date;
  dueDate?: Date;
  status: 'assigned' | 'in-progress' | 'completed' | 'blocked';
  notes?: string;
}

/**
 * Exemption - Exempt a pain point from remediation
 */
export interface Exemption {
  id: string;
  painPointId: string;
  reason: string;
  exemptedBy: string;
  exemptedAt: Date;
  expiresAt?: Date; // Optional expiration date
  approvedBy?: string;
}

