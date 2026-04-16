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
exports.getArkServerDir = getArkServerDir;
exports.isArkServerInstalled = isArkServerInstalled;
exports.getCurrentInstalledVersion = getCurrentInstalledVersion;
exports.installArkServer = installArkServer;
// --- Imports ---
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const steamcmd_utils_1 = require("../steamcmd.utils");
const installer_utils_1 = require("../installer.utils");
const ark_path_utils_1 = require("./ark-path.utils");
// --- Installation Utilities ---
/**
 * Get the ARK server installation directory
 */
function getArkServerDir() {
    return ark_path_utils_1.ArkPathUtils.getArkServerDir();
}
/**
 * Check if ARK server is installed
 */
function isArkServerInstalled() {
    const arkExecutable = ark_path_utils_1.ArkPathUtils.getArkExecutablePath();
    return fs.existsSync(arkExecutable);
}
/**
 * Get current installed ARK server version
 */
async function getCurrentInstalledVersion() {
    try {
        const serverPath = getArkServerDir();
        const versionFile = path.join(serverPath, 'version.txt');
        if (fs.existsSync(versionFile)) {
            const version = fs.readFileSync(versionFile, 'utf8').trim();
            if (version)
                return version;
        }
        const steamappsPath = path.join(serverPath, 'steamapps');
        if (fs.existsSync(steamappsPath)) {
            const manifestPath = path.join(steamappsPath, `appmanifest_${ark_path_utils_1.ARK_APP_ID}.acf`);
            if (fs.existsSync(manifestPath)) {
                const manifestContent = fs.readFileSync(manifestPath, 'utf8');
                const buildIdMatch = manifestContent.match(/"buildid"\s+"(\d+)"/);
                if (buildIdMatch) {
                    return buildIdMatch[1];
                }
            }
        }
        return null;
    }
    catch (error) {
        console.error('[ark.utils] Error getting current version:', error);
        return null;
    }
}
/**
 * Install ARK server using SteamCMD
 */
function installArkServer(callback, onData) {
    const steamcmdPath = (0, steamcmd_utils_1.getSteamCmdDir)();
    const steamcmdExe = process.platform === 'win32' ? 'steamcmd.exe' : 'steamcmd.sh';
    const steamcmdExecutable = path.join(steamcmdPath, steamcmdExe);
    if (!fs.existsSync(steamcmdExecutable)) {
        const error = new Error('SteamCMD not found. Please install SteamCMD first.');
        callback(error);
        return;
    }
    const installDir = getArkServerDir();
    let arkProgressState = { maxBootstrap: 0, largeDownloadStarted: false };
    const installerOptions = {
        command: steamcmdExecutable,
        args: [
            '+force_install_dir', installDir,
            '+login', 'anonymous',
            '+app_update', ark_path_utils_1.ARK_APP_ID, 'validate',
            '+quit'
        ],
        cwd: steamcmdPath,
        estimatedTotal: 100,
        phaseSplit: 80,
        parseProgress: (data, lastPercent) => {
            const steamcmdPatterns = [
                /Update state.*?progress: (\d+\.\d+)/i,
                /\[\s*(\d+)%\]\s+Downloading update/i,
                /\[\s*(\d+)%\]\s+Download complete/i,
                /progress: (\d+\.\d+)/i,
                /(\d+)% complete/i,
                /downloading.*?(\d+)%/i,
            ];
            for (const pattern of steamcmdPatterns) {
                const match = pattern.exec(data);
                if (match) {
                    let percent = parseFloat(match[1]);
                    if (percent > 100)
                        percent = 100;
                    if (data.includes('Update state (0x61) downloading')) {
                        if (!arkProgressState.largeDownloadStarted) {
                            arkProgressState.largeDownloadStarted = true;
                            if (onData) {
                                onData({
                                    percent: 0,
                                    step: 'downloading',
                                    message: 'Starting Ark Server download...'
                                });
                            }
                        }
                        if (percent >= lastPercent) {
                            if (onData) {
                                onData({
                                    percent: Math.floor(percent),
                                    step: 'downloading',
                                    message: `Downloading Ark Server (${percent.toFixed(1)}%)`
                                });
                            }
                            return Math.floor(percent);
                        }
                        else {
                            return null;
                        }
                    }
                    else if (data.includes('Update state (0x81) verifying')) {
                        if (onData) {
                            onData({
                                percent: 100,
                                step: 'downloading',
                                message: `Verifying Ark Server installation...`
                            });
                        }
                        return 100;
                    }
                    else {
                        return null;
                    }
                }
            }
            return null;
        },
        validatePhase: () => ({
            command: steamcmdExecutable,
            args: [
                '+force_install_dir', `"${installDir}"`,
                '+login', 'anonymous',
                '+app_update', ark_path_utils_1.ARK_APP_ID, 'validate',
                '+quit'
            ],
            cwd: steamcmdPath,
        })
    };
    const MAX_RETRIES = 2;
    let attempts = 0;
    function attemptInstall() {
        attempts++;
        // Reset progress state for retries so progress reporting works correctly
        if (attempts > 1) {
            arkProgressState = { maxBootstrap: 0, largeDownloadStarted: false };
            console.log(`[ark-install] Retrying SteamCMD install (attempt ${attempts}/${MAX_RETRIES + 1})...`);
            if (onData) {
                onData({
                    percent: 0,
                    step: 'download',
                    message: `Retrying ARK server install (attempt ${attempts})...`
                });
            }
        }
        (0, installer_utils_1.runInstaller)(installerOptions, (progress) => {
            if (onData) {
                onData(progress);
            }
        }, (err, output) => {
            if (err && attempts <= MAX_RETRIES) {
                // SteamCMD may exit non-zero during self-update; retry automatically
                console.warn(`[ark-install] Attempt ${attempts} failed: ${err.message}`);
                attemptInstall();
            }
            else {
                callback(err ?? null, output);
            }
        });
    }
    attemptInstall();
}
