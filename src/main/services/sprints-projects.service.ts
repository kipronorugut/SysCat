import log from 'electron-log';
import { Sprint, Project, PainPoint } from '../../shared/types/pain-points';
import { db } from '../database/db';

/**
 * Sprints and Projects Service
 * Organizes remediation into focused sprints and projects
 * Similar to Griffin31's "Sprints And Projects" feature
 */
export class SprintsProjectsService {
  constructor() {
    this.initializeDatabase();
  }

  /**
   * Initialize database tables
   */
  private async initializeDatabase(): Promise<void> {
    try {
      const database = await db();
      database.exec(`
        CREATE TABLE IF NOT EXISTS sprints (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          start_date TEXT NOT NULL,
          end_date TEXT NOT NULL,
          pain_point_ids TEXT NOT NULL,
          status TEXT NOT NULL,
          progress INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS projects (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          sprint_ids TEXT NOT NULL,
          story_ids TEXT,
          status TEXT NOT NULL,
          progress INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);
      log.info('[SprintsProjectsService] Database initialized');
    } catch (error: any) {
      log.error('[SprintsProjectsService] Error initializing database', error);
    }
  }

  /**
   * Create a new sprint
   */
  async createSprint(sprint: Omit<Sprint, 'id' | 'createdAt' | 'updatedAt'>): Promise<Sprint> {
    try {
      const database = await db();
      const id = `sprint-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      const newSprint: Sprint = {
        ...sprint,
        id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      database
        .prepare(
          `INSERT INTO sprints (id, name, description, start_date, end_date, pain_point_ids, status, progress, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          id,
          newSprint.name,
          newSprint.description || null,
          newSprint.startDate.toISOString(),
          newSprint.endDate.toISOString(),
          JSON.stringify(newSprint.painPointIds),
          newSprint.status,
          newSprint.progress,
          now,
          now
        );

      log.info(`[SprintsProjectsService] Created sprint ${id}`);
      return newSprint;
    } catch (error: any) {
      log.error('[SprintsProjectsService] Error creating sprint', error);
      throw error;
    }
  }

  /**
   * Get all sprints
   */
  async getAllSprints(): Promise<Sprint[]> {
    try {
      const database = await db();
      const rows = database.prepare('SELECT * FROM sprints ORDER BY created_at DESC').all();

      return rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        startDate: new Date(row.start_date),
        endDate: new Date(row.end_date),
        painPointIds: JSON.parse(row.pain_point_ids),
        status: row.status,
        progress: row.progress,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      }));
    } catch (error: any) {
      log.error('[SprintsProjectsService] Error getting sprints', error);
      return [];
    }
  }

  /**
   * Get sprint by ID
   */
  async getSprintById(id: string): Promise<Sprint | null> {
    try {
      const database = await db();
      const row = database.prepare('SELECT * FROM sprints WHERE id = ?').get(id) as any;

      if (!row) return null;

      return {
        id: row.id,
        name: row.name,
        description: row.description,
        startDate: new Date(row.start_date),
        endDate: new Date(row.end_date),
        painPointIds: JSON.parse(row.pain_point_ids),
        status: row.status,
        progress: row.progress,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      };
    } catch (error: any) {
      log.error('[SprintsProjectsService] Error getting sprint', error);
      return null;
    }
  }

  /**
   * Update sprint
   */
  async updateSprint(id: string, updates: Partial<Sprint>): Promise<Sprint | null> {
    try {
      const database = await db();
      const existing = await this.getSprintById(id);
      if (!existing) return null;

      const updated: Sprint = {
        ...existing,
        ...updates,
        updatedAt: new Date(),
      };

      database
        .prepare(
          `UPDATE sprints SET name = ?, description = ?, start_date = ?, end_date = ?, 
           pain_point_ids = ?, status = ?, progress = ?, updated_at = ? WHERE id = ?`
        )
        .run(
          updated.name,
          updated.description || null,
          updated.startDate.toISOString(),
          updated.endDate.toISOString(),
          JSON.stringify(updated.painPointIds),
          updated.status,
          updated.progress,
          updated.updatedAt.toISOString(),
          id
        );

      log.info(`[SprintsProjectsService] Updated sprint ${id}`);
      return updated;
    } catch (error: any) {
      log.error('[SprintsProjectsService] Error updating sprint', error);
      throw error;
    }
  }

  /**
   * Create a new project
   */
  async createProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    try {
      const database = await db();
      const id = `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      const newProject: Project = {
        ...project,
        id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      database
        .prepare(
          `INSERT INTO projects (id, name, description, sprint_ids, story_ids, status, progress, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          id,
          newProject.name,
          newProject.description || null,
          JSON.stringify(newProject.sprintIds),
          newProject.storyIds ? JSON.stringify(newProject.storyIds) : null,
          newProject.status,
          newProject.progress,
          now,
          now
        );

      log.info(`[SprintsProjectsService] Created project ${id}`);
      return newProject;
    } catch (error: any) {
      log.error('[SprintsProjectsService] Error creating project', error);
      throw error;
    }
  }

  /**
   * Get all projects
   */
  async getAllProjects(): Promise<Project[]> {
    try {
      const database = await db();
      const rows = database.prepare('SELECT * FROM projects ORDER BY created_at DESC').all();

      return rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        sprintIds: JSON.parse(row.sprint_ids),
        storyIds: row.story_ids ? JSON.parse(row.story_ids) : undefined,
        status: row.status,
        progress: row.progress,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      }));
    } catch (error: any) {
      log.error('[SprintsProjectsService] Error getting projects', error);
      return [];
    }
  }

  /**
   * Create quick win sprint from pain points
   */
  async createQuickWinSprint(painPoints: PainPoint[]): Promise<Sprint> {
    const quickWins = painPoints.filter((pp) => {
      // Quick wins: automated, low severity, minimal user impact
      return (
        pp.remediation.automated &&
        pp.severity !== 'critical' &&
        (pp.remediation.estimatedTime || 0) <= 15
      );
    });

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7); // 1 week sprint

    return this.createSprint({
      name: 'Quick Wins Sprint',
      description: 'Focus on easy fixes with minimal effort and no user impact',
      startDate: new Date(),
      endDate,
      painPointIds: quickWins.map((pp) => pp.id),
      status: 'planned',
      progress: 0,
    });
  }

  /**
   * Calculate sprint progress
   */
  async calculateSprintProgress(sprintId: string, completedPainPointIds: string[]): Promise<number> {
    const sprint = await this.getSprintById(sprintId);
    if (!sprint || sprint.painPointIds.length === 0) return 0;

    const completed = sprint.painPointIds.filter((id) => completedPainPointIds.includes(id)).length;
    return Math.round((completed / sprint.painPointIds.length) * 100);
  }
}

export const sprintsProjectsService = new SprintsProjectsService();

