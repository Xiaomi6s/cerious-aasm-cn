"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const messaging_service_1 = require("../services/messaging.service");
const firewall_service_1 = require("../services/firewall.service");
const platform_utils_1 = require("../utils/platform.utils");
/**
 * Handles the 'setup-ark-server-firewall' message event from the messaging service.
 *
 * When triggered, this handler invokes the FirewallService to get the ARK server firewall instructions.
 * It then sends the result back to the originator of the message, including details such as
 * success status and any error information.
 * In case of unexpected errors during the firewall instructions retrieval, it logs the error and sends a failure
 * response to the originator.
 *
 * @param payload - The payload received with the message, expected to contain `gamePort`, `queryPort`, `rconPort`, and `requestId`.
 * @param sender - The sender of the message, used to route the response.
 */
messaging_service_1.messagingService.on('setup-ark-server-firewall', async (payload, sender) => {
    const { gamePort, queryPort, rconPort, requestId } = payload || {};
    try {
        const result = await firewall_service_1.firewallService.getArkServerFirewallInstructions(gamePort, queryPort, rconPort);
        // Return in the format expected by frontend
        messaging_service_1.messagingService.sendToOriginator('setup-ark-server-firewall', {
            success: result.success,
            platform: result.platform,
            instructions: result.instructions,
            message: result.success
                ? 'Linux firewall configuration instructions provided'
                : 'Failed to generate firewall instructions',
            error: result.error,
            requestId
        }, sender);
    }
    catch (error) {
        console.error('[firewall-handler] Failed to handle setup-ark-server-firewall:', error);
        messaging_service_1.messagingService.sendToOriginator('setup-ark-server-firewall', {
            success: false,
            platform: (0, platform_utils_1.getPlatform)(),
            message: 'Failed to generate ARK server firewall instructions',
            error: error?.message || 'Failed to generate ARK server firewall instructions',
            requestId
        }, sender);
    }
});
/**
 * Handles the 'setup-web-server-firewall' message event from the messaging service.
 *
 * When triggered, this handler invokes the FirewallService to get the web server firewall instructions.
 * It then sends the result back to the originator of the message, including details such as
 * success status and any error information.
 * In case of unexpected errors during the firewall instructions retrieval, it logs the error and sends a failure
 * response to the originator.
 *
 * @param payload - The payload received with the message, expected to contain `port` and `requestId`.
 * @param sender - The sender of the message, used to route the response.
 */
messaging_service_1.messagingService.on('setup-web-server-firewall', async (payload, sender) => {
    const { port, requestId } = payload || {};
    try {
        const result = await firewall_service_1.firewallService.getWebServerFirewallInstructions(port);
        messaging_service_1.messagingService.sendToOriginator('setup-web-server-firewall', {
            success: result.success,
            platform: result.platform,
            instructions: result.instructions,
            message: result.success
                ? `Linux firewall configuration instructions for port ${port} provided`
                : 'Failed to generate web server firewall instructions',
            error: result.error,
            requestId
        }, sender);
    }
    catch (error) {
        console.error('[firewall-handler] Failed to handle setup-web-server-firewall:', error);
        messaging_service_1.messagingService.sendToOriginator('setup-web-server-firewall', {
            success: false,
            platform: (0, platform_utils_1.getPlatform)(),
            message: 'Failed to generate web server firewall instructions',
            error: error?.message || 'Failed to generate web server firewall instructions',
            requestId
        }, sender);
    }
});
/**
 * Handles the 'get-linux-firewall-instructions' message event from the messaging service.
 *
 * When triggered, this handler invokes the FirewallService to get the Linux firewall instructions.
 * It then sends the result back to the originator of the message, including details such as
 * success status and any error information.
 * In case of unexpected errors during the firewall instructions retrieval, it logs the error and sends a failure
 * response to the originator.
 *
 * @param payload - The payload received with the message, expected to contain `gamePort`, `queryPort`, `rconPort`, and `requestId`.
 * @param sender - The sender of the message, used to route the response.
 */
messaging_service_1.messagingService.on('get-linux-firewall-instructions', async (payload, sender) => {
    const { gamePort, queryPort, rconPort, requestId } = payload || {};
    try {
        const result = await firewall_service_1.firewallService.getArkServerFirewallInstructions(gamePort, queryPort, rconPort);
        messaging_service_1.messagingService.sendToOriginator('get-linux-firewall-instructions', {
            success: result.success,
            instructions: result.instructions,
            platform: result.platform,
            error: result.error,
            requestId
        }, sender);
    }
    catch (error) {
        console.error('[firewall-handler] Failed to handle get-linux-firewall-instructions:', error);
        messaging_service_1.messagingService.sendToOriginator('get-linux-firewall-instructions', {
            success: false,
            platform: (0, platform_utils_1.getPlatform)(),
            error: error?.message || 'Failed to get Linux firewall instructions',
            requestId
        }, sender);
    }
});
/**
 * Handles the 'check-firewall-enabled' message event from the messaging service.
 *
 * When triggered, this handler checks the current platform and returns firewall status.
 * It sends the result back to the originator of the message, including platform information.
 * In case of unexpected errors, it logs the error and sends a failure response.
 *
 * @param payload - The payload received with the message, expected to contain `requestId`.
 * @param sender - The sender of the message, used to route the response.
 */
messaging_service_1.messagingService.on('check-firewall-enabled', async (payload, sender) => {
    const { requestId } = payload || {};
    try {
        const platform = (0, platform_utils_1.getPlatform)();
        const isEnabled = platform === 'linux'; // Firewall management is only relevant on Linux
        messaging_service_1.messagingService.sendToOriginator('check-firewall-enabled', {
            success: true,
            platform,
            enabled: isEnabled,
            message: platform === 'linux'
                ? 'Firewall management available on Linux'
                : 'Firewall management not available on this platform',
            requestId
        }, sender);
    }
    catch (error) {
        console.error('[firewall-handler] Failed to handle check-firewall-enabled:', error);
        messaging_service_1.messagingService.sendToOriginator('check-firewall-enabled', {
            success: false,
            platform: (0, platform_utils_1.getPlatform)(),
            enabled: false,
            message: 'Failed to check firewall status',
            error: error?.message || 'Failed to check firewall status',
            requestId
        }, sender);
    }
});
