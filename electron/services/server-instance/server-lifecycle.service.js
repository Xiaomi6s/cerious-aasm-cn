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
exports.serverLifecycleService = exports.ServerLifecycleService = void 0;
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const validation_utils_1 = require("../../utils/validation.utils");
const ark_utils_1 = require("../../utils/ark.utils");
const network_utils_1 = require("../../utils/network.utils");
const platform_utils_1 = require("../../utils/platform.utils");
/**
 * Server Lifecycle Service - Handles server start, stop, and restart operations
 */
class ServerLifecycleService {
    /**
     * Start ARK server instance
     */
    async startServerInstance(instanceId, instance, onLog, onState) {
        try {
            // Validate prerequisites
            const validationResult = await this.validateStartPrerequisites(instanceId, instance);
            if (!validationResult.success) {
                return validationResult;
            }
            // Prepare instance configuration
            const managementService = require('./server-management.service').serverManagementService;
            await managementService.prepareInstanceConfiguration(instanceId, instance);
            // Start the server process
            const processService = require('./server-process.service').serverProcessService;
            const processResult = await processService.startServerProcess(instanceId, instance);
            if (!processResult.success) {
                return processResult;
            }
            // Set up monitoring and event handling
            processService.setupProcessMonitoring(instanceId, instance, onLog, onState);
            return {
                success: true,
                instanceId
            };
        }
        catch (error) {
            console.error(`[server-lifecycle-service] Failed to start ARK server instance ${instanceId}:`, error);
            const processService = require('./server-process.service').serverProcessService;
            processService.setInstanceState(instanceId, 'error');
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to start server instance',
                instanceId
            };
        }
    }
    /**
     * Validate all prerequisites before starting a server instance
     */
    async validateStartPrerequisites(instanceId, instance) {
        if (!(0, validation_utils_1.validateInstanceId)(instanceId)) {
            return {
                success: false,
                error: 'Invalid instance ID',
                instanceId
            };
        }
        // Check if ARK server is installed
        const arkExecutablePath = ark_utils_1.ArkPathUtils.getArkExecutablePath();
        if (!fs.existsSync(arkExecutablePath)) {
            return {
                success: false,
                error: 'ARK server is not installed',
                instanceId
            };
        }
        // Check if instance is already running
        const processService = require('./server-process.service').serverProcessService;
        const currentState = processService.getNormalizedInstanceState(instanceId);
        if (['starting', 'running'].includes(currentState)) {
            return {
                success: false,
                error: 'Instance is already running or starting',
                instanceId
            };
        }
        // Validate ports
        return await this.validateInstancePorts(instance, instanceId);
    }
    /**
     * Validate that required ports are available
     */
    async validateInstancePorts(instance, instanceId) {
        const gamePort = parseInt(instance.gamePort);
        const rconPort = parseInt(instance.rconPort);
        const queryPort = parseInt(instance.queryPort || 27015);
        if (await (0, network_utils_1.isPortInUse)(gamePort)) {
            return {
                success: false,
                error: `Game port ${gamePort} is already in use`,
                instanceId
            };
        }
        if (await (0, network_utils_1.isPortInUse)(rconPort)) {
            return {
                success: false,
                error: `RCON port ${rconPort} is already in use`,
                instanceId
            };
        }
        if (await (0, network_utils_1.isPortInUse)(queryPort)) {
            return {
                success: false,
                error: `Query port ${queryPort} (Steam discovery) is already in use`,
                instanceId
            };
        }
        return { success: true, instanceId };
    }
    /**
     * Stop ARK server instance
     */
    async stopServerInstance(instanceId) {
        const processService = require('./server-process.service').serverProcessService;
        return await processService.stopServerProcess(instanceId);
    }
    /**
     * Restart ARK server instance
     */
    async restartServerInstance(instanceId, instance, onLog, onState) {
        try {
            // Stop the server first
            const stopResult = await this.stopServerInstance(instanceId);
            if (!stopResult.success) {
                return stopResult;
            }
            // Wait a moment before restarting
            await new Promise(resolve => setTimeout(resolve, 3000));
            // Start the server again
            return await this.startServerInstance(instanceId, instance, onLog, onState);
        }
        catch (error) {
            console.error(`[server-lifecycle-service] Failed to restart ARK server instance ${instanceId}:`, error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to restart server instance',
                instanceId
            };
        }
    }
    /**
     * Cleanup orphaned ARK processes on startup
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
                console.error('[server-lifecycle-service] Orphaned process cleanup failed:', e);
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
                console.error('[server-lifecycle-service] Windows orphaned process cleanup failed:', e);
            }
        }
    }
    /**
     * Start ARK server instance (legacy method for backward compatibility)
     */
    async startArkServerInstance(instanceId, onLog, onState) {
        const instance = require('../../utils/ark/instance.utils').getInstance(instanceId);
        if (!instance) {
            return { started: false, portError: 'Instance not found' };
        }
        const result = await this.startServerInstance(instanceId, instance, onLog, onState);
        return {
            started: result.success,
            portError: result.error
        };
    }
    // ====================================================================
    // Feature #7: Cluster Control (Start/Stop All)
    // ====================================================================
    /**
     * Start all server instances with staggered delay to prevent CPU overload
     */
    async startAllInstances(delayMs = 30000) {
        const managementService = require('./server-management.service').serverManagementService;
        const processService = require('./server-process.service').serverProcessService;
        const instances = (await managementService.getAllInstances()).instances;
        const started = [];
        const failed = [];
        for (const instance of instances) {
            const state = processService.getNormalizedInstanceState(instance.id);
            if (state !== 'running' && state !== 'starting') {
                try {
                    console.log(`[Lifecycle] Starting instance ${instance.id} as part of Start All...`);
                    // Use standard callback hooks
                    const callbacks = require('./server-instance.service').serverInstanceService.getStandardEventCallbacks(instance.id);
                    await this.startServerInstance(instance.id, instance, callbacks.onLog, callbacks.onState);
                    started.push(instance.id);
                    // Stagger delay
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                }
                catch (e) {
                    console.error(`[Lifecycle] Failed to start ${instance.id}:`, e);
                    failed.push(instance.id);
                }
            }
        }
        return { started, failed };
    }
    /**
     * Stop all running server instances in parallel
     */
    async stopAllInstances() {
        const managementService = require('./server-management.service').serverManagementService;
        const processService = require('./server-process.service').serverProcessService;
        const instances = (await managementService.getAllInstances()).instances;
        const stopped = [];
        const failed = [];
        const stopPromises = instances.map(async (instance) => {
            const state = processService.getNormalizedInstanceState(instance.id);
            if (state === 'running' || state === 'starting') {
                try {
                    console.log(`[Lifecycle] Stopping instance ${instance.id} as part of Stop All...`);
                    await this.stopServerInstance(instance.id);
                    stopped.push(instance.id);
                }
                catch (e) {
                    console.error(`[Lifecycle] Failed to stop ${instance.id}:`, e);
                    failed.push(instance.id);
                }
            }
        });
        await Promise.all(stopPromises);
        return { stopped, failed };
    }
}
exports.ServerLifecycleService = ServerLifecycleService;
// Export singleton instance
exports.serverLifecycleService = new ServerLifecycleService();
