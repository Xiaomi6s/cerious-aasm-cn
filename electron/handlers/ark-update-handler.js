"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setArkUpdateService = setArkUpdateService;
const messaging_service_1 = require("../services/messaging.service");
// Will be set by main.ts via setArkUpdateService()
let arkUpdateService = null;
function setArkUpdateService(service) {
    arkUpdateService = service;
}
/**
 * Handles the 'check-ark-update' message event from the messaging service.
 *
 * When triggered, this handler invokes the ArkUpdateService to check for available updates.
 * It then sends the result back to the originator of the message, including details such as
 * whether an update is available, the build ID, a message, and any error information.
 *
 * In case of unexpected errors during the update check, it logs the error and sends a failure
 * response to the originator.
 *
 * @param payload - The payload received with the message, expected to contain a `requestId`.
 * @param sender - The sender of the message, used to route the response.
 */
messaging_service_1.messagingService.on('check-ark-update', async (payload, sender) => {
    const { requestId } = payload || {};
    if (!arkUpdateService) {
        console.error('[ark-update-handler] ArkUpdateService not initialized');
        messaging_service_1.messagingService.sendToOriginator('check-ark-update', {
            success: false,
            error: 'Update service not initialized',
            requestId
        }, sender);
        return;
    }
    try {
        const result = await arkUpdateService.checkForUpdate();
        messaging_service_1.messagingService.sendToOriginator('check-ark-update', {
            success: result.success,
            hasUpdate: result.hasUpdate,
            buildId: result.buildId,
            message: result.message,
            error: result.error,
            requestId
        }, sender);
    }
    catch (error) {
        console.error('[ark-update-handler] Unexpected error:', error);
        messaging_service_1.messagingService.sendToOriginator('check-ark-update', {
            success: false,
            error: error instanceof Error ? error.message : String(error),
            requestId
        }, sender);
    }
});
