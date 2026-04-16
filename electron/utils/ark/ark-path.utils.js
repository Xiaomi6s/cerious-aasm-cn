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
exports.POLL_INTERVAL_MS = exports.ARK_APP_ID = exports.ArkPathUtils = void 0;
// --- Imports ---
const path = __importStar(require("path"));
const platform_utils_1 = require("../platform.utils");
// --- Path Utilities ---
class ArkPathUtils {
    /**
     * Gets the ARK server installation directory
     */
    static getArkServerDir() {
        try {
            const { loadGlobalConfig } = require('../global-config.utils');
            const config = loadGlobalConfig();
            if (config.serverDataDir) {
                return path.join(config.serverDataDir, 'AASMServer');
            }
        }
        catch (e) { }
        return path.join((0, platform_utils_1.getDefaultInstallDir)(), 'AASMServer');
    }
    /**
     * Gets the ARK server executable path for the current platform.
     * On Windows: ArkAscendedServer.exe
     * On Linux: Uses Proton to run the Windows executable
     */
    static getArkExecutablePath() {
        const arkServerDir = ArkPathUtils.getArkServerDir();
        const windowsExePath = path.join(arkServerDir, 'ShooterGame', 'Binaries', 'Win64', 'ArkAscendedServer.exe');
        if ((0, platform_utils_1.getPlatform)() === 'windows') {
            return windowsExePath;
        }
        else {
            // On Linux, we still point to the Windows executable but run it via Proton
            return windowsExePath;
        }
    }
    /**
     * Gets the ARK server config directory.
     * Windows: WindowsServer
     * Linux: LinuxServer (but we use WindowsServer when running via Proton)
     */
    static getArkConfigDir() {
        const arkServerDir = ArkPathUtils.getArkServerDir();
        return path.join(arkServerDir, 'ShooterGame', 'Saved', 'Config', 'WindowsServer');
    }
    /**
     * Gets the ARK server saved data directory
     */
    static getArkSavedDir() {
        const arkServerDir = ArkPathUtils.getArkServerDir();
        return path.join(arkServerDir, 'ShooterGame', 'Saved');
    }
    /**
     * Gets the ARK server logs directory
     */
    static getArkLogsDir() {
        const arkServerDir = ArkPathUtils.getArkServerDir();
        return path.join(arkServerDir, 'ShooterGame', 'Saved', 'Logs');
    }
}
exports.ArkPathUtils = ArkPathUtils;
// --- Constants ---
exports.ARK_APP_ID = '2430930';
exports.POLL_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
