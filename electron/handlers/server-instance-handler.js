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
const instanceUtils = __importStar(require("../utils/ark/instance.utils"));
const messaging_service_1 = require("../services/messaging.service");
const server_instance_service_1 = require("../services/server-instance/server-instance.service");
const server_lifecycle_service_1 = require("../services/server-instance/server-lifecycle.service");
const server_monitoring_service_1 = require("../services/server-instance/server-monitoring.service");
const server_operations_service_1 = require("../services/server-instance/server-operations.service");
const server_management_service_1 = require("../services/server-instance/server-management.service");
const automation_service_1 = require("../services/automation/automation.service");
const { arkConfigService } = require('../services/ark-config.service');
// feature: ini editor //
/**
 * Handle 'get-ini-file' requests from renderer
 */
messaging_service_1.messagingService.on('get-ini-file', (payload, sender) => {
    const { instanceId, filename, requestId } = payload;
    try {
        const content = arkConfigService.readIniFile(instanceId, filename);
        messaging_service_1.messagingService.sendToOriginator('get-ini-file', { success: true, content, instanceId, filename, requestId }, sender);
    }
    catch (error) {
        messaging_service_1.messagingService.sendToOriginator('get-ini-file', { success: false, error: error.message, requestId }, sender);
    }
});
/**
 * Handle 'save-ini-file' requests from renderer
 */
messaging_service_1.messagingService.on('save-ini-file', (payload, sender) => {
    const { instanceId, filename, content, requestId } = payload;
    try {
        arkConfigService.writeIniFile(instanceId, filename, content);
        // Parse INI back to config keys and merge into config.json
        try {
            const { getInstancesBaseDir } = require('../utils/ark/instance.utils');
            const fs = require('fs');
            const path = require('path');
            const configPath = path.join(getInstancesBaseDir(), instanceId, 'config.json');
            if (fs.existsSync(configPath)) {
                const existing = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                const parsed = arkConfigService.parseIniToConfig(filename, content);
                const merged = { ...existing, ...parsed };
                fs.writeFileSync(configPath, JSON.stringify(merged, null, 2));
                // Notify renderer of the updated instance
                messaging_service_1.messagingService.sendToAll('server-instance-updated', merged);
            }
        }
        catch (mergeErr) {
            console.warn('[save-ini-file] Could not merge INI back to config.json:', mergeErr);
        }
        messaging_service_1.messagingService.sendToOriginator('save-ini-file', { success: true, instanceId, filename, requestId }, sender);
    }
    catch (error) {
        messaging_service_1.messagingService.sendToOriginator('save-ini-file', { success: false, error: error.message, requestId }, sender);
    }
});
// Feature #7: Cluster Control
messaging_service_1.messagingService.on('start-all-instances', async (payload, sender) => {
    const { requestId } = payload || {};
    try {
        const { serverProcessService } = require('../services/server-instance/server-process.service');
        const allInstances = (await server_management_service_1.serverManagementService.getAllInstances()).instances;
        // Determine which instances are eligible to start (skip already-running, starting, or queued)
        const eligible = allInstances.filter((inst) => {
            const state = serverProcessService.getNormalizedInstanceState(inst.id);
            return state !== 'running' && state !== 'starting' && state !== 'queued';
        });
        // Immediately set backend state to 'queued' and broadcast so the UI updates right away.
        // This ensures get-server-instance-state returns 'queued' even before the staggered start begins.
        for (const inst of eligible) {
            serverProcessService.setInstanceState(inst.id, 'queued');
            messaging_service_1.messagingService.sendToAll('server-instance-state', { instanceId: inst.id, state: 'queued' });
        }
        // Acknowledge the request immediately — don't make the frontend wait for staggered starts
        messaging_service_1.messagingService.sendToOriginator('start-all-instances', { success: true, requestId, starting: eligible.map((i) => i.id) }, sender);
        // Start instances in the background; getStandardEventCallbacks handles all further state transitions
        server_lifecycle_service_1.serverLifecycleService.startAllInstances().catch((err) => {
            console.error('[start-all-instances] Background start error:', err);
        });
    }
    catch (error) {
        messaging_service_1.messagingService.sendToOriginator('start-all-instances', { success: false, requestId, error: error.message }, sender);
    }
});
messaging_service_1.messagingService.on('stop-all-instances', async (payload, sender) => {
    const { requestId } = payload || {};
    try {
        const { serverProcessService } = require('../services/server-instance/server-process.service');
        const allInstances = (await server_management_service_1.serverManagementService.getAllInstances()).instances;
        // Determine which instances are eligible to stop
        const eligible = allInstances.filter((inst) => {
            const state = serverProcessService.getNormalizedInstanceState(inst.id);
            return state === 'running' || state === 'starting';
        });
        // Immediately broadcast 'stopping' for each eligible instance so the UI updates right away
        for (const inst of eligible) {
            messaging_service_1.messagingService.sendToAll('server-instance-state', { instanceId: inst.id, state: 'stopping' });
        }
        // Acknowledge the request immediately
        messaging_service_1.messagingService.sendToOriginator('stop-all-instances', { success: true, requestId, stopping: eligible.map((i) => i.id) }, sender);
        // Stop instances in the background; lifecycle callbacks handle further state transitions
        server_lifecycle_service_1.serverLifecycleService.stopAllInstances().catch((err) => {
            console.error('[stop-all-instances] Background stop error:', err);
        });
    }
    catch (error) {
        messaging_service_1.messagingService.sendToOriginator('stop-all-instances', { success: false, requestId, error: error.message }, sender);
    }
});
/** Handles the 'stop-server-instance' message event from the messaging service.
 * Performs a graceful shutdown: SaveWorld via RCON, then DoExit, then force kill if needed.
 */
