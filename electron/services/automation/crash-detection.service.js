"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrashDetectionService = void 0;
const server_instance_service_1 = require("../server-instance/server-instance.service");
const instance_utils_1 = require("../../utils/ark/instance.utils");
class CrashDetectionService {
    constructor(automations) {
        this.automations = automations;
    }
    startCrashDetection(serverId) {
        const automation = this.automations.get(serverId);
        if (!automation)
            return;
        this.stopCrashDetection(serverId);
        automation.status.isMonitoring = true;
        automation.crashDetectionTimer = setInterval(async () => {
            await this.checkForCrash(serverId);
        }, automation.settings.crashDetectionInterval);
    }
    stopCrashDetection(serverId) {
        const automation = this.automations.get(serverId);
        if (!automation)
            return;
        if (automation.crashDetectionTimer) {
            clearInterval(automation.crashDetectionTimer);
            automation.crashDetectionTimer = undefined;
        }
        automation.status.isMonitoring = false;
    }
    async checkForCrash(serverId) {
        const automation = this.automations.get(serverId);
        if (!automation)
            return;
        try {
            const state = require('../server-instance/server-process.service').serverProcessService.getInstanceState(serverId);
            const arkProcess = require('../server-instance/server-process.service').serverProcessService.getServerProcess(serverId);
            if (state === 'running' && !arkProcess) {
                if (automation.manuallyStopped) {
                    automation.manuallyStopped = false;
                    return;
                }
                if (automation.restartAttempts >= automation.settings.maxRestartAttempts) {
                    this.stopCrashDetection(serverId);
                    require('../server-instance/server-process.service').serverProcessService.setInstanceState(serverId, 'stopped');
                    return;
                }
                automation.restartAttempts++;
                automation.lastCrashTime = new Date();
                // Notify Discord about the crash and restart attempt
                const { discordService } = require('../discord.service');
                discordService.sendNotification(serverId, 'crash', `Server Crash Detected! Attempting automatic restart (${automation.restartAttempts}/${automation.settings.maxRestartAttempts}).`);
                try {
                    const { onLog, onState } = server_instance_service_1.serverInstanceService.getStandardEventCallbacks(serverId);
                    await server_instance_service_1.serverInstanceService.startServerInstance(serverId, onLog, onState);
                }
                catch (error) {
                    console.error(`Failed to restart server ${serverId} after crash:`, error);
                }
                const instance = (0, instance_utils_1.getInstance)(serverId);
                if (instance) {
                    await (0, instance_utils_1.saveInstance)(instance);
                }
            }
            else if (state === 'running' && arkProcess) {
                if (automation.restartAttempts > 0) {
                    automation.restartAttempts = 0;
                    const instance = (0, instance_utils_1.getInstance)(serverId);
                    if (instance) {
                        await (0, instance_utils_1.saveInstance)(instance);
                    }
                }
            }
        }
        catch (error) {
            console.error(`Error during crash detection for server ${serverId}:`, error);
        }
    }
}
exports.CrashDetectionService = CrashDetectionService;
