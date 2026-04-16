"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = exports.updateAuthConfig = void 0;
exports.startWebServer = startWebServer;
const auth_config_1 = require("./auth-config");
const server_setup_1 = require("./server-setup");
// =============================================================================
// SERVER STARTUP
// =============================================================================
// Initialize authentication and start server
async function startWebServer() {
    try {
        // Initialize authentication system
        await (0, auth_config_1.initializeAuth)();
        // Create and configure Express app
        const app = (0, server_setup_1.createApp)();
        const port = (0, server_setup_1.getServerPort)();
        // Start the server
        (0, server_setup_1.startServer)(app, port);
    }
    catch (error) {
        console.error('[Web Server] Failed to start:', error);
        process.exit(1);
    }
}
// Only start the server if this file is being run directly (not required as a module)
if (require.main === module) {
    startWebServer();
}
// =============================================================================
// EXPORTS
// =============================================================================
// Export authentication functions for external use
var auth_config_2 = require("./auth-config");
Object.defineProperty(exports, "updateAuthConfig", { enumerable: true, get: function () { return auth_config_2.updateAuthConfig; } });
Object.defineProperty(exports, "hashPassword", { enumerable: true, get: function () { return auth_config_2.hashPassword; } });