messaging_service_1.messagingService.on('stop-server-instance', async (payload, sender) => {
    const { id, requestId } = payload || {};
    try {
        const result = await server_lifecycle_service_1.serverLifecycleService.stopServerInstance(id);
        if (result.success) {
            messaging_service_1.messagingService.sendToAll('rcon-status', { instanceId: id, connected: false });
            server_monitoring_service_1.serverMonitoringService.stopPlayerPolling(id);
            automation_service_1.automationService.setManuallyStopped(id, true);
        }
        messaging_service_1.messagingService.sendToOriginator('stop-server-instance', {
            ...result,
            requestId
        }, sender);
    }
    catch (error) {
        console.error('[server-instance-handler] Failed to handle stop-server-instance:', error);
        messaging_service_1.messagingService.sendToOriginator('stop-server-instance', {
            success: false,
            error: error?.message || 'Failed to stop server',
            requestId
        }, sender);
    }
});
/** Handles the 'force-stop-server-instance' message event from the messaging service.
 *
 * When triggered, this handler invokes the ServerInstanceService to force stop a server instance.
 * It then sends the result back to the originator of the message, including details such as
 * success status, instance ID, and any error information.
 * If the force stop is successful, it broadcasts relevant updates such as RCON status,
 * server logs, and notifications to all connected clients.
 * In case of unexpected errors during the force stop, it logs the error and sends a failure
 * response.
 *
 * @param payload - The payload received with the message, expected to contain `id` and `requestId`.
 * @param sender - The sender of the message, used to route the response.
*/
messaging_service_1.messagingService.on('force-stop-server-instance', async (payload, sender) => {
    const { id, requestId } = payload || {};
    try {
        const result = await server_instance_service_1.serverInstanceService.forceStopInstance(id);
        if (result.success) {
            // Broadcast RCON status and logs
            messaging_service_1.messagingService.sendToAll('rcon-status', { instanceId: id, connected: false });
            messaging_service_1.messagingService.sendToAll('server-instance-log', { log: '[FORCE STOP] Server force stopped', instanceId: id });
            server_monitoring_service_1.serverMonitoringService.stopPlayerPolling(id);
            // Notify automation service if needed
            if (result.shouldNotifyAutomation) {
                automation_service_1.automationService.setManuallyStopped(id, true);
            }
            // Broadcast notification using service-provided name
            messaging_service_1.messagingService.sendToAll('notification', {
                type: 'warning',
                message: `Server ${result.instanceName} force stopped.`
            });
        }
        messaging_service_1.messagingService.sendToOriginator('force-stop-server-instance', {
            ...result,
            requestId
        }, sender);
    }
    catch (error) {
        console.error('[server-instance-handler] Failed to handle force-stop-server-instance:', error);
        messaging_service_1.messagingService.sendToOriginator('force-stop-server-instance', {
            success: false,
            error: error?.message || 'Failed to force stop server',
            requestId
        }, sender);
    }
});
/** Handles the 'get-server-instance-state' message event from the messaging service.
 *
 * When triggered, this handler invokes the ServerInstanceService to get the current state of a server instance.
 * It then sends the result back to the originator of the message, including details such as
 * the current state and instance ID.
 * In case of unexpected errors during the state retrieval, it logs the error and sends a failure
 * response to the originator.
 *
 * @param payload - The payload received with the message, expected to contain `id` and `requestId`.
 * @param sender - The sender of the message, used to route the response.
*/
messaging_service_1.messagingService.on('get-server-instance-state', async (payload, sender) => {
    const { id, requestId } = payload || {};
    try {
        const { getNormalizedInstanceState } = require('../utils/ark/ark-server/ark-server-state.utils');
        const state = getNormalizedInstanceState(id);
        messaging_service_1.messagingService.sendToOriginator('get-server-instance-state', {
            state,
            instanceId: id,
            requestId
        }, sender);
    }
    catch (error) {
        console.error('[server-instance-handler] Failed to handle get-server-instance-state:', error);
        messaging_service_1.messagingService.sendToOriginator('get-server-instance-state', {
            state: 'unknown',
            instanceId: id,
            requestId
        }, sender);
    }
});
/** Handles the 'get-server-instance-logs' message event from the messaging service.
 *
 * When triggered, this handler invokes the ServerInstanceService to get the logs of a server instance.
 * It then sends the result back to the originator of the message, including details such as
 * the logs and instance ID.
 * In case of unexpected errors during the logs retrieval, it logs the error and sends a failure
 * response to the originator.
 *
 * @param payload - The payload received with the message, expected to contain `id`, `maxLines`, and `requestId`.
 * @param sender - The sender of the message, used to route the response.
*/
messaging_service_1.messagingService.on('get-server-instance-logs', async (payload, sender) => {
    const { id, maxLines, requestId } = payload || {};
    try {
        const result = server_monitoring_service_1.serverMonitoringService.getInstanceLogs(id, maxLines);
        messaging_service_1.messagingService.sendToOriginator('get-server-instance-logs', {
            log: result.log,
            instanceId: result.instanceId,
            requestId
        }, sender);
        messaging_service_1.messagingService.sendToAll('get-server-instance-logs', {
            log: result.log,
            instanceId: result.instanceId,
            requestId
        });
    }
    catch (error) {
        console.error('[server-instance-handler] Failed to handle get-server-instance-logs:', error);
        messaging_service_1.messagingService.sendToOriginator('get-server-instance-logs', {
            log: '',
            instanceId: id,
            requestId
        }, sender);
    }
});
/** Handles the 'connect-rcon' message event from the messaging service.
 *
 * When triggered, this handler invokes the ServerInstanceService to connect to the RCON interface of a server instance.
 * It then sends the result back to the originator of the message, including details such as
 * the connection status and instance ID.
 * In case of unexpected errors during the connection attempt, it logs the error and sends a failure
 * response to the originator.
 *
 * @param payload - The payload received with the message, expected to contain `id` and `requestId`.
 * @param sender - The sender of the message, used to route the response.
 */
