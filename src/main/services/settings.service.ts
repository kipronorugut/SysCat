import Store from 'electron-store';
import log from 'electron-log';
import { app } from 'electron';
import * as path from 'path';

export interface AppSettings {
  auth?: {
    tenantId?: string;
    clientId?: string;
  };
  storage?: {
    path?: string;
    portable?: boolean;
  };
  automation?: {
    autoFixEnabled?: boolean;
    autoFixSchedule?: string;
    mode?: 'monitor' | 'auto-fix' | 'full-autopilot';
  };
  notifications?: {
    enabled?: boolean;
    sound?: boolean;
  };
}

const defaultSettings: AppSettings = {
  automation: {
    autoFixEnabled: false,
    autoFixSchedule: '0 3 * * *', // 3 AM daily
    mode: 'monitor',
  },
  notifications: {
    enabled: true,
    sound: false,
  },
};

export class SettingsService {
  private store: Store<AppSettings>;

  constructor() {
    this.store = new Store<AppSettings>({
      name: 'syscat-settings',
      defaults: defaultSettings,
    });

    log.info('[SettingsService] Initialized', { path: this.store.path });
  }

  getSettings(): AppSettings {
    return this.store.store;
  }

  updateSettings(settings: Partial<AppSettings>): void {
    log.info('[SettingsService] Updating settings', settings);
    const current = this.store.store;
    this.store.store = { ...current, ...settings };
  }

  getStoragePath(): string {
    const settings = this.getSettings();

    if (settings.storage?.path) {
      return settings.storage.path;
    }

    if (settings.storage?.portable) {
      // Portable mode: store in app directory
      return path.join(app.getPath('userData'), 'data');
    }

    // Default: use OS app data directory
    return path.join(app.getPath('userData'), 'data');
  }
}

export const settingsService = new SettingsService();

