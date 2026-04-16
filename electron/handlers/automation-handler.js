"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const messaging_service_1 = require("../services/messaging.service");
const automation_service_1 = require("../services/automation/automation.service");
/**
 * Handles the 'configure-autostart' message event from the messaging service.
 *
 * When triggered, this handler invokes the AutomationService to configure autostart settings.
 * It then sends the result back to the originator of the message, including details such as
 * success status and any error information.
 * In case of unexpected errors during the configuration, it logs the error and sends a failure
 * response to the originator.
 *
 * @param payload - The payload received with the message, expected to contain `serverId`,
 *                  `autoStartOnAppLaunch`, `autoStartOnBoot`, and `requestId`.
 * @param sender - The sender of the message, used to route the response.
 */
messaging_service_1.messagingService.on('configure-autostart', async (payload, sender) => {
    const { serverId, autoStartOnAppLaunch, autoStartOnBoot, requestId } = payload || {};
    try {
        const result = await automation_service_1.automationService.configureAutostart(serverId, autoStartOnAppLaunch, autoStartOnBoot);
        messaging_service_1.messagingService.sendToOriginator('configure-autostart', {
            ...result,
            requestId
        }, sender);
    }
    catch (error) {
        console.error('[automation-handler] Error configuring autostart:', error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        messaging_service_1.messagingService.sendToOriginator('configure-autostart', {
            success: false,
            error: errorMsg,
            requestId
        }, sender);
    }
});
/**
 * Handles the 'configure-crash-detection' message event from the messaging service.
 *
 * When triggered, this handler invokes the AutomationService to configure crash detection settings.
 * It then sends the result back to the originator of the message, including details such as
 * success status and any error information.
 * In case of unexpected errors during the configuration, it logs the error and sends a failure
 * response to the originator.
 *
 * @param payload - The payload received with the message, expected to contain `serverId`,
 *                  `enabled`, `checkInterval`, `maxRestartAttempts`, and `requestId`.
 * @param sender - The sender of the message, used to route the response.
 */
messaging_service_1.messagingService.on('configure-crash-detection', async (payload, sender) => {
    const { serverId, enabled, checkInterval, maxRestartAttempts, requestId } = payload || {};
    try {
        const result = await automation_service_1.automationService.configureCrashDetection(serverId, enabled, checkInterval, maxRestartAttempts);
        messaging_service_1.messagingService.sendToOriginator('configure-crash-detection', {
            ...result,
            requestId
        }, sender);
    }
    catch (error) {
        console.error('[automation-handler] Error configuring crash detection:', error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        messaging_service_1.messagingService.sendToOriginator('configure-crash-detection', {
            success: false,
            error: errorMsg,
            requestId
        }, sender);
    }
});
/**
 * Configure Discord Webhook Integration
 */
messaging_service_1.messagingService.on('configure-discord-webhook', async (payload, sender) => {
    const { serverId, config, requestId } = payload || {};
    try {
        const { instanceUtils } = require('../utils/ark/instance.utils');
        const instance = await instanceUtils.getInstance(serverId);
        if (!instance)
            throw new Error('Instance not found');
        instance.discordConfig = config;
        await instanceUtils.saveInstance(instance);
        messaging_service_1.messagingService.sendToOriginator('configure-discord-webhook', { success: true, requestId }, sender);
    }
    catch (error) {
        console.error('[automation-handler] Error configuring discord:', error);
        messaging_service_1.messagingService.sendToOriginator('configure-discord-webhook', {
            success: false,
            error: error.message,
            requestId
        }, sender);
    }
});
/**
 * Configure Scheduled Broadcasts
 */
messaging_service_1.messagingService.on('configure-broadcasts', async (payload, sender) => {
    const { serverId, broadcasts, requestId } = payload || {};
    try {
        const { instanceUtils } = require('../utils/ark/instance.utils');
        const { schedulerService } = require('../services/scheduler.service');
        const instance = await instanceUtils.getInstance(serverId);
        if (!instance)
            throw new Error('Instance not found');
        instance.broadcasts = broadcasts;
        await instanceUtils.saveInstance(instance);
        // Update live scheduler
        schedulerService.updateBroadcasts(serverId, broadcasts);
        schedulerService.initSchedule(serverId);
        messaging_service_1.messagingService.sendToOriginator('configure-broadcasts', { success: true, requestId }, sender);
    }
    catch (error) {
        console.error('[automation-handler] Error configuring broadcasts:', error);
        messaging_service_1.messagingService.sendToOriginator('configure-broadcasts', {
            success: false,
            error: error.message,
            requestId
        }, sender);
    }
});
/**
 * Handles the 'configure-scheduled-restart' message event from the messaging service.
 *
 * When triggered, this handler invokes the AutomationService to configure scheduled restart settings.
 * It then sends the result back to the originator of the message, including details such as
 * success status and any error information.
 * In case of unexpected errors during the configuration, it logs the error and sends a failure
 * response to the originator.
 *
 * @param payload - The payload received with the message, expected to contain `serverId`,
 *                  `enabled`, `frequency`, `time`, `days`, `warningMinutes`, and `requestId`.
 * @param sender - The sender of the message, used to route the response.
 */
messaging_service_1.messagingService.on('configure-scheduled-restart', async (payload, sender) => {
    const { serverId, enabled, frequency, time, days, warningMinutes, requestId } = payload || {};
    try {
        const result = await automation_service_1.automationService.configureScheduledRestart(serverId, enabled, frequency, time, days, warningMinutes);
        messaging_service_1.messagingService.sendToOriginator('configure-scheduled-restart', {
            ...result,
            requestId
        }, sender);
    }
    catch (error) {
        console.error('[automation-handler] Error configuring scheduled restart:', error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        messaging_service_1.messagingService.sendToOriginator('configure-scheduled-restart', {
            success: false,
            error: errorMsg,
            requestId
        }, sender);
    }
});
/**
 * Handles the 'get-automation-status' message event from the messaging service.
 *
 * When triggered, this handler invokes the AutomationService to retrieve the current automation status.
 * It then sends the result back to the originator of the message, including details such as
 * the current status and any error information.
 * In case of unexpected errors during the status retrieval, it logs the error and sends a failure
 * response to the originator.
 *
 * @param payload - The payload received with the message, expected to contain `serverId` and `requestId`.
 * @param sender - The sender of the message, used to route the response.
 */
messaging_service_1.messagingService.on('get-automation-status', async (payload, sender) => {
    const { serverId, requestId } = payload || {};
    try {
        const result = await automation_service_1.automationService.getAutomationStatus(serverId);
        messaging_service_1.messagingService.sendToOriginator('get-automation-status', {
            ...result,
            requestId
        }, sender);
    }
    catch (error) {
        console.error('[automation-handler] Error getting automation status:', error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        messaging_service_1.messagingService.sendToOriginator('get-automation-status', {
            success: false,
            error: errorMsg,
            requestId
        }, sender);
    }
});
/**
 * Handles the 'auto-start-on-app-launch' message event from the messaging service.
 *
 * When triggered, this handler invokes the AutomationService to configure auto-start on app launch.
 * It then sends the result back to the originator of the message, including details such as
 * success status and any error information.
 * In case of unexpected errors during the configuration, it logs the error and sends a failure
 * response to the originator.
 *
 * @param payload - The payload received with the message, expected to contain `requestId`.
 * @param sender - The sender of the message, used to route the response.
 */
messaging_service_1.messagingService.on('auto-start-on-app-launch', async (payload, sender) => {
    const { requestId } = payload || {};
    try {
        await automation_service_1.automationService.handleAutoStartOnAppLaunch();
        messaging_service_1.messagingService.sendToOriginator('auto-start-on-app-launch', {
            success: true,
            requestId
        }, sender);
    }
    catch (error) {
        console.error('[automation-handler] Error during auto-start on app launch:', error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        messaging_service_1.messagingService.sendToOriginator('auto-start-on-app-launch', {
            success: false,
            error: errorMsg,
            requestId
        }, sender);
    }
});
