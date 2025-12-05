import cron from 'node-cron';
import log from 'electron-log';
import { automationService } from './automation.service';
import { graphApiService } from './graph-api.service';
import { settingsService } from './settings.service';

export class SchedulerService {
  private tasks: Map<string, cron.ScheduledTask> = new Map();

  initialize(): void {
    log.info('[SchedulerService] Initializing');

    // Load settings to see if auto-fix is enabled
    const settings = settingsService.getSettings();

    // Daily tenant scan at 2 AM
    this.scheduleTask('daily-scan', '0 2 * * *', async () => {
      log.info('[SchedulerService] Running daily tenant scan');
      try {
        await graphApiService.getTenantSummary();
        log.info('[SchedulerService] Daily scan complete');
      } catch (error: any) {
        log.error('[SchedulerService] Daily scan failed', error);
      }
    });

    // Auto-fix safe issues if enabled
    if (settings.automation?.autoFixEnabled) {
      this.scheduleTask('auto-fix', settings.automation.autoFixSchedule || '0 3 * * *', async () => {
        log.info('[SchedulerService] Running auto-fix');
        try {
          const plan = await automationService.getSafeFixPlan();
          await automationService.applySafeFixes(plan);
          log.info('[SchedulerService] Auto-fix complete');
        } catch (error: any) {
          log.error('[SchedulerService] Auto-fix failed', error);
        }
      });
    }

    log.info('[SchedulerService] Initialized', { taskCount: this.tasks.size });
  }

  private scheduleTask(name: string, schedule: string, callback: () => Promise<void>): void {
    if (this.tasks.has(name)) {
      log.warn('[SchedulerService] Task already exists', name);
      return;
    }

    const task = cron.schedule(schedule, async () => {
      try {
        await callback();
      } catch (error: any) {
        log.error('[SchedulerService] Task error', { name, error });
      }
    });

    this.tasks.set(name, task);
    log.info('[SchedulerService] Scheduled task', { name, schedule });
  }

  shutdown(): void {
    log.info('[SchedulerService] Shutting down');
    this.tasks.forEach((task, name) => {
      log.debug('[SchedulerService] Stopping task', name);
      task.stop();
    });
    this.tasks.clear();
  }
}

export const schedulerService = new SchedulerService();

