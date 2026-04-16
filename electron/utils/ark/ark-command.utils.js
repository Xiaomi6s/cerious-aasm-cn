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
exports.ArkCommandUtils = void 0;
// --- Imports ---
const path = __importStar(require("path"));
const platform_utils_1 = require("../platform.utils");
const proton_utils_1 = require("../proton.utils");
const ark_path_utils_1 = require("./ark-path.utils");
// --- Command Preparation Helpers ---
class ArkCommandUtils {
    /**
     * Prepare ARK server command for cross-platform execution
     * On Windows: Direct execution
     * On Linux: Execute via Proton
     */
    static prepareArkServerCommand(arkExecutable, arkArgs, env) {
        const workingDir = path.dirname(arkExecutable); // Set working directory to executable location
        if ((0, platform_utils_1.getPlatform)() === 'windows') {
            // Add Steam environment variables for Windows
            const steamEnv = {
                SteamAppId: ark_path_utils_1.ARK_APP_ID,
                ...env
            };
            return { command: arkExecutable, args: arkArgs, env: steamEnv, cwd: workingDir };
        }
        else {
            // Linux: Use Proton to run the Windows executable
            if (!(0, proton_utils_1.isProtonInstalled)()) {
                throw new Error('Proton is required to run ARK server on Linux but is not installed');
            }
            // Ensure proton prefix exists so Proton's filelock can create pfx.lock
            (0, proton_utils_1.ensureProtonPrefixExists)();
            const protonBinary = (0, proton_utils_1.getProtonBinaryPath)();
            const prefixDir = path.join((0, platform_utils_1.getDefaultInstallDir)(), 'proton-prefix');
            const protonEnv = {
                WINEPREFIX: prefixDir,
                STEAM_COMPAT_DATA_PATH: prefixDir,
                STEAM_COMPAT_CLIENT_INSTALL_PATH: path.join((0, platform_utils_1.getDefaultInstallDir)(), '.steam'),
                WINEDLLOVERRIDES: 'mshtml=d',
                SteamAppId: ark_path_utils_1.ARK_APP_ID,
                ...env
            };
            return {
                command: 'xvfb-run',
                args: ['-a', '--server-args=-screen 0 1024x768x24', protonBinary, 'run', arkExecutable, ...arkArgs],
                env: protonEnv,
                cwd: workingDir
            };
        }
    }
}
exports.ArkCommandUtils = ArkCommandUtils;
