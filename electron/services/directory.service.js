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
exports.directoryService = exports.DirectoryService = void 0;
const electron_1 = require("electron");
const platform_utils_1 = require("../utils/platform.utils");
const instance_utils_1 = require("../utils/ark/instance.utils");
const validation_utils_1 = require("../utils/validation.utils");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
/**
 * Directory Service - Handles all business logic for directory operations
 */
class DirectoryService {
    /**
     * Open the main configuration directory in the system file explorer
     * @returns Promise resolving to an object indicating success or failure of opening the config directory
     */
    async openConfigDirectory() {
        try {
            const configDir = (0, platform_utils_1.getDefaultInstallDir)();
            await electron_1.shell.openPath(configDir);
            return { success: true, configDir };
        }
        catch (error) {
            return {
                success: false,
                configDir: '',
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
    /**
     * Open a server instance directory with security validation
     * @param instanceId - The unique identifier of the server instance
     * @returns Promise resolving to an object indicating success or failure of opening the instance directory
     */
    async openInstanceDirectory(instanceId) {
        try {
            // Validate the instance ID
            if (!(0, validation_utils_1.validateInstanceId)(instanceId)) {
                return { success: false, error: 'Invalid instance ID' };
            }
            // Verify instance exists in our database
            const instance = await (0, instance_utils_1.getInstance)(instanceId);
            if (!instance) {
                return { success: false, error: 'Instance not found' };
            }
            // Get the server directory path
            const serverDir = this.getInstanceDirectoryPath(instanceId);
            // Perform security validation
            const securityCheck = this.validateDirectoryPath(serverDir);
            if (!securityCheck.isValid) {
                return { success: false, error: securityCheck.error };
            }
            // Open the directory
            await electron_1.shell.openPath(serverDir);
            return { success: true, instanceId };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
    /**
     * Get the base directory for server instances
     * @returns The base directory where all server instances are stored
     */
    getServerInstancesBaseDirectory() {
        const { loadGlobalConfig } = require('../utils/global-config.utils');
        const config = loadGlobalConfig();
        const baseDir = config.serverDataDir ? config.serverDataDir : (0, platform_utils_1.getDefaultInstallDir)();
        return path.join(baseDir, 'AASMServer', 'ShooterGame', 'Saved', 'Servers');
    }
    /**
     * Get the default configuration directory path
     * @returns The default configuration directory path
     */
    getConfigDirectory() {
        return (0, platform_utils_1.getDefaultInstallDir)();
    }
    /**
     * Get the directory path for a server instance
     * @param instanceId - The unique identifier of the server instance
     * @returns The directory path for the server instance
     */
    getInstanceDirectoryPath(instanceId) {
        const { loadGlobalConfig } = require('../utils/global-config.utils');
        const config = loadGlobalConfig();
        const baseDir = config.serverDataDir ? config.serverDataDir : (0, platform_utils_1.getDefaultInstallDir)();
        return path.join(baseDir, 'AASMServer', 'ShooterGame', 'Saved', 'Servers', instanceId);
    }
    /**
     * Test if a directory is accessible for cluster operations
     * @param directoryPath - The directory path to test (can be absolute or relative to ARK install dir)
     * @returns Promise resolving to an object indicating if the directory is accessible
     */
    async testDirectoryAccess(directoryPath) {
        try {
            // Resolve relative paths relative to the ARK installation directory
            let resolvedPath = directoryPath;
            if (!path.isAbsolute(directoryPath)) {
                resolvedPath = path.resolve((0, platform_utils_1.getDefaultInstallDir)(), directoryPath);
            }
            // Check if the path exists
            const stats = await fs.promises.stat(resolvedPath);
            // Check if it's actually a directory
            if (!stats.isDirectory()) {
                return { accessible: false, error: 'Path is not a directory' };
            }
            // Try to read the directory contents to verify access
            await fs.promises.readdir(resolvedPath);
            // Try to write a test file to verify write access
            const testFile = path.join(resolvedPath, '.cluster-test.tmp');
            await fs.promises.writeFile(testFile, 'test', 'utf8');
            await fs.promises.unlink(testFile);
            return { accessible: true };
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            return { accessible: false, error: errorMsg };
        }
    }
    /**
     * Validate directory path to prevent path traversal attacks
     * @param targetPath - The target directory path to validate
     * @returns An object indicating whether the path is valid and an error message if not
     */
    validateDirectoryPath(targetPath) {
        try {
            const baseDir = path.join((0, platform_utils_1.getDefaultInstallDir)(), 'AASMServer', 'ShooterGame', 'Saved', 'Servers');
            const resolvedPath = path.resolve(targetPath);
            const basePath = path.resolve(baseDir);
            if (!resolvedPath.startsWith(basePath)) {
                console.error('[DirectoryService] Path traversal attempt detected:', resolvedPath);
                return { isValid: false, error: 'Access denied' };
            }
            return { isValid: true };
        }
        catch (error) {
            return {
                isValid: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
}
exports.DirectoryService = DirectoryService;
// Export singleton instance
exports.directoryService = new DirectoryService();
