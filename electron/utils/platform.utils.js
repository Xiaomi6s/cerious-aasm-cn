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
exports.getPlatform = getPlatform;
exports.isWindows = isWindows;
exports.isLinux = isLinux;
exports.getDefaultInstallDir = getDefaultInstallDir;
exports.getUserDataPath = getUserDataPath;
exports.getHomeDir = getHomeDir;
exports.getTempDir = getTempDir;
exports.getArchitecture = getArchitecture;
exports.getTotalMemory = getTotalMemory;
exports.getFreeMemory = getFreeMemory;
exports.getProcessMemoryUsage = getProcessMemoryUsage;
exports.getCpuInfo = getCpuInfo;
exports.getUptime = getUptime;
exports.getNetworkInterfaces = getNetworkInterfaces;
exports.getEnvironmentPaths = getEnvironmentPaths;
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
/**
 * Platform Detection and Path Utilities
 * Consolidated from os-utils.ts and lean-os-utils.ts
 */
/**
 * Get the current platform
 * @returns 'windows' | 'linux'
 */
function getPlatform() {
    const platform = process.platform;
    if (platform === 'win32')
        return 'windows';
    if (platform === 'linux')
        return 'linux';
    // Only Windows and Linux are supported
    throw new Error(`Only Windows and Linux are supported. Current platform: ${platform}`);
}
/**
 * Check if running on Windows
 */
function isWindows() {
    return getPlatform() === 'windows';
}
/**
 * Check if running on Linux
 */
function isLinux() {
    return getPlatform() === 'linux';
}
/**
 * Get the default installation directory based on platform
 */
function getDefaultInstallDir() {
    const platform = getPlatform();
    if (platform === 'windows') {
        return path.join(process.env.APPDATA || os.homedir(), 'Cerious AASM');
    }
    else if (platform === 'linux') {
        return path.join(os.homedir(), '.local', 'share', 'cerious-aasm');
    }
    throw new Error(`Unsupported platform: ${platform}`);
}
/**
 * Get the user data path for Electron app
 */
function getUserDataPath(app) {
    const platform = getPlatform();
    if (platform === 'windows') {
        return path.join(app.getPath('appData'), 'Cerious AASM');
    }
    else if (platform === 'linux') {
        return path.join(os.homedir(), '.local', 'share', 'cerious-aasm');
    }
    throw new Error(`Unsupported platform: ${platform}`);
}
/**
 * Get the home directory path
 */
function getHomeDir() {
    return os.homedir();
}
/**
 * Get the temporary directory path
 */
function getTempDir() {
    return os.tmpdir();
}
/**
 * Get system architecture
 */
function getArchitecture() {
    return os.arch();
}
/**
 * Get total system memory in bytes
 */
function getTotalMemory() {
    return os.totalmem();
}
/**
 * Get free system memory in bytes
 */
function getFreeMemory() {
    return os.freemem();
}
/**
 * Get process memory usage in MB
 * @param pid - Process ID
 * @returns Memory usage in MB, or null if unable to determine
 */
function getProcessMemoryUsage(pid) {
    try {
        const platform = getPlatform();
        if (platform === 'windows') {
            // Use tasklist command on Windows
            const output = (0, child_process_1.execSync)(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, { encoding: 'utf8' });
            // Parse CSV output: "Image Name","PID","Session Name","Session#","Mem Usage"
            // Use split by '","' to handle commas in the memory field
            const parts = output.split('","');
            if (parts.length >= 5) {
                // The memory is in the last part
                const memoryStr = parts[parts.length - 1].replace(/"/g, '').trim();
                const memUsageKB = parseFloat(memoryStr.replace(/,/g, '').replace(' K', ''));
                if (!isNaN(memUsageKB)) {
                    return Math.round(memUsageKB / 1024); // Convert KB to MB
                }
            }
        }
        else if (platform === 'linux') {
            // Memory usage calculation for Proton/Wine processes on Linux is unreliable
            // Return null to indicate memory usage cannot be accurately determined
            return null;
        }
        return null;
    }
    catch (error) {
        console.error(`[platform-utils] Failed to get memory usage for PID ${pid}:`, error);
        return null;
    }
}
/**
 * Get CPU information
 */
function getCpuInfo() {
    return os.cpus();
}
/**
 * Get system uptime in seconds
 */
function getUptime() {
    return os.uptime();
}
/**
 * Get network interfaces
 */
function getNetworkInterfaces() {
    return os.networkInterfaces();
}
/**
 * Get environment-specific paths
 */
function getEnvironmentPaths() {
    return {
        home: getHomeDir(),
        temp: getTempDir(),
        installDir: getDefaultInstallDir(),
        platform: getPlatform(),
        arch: getArchitecture()
    };
}
