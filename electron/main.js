"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// =========================
// Command Line Arguments & Sandbox Configuration
// MUST BE FIRST - Before any Electron imports!
// =========================
// Check if running in headless mode or if we need to disable sandbox
const isHeadlessMode = process.argv.includes('--headless');
const isLinux = process.platform === 'linux';
// =========================
// Core Dependencies
// =========================
const electron_1 = require("electron");
const path = __importStar(require("path"));
// Apply sandbox fixes immediately after app import
if (isLinux || isHeadlessMode) {
    electron_1.app.commandLine.appendSwitch('no-sandbox');
    electron_1.app.commandLine.appendSwitch('disable-setuid-sandbox');
}
// Additional stability switches for headless mode
if (isHeadlessMode) {
    electron_1.app.commandLine.appendSwitch('disable-gpu'); // No dash prefix for value key, but for switch it is fine
    electron_1.app.commandLine.appendSwitch('disable-software-rasterizer');
    electron_1.app.commandLine.appendSwitch('disable-dev-shm-usage');
    // Prevent ALSA symbol lookup errors on headless Linux servers (no audio needed)
    electron_1.app.commandLine.appendSwitch('disable-audio-output');
    // Crucial for headless environments to prevent GTK faults
    electron_1.app.disableHardwareAcceleration();
}
// =========================
// Logging
// Must be initialised before all other imports so console.* is overridden
// for every subsequent module load.
// =========================
const logger_1 = require("./utils/logger");
// =========================
// Services
// =========================
const automation_service_1 = require("./services/automation/automation.service");
const server_instance_service_1 = require("./services/server-instance/server-instance.service");
const messaging_service_1 = require("./services/messaging.service");
const web_server_service_1 = require("./services/web-server.service");
const application_service_1 = require("./services/application.service");
const log_service_1 = require("./services/log.service");
// =========================
// Utilities & Handlers
// =========================
const rcon_utils_1 = require("./utils/rcon.utils");
const ark_update_service_1 = require("./services/ark-update.service");
const ark_update_handler_1 = require("./handlers/ark-update-handler");
const backup_handler_1 = require("./handlers/backup-handler");
const auto_update_service_1 = require("./services/auto-update.service");
// =========================
// Handler Imports (side effects)
// =========================
require("./handlers/web-server-handler");
require("./handlers/directory-handler");
require("./handlers/message-handler");
require("./handlers/install-handler");
require("./handlers/automation-handler");
require("./handlers/ark-update-handler");
require("./handlers/server-instance-handler");
require("./handlers/settings-handler");
require("./handlers/backup-handler");
require("./handlers/proton-handler");
require("./handlers/linux-deps-handler");
require("./handlers/firewall-handler");
require("./handlers/system-info-handler");
require("./handlers/whitelist-handler");
require("./handlers/config-import-export-handler");
require("./handlers/auto-update-handler");
require("./handlers/ark-api-handler");
require("./handlers/curseforge-handler");
// =========================
// Service Initialization
// =========================
const arkUpdateService = new ark_update_service_1.ArkUpdateService(messaging_service_1.messagingService);
(0, ark_update_handler_1.setArkUpdateService)(arkUpdateService);
// =========================
// Application State
// =========================
let mainWindow = null;
// =========================
// Startup Cleanup
// =========================
// Clean up any orphaned processes from previous crashes
server_instance_service_1.serverInstanceService.cleanupOrphanedArkProcesses();
// =========================
// Error Handling
// =========================
process.on('uncaughtException', (err) => {
    if (err && typeof err === 'object' && 'code' in err && err.code === 'EPIPE') {
        return;
    }
    console.error('[main] Uncaught exception:', err);
    cleanup();
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    // Log but do NOT exit — some third-party libraries (e.g. electron-updater)
    // can emit unhandled rejections in edge cases that are benign.
    // Calling process.exit(1) here would kill all running ARK servers and crash
    // the app whenever any library has an uncaught async error.
    console.error('[main] Unhandled promise rejection at:', promise, 'reason:', reason);
});
// =========================
// Process Cleanup
// =========================
const cleanup = () => {
    // Cleanup RCON connections first
    (0, rcon_utils_1.cleanupAllRconConnections)();
    // Cleanup web server
    web_server_service_1.webServerService.cleanup();
    // Then cleanup ARK server processes
    require('./services/server-instance/server-process.service').serverProcessService.cleanupOrphanedProcesses();
};
process.on('SIGINT', () => {
    cleanup();
    process.exit(0);
});
process.on('SIGTERM', () => {
    cleanup();
    process.exit(0);
});
process.on('beforeExit', () => {
    cleanup();
});
// =========================
// Window Management
// =========================
function createWindow() {
    if (application_service_1.applicationService.isHeadless()) {
        return;
    }
    mainWindow = new electron_1.BrowserWindow({
        width: 1024,
        height: 768,
        autoHideMenuBar: true, // Hide the menu bar
        icon: path.join(electron_1.app.getAppPath(), isLinux ? 'logo-square-256.png' : 'logo.png'), // Set app icon
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });
    messaging_service_1.messagingService.addWebContents(mainWindow.webContents);
    // In development, load from the dev server. In production, load from built files.
    const isDev = process.env.NODE_ENV === 'development';
    if (isDev) {
        mainWindow.loadURL('http://localhost:4200');
    }
    else {
        // Load the built Angular files directly from the file system
        // In production/packaged app, we need to resolve the correct path to the Angular files
        const appPath = electron_1.app.getAppPath();
        const indexPath = path.join(appPath, 'dist', 'cerious-aasm', 'browser', 'index.html');
        mainWindow.loadFile(indexPath);
    }
    // Intercept close event for shutdown modal (robust IPC protocol)
    let awaitingCloseResponse = false;
    mainWindow.on('close', async (e) => {
        if (mainWindow && !awaitingCloseResponse) {
            e.preventDefault();
            awaitingCloseResponse = true;
            mainWindow.webContents.send('app-close-request');
            electron_1.ipcMain.once('app-close-response', (_event, data) => {
                awaitingCloseResponse = false;
                if (data && data.action === 'shutdown') {
                    if (mainWindow) {
                        mainWindow.webContents.send('shutdown-all-servers');
                    }
                    setTimeout(() => electron_1.app.exit(0), 1500);
                }
                else if (data && data.action === 'exit') {
                    electron_1.app.exit(0);
                }
                // else (cancel) do nothing
            });
        }
    });
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
// =========================
// Application Event Handlers
// =========================
electron_1.app.on('ready', async () => {
    console.info(`[main] ====== Cerious AASM starting — log: ${(0, logger_1.getLogFilePath)()} ======`);
    // Clear ARK log files before starting servers
    log_service_1.LogService.clearArkLogFiles();
    // Initialize application (handles headless mode and web server startup)
    await application_service_1.applicationService.initializeApplication();
    // Expose log file path to renderer / web clients
    messaging_service_1.messagingService.on('get-log-file-path', (_payload, sender) => {
        messaging_service_1.messagingService.sendToOriginator('get-log-file-path', { path: (0, logger_1.getLogFilePath)() }, sender);
    });
    createWindow();
    // Initialize backup system
    (0, backup_handler_1.initializeBackupSystem)().catch(console.error);
    // Initialize automation system
    automation_service_1.automationService.initializeAutomation();
    // Start background poll for Ark server updates once main app is ready
    try {
        // Initialize with current installed version and start polling
        await arkUpdateService.initialize();
    }
    catch (e) { }
    // Check for application updates (skip in dev mode unless --test-update flag is present)
    if (process.env.NODE_ENV !== 'development') {
        auto_update_service_1.autoUpdateService.checkForUpdates().catch(console.error);
        // Re-check every 4 hours while the app is running
        auto_update_service_1.autoUpdateService.startPeriodicUpdateCheck();
    }
    else if (process.argv.includes('--test-update')) {
        // Simulate an update lifecycle so the banner can be visually tested in dev mode
        console.log('[main] Simulating update lifecycle for dev testing...');
        setTimeout(() => {
            messaging_service_1.messagingService.sendToAllRenderers('app-update-status', { status: 'checking' });
        }, 2000);
        setTimeout(() => {
            messaging_service_1.messagingService.sendToAllRenderers('app-update-status', {
                status: 'available',
                version: '99.0.0',
                releaseNotes: 'Test release notes for dev simulation.',
                releaseDate: new Date().toISOString(),
            });
        }, 3000);
        // Simulate download progress
        const steps = 10;
        for (let i = 1; i <= steps; i++) {
            setTimeout(() => {
                messaging_service_1.messagingService.sendToAllRenderers('app-update-status', {
                    status: 'downloading',
                    percent: (i / steps) * 100,
                    bytesPerSecond: 1024 * 1024 * 2,
                    transferred: i * 5 * 1024 * 1024,
                    total: steps * 5 * 1024 * 1024,
                });
            }, 3000 + i * 500);
        }
        // Simulate download complete
        setTimeout(() => {
            messaging_service_1.messagingService.sendToAllRenderers('app-update-status', {
                status: 'downloaded',
                version: '99.0.0',
                releaseNotes: 'Test release notes for dev simulation.',
                releaseDate: new Date().toISOString(),
            });
        }, 3000 + (steps + 1) * 500);
    }
});
electron_1.app.on('window-all-closed', () => {
    // Cleanup automation on shutdown
    automation_service_1.automationService.cleanup();
    // Cleanup RCON connections
    (0, rcon_utils_1.cleanupAllRconConnections)();
    // Cleanup all running ARK servers
    require('./services/server-instance/server-process.service').serverProcessService.cleanupOrphanedProcesses();
    if (process.platform !== 'darwin' && !application_service_1.applicationService.isHeadless()) {
        electron_1.app.quit();
    }
});
electron_1.app.on('activate', () => {
    if (mainWindow === null && !application_service_1.applicationService.isHeadless()) {
        createWindow();
    }
});
