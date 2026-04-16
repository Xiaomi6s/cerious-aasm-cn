"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const messaging_service_1 = require("../services/messaging.service");
const web_server_service_1 = require("../services/web-server.service");
const settings_service_1 = require("../services/settings.service");
messaging_service_1.messagingService.on('start-web-server', async (payload, sender) => {
    const port = payload?.port || 3000;
    try {
        // Load current global config to get authentication settings
        const globalConfig = settings_service_1.settingsService.getGlobalConfig();
        const authOptions = settings_service_1.settingsService.getWebServerAuthConfig(globalConfig);
        const result = await web_server_service_1.webServerService.startWebServer(port, authOptions);
        // Send direct response to the requester with requestId for proper matching
        sender?.send?.('start-web-server', {
            success: result.success,
            port: result.port,
            message: result.message,
            requestId: payload?.requestId // Include requestId for frontend matching
        });
    }
    catch (error) {
        // Send direct error response to the requester with requestId
        sender?.send?.('start-web-server', {
            success: false,
            port,
            message: `Failed to start web server: ${error}`,
            requestId: payload?.requestId // Include requestId for frontend matching
        });
    }
});
messaging_service_1.messagingService.on('stop-web-server', async (payload, sender) => {
    try {
        const result = await web_server_service_1.webServerService.stopWebServer();
        // Send direct response to the requester
        sender?.send?.('stop-web-server', {
            success: result.success,
            message: result.message,
            requestId: payload?.requestId // Include requestId for frontend matching
        });
        // Also broadcast status to all clients
        sender?.send?.('web-server-status', {
            running: false,
            port: web_server_service_1.webServerService.getStatus().port,
            message: result.message
        });
    }
    catch (error) {
        // Send direct error response to the requester
        sender?.send?.('stop-web-server', {
            success: false,
            message: `Error stopping web server: ${error}`,
            requestId: payload?.requestId // Include requestId for frontend matching
        });
        // Also broadcast status to all clients
        sender?.send?.('web-server-status', {
            running: web_server_service_1.webServerService.getStatus().running,
            port: web_server_service_1.webServerService.getStatus().port,
            message: `Error stopping web server: ${error}`
        });
    }
});
messaging_service_1.messagingService.on('web-server-status', (_payload, sender) => {
    const status = web_server_service_1.webServerService.getStatus();
    sender?.send?.('web-server-status', { running: status.running, port: status.port });
});