messaging_service_1.messagingService.on('connect-rcon', async (payload, sender) => {
    const { id, requestId } = payload || {};
    try {
        const result = await server_operations_service_1.serverOperationsService.connectRcon(id);
        messaging_service_1.messagingService.sendToOriginator('connect-rcon', {
            success: result.success,
            connected: result.connected,
            instanceId: result.instanceId,
            error: result.error,
            requestId
        }, sender);
        messaging_service_1.messagingService.sendToAll('rcon-status', {
            instanceId: id,
            connected: result.connected || false
        });
        if (result.connected) {
            server_monitoring_service_1.serverMonitoringService.startPlayerPolling(id, (instanceId, count) => {
                messaging_service_1.messagingService.sendToAll('server-instance-players', { instanceId, players: count });
            });
        }
    }
    catch (error) {
        console.error('[server-instance-handler] Failed to handle connect-rcon:', error);
        messaging_service_1.messagingService.sendToOriginator('connect-rcon', {
            success: false,
            connected: false,
            instanceId: id,
            error: error?.message || 'Failed to connect RCON',
            requestId
        }, sender);
    }
});
/**
 * Handles the 'get-online-players' request.
 * Fetches and parses the list of online players from RCON.
 */
messaging_service_1.messagingService.on('get-online-players', async (payload, sender) => {
    const { id, requestId } = payload || {};
    try {
        const rconService = require('../services/rcon.service').rconService;
        const players = await rconService.getOnlinePlayers(id);
        messaging_service_1.messagingService.sendToOriginator('get-online-players', {
            success: true,
            instanceId: id,
            players: players,
            requestId
        }, sender);
    }
    catch (error) {
        console.error(`[server-instance-handler] Failed to get online players for ${id}:`, error);
        messaging_service_1.messagingService.sendToOriginator('get-online-players', {
            success: false,
            instanceId: id,
            error: error?.message,
            requestId
        }, sender);
    }
});
/** Handles the 'disconnect-rcon' message event from the messaging service.
 *
 * When triggered, this handler invokes the ServerInstanceService to disconnect from the RCON interface of a server instance.
 * It then sends the result back to the originator of the message, including details such as
 * the disconnection status and instance ID.
 * In case of unexpected errors during the disconnection attempt, it logs the error and sends a failure
 * response to the originator.
 *
 * @param payload - The payload received with the message, expected to contain `id` and `requestId`.
 * @param sender - The sender of the message, used to route the response.
 */
