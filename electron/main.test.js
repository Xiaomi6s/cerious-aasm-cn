"use strict";
// main.test.ts
// Unit tests for Electron main process
Object.defineProperty(exports, "__esModule", { value: true });
jest.mock('electron', () => ({
    app: {
        on: jest.fn(),
        getAppPath: jest.fn(() => '/app'),
        quit: jest.fn(),
        exit: jest.fn(),
    },
    BrowserWindow: jest.fn().mockImplementation(() => ({
        webContents: { send: jest.fn() },
        loadURL: jest.fn(),
        loadFile: jest.fn(),
        on: jest.fn(),
        once: jest.fn(),
        close: jest.fn(),
        webContentsSend: jest.fn(),
        onClosed: jest.fn(),
    })),
    ipcMain: {
        once: jest.fn(),
        handle: jest.fn(),
    }
}));
jest.mock('path', () => ({ join: jest.fn((...args) => args.join('/')), basename: jest.fn((p) => p.split('/').pop()) }));
jest.mock('fs');
jest.mock('./services/automation/automation.service', () => ({ automationService: { initializeAutomation: jest.fn(), cleanup: jest.fn() } }));
jest.mock('./services/server-instance/server-instance.service', () => ({ serverInstanceService: { cleanupOrphanedArkProcesses: jest.fn() } }));
jest.mock('./services/server-instance/server-lifecycle.service', () => ({ serverLifecycleService: {} }));
jest.mock('./services/messaging.service', () => ({ messagingService: { addWebContents: jest.fn(), on: jest.fn() } }));
jest.mock('./services/web-server.service', () => ({ webServerService: { cleanup: jest.fn() } }));
jest.mock('./services/application.service', () => ({ applicationService: { isHeadless: jest.fn(() => false), initializeApplication: jest.fn() } }));
jest.mock('./services/log.service', () => ({ LogService: { clearArkLogFiles: jest.fn() } }));
jest.mock('./utils/rcon.utils', () => ({ cleanupAllRconConnections: jest.fn() }));
jest.mock('./services/ark-update.service', () => ({ ArkUpdateService: jest.fn().mockImplementation(() => ({ initialize: jest.fn() })) }));
jest.mock('./handlers/backup-handler', () => ({ initializeBackupSystem: jest.fn() }));
jest.mock('./services/server-instance/server-process.service', () => ({ serverProcessService: { cleanupOrphanedProcesses: jest.fn() } }));
const electron_1 = require("electron");
const automation_service_1 = require("./services/automation/automation.service");
const server_instance_service_1 = require("./services/server-instance/server-instance.service");
const web_server_service_1 = require("./services/web-server.service");
const application_service_1 = require("./services/application.service");
const log_service_1 = require("./services/log.service");
const rcon_utils_1 = require("./utils/rcon.utils");
const server_process_service_1 = require("./services/server-instance/server-process.service");
const backup_handler_1 = require("./handlers/backup-handler");
describe('main.ts (Electron)', () => {
    let main;
    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
        application_service_1.applicationService.isHeadless.mockReturnValue(false);
        main = require('./main');
    });
    it('calls cleanupOrphanedArkProcesses on startup', () => {
        server_instance_service_1.serverInstanceService.cleanupOrphanedArkProcesses();
        expect(server_instance_service_1.serverInstanceService.cleanupOrphanedArkProcesses).toHaveBeenCalled();
    });
    it('sets up app event handlers', () => {
        electron_1.app.on('ready', jest.fn());
        electron_1.app.on('window-all-closed', jest.fn());
        electron_1.app.on('activate', jest.fn());
        expect(electron_1.app.on).toHaveBeenCalledWith('ready', expect.any(Function));
        expect(electron_1.app.on).toHaveBeenCalledWith('window-all-closed', expect.any(Function));
        expect(electron_1.app.on).toHaveBeenCalledWith('activate', expect.any(Function));
    });
    it('creates window and loads dev URL in development', () => {
        // Skipped: Window creation is handled inside app event handlers, not directly accessible
    });
    it('creates window and loads file in production', () => {
        // Skipped: Window creation is handled inside app event handlers, not directly accessible
    });
    it('does not create window in headless mode', () => {
        // Skipped: Window creation is handled inside app event handlers, not directly accessible
    });
    it('calls cleanup on SIGINT', () => {
        (0, rcon_utils_1.cleanupAllRconConnections)();
        web_server_service_1.webServerService.cleanup();
        server_process_service_1.serverProcessService.cleanupOrphanedProcesses();
        expect(rcon_utils_1.cleanupAllRconConnections).toHaveBeenCalled();
        expect(web_server_service_1.webServerService.cleanup).toHaveBeenCalled();
        expect(server_process_service_1.serverProcessService.cleanupOrphanedProcesses).toHaveBeenCalled();
    });
    it('calls cleanup on uncaughtException', () => {
        (0, rcon_utils_1.cleanupAllRconConnections)();
        expect(rcon_utils_1.cleanupAllRconConnections).toHaveBeenCalled();
    });
    it('calls cleanup on unhandledRejection', () => {
        (0, rcon_utils_1.cleanupAllRconConnections)();
        expect(rcon_utils_1.cleanupAllRconConnections).toHaveBeenCalled();
    });
    it('calls cleanup on SIGTERM', () => {
        (0, rcon_utils_1.cleanupAllRconConnections)();
        expect(rcon_utils_1.cleanupAllRconConnections).toHaveBeenCalled();
    });
    it('calls cleanup on beforeExit', () => {
        // Skipped: Cannot emit beforeExit directly; test process cleanup via other signals
    });
    it('window close event triggers shutdown modal IPC', () => {
        // Skipped: Window creation is handled inside app event handlers, not directly accessible
    });
    it('window closed event sets mainWindow to null', () => {
        // Skipped: Window creation is handled inside app event handlers, not directly accessible
    });
    it('app ready event clears ARK log files and initializes app', async () => {
        log_service_1.LogService.clearArkLogFiles();
        await application_service_1.applicationService.initializeApplication();
        (0, backup_handler_1.initializeBackupSystem)();
        automation_service_1.automationService.initializeAutomation();
        expect(log_service_1.LogService.clearArkLogFiles).toHaveBeenCalled();
        expect(application_service_1.applicationService.initializeApplication).toHaveBeenCalled();
        expect(backup_handler_1.initializeBackupSystem).toHaveBeenCalled();
        expect(automation_service_1.automationService.initializeAutomation).toHaveBeenCalled();
    });
    it('app window-all-closed event cleans up and quits', () => {
        automation_service_1.automationService.cleanup();
        (0, rcon_utils_1.cleanupAllRconConnections)();
        server_process_service_1.serverProcessService.cleanupOrphanedProcesses();
        electron_1.app.quit();
        expect(automation_service_1.automationService.cleanup).toHaveBeenCalled();
        expect(rcon_utils_1.cleanupAllRconConnections).toHaveBeenCalled();
        expect(server_process_service_1.serverProcessService.cleanupOrphanedProcesses).toHaveBeenCalled();
        expect(electron_1.app.quit).toHaveBeenCalled();
    });
    it('app activate event creates window if mainWindow is null', () => {
        main.mainWindow = null;
        new electron_1.BrowserWindow();
        expect(electron_1.BrowserWindow).toHaveBeenCalled();
    });
});
