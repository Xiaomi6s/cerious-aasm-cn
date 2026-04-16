"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutomationInstancesService = void 0;
const instance_utils_1 = require("../../utils/ark/instance.utils");
class AutomationInstancesService {
    constructor(automations) {
        this.automations = automations;
    }
    async loadAutomationFromInstances() {
        try {
            const allInstances = await (0, instance_utils_1.getAllInstances)();
            for (const instance of Array.isArray(allInstances) ? allInstances : []) {
                if (instance && instance.id && instance.autoStartOnAppLaunch !== undefined) {
                    const automation = {
                        serverId: instance.id,
                        settings: {
                            autoStartOnAppLaunch: !!instance.autoStartOnAppLaunch,
                            autoStartOnBoot: !!instance.autoStartOnBoot,
                            crashDetectionEnabled: !!instance.crashDetectionEnabled,
                            crashDetectionInterval: instance.crashDetectionInterval || 60,
                            maxRestartAttempts: instance.maxRestartAttempts || 3,
                            scheduledRestartEnabled: !!instance.scheduledRestartEnabled,
                            restartFrequency: instance.restartFrequency || 'daily',
                            restartTime: instance.restartTime || '02:00',
                            restartDays: instance.restartDays || [1],
                            restartWarningMinutes: instance.restartWarningMinutes || 5
                        },
                        restartAttempts: 0,
                        manuallyStopped: false,
                        status: {
                            isMonitoring: false,
                            isScheduled: false
                        }
                    };
                    this.automations.set(instance.id, automation);
                }
            }
        }
        catch (error) {
            console.error('Failed to load automation from instances:', error);
        }
    }
}
exports.AutomationInstancesService = AutomationInstancesService;