messaging_service_1.messagingService.on('disconnect-rcon', async (payload, sender) => {
    const { id, requestId } = payload || {};
    try {
        const result = await server_operations_service_1.serverOperationsService.disconnectRcon(id);
        messaging_service_1.messagingService.sendToOriginator('disconnect-rcon', {
            success: result.success,
            connected: result.connected,
            instanceId: result.instanceId,
            requestId
        }, sender);
        messaging_service_1.messagingService.sendToAll('rcon-status', {
            instanceId: id,
            connected: false
        });
        server_monitoring_service_1.serverMonitoringService.stopPlayerPolling(id);
    }
    catch (error) {
        console.error('[server-instance-handler] Failed to handle disconnect-rcon:', error);
        messaging_service_1.messagingService.sendToOriginator('disconnect-rcon', {
            success: false,
            connected: false,
            instanceId: id,
            requestId
        }, sender);
    }
});
/** Handles the 'get-rcon-status' message event from the messaging service.
 *
 * When triggered, this handler invokes the ServerInstanceService to get the RCON status of a server instance.
 * It then sends the result back to the originator of the message, including details such as
 * the connection status and instance ID.
 * In case of unexpected errors during the status retrieval, it logs the error and sends a failure
 * response to the originator.
 *
 * @param payload - The payload received with the message, expected to contain `id` and `requestId`.
 * @param sender - The sender of the message, used to route the response.
 */
messaging_service_1.messagingService.on('get-rcon-status', async (payload, sender) => {
    const { id, requestId } = payload || {};
    try {
        const result = server_operations_service_1.serverOperationsService.getRconStatus(id);
        messaging_service_1.messagingService.sendToOriginator('get-rcon-status', {
            success: result.success,
            connected: result.connected,
            instanceId: result.instanceId,
            requestId
        }, sender);
    }
    catch (error) {
        console.error('[server-instance-handler] Failed to handle get-rcon-status:', error);
        messaging_service_1.messagingService.sendToOriginator('get-rcon-status', {
            success: false,
            connected: false,
            instanceId: id,
            requestId
        }, sender);
    }
});
/** Handles the 'rcon-command' message event from the messaging service.
 *
 * When triggered, this handler invokes the ServerInstanceService to execute an RCON command on a server instance.
 * It then sends the result back to the originator of the message, including details such as
 * the command execution status and instance ID.
 * In case of unexpected errors during the command execution, it logs the error and sends a failure
 * response to the originator.
 *
 * @param payload - The payload received with the message, expected to contain `id`, `command`, and `requestId`.
 * @param sender - The sender of the message, used to route the response.
 */
