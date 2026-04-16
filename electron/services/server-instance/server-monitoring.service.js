"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serverMonitoringService = exports.ServerMonitoringService = void 0;
const platform_utils_1 = require("../../utils/platform.utils");
const rcon_service_1 = require("../rcon.service");
const rcon_utils_1 = require("../../utils/rcon.utils");
const ark_server_logging_utils_1 = require("../../utils/ark/ark-server/ark-server-logging.utils");
const instance_utils_1 = require("../../utils/ark/instance.utils");
/**
 * Server Monitoring Service - Handles player polling, memory polling, and log monitoring
 */
class ServerMonitoringService {
    constructor() {
        // Track latest player counts to avoid redundant broadcasts
        this.latestPlayerCounts = {};
        // Track player polling intervals internally
        this.playerPollingIntervals = {};
        // Track callbacks for player updates
        this.playerUpdateCallbacks = {};
        // Track memory polling intervals internally
        this.memoryPollingIntervals = {};
        // Track callbacks for memory updates
        this.memoryUpdateCallbacks = {};
    }
    /**
     * Get server instance state (uses backend state utils)
     */
    getInstanceState(instanceId) {
        const { getInstanceState } = require('../../utils/ark/ark-server/ark-server-state.utils');
        const state = getInstanceState(instanceId) || 'unknown';
        return {
            state,
            instanceId
        };
    }
    /**
     * Get server instance logs
     */
    getInstanceLogs(instanceId, maxLines = 200) {
        try {
            // Only return logs if server is running, starting, or stopping
            const state = this.getInstanceState(instanceId).state.toLowerCase();
            if (state !== 'running' && state !== 'starting' && state !== 'stopping') {
                return {
                    log: '',
                    instanceId
                };
            }
            // Use the new logging utilities to get instance logs
            const { getInstanceLogs } = require('../../utils/ark/ark-server/ark-server-logging.utils');
            const logLines = getInstanceLogs(instanceId, maxLines);
            return {
                log: logLines.join('\n'),
                instanceId
            };
        }
        catch (error) {
            console.error(`[server-monitoring-service] Failed to get logs for instance ${instanceId}:`, error);
            return {
                log: '',
                instanceId
            };
        }
    }
    /**
     * Set up log file monitoring and tailing for real-time updates using new backend utils
     */
    setupLogMonitoring(instanceId, _instance, onLog, onState) {
        // Use new instance and log tailing utilities
        const instance = (0, instance_utils_1.getInstance)(instanceId);
        if (!instance) {
            console.warn(`[server-monitoring-service] No instance config found for ${instanceId}`);
            return;
        }
        const instanceDir = require('path').join(require('../../utils/ark/instance.utils').getInstancesBaseDir(), instanceId);
        (0, ark_server_logging_utils_1.setupLogTailing)(instanceId, instanceDir, instance, onLog, onState);
    }
    /**
     * Start tailing a log file for real-time monitoring
     */
    startLogTailing(instanceId, logFilePath, onState) {
        // Deprecated: replaced by setupLogMonitoring using setupLogTailing
    }
    /**
     * Start polling for player count updates
     */
    startPlayerPolling(instanceId, callback) {
        // Clear any existing polling for this instance
        this.stopPlayerPolling(instanceId);
        // Store the callback
        this.playerUpdateCallbacks[instanceId] = callback;
        // Start polling every 30 seconds
        this.playerPollingIntervals[instanceId] = setInterval(async () => {
            try {
                // If RCON dropped or never connected, try to reconnect before polling.
                // This turns every poll cycle into a passive persistent reconnect probe
                // so a missed initial connection window (e.g. slow Proton boot) self-heals.
                // Skip if a retry loop is already running to prevent stacking concurrent chains.
                if (!(0, rcon_utils_1.isRconConnected)(instanceId)) {
                    const state = this.getInstanceState(instanceId).state.toLowerCase();
                    if (state === 'running' && !(0, rcon_utils_1.isRconConnecting)(instanceId)) {
                        rcon_service_1.rconService.connectRcon(instanceId).then((result) => {
                            if (result?.connected) {
                                const messagingService = require('../messaging.service').messagingService;
                                messagingService.sendToAll('rcon-status', { instanceId, connected: true });
                            }
                        }).catch(() => {
                            // connectRcon already logs; suppress unhandled rejection
                        });
                    }
                    return; // skip this poll tick — playerCount stays at last known value
                }
                const playerCount = await this.getPlayerCountFromRcon(instanceId);
                if (playerCount !== null && playerCount !== this.latestPlayerCounts[instanceId]) {
                    this.latestPlayerCounts[instanceId] = playerCount;
                    callback(instanceId, playerCount);
                }
            }
            catch (error) {
                // Silently handle polling errors to avoid spam
                console.debug(`[server-monitoring-service] Player polling error for ${instanceId}:`, error);
            }
        }, 10000); // 10 seconds
    }
    /**
     * Stop polling for player count updates
     */
    stopPlayerPolling(instanceId) {
        if (this.playerPollingIntervals[instanceId]) {
            clearInterval(this.playerPollingIntervals[instanceId]);
            delete this.playerPollingIntervals[instanceId];
        }
        if (this.playerUpdateCallbacks[instanceId]) {
            delete this.playerUpdateCallbacks[instanceId];
        }
    }
    /**
     * Start polling for memory usage updates
     */
    startMemoryPolling(instanceId, callback) {
        // Clear any existing polling for this instance
        this.stopMemoryPolling(instanceId);
        // Store the callback
        this.memoryUpdateCallbacks[instanceId] = callback;
        // Start polling every 60 seconds
        this.memoryPollingIntervals[instanceId] = setInterval(async () => {
            try {
                // Get the process from lifecycle service (will be injected)
                const lifecycleService = require('./server-lifecycle.service').serverLifecycleService;
                const process = lifecycleService.getServerProcess(instanceId);
                if (process && process.pid) {
                    const memoryUsage = (0, platform_utils_1.getProcessMemoryUsage)(process.pid);
                    if (memoryUsage !== null) {
                        callback(instanceId, memoryUsage);
                    }
                }
            }
            catch (error) {
                // Silently handle polling errors to avoid spam
                console.debug(`[server-monitoring-service] Memory polling error for ${instanceId}:`, error);
            }
        }, 60000); // 60 seconds
    }
    /**
     * Stop polling for memory usage updates
     */
    stopMemoryPolling(instanceId) {
        if (this.memoryPollingIntervals[instanceId]) {
            clearInterval(this.memoryPollingIntervals[instanceId]);
            delete this.memoryPollingIntervals[instanceId];
        }
        if (this.memoryUpdateCallbacks[instanceId]) {
            delete this.memoryUpdateCallbacks[instanceId];
        }
    }
    /**
     * Get player count for an instance using RCON
     */
    async getPlayerCountFromRcon(instanceId) {
        try {
            const result = await rcon_service_1.rconService.executeRconCommand(instanceId, 'ListPlayers');
            if (result.success && result.response) {
                // Parse the response to extract player count
                const match = result.response.match(/There are (\d+) players? connected/);
                if (match) {
                    return parseInt(match[1], 10);
                }
                // Try alternative format: "There are X of a max Y players connected"
                const altMatch = result.response.match(/There are (\d+) of a max \d+ players? connected/);
                if (altMatch) {
                    return parseInt(altMatch[1], 10);
                }
                // Fallback: count lines that look like player entries (numbered lines)
                const lines = result.response.split('\n').filter(line => line.trim().length > 0);
                const playerLines = lines.filter(line => /^\d+\.\s/.test(line.trim()));
                if (playerLines.length > 0) {
                    return playerLines.length;
                }
                // If no players found and response contains "No Players Connected", return 0
                if (result.response.toLowerCase().includes('no players connected')) {
                    return 0;
                }
                // Last resort: return 0 if we can't parse it
                console.warn(`[server-monitoring-service] Could not parse player count from response for ${instanceId}`);
                return 0;
            }
            return null;
        }
        catch (error) {
            console.debug(`[server-monitoring-service] Failed to get player count for ${instanceId}:`, error);
            return null;
        }
    }
    /**
     * Get latest player count for an instance
     */
    getLatestPlayerCount(instanceId) {
        return this.latestPlayerCounts[instanceId] || 0;
    }
    /**
     * Get player count result for an instance
     */
    getPlayerCount(instanceId) {
        const players = this.getLatestPlayerCount(instanceId);
        return {
            instanceId,
            players
        };
    }
    /**
     * Update player count for an instance
     */
    updatePlayerCount(instanceId, players) {
        this.latestPlayerCounts[instanceId] = players;
    }
}
exports.ServerMonitoringService = ServerMonitoringService;
// Export singleton instance
exports.serverMonitoringService = new ServerMonitoringService();
