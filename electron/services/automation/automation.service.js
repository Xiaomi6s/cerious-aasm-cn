"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.automationService = exports.AutomationService = void 0;
const server_instance_service_1 = require("../server-instance/server-instance.service");
const automation_config_service_1 = require("./automation-config.service");
const automation_status_service_1 = require("./automation-status.service");
const crash_detection_service_1 = require("./crash-detection.service");
const scheduled_restart_service_1 = require("./scheduled-restart.service");
const automation_instances_service_1 = require("./automation-instances.service");
class AutomationService {
    constructor() {
        this.automations = new Map();
        this.configService = new automation_config_service_1.AutomationConfigService(this.automations);
        this.statusService = new automation_status_service_1.AutomationStatusService(this.automations);
        this.crashDetectionService = new crash_detection_service_1.CrashDetectionService(this.automations);
        this.scheduledRestartService = new scheduled_restart_service_1.ScheduledRestartService(this.automations);
        this.instancesService = new automation_instances_service_1.AutomationInstancesService(this.automations);
        this.instancesService.loadAutomationFromInstances();
    }
    // Delegate to config service
    async configureAutostart(serverId, autoStartOnAppLaunch, autoStartOnBoot) {
        const result = await this.configService.configureAutostart(serverId, autoStartOnAppLaunch, autoStartOnBoot);
        if (result.success) {
            // Start/stop crash detection based on settings
            const automation = this.automations.get(serverId);
            if (automation?.settings.crashDetectionEnabled) {
                this.crashDetectionService.startCrashDetection(serverId);
            }
            else {
                this.crashDetectionService.stopCrashDetection(serverId);
            }
            if (automation?.settings.scheduledRestartEnabled) {
                this.scheduledRestartService.scheduleRestart(serverId);
            }
            else {
                this.scheduledRestartService.unscheduleRestart(serverId);
            }
        }
        return result;
    }
    async configureCrashDetection(serverId, enabled, checkInterval, maxRestartAttempts) {
        const result = await this.configService.configureCrashDetection(serverId, enabled, checkInterval, maxRestartAttempts);
        if (result.success) {
            if (enabled) {
                this.crashDetectionService.startCrashDetection(serverId);
            }
            else {
                this.crashDetectionService.stopCrashDetection(serverId);
            }
        }
        return result;
    }
    async configureScheduledRestart(serverId, enabled, frequency, time, days, warningMinutes) {
        const result = await this.configService.configureScheduledRestart(serverId, enabled, frequency, time, days, warningMinutes);
        if (result.success) {
            if (enabled) {
                this.scheduledRestartService.scheduleRestart(serverId);
            }
            else {
                this.scheduledRestartService.unscheduleRestart(serverId);
            }
        }
        return result;
    }
    // Delegate to status service
    getAutostartInstanceIds() {
        return this.statusService.getAutostartInstanceIds();
    }
    async getAutomationStatus(serverId) {
        return this.statusService.getAutomationStatus(serverId);
    }
    setManuallyStopped(serverId, manually) {
        this.statusService.setManuallyStopped(serverId, manually);
    }
    // Auto-start on app launch
    async handleAutoStartOnAppLaunch() {
        try {
            // Delay autostart to allow UI to subscribe
            setTimeout(async () => {
                for (const [serverId, automation] of this.automations) {
                    if (automation.settings.autoStartOnAppLaunch) {
                        try {
                            const { onLog, onState } = server_instance_service_1.serverInstanceService.getStandardEventCallbacks(serverId);
                            await server_instance_service_1.serverInstanceService.startServerInstance(serverId, onLog, onState);
                        }
                        catch (error) {
                            console.error(`Failed to auto-start server ${serverId}:`, error);
                        }
                    }
                }
            }, 4000); // 4s delay to allow UI to subscribe
        }
        catch (error) {
            console.error('Failed during auto-start on app launch:', error);
        }
    }
    // Initialize automation
    initializeAutomation() {
        for (const [serverId, automation] of this.automations) {
            if (automation.settings.crashDetectionEnabled) {
                this.crashDetectionService.startCrashDetection(serverId);
            }
            if (automation.settings.scheduledRestartEnabled) {
                this.scheduledRestartService.scheduleRestart(serverId);
            }
        }
        this.handleAutoStartOnAppLaunch();
    }
    // Cleanup
    cleanup() {
        for (const [serverId] of this.automations) {
            this.crashDetectionService.stopCrashDetection(serverId);
            this.scheduledRestartService.unscheduleRestart(serverId);
        }
    }
}
exports.AutomationService = AutomationService;
exports.automationService = new AutomationService();
