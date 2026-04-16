"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const messaging_service_1 = require("../services/messaging.service");
const platform_service_1 = require("../services/platform.service");
/** Handles the 'get-system-info' message event from the messaging service.
 *
 * When triggered, this handler invokes the PlatformService to get system information.
 * It then sends the result back to the originator of the message, including details such as
 * the current Node.js version, Electron version, platform, and config path.
 * In case of unexpected errors during the retrieval process, it logs the error and sends a failure
 * response to the originator.
 *
 * @param payload - The payload received with the message, expected to contain `requestId`.
 * @param sender - The sender of the message, used to route the response.
 */
messaging_service_1.messagingService.on('get-system-info', (payload, sender) => {
    const { requestId } = payload || {};
    try {
        const nodeVersion = platform_service_1.platformService.getNodeVersion();
        const electronVersion = platform_service_1.platformService.getElectronVersion();
        const platform = platform_service_1.platformService.getPlatform();
        const configPath = platform_service_1.platformService.getConfigPath();
        messaging_service_1.messagingService.sendToOriginator('get-system-info', { nodeVersion, electronVersion, platform, configPath, requestId }, sender);
    }
    catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        console.error('System info handler error:', errMsg);
        messaging_service_1.messagingService.sendToOriginator('get-system-info', { error: errMsg, requestId }, sender);
    }
});
