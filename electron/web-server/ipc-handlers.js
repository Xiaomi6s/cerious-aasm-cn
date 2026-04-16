"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupIPCHandlers = setupIPCHandlers;
const messaging_service_1 = require("../services/messaging.service");
const auth_config_1 = require("./auth-config");
/**
 * Setup IPC message handlers for the web server
 */
function setupIPCHandlers() {
    // Listen for messaging responses from main process
    process.on('message', async (message) => {
        if (message.type === 'messaging-response') {
            // Forward to WebSocket clients
            messaging_service_1.messagingService.sendToAllWebSockets(message.channel, message.data);
        }
        else if (message.type === 'broadcast-web') {
            // Main process requests a broadcast to web clients, with sender exclusion
            messaging_service_1.messagingService.sendToAllWebSockets(message.channel, message.data, message.excludeCid);
        }
        else if (message.type === 'update-auth-config') {
            // Update authentication configuration
            try {
                const authConfigUpdate = message.authConfig;
                // Handle different password formats from web UI
                if (authConfigUpdate.enabled) {
                    if (authConfigUpdate.password && typeof authConfigUpdate.password === 'string') {
                        // Plain text password provided - hash it
                        authConfigUpdate.passwordHash = await (0, auth_config_1.hashPassword)(authConfigUpdate.password);
                        delete authConfigUpdate.password;
                    }
                    else if (authConfigUpdate.passwordHash && typeof authConfigUpdate.passwordHash === 'string') {
                        // Already hashed password provided - use as is
                    }
                    else {
                        // Invalid password format
                        console.error('[Auth] No valid password or passwordHash provided');
                        return;
                    }
                }
                (0, auth_config_1.updateAuthConfig)(authConfigUpdate);
            }
            catch (error) {
                console.error('[Auth] Failed to update auth config:', error);
            }
        }
    });
}
