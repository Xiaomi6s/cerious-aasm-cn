"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const messaging_service_1 = require("../services/messaging.service");
const settings_service_1 = require("../services/settings.service");
/** Handles the 'get-global-config' message event from the messaging service.
 *
 * When triggered, this handler invokes the SettingsService to get the global configuration.
 * It then sends the result back to the originator of the message, including details such as
 * the current configuration values.
 * In case of unexpected errors during the retrieval process, it logs the error and sends a failure
 * response to the originator.
 *
 * @param payload - The payload received with the message, expected to contain `requestId`.
 * @param sender - The sender of the message, used to route the response.
 */
messaging_service_1.messagingService.on('get-global-config', async (payload, sender) => {
    const { requestId } = payload || {};
    try {
        const config = settings_service_1.settingsService.getGlobalConfig();
        messaging_service_1.messagingService.sendToOriginator('get-global-config', { ...config, requestId }, sender);
        // Also broadcast to all clients for consistent state
        messaging_service_1.messagingService.sendToAll('global-config', config);
    }
    catch (error) {
        console.error('[settings-handler] Error loading global config:', error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        messaging_service_1.messagingService.sendToOriginator('get-global-config', { error: errorMsg, requestId }, sender);
    }
});
/** Handles the 'set-global-config' message event from the messaging service.
 *
 * When triggered, this handler invokes the SettingsService to update the global configuration.
 * It then sends the result back to the originator of the message, including details such as
 * success status and any error information.
 * If the update is successful, it also updates the web server authentication configuration
 * and broadcasts the updated configuration to all connected clients.
 * In case of unexpected errors during the update process, it logs the error and sends a failure
 * response to the originator.
 *
 * @param payload - The payload received with the message, expected to contain `config` and `requestId`.
 * @param sender - The sender of the message, used to route the response.
 */
messaging_service_1.messagingService.on('set-global-config', async (payload, sender) => {
    const { config, requestId } = payload || {};
    try {
        const result = await settings_service_1.settingsService.updateGlobalConfig(config);
        messaging_service_1.messagingService.sendToOriginator('set-global-config', {
            success: result.success,
            error: result.error,
            requestId
        }, sender);
        if (result.success && result.updatedConfig) {
            // Update web server authentication configuration
            const apiProcess = messaging_service_1.messagingService.apiProcess;
            await settings_service_1.settingsService.updateWebServerAuth(result.updatedConfig, apiProcess);
            // Broadcast updated config to all clients
            messaging_service_1.messagingService.sendToAll('global-config', result.updatedConfig);
        }
    }
    catch (error) {
        console.error('[settings-handler] Error updating global config:', error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        messaging_service_1.messagingService.sendToOriginator('set-global-config', {
            success: false,
            error: errorMsg,
            requestId
        }, sender);
    }
});
