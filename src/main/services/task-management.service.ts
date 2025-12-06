import log from 'electron-log';
import { TaskAssignment, Exemption } from '../../shared/types/pain-points';
import { db } from '../database/db';

/**
 * Task Management Service
 * Handles task assignment and exemptions
 * Similar to Griffin31's task assignment and exemption features
 */
export class TaskManagementService {
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
        CREATE TABLE IF NOT EXISTS task_assignments (
          id TEXT PRIMARY KEY,
          pain_point_id TEXT NOT NULL,
          assigned_to TEXT,
          assigned_by TEXT NOT NULL,
          assigned_at TEXT NOT NULL,
          due_date TEXT,
          status TEXT NOT NULL,
          notes TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS exemptions (
          id TEXT PRIMARY KEY,
          pain_point_id TEXT NOT NULL,
          reason TEXT NOT NULL,
          exempted_by TEXT NOT NULL,
          exempted_at TEXT NOT NULL,
          expires_at TEXT,
          approved_by TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);
      log.info('[TaskManagementService] Database initialized');
    } catch (error: any) {
      log.error('[TaskManagementService] Error initializing database', error);
    }
  }

  /**
   * Assign a pain point to a user
   */
  async assignTask(assignment: Omit<TaskAssignment, 'id' | 'assignedAt'>): Promise<TaskAssignment> {
    try {
      const database = await db();
      const id = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      const newAssignment: TaskAssignment = {
        ...assignment,
        id,
        assignedAt: new Date(),
      };

      database
        .prepare(
          `INSERT INTO task_assignments (id, pain_point_id, assigned_to, assigned_by, assigned_at, due_date, status, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          id,
          newAssignment.painPointId,
          newAssignment.assignedTo || null,
          newAssignment.assignedBy,
          newAssignment.assignedAt.toISOString(),
          newAssignment.dueDate ? newAssignment.dueDate.toISOString() : null,
          newAssignment.status,
          newAssignment.notes || null,
          now,
          now
        );

      log.info(`[TaskManagementService] Assigned task ${id} for pain point ${newAssignment.painPointId}`);
      return newAssignment;
    } catch (error: any) {
      log.error('[TaskManagementService] Error assigning task', error);
      throw error;
    }
  }

  /**
   * Get all task assignments
   */
  async getAllAssignments(): Promise<TaskAssignment[]> {
    try {
      const database = await db();
      const rows = database.prepare('SELECT * FROM task_assignments ORDER BY assigned_at DESC').all();

      return rows.map((row: any) => ({
        id: row.id,
        painPointId: row.pain_point_id,
        assignedTo: row.assigned_to,
        assignedBy: row.assigned_by,
        assignedAt: new Date(row.assigned_at),
        dueDate: row.due_date ? new Date(row.due_date) : undefined,
        status: row.status,
        notes: row.notes,
      }));
    } catch (error: any) {
      log.error('[TaskManagementService] Error getting assignments', error);
      return [];
    }
  }

  /**
   * Get assignments for a pain point
   */
  async getAssignmentsByPainPoint(painPointId: string): Promise<TaskAssignment[]> {
    try {
      const database = await db();
      const rows = database
        .prepare('SELECT * FROM task_assignments WHERE pain_point_id = ? ORDER BY assigned_at DESC')
        .all(painPointId);

      return rows.map((row: any) => ({
        id: row.id,
        painPointId: row.pain_point_id,
        assignedTo: row.assigned_to,
        assignedBy: row.assigned_by,
        assignedAt: new Date(row.assigned_at),
        dueDate: row.due_date ? new Date(row.due_date) : undefined,
        status: row.status,
        notes: row.notes,
      }));
    } catch (error: any) {
      log.error('[TaskManagementService] Error getting assignments by pain point', error);
      return [];
    }
  }

  /**
   * Update task assignment status
   */
  async updateAssignmentStatus(id: string, status: TaskAssignment['status']): Promise<void> {
    try {
      const database = await db();
      database
        .prepare('UPDATE task_assignments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(status, id);
      log.info(`[TaskManagementService] Updated assignment ${id} status to ${status}`);
    } catch (error: any) {
      log.error('[TaskManagementService] Error updating assignment status', error);
      throw error;
    }
  }

  /**
   * Create an exemption
   */
  async createExemption(exemption: Omit<Exemption, 'id' | 'exemptedAt'>): Promise<Exemption> {
    try {
      const database = await db();
      const id = `exemption-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      const newExemption: Exemption = {
        ...exemption,
        id,
        exemptedAt: new Date(),
      };

      database
        .prepare(
          `INSERT INTO exemptions (id, pain_point_id, reason, exempted_by, exempted_at, expires_at, approved_by, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          id,
          newExemption.painPointId,
          newExemption.reason,
          newExemption.exemptedBy,
          newExemption.exemptedAt.toISOString(),
          newExemption.expiresAt ? newExemption.expiresAt.toISOString() : null,
          newExemption.approvedBy || null,
          now
        );

      log.info(`[TaskManagementService] Created exemption ${id} for pain point ${newExemption.painPointId}`);
      return newExemption;
    } catch (error: any) {
      log.error('[TaskManagementService] Error creating exemption', error);
      throw error;
    }
  }

  /**
   * Get all exemptions
   */
  async getAllExemptions(): Promise<Exemption[]> {
    try {
      const database = await db();
      const rows = database.prepare('SELECT * FROM exemptions ORDER BY exempted_at DESC').all();

      return rows.map((row: any) => ({
        id: row.id,
        painPointId: row.pain_point_id,
        reason: row.reason,
        exemptedBy: row.exempted_by,
        exemptedAt: new Date(row.exempted_at),
        expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
        approvedBy: row.approved_by,
      }));
    } catch (error: any) {
      log.error('[TaskManagementService] Error getting exemptions', error);
      return [];
    }
  }

  /**
   * Check if pain point is exempted
   */
  async isExempted(painPointId: string): Promise<Exemption | null> {
    try {
      const database = await db();
      const now = new Date().toISOString();
      const row = database
        .prepare(
          `SELECT * FROM exemptions WHERE pain_point_id = ? 
           AND (expires_at IS NULL OR expires_at > ?) 
           ORDER BY exempted_at DESC LIMIT 1`
        )
        .get(painPointId, now) as any;

      if (!row) return null;

      return {
        id: row.id,
        painPointId: row.pain_point_id,
        reason: row.reason,
        exemptedBy: row.exempted_by,
        exemptedAt: new Date(row.exempted_at),
        expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
        approvedBy: row.approved_by,
      };
    } catch (error: any) {
      log.error('[TaskManagementService] Error checking exemption', error);
      return null;
    }
  }

  /**
   * Revoke exemption
   */
  async revokeExemption(id: string): Promise<void> {
    try {
      const database = await db();
      // Set expiration to now
      database.prepare('UPDATE exemptions SET expires_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
      log.info(`[TaskManagementService] Revoked exemption ${id}`);
    } catch (error: any) {
      log.error('[TaskManagementService] Error revoking exemption', error);
      throw error;
    }
  }
}

export const taskManagementService = new TaskManagementService();

