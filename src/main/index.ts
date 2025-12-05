import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import log from 'electron-log';
import { registerAuthHandlers } from './ipc/auth.handler';
import { registerGraphHandlers } from './ipc/graph.handler';
import { registerAutomationHandlers } from './ipc/automation.handler';
import { registerSettingsHandlers } from './ipc/settings.handler';
import { schedulerService } from './services/scheduler.service';

// Configure electron-log
log.transports.file.level = 'info';
log.transports.console.level = process.env.NODE_ENV === 'development' ? 'debug' : 'info';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

const isDev = process.env.NODE_ENV === 'development';
const MAIN_WINDOW_WEBPACK_ENTRY = isDev
  ? 'http://localhost:3000'
  : `file://${path.join(__dirname, '../renderer/index.html')}`;

function createWindow(): void {
  log.info('[Main] Creating BrowserWindow');

  const preloadPath = path.join(__dirname, 'preload.js');
  log.info('[Main] Preload script path:', preloadPath);
  
  // Check if preload file exists
  if (!fs.existsSync(preloadPath)) {
    log.error('[Main] Preload script not found at:', preloadPath);
  } else {
    log.info('[Main] Preload script found');
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    backgroundColor: '#0F172A',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    icon: path.join(__dirname, '../../assets/icons/icon.png'),
  });

  log.info('[Main] Loading URL:', MAIN_WINDOW_WEBPACK_ENTRY);
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  mainWindow.once('ready-to-show', () => {
    log.info('[Main] Window ready to show');
    mainWindow?.show();

    if (isDev) {
      mainWindow?.webContents.openDevTools();
    }
  });

  // Log page load events for debugging
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    log.error('[Main] Page failed to load', { errorCode, errorDescription, validatedURL });
  });

  mainWindow.webContents.on('did-finish-load', () => {
    log.info('[Main] Page finished loading');
  });

  mainWindow.webContents.on('console-message', (_event, level, message) => {
    // level 0 = debug, 1 = info, 2 = warning, 3 = error
    if (level >= 1) {
      // Log info, warnings, and errors
      const levelName = level === 1 ? 'INFO' : level === 2 ? 'WARN' : 'ERROR';
      log[level === 3 ? 'error' : level === 2 ? 'warn' : 'info'](`[Renderer ${levelName}]`, message);
    }
  });

  // Log when preload script is loaded
  mainWindow.webContents.on('did-attach-webview', () => {
    log.info('[Main] Webview attached');
  });

  mainWindow.on('closed', () => {
    log.info('[Main] Window closed');
    mainWindow = null;
  });

  // Handle window close - minimize to tray instead
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
      log.debug('[Main] Window minimized to tray');
    }
  });
}

function createTray(): void {
  log.info('[Main] Creating system tray');

  const iconPath = path.join(__dirname, '../../assets/icons/tray/icon-normal.png');
  const icon = nativeImage.createFromPath(iconPath);

  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Dashboard',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createWindow();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.webContents.send('navigate', '/settings');
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Quit SysCat',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip('SysCat - M365 Admin Autopilot');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    } else {
      createWindow();
    }
  });
}

// Register IPC handlers
function registerIpcHandlers(): void {
  log.info('[Main] Registering IPC handlers');
  registerAuthHandlers(ipcMain);
  registerGraphHandlers(ipcMain);
  registerAutomationHandlers(ipcMain);
  registerSettingsHandlers(ipcMain);
}

// App lifecycle
app.whenReady().then(() => {
  log.info('[Main] App ready - initializing');

  // Initialize services
  schedulerService.initialize();

  // Create UI
  createWindow();
  createTray();

  // Register IPC
  registerIpcHandlers();

  // Handle app activation (macOS)
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  log.info('[Main] All windows closed');
  // Don't quit on macOS - keep running in background
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  log.info('[Main] App quitting');
  isQuitting = true;
  schedulerService.shutdown();
});

app.on('will-quit', () => {
  log.info('[Main] App will quit - cleaning up');
});

// Security: Prevent new window creation
app.on('web-contents-created', (_event, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    log.warn('[Main] Blocked new window creation to:', url);
    return { action: 'deny' };
  });
});

