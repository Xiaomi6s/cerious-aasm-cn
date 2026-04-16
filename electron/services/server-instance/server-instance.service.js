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
exports.serverInstanceService = exports.ServerInstanceService = void 0;
const child_process_1 = require("child_process");
const instanceUtils = __importStar(require("../../utils/ark/instance.utils"));
const validation_utils_1 = require("../../utils/validation.utils");
const automation_service_1 = require("../automation/automation.service");
const rcon_service_1 = require("../rcon.service");
const platform_utils_1 = require("../../utils/platform.utils");
// Import specialized services
const server_lifecycle_service_1 = require("./server-lifecycle.service");
const server_monitoring_service_1 = require("./server-monitoring.service");
const server_management_service_1 = require("./server-management.service");
/**
 * Server Instance Service - Main orchestrator for server instance management operations
 * Delegates to specialized services for different concerns
 */
class ServerInstanceService {
    /**
     * Returns the standard event callbacks for server start (log, state, rcon, player polling)
     */
    getStandardEventCallbacks(instanceId) {
        const messagingService = require('../messaging.service').messagingService;
        return {
            onLog: (log) => messagingService.sendToAll('server-instance-log', { log, instanceId }),
            onState: async (state) => {
                messagingService.sendToAll('server-instance-state', { state, instanceId });
                // Small delay to ensure state is properly set before broadcasting all instances
                setTimeout(async () => {
                    const allInstances = await server_management_service_1.serverManagementService.getAllInstances();
                    messagingService.sendToAll('server-instances', allInstances.instances);
                }, 100);
                // Handle state change for polling
                if (state === 'running') {
                    server_monitoring_service_1.serverMonitoringService.startMemoryPolling(instanceId, (instanceId, memory) => {
                        messagingService.sendToAll('server-instance-memory', { instanceId, memory });
                    });
                    server_monitoring_service_1.serverMonitoringService.startPlayerPolling(instanceId, (instanceId, count) => {
                        messagingService.sendToAll('server-instance-players', { instanceId, players: count });
                    });
                    // RCON connection is handled by server-process.service.ts triggerRconConnect
                    // which fires on the same 'running' state transition — no duplicate connect here
                }
                else {
                    server_monitoring_service_1.serverMonitoringService.stopMemoryPolling(instanceId);
                    server_monitoring_service_1.serverMonitoringService.stopPlayerPolling(instanceId);
                }
            }
        };
    }
    /**
     * Start a server instance with event callbacks for monitoring
     * @param instanceId - The unique identifier of the server instance to start
     * @param onLog - Callback function invoked for each log message from the server process
     * @param onStateChange - Callback function invoked when the server state changes (starting, running, stopped, etc.)
     * @returns Promise resolving to a StartServerResult indicating success/failure and any port conflicts
     */
    async startServerInstance(instanceId, onLog, onStateChange) {
        try {
            const result = await server_lifecycle_service_1.serverLifecycleService.startArkServerInstance(instanceId, onLog, onStateChange);
            if (result.started) {
                // Immediately broadcast the starting state
                const messagingService = require('../messaging.service').messagingService;
                messagingService.sendToAll('server-instance-state', { state: 'starting', instanceId });
                // Notify automation service that server was manually started
                automation_service_1.automationService.setManuallyStopped(instanceId, false);
            }
            // Get instance name for notifications
            const instance = await instanceUtils.getInstance(instanceId);
            const instanceName = instance?.name || instanceId;
            return {
                started: result.started,
                portError: result.portError,
                instanceId,
                instanceName
            };
        }
        catch (error) {
            console.error('[server-instance-service] Failed to start server instance:', error);
            return {
                started: false,
                portError: error instanceof Error ? error.message : 'Failed to start server',
                instanceId
            };
        }
    }
    /**
     * Import a server instance from a backup file, creating a new instance with the backup data
     * @param serverName - The name to assign to the newly imported server instance
     * @param backupFilePath - Optional file system path to the backup file for direct file access
     * @param fileData - Optional base64 encoded backup file data for web uploads
     * @param fileName - Optional original filename of the backup for metadata purposes
     * @returns Promise resolving to an ImportBackupResult with the new instance details or error information
     */
    async importServerFromBackup(serverName, backupFilePath, fileData, fileName) {
        try {
            if (!serverName || (!backupFilePath && !fileData)) {
                return {
                    success: false,
                    error: 'Server name and backup file (path or data) are required'
                };
            }
            let actualFilePath = backupFilePath;
            // If we received file data (browser environment), save it to a temporary file
            if (fileData && fileName) {
                const fs = await import('fs');
                const path = await import('path');
                const os = await import('os');
                try {
                    // Create temporary file
                    const tempDir = os.tmpdir();
                    const tempFileName = `import_${Date.now()}_${fileName}`;
                    actualFilePath = path.join(tempDir, tempFileName);
                    // Convert base64 to buffer and save
                    const buffer = Buffer.from(fileData, 'base64');
                    fs.writeFileSync(actualFilePath, buffer);
                }
                catch (error) {
                    console.error('[server-instance-service] Failed to save uploaded file:', error);
                    return {
                        success: false,
                        error: 'Failed to save uploaded backup file'
                    };
                }
            }
            // Import the backup as a new server using management service
            if (!actualFilePath) {
                return {
                    success: false,
                    error: 'No backup file path available'
                };
            }
            const result = await server_management_service_1.serverManagementService.importFromBackup(actualFilePath, serverName);
            // Clean up temporary file if we created one
            if (fileData && actualFilePath !== backupFilePath) {
                const fs = await import('fs');
                try {
                    fs.unlinkSync(actualFilePath);
                }
                catch (cleanupError) {
                    console.warn('[server-instance-service] Failed to cleanup temporary file:', cleanupError);
                }
            }
            return result;
        }
        catch (error) {
            console.error('[server-instance-service] Failed to import server from backup:', error);
            return {
                success: false,
                error: error.message || 'Failed to import server from backup'
            };
        }
    }
    // ========== PUBLIC SERVICE METHODS ==========
    /**
     * Forcefully stop a running server instance, terminating the process if necessary
     * @param instanceId - The unique identifier of the server instance to force stop
     * @returns Promise resolving to a ServerInstanceResult indicating success/failure of the stop operation
     */
    async forceStopInstance(instanceId) {
        try {
            if (!(0, validation_utils_1.validateInstanceId)(instanceId)) {
                return {
                    success: false,
                    error: 'Invalid instance ID'
                };
            }
            // Disconnect RCON if connected
            await rcon_service_1.rconService.forceDisconnectRcon(instanceId);
            // Kill the ARK server process for this instance
            const proc = require('./server-process.service').serverProcessService.getServerProcess(instanceId);
            if (proc && !proc.killed) {
                // For detached processes on Linux, we need special handling
                if ((0, platform_utils_1.getPlatform)() === 'linux' && proc.pid) {
                    // Use process group kill for detached processes
                    try {
                        process.kill(-proc.pid, 'SIGKILL');
                    }
                    catch (e) {
                        // Fallback to regular kill if process group kill fails
                        proc.kill('SIGKILL');
                    }
                }
                else {
                    proc.kill('SIGKILL');
                }
            }
            // Update instance state
            require('./server-process.service').serverProcessService.setInstanceState(instanceId, 'stopping');
            // Get instance details for notification
            const instance = await instanceUtils.getInstance(instanceId);
            const instanceName = instance?.name || instanceId;
            return {
                success: true,
                instanceId,
                instanceName,
                shouldNotifyAutomation: true
            };
        }
        catch (error) {
            console.error('[server-instance-service] Failed to force stop instance:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to force stop server',
                instanceId
            };
        }
    }
    /**
     * Cleanup orphaned ARK processes on startup (moved from ark-server-utils.ts)
     * This is more aggressive than the normal cleanup and should be called on app startup
     */
    cleanupOrphanedArkProcesses() {
        if ((0, platform_utils_1.getPlatform)() === 'linux') {
            try {
                // Kill any ARK server processes
                try {
                    (0, child_process_1.execSync)('pkill -f ArkAscendedServer', { stdio: 'ignore' });
                }
                catch (e) {
                    // Ignore if no processes found
                }
                // Kill any Proton processes running ARK
                try {
                    (0, child_process_1.execSync)('pkill -f "proton.*ArkAscendedServer"', { stdio: 'ignore' });
                }
                catch (e) {
                    // Ignore if no processes found
                }
                // Kill any xvfb processes that might be stuck
                try {
                    (0, child_process_1.execSync)('pkill -f "Xvfb.*ArkAscendedServer"', { stdio: 'ignore' });
                }
                catch (e) {
                    // Ignore if no processes found
                }
                // Kill any wine processes that might be related to ARK (if somehow still present)
                try {
                    (0, child_process_1.execSync)('pkill -f "wine.*ArkAscendedServer"', { stdio: 'ignore' });
                }
                catch (e) {
                    // Ignore if no processes found
                }
            }
            catch (e) {
                console.error('[server-instance-service] Orphaned process cleanup failed:', e);
            }
        }
        else {
            // On Windows, use taskkill for orphaned processes
            try {
                try {
                    (0, child_process_1.execSync)('taskkill /F /IM ArkAscendedServer.exe', { stdio: 'ignore' });
                }
                catch (e) {
                    // Ignore if no processes found
                }
            }
            catch (e) {
                console.error('[server-instance-service] Windows orphaned process cleanup failed:', e);
            }
        }
    }
}
exports.ServerInstanceService = ServerInstanceService;
// Export singleton instance
exports.serverInstanceService = new ServerInstanceService();