messaging_service_1.messagingService.on('rcon-command', async (payload, sender) => {
    const { id, command, requestId } = payload || {};
    try {
        const result = await server_operations_service_1.serverOperationsService.executeRconCommand(id, command);
        messaging_service_1.messagingService.sendToOriginator('rcon-command', {
            instanceId: result.instanceId,
            response: result.response || result.error || 'No response',
            requestId
        }, sender);
    }
    catch (error) {
        console.error('[server-instance-handler] Failed to handle rcon-command:', error);
        messaging_service_1.messagingService.sendToOriginator('rcon-command', {
            instanceId: id,
            response: error?.message || 'RCON command failed',
            requestId
        }, sender);
    }
});
/** Handles the 'start-server-instance' message event from the messaging service.
 *
 * When triggered, this handler invokes the ServerInstanceService to start a server instance.
 * It then sends the result back to the originator of the message, including details such as
 * the start status and instance ID.
 * In case of unexpected errors during the start process, it logs the error and sends a failure
 * response to the originator.
 *
 * @param payload - The payload received with the message, expected to contain `id` and `requestId`.
 * @param sender - The sender of the message, used to route the response.
 */
messaging_service_1.messagingService.on('start-server-instance', async (payload, sender) => {
    const { id, requestId } = payload || {};
    try {
        messaging_service_1.messagingService.sendToAll('clear-server-instance-logs', { instanceId: id });
        const { onLog, onState } = server_instance_service_1.serverInstanceService.getStandardEventCallbacks(id);
        const result = await server_instance_service_1.serverInstanceService.startServerInstance(id, onLog, onState);
        if (result.started) {
            messaging_service_1.messagingService.sendToAll('notification', {
                type: 'info',
                message: `Server ${result.instanceName} started.`
            });
        }
        else {
            if (result.portError && sender && typeof sender.send === 'function') {
                sender.send('notification', {
                    type: 'error',
                    message: result.portError
                });
            }
        }
        messaging_service_1.messagingService.sendToOriginator('start-server-instance', {
            success: result.started,
            instanceId: result.instanceId,
            error: result.portError,
            requestId
        }, sender);
    }
    catch (error) {
        console.error('[server-instance-handler] Failed to handle start-server-instance:', error);
        messaging_service_1.messagingService.sendToOriginator('start-server-instance', {
            success: false,
            instanceId: id,
            error: error?.message || 'Failed to start server',
            requestId
        }, sender);
    }
});
/** Handles the 'get-server-instance-players' message event from the messaging service.
 *
 * When triggered, this handler invokes the ServerInstanceService to retrieve the player count
 * for a specific server instance. It then sends the result back to the originator of the message,
 * including details such as the instance ID and player count.
 * In case of unexpected errors during the player count retrieval, it logs the error and sends a failure
 * response to the originator.
 *
 * @param payload - The payload received with the message, expected to contain `id` and `requestId`.
 * @param sender - The sender of the message, used to route the response.
 */
messaging_service_1.messagingService.on('get-server-instance-players', async (payload, sender) => {
    const { id, requestId } = payload || {};
    try {
        const result = server_monitoring_service_1.serverMonitoringService.getPlayerCount(id);
        messaging_service_1.messagingService.sendToOriginator('get-server-instance-players', {
            instanceId: result.instanceId,
            players: result.players,
            requestId
        }, sender);
    }
    catch (error) {
        console.error('[server-instance-handler] Failed to handle get-server-instance-players:', error);
        messaging_service_1.messagingService.sendToOriginator('get-server-instance-players', {
            instanceId: id,
            players: 0,
            requestId
        }, sender);
    }
});
/** Handles the 'get-server-instances' message event from the messaging service.
 *
 * When triggered, this handler invokes the ServerInstanceService to retrieve all server instances.
 * It then sends the result back to the originator of the message, including details such as
 * the list of instances.
 * In case of unexpected errors during the retrieval process, it logs the error and sends a failure
 * response to the originator.
 *
 * @param payload - The payload received with the message, expected to contain `requestId`.
 * @param sender - The sender of the message, used to route the response.
 */
