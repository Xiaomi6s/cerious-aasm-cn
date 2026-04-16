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
exports.settingsService = exports.SettingsService = void 0;
const globalConfigUtils = __importStar(require("../utils/global-config.utils"));
const validation_utils_1 = require("../utils/validation.utils");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const platform_utils_1 = require("../utils/platform.utils");
const bcrypt = __importStar(require("bcryptjs"));
/**
 * Settings Service - Handles all business logic for application settings
 */
class SettingsService {
    constructor() {
        this.SALT_ROUNDS = 12;
    }
    /**
     * Hash a password using bcrypt
     */
    async hashPassword(password) {
        if (!password || typeof password !== 'string') {
            throw new Error('Password must be a non-empty string');
        }
        return await bcrypt.hash(password, this.SALT_ROUNDS);
    }
    /**
     * Get the current global configuration
     */
    getGlobalConfig() {
        try {
            return globalConfigUtils.loadGlobalConfig();
        }
        catch (error) {
            throw new Error(`Failed to load global configuration: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Update the global application configuration with validation and persistence
     * @param config - The configuration object containing updated settings
     * @returns Promise resolving to an object with success status, error message, and updated config
     */
    async updateGlobalConfig(config) {
        try {
            // Validate config object
            if (!config || typeof config !== 'object') {
                return { success: false, error: 'Invalid config object' };
            }
            // Validate individual config fields
            if (config.webServerPort !== undefined) {
                if (!(0, validation_utils_1.validatePort)(config.webServerPort)) {
                    return { success: false, error: 'Invalid web server port' };
                }
            }
            // Validate server data directory (if provided and different from default)
            if (config.serverDataDir && typeof config.serverDataDir === 'string') {
                const resolvedPath = path.resolve(config.serverDataDir);
                try {
                    if (!fs.existsSync(resolvedPath)) {
                        // Attempt to create it if it doesn't exist
                        fs.mkdirSync(resolvedPath, { recursive: true });
                    }
                    // Check writable
                    fs.accessSync(resolvedPath, fs.constants.W_OK);
                    config.serverDataDir = resolvedPath;
                }
                catch (e) {
                    return { success: false, error: `Invalid Server Data Directory: ${e instanceof Error ? e.message : 'Path not writable'}` };
                }
            }
            // Validate SteamCMD directory
            if (config.steamCmdDir && typeof config.steamCmdDir === 'string') {
                const resolvedPath = path.resolve(config.steamCmdDir);
                try {
                    if (!fs.existsSync(resolvedPath)) {
                        fs.mkdirSync(resolvedPath, { recursive: true });
                    }
                    fs.accessSync(resolvedPath, fs.constants.W_OK);
                    config.steamCmdDir = resolvedPath;
                }
                catch (e) {
                    return { success: false, error: `Invalid SteamCMD Directory: ${e instanceof Error ? e.message : 'Path not writable'}` };
                }
            }
            // Sanitize string fields
            if (config.authenticationUsername !== undefined && typeof config.authenticationUsername === 'string') {
                config.authenticationUsername = (0, validation_utils_1.sanitizeString)(config.authenticationUsername);
            }
            if (config.authenticationPassword !== undefined && typeof config.authenticationPassword === 'string') {
                config.authenticationPassword = (0, validation_utils_1.sanitizeString)(config.authenticationPassword);
            }
            // Save the configuration
            const success = globalConfigUtils.saveGlobalConfig(config);
            if (!success) {
                return { success: false, error: 'Failed to save configuration' };
            }
            // Get the updated configuration
            const updatedConfig = globalConfigUtils.loadGlobalConfig();
            return { success: true, updatedConfig };
        }
        catch (error) {
            return { success: false, error: error instanceof Error ? error.message : String(error) };
        }
    }
    /**
     * Get authentication configuration for web server
     */
    getWebServerAuthConfig(config) {
        return {
            enabled: config.authenticationEnabled || false,
            username: config.authenticationUsername || '',
            password: config.authenticationPassword || '' // Send plain password, let server hash it
        };
    }
    /**
     * Update the web server authentication configuration and notify the running API process
     * @param config - The configuration object containing authentication settings
     * @param apiProcess - Optional reference to the API server child process to notify of changes
     * @returns Promise that resolves when the update is complete
     */
    async updateWebServerAuth(config, apiProcess) {
        const authConfig = this.getWebServerAuthConfig(config);
        // Save auth config to web server's config file for persistence
        try {
            const authConfigFile = path.join((0, platform_utils_1.getDefaultInstallDir)(), 'data', 'auth-config.json');
            fs.mkdirSync(path.dirname(authConfigFile), { recursive: true });
            // Create the config object for the web server
            const webServerAuthConfig = {
                enabled: authConfig.enabled,
                username: authConfig.username,
                passwordHash: authConfig.password ? await this.hashPassword(authConfig.password) : ''
            };
            fs.writeFileSync(authConfigFile, JSON.stringify(webServerAuthConfig, null, 2), 'utf-8');
        }
        catch (error) {
            console.error('[Settings] Failed to save web server auth config:', error);
        }
        // Send auth config to web server process if it's running
        if (apiProcess && !apiProcess.killed) {
            apiProcess.send({
                type: 'update-auth-config',
                authConfig
            });
        }
    }
}
exports.SettingsService = SettingsService;
// Export singleton instance
exports.settingsService = new SettingsService();
