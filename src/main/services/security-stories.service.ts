import log from 'electron-log';
import { SecurityStory, SecurityStoryDomain, PainPoint } from '../../shared/types/pain-points';

/**
 * Security Stories Service
 * Provides curated collections of related recommendations organized by domain
 * Similar to Griffin31's "Security Stories" feature
 */
export class SecurityStoriesService {
  private stories: Map<string, SecurityStory> = new Map();

  constructor() {
    this.initializeStories();
  }

  /**
   * Initialize default security stories
   */
  private initializeStories(): void {
    log.info('[SecurityStoriesService] Initializing security stories');

    const defaultStories: SecurityStory[] = [
      {
        id: 'protect-services',
        domain: 'protect-services',
        title: 'Protect Services',
        description: 'Secure your Microsoft 365 services and applications from misconfigurations and threats.',
        icon: '🛡️',
        painPointIds: [],
        priority: 'high',
        estimatedCompletionTime: 120,
        estimatedImpact: {
          security: 'High - Prevents service-level security breaches',
        },
      },
      {
        id: 'protect-users',
        domain: 'protect-users',
        title: 'Protect Users',
        description: 'Strengthen user identity protection and access controls across your organization.',
        icon: '👥',
        painPointIds: [],
        priority: 'critical',
        estimatedCompletionTime: 180,
        estimatedImpact: {
          security: 'Critical - Prevents account compromise and identity attacks',
        },
      },
      {
        id: 'conditional-access',
        domain: 'conditional-access',
        title: 'Conditional Access',
        description: 'Implement and optimize Conditional Access policies to enforce security controls.',
        icon: '🔐',
        painPointIds: [],
        priority: 'high',
        estimatedCompletionTime: 240,
        estimatedImpact: {
          security: 'High - Enforces adaptive security controls',
        },
      },
      {
        id: 'identity-protection',
        domain: 'identity-protection',
        title: 'Identity Protection',
        description: 'Enable and configure Identity Protection to detect and respond to identity risks.',
        icon: '🆔',
        painPointIds: [],
        priority: 'high',
        estimatedCompletionTime: 90,
        estimatedImpact: {
          security: 'High - Detects compromised identities early',
        },
      },
      {
        id: 'm365-copilot',
        domain: 'm365-copilot',
        title: 'M365 Copilot Security',
        description: 'Secure Microsoft 365 Copilot deployment and manage AI-powered features safely.',
        icon: '🤖',
        painPointIds: [],
        priority: 'medium',
        estimatedCompletionTime: 60,
        estimatedImpact: {
          security: 'Medium - Ensures AI features are used securely',
        },
      },
      {
        id: 'secure-collaboration',
        domain: 'secure-collaboration',
        title: 'Secure Collaboration',
        description: 'Protect Teams, SharePoint, and OneDrive from data leakage and unauthorized access.',
        icon: '💬',
        painPointIds: [],
        priority: 'high',
        estimatedCompletionTime: 150,
        estimatedImpact: {
          security: 'High - Prevents data breaches in collaboration tools',
        },
      },
      {
        id: 'emerging-threats',
        domain: 'emerging-threats',
        title: 'Emerging Threats',
        description: 'Stay ahead of new security threats and implement proactive protections.',
        icon: '⚠️',
        painPointIds: [],
        priority: 'high',
        estimatedCompletionTime: 120,
        estimatedImpact: {
          security: 'High - Protects against latest attack vectors',
        },
      },
      {
        id: 'license-step-up',
        domain: 'license-step-up',
        title: 'License Step-Up',
        description: 'Optimize license usage and identify opportunities to step up to better security features.',
        icon: '📈',
        painPointIds: [],
        priority: 'medium',
        estimatedCompletionTime: 90,
        estimatedImpact: {
          cost: 0, // May increase costs but improve security
          security: 'Medium - Better security features with upgraded licenses',
        },
      },
    ];

    for (const story of defaultStories) {
      this.stories.set(story.id, story);
    }

    log.info(`[SecurityStoriesService] Initialized ${this.stories.size} security stories`);
  }

  /**
   * Get all security stories
   */
  getAllStories(): SecurityStory[] {
    return Array.from(this.stories.values());
  }

  /**
   * Get story by ID
   */
  getStoryById(id: string): SecurityStory | null {
    return this.stories.get(id) || null;
  }

  /**
   * Get stories by domain
   */
  getStoriesByDomain(domain: SecurityStoryDomain): SecurityStory[] {
    return Array.from(this.stories.values()).filter((s) => s.domain === domain);
  }

  /**
   * Update story with related pain points
   */
  updateStoryPainPoints(storyId: string, painPointIds: string[]): void {
    const story = this.stories.get(storyId);
    if (story) {
      story.painPointIds = painPointIds;
      this.stories.set(storyId, story);
      log.debug(`[SecurityStoriesService] Updated story ${storyId} with ${painPointIds.length} pain points`);
    }
  }

  /**
   * Auto-assign pain points to stories based on category and content
   */
  autoAssignPainPointsToStories(painPoints: PainPoint[]): void {
    log.info('[SecurityStoriesService] Auto-assigning pain points to stories');

    // Clear existing assignments
    for (const story of this.stories.values()) {
      story.painPointIds = [];
    }

    // Assign pain points to stories based on category and content
    for (const painPoint of painPoints) {
      const storyIds = this.findRelevantStories(painPoint);
      for (const storyId of storyIds) {
        const story = this.stories.get(storyId);
        if (story) {
          story.painPointIds.push(painPoint.id);
        }
      }
    }

    // Update stories map
    for (const story of this.stories.values()) {
      this.stories.set(story.id, story);
    }

    log.info('[SecurityStoriesService] Auto-assignment complete');
  }

  /**
   * Find relevant stories for a pain point
   */
  private findRelevantStories(painPoint: PainPoint): string[] {
    const relevantStories: string[] = [];

    // Map categories to stories
    const categoryToStoryMap: Record<string, string[]> = {
      identity: ['protect-users', 'conditional-access', 'identity-protection'],
      security: ['protect-services', 'protect-users', 'emerging-threats'],
      licensing: ['license-step-up'],
      teams: ['secure-collaboration'],
      sharepoint: ['secure-collaboration'],
      exchange: ['protect-services'],
    };

    // Add stories based on category
    const categoryStories = categoryToStoryMap[painPoint.category] || [];
    relevantStories.push(...categoryStories);

    // Add stories based on keywords in title/description
    const text = `${painPoint.title} ${painPoint.description}`.toLowerCase();
    if (text.includes('conditional access') || text.includes('ca policy')) {
      relevantStories.push('conditional-access');
    }
    if (text.includes('identity protection') || text.includes('risky')) {
      relevantStories.push('identity-protection');
    }
    if (text.includes('copilot') || text.includes('ai')) {
      relevantStories.push('m365-copilot');
    }
    if (text.includes('phishing') || text.includes('threat') || text.includes('attack')) {
      relevantStories.push('emerging-threats');
    }

    // Remove duplicates
    return Array.from(new Set(relevantStories));
  }
}

export const securityStoriesService = new SecurityStoriesService();