messaging_service_1.messagingService.on('get-server-instances', async (payload, sender) => {
    const { requestId } = payload || {};
    try {
        const result = await server_management_service_1.serverManagementService.getAllInstances();
        messaging_service_1.messagingService.sendToOriginator('get-server-instances', {
            instances: result.instances,
            requestId
        }, sender);
        messaging_service_1.messagingService.sendToAll('server-instances', result.instances);
    }
    catch (error) {
        console.error('[server-instance-handler] Failed to handle get-server-instances:', error);
        messaging_service_1.messagingService.sendToOriginator('get-server-instances', {
            instances: [],
            requestId
        }, sender);
    }
});
/** Handles the 'get-server-instance' message event from the messaging service.
 *
 * When triggered, this handler invokes the ServerInstanceService to retrieve a specific server instance.
 * It then sends the result back to the originator of the message, including details such as the instance ID.
 * In case of unexpected errors during the retrieval process, it logs the error and sends a failure
 * response to the originator.
 *
 * @param payload - The payload received with the message, expected to contain `id` and `requestId`.
 * @param sender - The sender of the message, used to route the response.
 */
messaging_service_1.messagingService.on('get-server-instance', async (payload, sender) => {
    const { id, requestId } = payload || {};
    try {
        const result = await server_management_service_1.serverManagementService.getInstance(id);
        messaging_service_1.messagingService.sendToOriginator('get-server-instance', {
            instance: result.instance,
            requestId
        }, sender);
    }
    catch (error) {
        console.error('[server-instance-handler] Failed to handle get-server-instance:', error);
        messaging_service_1.messagingService.sendToOriginator('get-server-instance', {
            instance: null,
            requestId
        }, sender);
    }
});
/** Handles the 'save-server-instance' message event from the messaging service.
 *
 * When triggered, this handler invokes the ServerInstanceService to save a server instance.
 * It then sends the result back to the originator of the message, including details such as
 * the success status and any error messages.
 * In case of unexpected errors during the save process, it logs the error and sends a failure
 * response to the originator.
 *
 * @param payload - The payload received with the message, expected to contain `instance` and `requestId`.
 * @param sender - The sender of the message, used to route the response.
 */
messaging_service_1.messagingService.on('save-server-instance', async (payload, sender) => {
    const { instance, requestId } = payload || {};
    try {
        const existingInstance = instance?.id ? await instanceUtils.getInstance(instance.id) : null;
        const result = await server_management_service_1.serverManagementService.saveInstance(instance);
        messaging_service_1.messagingService.sendToOriginator('save-server-instance', {
            success: result.success,
            instance: result.instance,
            error: result.error,
            requestId
        }, sender);
        if (result.success && result.instance) {
            messaging_service_1.messagingService.sendToAll('server-instance-updated', result.instance);
            const allInstances = await server_management_service_1.serverManagementService.getAllInstances();
            messaging_service_1.messagingService.sendToAll('server-instances', allInstances.instances);
            let notificationMessage = '';
            if (existingInstance && existingInstance.name !== result.instance?.name) {
                notificationMessage = `Server renamed from "${existingInstance.name}" to "${result.instance?.name}".`;
            }
            else if (existingInstance) {
                notificationMessage = `Server "${result.instance?.name || result.instance?.id}" updated.`;
            }
            else {
                notificationMessage = `Server "${result.instance?.name || result.instance?.id || 'Unknown'}" added.`;
            }
            messaging_service_1.messagingService.sendToAllOthers('notification', {
                type: 'info',
                message: notificationMessage
            }, sender);
        }
    }
    catch (error) {
        console.error('[server-instance-handler] Failed to handle save-server-instance:', error);
        messaging_service_1.messagingService.sendToOriginator('save-server-instance', {
            success: false,
            error: error?.message || 'Failed to save server instance',
            requestId
        }, sender);
    }
});
/** Handles the 'delete-server-instance' message event from the messaging service.
 *
 * When triggered, this handler invokes the ServerInstanceService to delete a server instance.
 * It then sends the result back to the originator of the message, including details such as
 * the success status and any error messages.
 * In case of unexpected errors during the delete process, it logs the error and sends a failure
 * response to the originator.
 *
 * @param payload - The payload received with the message, expected to contain `id` and `requestId`.
 * @param sender - The sender of the message, used to route the response.
 */
