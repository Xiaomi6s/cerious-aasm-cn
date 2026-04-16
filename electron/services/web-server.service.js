"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.webServerService = exports.WebServerService = void 0;
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const electron_1 = require("electron");
const network_utils_1 = require("../utils/network.utils");
const messaging_service_1 = require("./messaging.service");
const globalConfigUtils = __importStar(require("../utils/global-config.utils"));
class WebServerService {
    constructor() {
        this.apiProcess = null;
        this.webServerRunning = false;
        this.webServerStarting = false;
        this.webServerPort = 3000;
        this.statusPollingInterval = null;
        this.startStatusPolling();
    }
    /**
     * Get the correct path for the API server in both dev and production
     */
    getApiServerPath() {
        const isDev = process.env.NODE_ENV === 'development';
        if (isDev) {
            return path.join(__dirname, '..', 'web-server', 'server.js');
        }
        else {
            // In production, use app.getAppPath() for reliable path resolution
            return path.join(electron_1.app.getAppPath(), 'electron', 'web-server', 'server.js');
        }
    }
    /**
     * Start polling for web server status
     */
    startStatusPolling() {
        let lastWebServerStatus = false;
        this.statusPollingInterval = setInterval(async () => {
            const portInUse = await (0, network_utils_1.isPortInUse)(this.webServerPort);
            if (portInUse !== lastWebServerStatus) {
                lastWebServerStatus = portInUse;
                // Unify channel: always broadcast on 'web-server-status'
                messaging_service_1.messagingService.broadcastToWebClients('web-server-status', {
                    running: portInUse,
                    port: this.webServerPort
                });
            }
        }, 2000);
    }
    /**
     * Start the web server
     */
    async startWebServer(port, authOptions) {
        if (this.webServerStarting) {
            return { success: true, message: 'Web server already starting', port };
        }
        if (this.apiProcess) {
            if (this.webServerRunning && this.webServerPort === port) {
                return { success: true, message: 'Web server already running', port };
            }
            await this.stopWebServer();
        }
        this.webServerStarting = true;
        this.webServerPort = port;
        // Prepare environment variables for authentication
        const env = { ...process.env };
        if (authOptions) {
            env.AUTH_ENABLED = authOptions.enabled.toString();
            env.AUTH_USERNAME = authOptions.username;
            env.AUTH_PASSWORD = authOptions.password;
        }
        // Fork API process, which will listen and attach WebSocket server
        const apiServerPath = this.getApiServerPath();
        this.apiProcess = (0, child_process_1.fork)(apiServerPath, [`--port=${port}`], {
            env: {
                ...env,
                ELECTRON_RUN_AS_NODE: '1',
                PORT: String(port),
            },
        });
        // Set apiProcess on messagingService for web client broadcasts
        messaging_service_1.messagingService.setApiProcess(this.apiProcess);
        return new Promise((resolve) => {
            // Handle server ready/error messages
            const handleServerMessage = (message) => {
                if (message.type === 'server-ready') {
                    this.webServerRunning = true;
                    this.webServerStarting = false;
                    // Send current authentication configuration to the web server
                    // Skip this in headless mode as authentication is initialized from environment variables
                    const isHeadless = process.argv.includes('--headless');
                    if (!isHeadless) {
                        const config = globalConfigUtils.loadGlobalConfig();
                        if (config.authenticationEnabled || config.authenticationUsername || config.authenticationPassword) {
                            const authConfig = {
                                enabled: config.authenticationEnabled || false,
                                username: config.authenticationUsername || '',
                                password: config.authenticationPassword || '' // Send plain password, let server hash it
                            };
                            this.apiProcess?.send({
                                type: 'update-auth-config',
                                authConfig
                            });
                        }
                    }
                    resolve({ success: true, message: message.message, port: message.port });
                }
                else if (message.type === 'server-error') {
                    this.webServerRunning = false;
                    this.webServerStarting = false;
                    resolve({ success: false, message: message.error, port: message.port });
                }
                else if (message.type === 'messaging-event') {
                    // Forward to main process handlers, then respond to API process with cid
                    messaging_service_1.messagingService.emit(message.channel, message.payload, {
                        type: 'api-process',
                        cid: message.cid, // Pass cid for exclusion logic
                        send: (channel, data) => {
                            this.apiProcess?.send({ type: 'messaging-response', channel, data, cid: message.cid });
                        }
                    });
                }
            };
            if (this.apiProcess) {
                this.apiProcess.on('message', handleServerMessage);
                this.apiProcess.on('error', (error) => {
                    this.webServerRunning = false;
                    this.webServerStarting = false;
                    resolve({ success: false, message: `Server process error: ${error.message}`, port });
                });
                this.apiProcess.on('exit', (code) => {
                    this.webServerRunning = false;
                    this.webServerStarting = false;
                    this.apiProcess = null;
                    if (code !== 0) {
                        resolve({ success: false, message: `Server process exited with code ${code}`, port });
                    }
                });
            } // Timeout after 10 seconds
            setTimeout(() => {
                if (this.apiProcess && !this.webServerRunning) {
                    this.webServerStarting = false;
                    resolve({ success: false, message: 'Server startup timed out', port });
                }
            }, 10000);
        });
    }
    /**
     * Stop the web server
     */
    async stopWebServer() {
        if (!this.apiProcess) {
            return { success: true, message: 'Web server was not running' };
        }
        return new Promise((resolve) => {
            const cleanupAndResolve = (message) => {
                this.apiProcess = null;
                this.webServerRunning = false;
                this.webServerStarting = false;
                resolve({ success: true, message });
            };
            if (this.apiProcess) {
                this.apiProcess.on('exit', () => {
                    cleanupAndResolve('Web server stopped successfully');
                });
                this.apiProcess.kill();
            } // Timeout after 5 seconds
            setTimeout(() => {
                if (this.apiProcess) {
                    this.apiProcess.kill('SIGKILL');
                    cleanupAndResolve('Web server force stopped');
                }
            }, 5000);
        });
    }
    /**
     * Get current web server status
     */
    getStatus() {
        return {
            running: this.webServerRunning,
            port: this.webServerPort
        };
    }
    /**
     * Check if web server is currently starting
     */
    isStarting() {
        return this.webServerStarting;
    }
    /**
     * Cleanup resources
     */
    cleanup() {
        if (this.statusPollingInterval) {
            clearInterval(this.statusPollingInterval);
            this.statusPollingInterval = null;
        }
        if (this.apiProcess) {
            this.apiProcess.kill();
            this.apiProcess = null;
        }
        this.webServerRunning = false;
        this.webServerStarting = false;
    }
}
exports.WebServerService = WebServerService;
// Export singleton instance
exports.webServerService = new WebServerService();
