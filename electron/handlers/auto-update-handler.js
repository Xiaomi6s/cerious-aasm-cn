"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const messaging_service_1 = require("../services/messaging.service");
const auto_update_service_1 = require("../services/auto-update.service");
/**
 * IPC handler for auto-update actions from the renderer / web clients.
 *
 * Supported channels:
 *   - check-for-app-update   → triggers an update check
 *   - install-app-update     → quits and installs the downloaded update
 */
messaging_service_1.messagingService.on('check-for-app-update', async (_payload, sender) => {
    try {
        await auto_update_service_1.autoUpdateService.checkForUpdates();
        messaging_service_1.messagingService.sendToOriginator('check-for-app-update', { success: true }, sender);
    }
    catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error('[auto-update-handler] Error checking for update:', errorMsg);
        messaging_service_1.messagingService.sendToOriginator('check-for-app-update', { success: false, error: errorMsg }, sender);
    }
});
/**
 * Renderer requests the last known update status on boot so it doesn't miss
 * events that fired before Angular finished subscribing.
 */
messaging_service_1.messagingService.on('get-app-update-status', (_payload, sender) => {
    const last = auto_update_service_1.autoUpdateService.getLastStatus();
    messaging_service_1.messagingService.sendToOriginator('app-update-status', last ?? { status: 'up-to-date' }, sender);
});
messaging_service_1.messagingService.on('install-app-update', async (_payload, sender) => {
    try {
        if (!auto_update_service_1.autoUpdateService.isUpdateReady()) {
            messaging_service_1.messagingService.sendToOriginator('install-app-update', {
                success: false,
                error: 'No update has been downloaded yet.',
            }, sender);
            return;
        }
        messaging_service_1.messagingService.sendToOriginator('install-app-update', { success: true }, sender);
        // Give the response a moment to reach the client before restarting
        setTimeout(() => auto_update_service_1.autoUpdateService.quitAndInstall(), 1000);
    }
    catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error('[auto-update-handler] Error installing update:', errorMsg);
        messaging_service_1.messagingService.sendToOriginator('install-app-update', { success: false, error: errorMsg }, sender);
    }
});
/**
 * User has chosen to download the available update.
 */
messaging_service_1.messagingService.on('download-app-update', async (_payload, sender) => {
    try {
        await auto_update_service_1.autoUpdateService.downloadUpdate();
        messaging_service_1.messagingService.sendToOriginator('download-app-update', { success: true }, sender);
    }
    catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error('[auto-update-handler] Error downloading update:', errorMsg);
        messaging_service_1.messagingService.sendToOriginator('download-app-update', { success: false, error: errorMsg }, sender);
    }
});
