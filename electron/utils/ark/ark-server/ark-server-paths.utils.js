"use strict";
// ark-server-paths.utils.ts
// Utility functions for ARK server paths and cross-platform handling
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
exports.getArkExecutablePath = getArkExecutablePath;
exports.getArkConfigDir = getArkConfigDir;
exports.prepareArkServerCommand = prepareArkServerCommand;
const path = __importStar(require("path"));
const platform_utils_1 = require("../../platform.utils");
const ark_server_install_utils_1 = require("./ark-server-install.utils");
const proton_utils_1 = require("../../proton.utils");
const platform_utils_2 = require("../../platform.utils");
/**
 * Gets the ARK server executable path for the current platform.
 * On Windows: ArkAscendedServer.exe
 * On Linux: Uses Proton to run the Windows executable
 */
function getArkExecutablePath() {
    const arkServerDir = (0, ark_server_install_utils_1.getArkServerDir)();
    const windowsExePath = path.join(arkServerDir, 'ShooterGame', 'Binaries', 'Win64', 'ArkAscendedServer.exe');
    if ((0, platform_utils_1.getPlatform)() === 'windows') {
        return windowsExePath;
    }
    else {
        // Linux: Return the Windows executable path - we'll wrap it with Proton
        return windowsExePath;
    }
}
/**
 * Gets the config directory path for the current platform.
 * Windows: WindowsServer
 * Linux: LinuxServer (but we use WindowsServer when running via Proton)
 */
function getArkConfigDir() {
    const arkServerDir = (0, ark_server_install_utils_1.getArkServerDir)();
    // Always use WindowsServer since we're running Windows binaries via Proton on Linux
    return path.join(arkServerDir, 'ShooterGame', 'Saved', 'Config', 'WindowsServer');
}
/**
 * Prepares spawn command and args for running ARK server with Proton on Linux if needed.
 */
function prepareArkServerCommand(arkExecutable, arkArgs) {
    const platform = (0, platform_utils_1.getPlatform)();
    if (platform === 'windows') {
        return { command: arkExecutable, args: arkArgs };
    }
    // --- Linux (Proton) ---
    if (!(0, proton_utils_1.isProtonInstalled)())
        throw new Error('Proton is required but not installed. Please install Proton first.');
    (0, proton_utils_1.ensureProtonPrefixExists)();
    const protonBinary = (0, proton_utils_1.getProtonBinaryPath)();
    // Set up Proton environment with Wine/Proton compatibility fixes
    const { ARK_APP_ID } = require('./ark-server-install.utils');
    const protonEnv = {
        WINEPREFIX: path.join((0, platform_utils_2.getDefaultInstallDir)(), '.wine-ark'),
        STEAM_COMPAT_DATA_PATH: path.join((0, platform_utils_2.getDefaultInstallDir)(), '.steam-compat'),
        STEAM_COMPAT_CLIENT_INSTALL_PATH: path.join((0, platform_utils_2.getDefaultInstallDir)(), '.steam'),
        SteamAppId: ARK_APP_ID,
        // Wine DLL overrides for compatibility:
        // - mshtml=d: Disable IE/HTML rendering components (not needed for dedicated server)
        // - winhttp/bcrypt/crypt32=n,b: Use native Wine implementations for networking/crypto
        //   (fixes hang during Sentry SDK initialization in ARK Server v83.21+)
        WINEDLLOVERRIDES: 'mshtml=d;winhttp=n,b;bcrypt=n,b;crypt32=n,b'
    };
    return {
        command: 'xvfb-run',
        args: ['-a', '--server-args=-screen 0 1024x768x24', protonBinary, 'run', arkExecutable, ...arkArgs],
        env: protonEnv
    };
}