messaging_service_1.messagingService.on('delete-server-instance', async (payload, sender) => {
    const { id, requestId } = payload || {};
    try {
        const result = await server_management_service_1.serverManagementService.deleteInstance(id);
        messaging_service_1.messagingService.sendToOriginator('delete-server-instance', {
            success: result.success,
            id: result.id,
            requestId
        }, sender);
        if (result.success) {
            const allInstances = await server_management_service_1.serverManagementService.getAllInstances();
            messaging_service_1.messagingService.sendToAll('server-instances', allInstances.instances);
            messaging_service_1.messagingService.sendToAllOthers('notification', {
                type: 'info',
                message: 'Server deleted.'
            }, sender);
        }
    }
    catch (error) {
        console.error('[server-instance-handler] Failed to handle delete-server-instance:', error);
        messaging_service_1.messagingService.sendToOriginator('delete-server-instance', {
            success: false,
            id,
            requestId
        }, sender);
    }
});
/** Handles the 'import-server-from-backup' message event from the messaging service.
 *
 * When triggered, this handler invokes the ServerInstanceService to import a server instance
 * from a backup file. It then sends the result back to the originator of the message, including
 * details such as the success status and any error messages.
 * In case of unexpected errors during the import process, it logs the error and sends a failure
 * response to the originator.
 *
 * @param payload - The payload received with the message, expected to contain `serverName`,
 * `backupFilePath`, `fileData`, `fileName`, and `requestId`.
 * @param sender - The sender of the message, used to route the response.
 */
messaging_service_1.messagingService.on('import-server-from-backup', async (payload, sender) => {
    const { serverName, backupFilePath, fileData, fileName, requestId } = payload || {};
    try {
        const result = await server_instance_service_1.serverInstanceService.importServerFromBackup(serverName, backupFilePath, fileData, fileName);
        messaging_service_1.messagingService.sendToOriginator('import-server-from-backup', {
            success: result.success,
            instance: result.instance,
            message: result.message,
            error: result.error,
            requestId
        }, sender);
        if (result.success) {
            const allInstances = await server_management_service_1.serverManagementService.getAllInstances();
            messaging_service_1.messagingService.sendToAll('server-instances', allInstances.instances);
        }
    }
    catch (error) {
        console.error('[server-instance-handler] Failed to handle import-server-from-backup:', error);
        messaging_service_1.messagingService.sendToOriginator('import-server-from-backup', {
            success: false,
            error: error?.message || 'Failed to import server from backup',
            requestId
        }, sender);
    }
});
console.log('[server-instance-handler] Server instance message handlers registered');
// =====================================================
// Reorder Server Instances Handler
// =====================================================
/**
 * Handles the 'reorder-server-instances' message event.
 * Updates the sortOrder property for each server instance based on the new order.
 */
messaging_service_1.messagingService.on('reorder-server-instances', async (payload, sender) => {
    try {
        const { orderedIds, requestId } = payload;
        if (!Array.isArray(orderedIds)) {
            messaging_service_1.messagingService.sendToOriginator('reorder-server-instances', {
                success: false,
                error: 'orderedIds must be an array',
                requestId
            }, sender);
            return;
        }
        // Update sortOrder for each instance
        const allInstances = await server_management_service_1.serverManagementService.getAllInstances();
        const instances = allInstances.instances || [];
        for (let i = 0; i < orderedIds.length; i++) {
            const instance = instances.find((inst) => inst.id === orderedIds[i]);
            if (instance) {
                instance.sortOrder = i;
                await server_management_service_1.serverManagementService.saveInstance(instance);
            }
        }
        // Broadcast updated list to all clients
        const updatedInstances = await server_management_service_1.serverManagementService.getAllInstances();
        messaging_service_1.messagingService.sendToAll('server-instances', updatedInstances.instances);
        messaging_service_1.messagingService.sendToOriginator('reorder-server-instances', {
            success: true,
            requestId
        }, sender);
    }
    catch (error) {
        console.error('[server-instance-handler] Failed to reorder server instances:', error);
        messaging_service_1.messagingService.sendToOriginator('reorder-server-instances', {
            success: false,
            error: error?.message || 'Failed to reorder server instances'
        }, sender);
    }
});
