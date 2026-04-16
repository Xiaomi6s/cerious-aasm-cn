"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutomationConfigService = void 0;
const instance_utils_1 = require("../../utils/ark/instance.utils");
class AutomationConfigService {
    constructor(automations) {
        this.automations = automations;
    }
    getOrCreateAutomation(serverId) {
        if (!this.automations.has(serverId)) {
            const automation = {
                serverId,
                settings: {
                    autoStartOnAppLaunch: false,
                    autoStartOnBoot: false,
                    crashDetectionEnabled: false,
                    crashDetectionInterval: 60000,
                    maxRestartAttempts: 3,
                    scheduledRestartEnabled: false,
                    restartFrequency: 'daily',
                    restartTime: '04:00',
                    restartDays: [0],
                    restartWarningMinutes: 15
                },
                restartAttempts: 0,
                manuallyStopped: false,
                status: {
                    isMonitoring: false,
                    isScheduled: false
                }
            };
            this.automations.set(serverId, automation);
        }
        return this.automations.get(serverId);
    }
    async configureAutostart(serverId, autoStartOnAppLaunch, autoStartOnBoot) {
        try {
            const automation = this.getOrCreateAutomation(serverId);
            automation.settings.autoStartOnAppLaunch = autoStartOnAppLaunch;
            automation.settings.autoStartOnBoot = autoStartOnBoot;
            // Update instance config.json
            const instance = (0, instance_utils_1.getInstance)(serverId);
            if (instance) {
                instance.autoStartOnAppLaunch = autoStartOnAppLaunch;
                instance.autoStartOnBoot = autoStartOnBoot;
                await (0, instance_utils_1.saveInstance)(instance);
            }
            return { success: true };
        }
        catch (error) {
            console.error('Failed to configure autostart:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }
    async configureCrashDetection(serverId, enabled, checkInterval, maxRestartAttempts) {
        try {
            const automation = this.getOrCreateAutomation(serverId);
            automation.settings.crashDetectionEnabled = enabled;
            automation.settings.crashDetectionInterval = checkInterval;
            automation.settings.maxRestartAttempts = maxRestartAttempts;
            // Update instance config.json
            const instance = (0, instance_utils_1.getInstance)(serverId);
            if (instance) {
                instance.crashDetectionEnabled = enabled;
                instance.crashDetectionInterval = checkInterval;
                instance.maxRestartAttempts = maxRestartAttempts;
                await (0, instance_utils_1.saveInstance)(instance);
            }
            return { success: true };
        }
        catch (error) {
            console.error('Failed to configure crash detection:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }
    async configureScheduledRestart(serverId, enabled, frequency, time, days, warningMinutes) {
        try {
            const automation = this.getOrCreateAutomation(serverId);
            automation.settings.scheduledRestartEnabled = enabled;
            automation.settings.restartFrequency = frequency;
            automation.settings.restartTime = time;
            automation.settings.restartDays = days;
            automation.settings.restartWarningMinutes = warningMinutes;
            // Update instance config.json
            const instance = (0, instance_utils_1.getInstance)(serverId);
            if (instance) {
                instance.scheduledRestartEnabled = enabled;
                instance.restartFrequency = frequency;
                instance.restartTime = time;
                instance.restartDays = days;
                instance.restartWarningMinutes = warningMinutes;
                await (0, instance_utils_1.saveInstance)(instance);
            }
            return { success: true };
        }
        catch (error) {
            console.error('Failed to configure scheduled restart:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }
}
exports.AutomationConfigService = AutomationConfigService;
