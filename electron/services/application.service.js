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
exports.applicationService = exports.ApplicationService = void 0;
const web_server_service_1 = require("./web-server.service");
const globalConfigUtils = __importStar(require("../utils/global-config.utils"));
class ApplicationService {
    constructor() {
        this.commandLineArgs = this.parseCommandLineArgs();
    }
    /**
     * Parse command line arguments
     */
    parseCommandLineArgs() {
        // Check for help flag first
        if (process.argv.includes('--help') || process.argv.includes('-h')) {
            console.log('\nCerious ARK Server Manager - Headless Mode Options:\n');
            console.log('  --headless                    Run in headless mode (no GUI)');
            console.log('  --port=<port>                Set web server port (default: 3000)');
            console.log('  --auth-enabled                Enable authentication for web interface');
            console.log('  --username=<username>         Set authentication username (default: admin)');
            console.log('  --password=<password>         Set authentication password (required with --auth-enabled)');
            console.log('\nExamples:');
            console.log('  electron main.js --headless --port=8080');
            console.log('  electron main.js --headless --auth-enabled --username=user --password=secret');
            console.log('  electron main.js --headless --port=3000 --auth-enabled --password=mypassword\n');
            process.exit(0);
        }
        const isHeadless = process.argv.includes('--headless');
        const authEnabled = process.argv.includes('--auth-enabled');
        const usernameArg = process.argv.find(a => a.startsWith('--username='));
        const passwordArg = process.argv.find(a => a.startsWith('--password='));
        const portArg = process.argv.find(a => a.startsWith('--port='));
        // Extract values from arguments
        const username = usernameArg ? usernameArg.split('=')[1] : 'admin';
        const password = passwordArg ? passwordArg.split('=')[1] : '';
        const config = globalConfigUtils.loadGlobalConfig();
        const port = portArg ? parseInt(portArg.split('=')[1], 10) : (config.webServerPort || 3000);
        return {
            isHeadless,
            authEnabled,
            username,
            password,
            port
        };
    }
    /**
     * Get parsed command line arguments
     */
    getCommandLineArgs() {
        return this.commandLineArgs;
    }
    /**
     * Initialize the application based on command line arguments
     */
    async initializeApplication() {
        const { isHeadless, authEnabled, username, password, port } = this.commandLineArgs;
        if (isHeadless) {
            // In headless mode, determine authentication settings
            let authOptions;
            if (authEnabled) {
                if (!password) {
                    console.error('[ApplicationService] Error: --auth-enabled requires --password to be set');
                    process.exit(1);
                }
                authOptions = {
                    enabled: true,
                    username,
                    password
                };
            }
            else {
                authOptions = {
                    enabled: false,
                    username: '',
                    password: ''
                };
            }
            await web_server_service_1.webServerService.startWebServer(port, authOptions);
        }
        else {
            // In GUI mode, start web server if configured
            const config = globalConfigUtils.loadGlobalConfig();
            if (config.startWebServerOnLoad) {
                await web_server_service_1.webServerService.startWebServer(port);
            }
        }
    }
    /**
     * Check if application is running in headless mode
     */
    isHeadless() {
        return this.commandLineArgs.isHeadless;
    }
}
exports.ApplicationService = ApplicationService;
// Export singleton instance
exports.applicationService = new ApplicationService();
