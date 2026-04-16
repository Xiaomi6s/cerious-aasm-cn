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
exports.getProtonDir = getProtonDir;
exports.isProtonInstalled = isProtonInstalled;
exports.getProtonBinaryPath = getProtonBinaryPath;
exports.installProton = installProton;
exports.ensureProtonPrefixExists = ensureProtonPrefixExists;
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const platform_utils_1 = require("./platform.utils");
const installer_utils_1 = require("./installer.utils");
const fs = __importStar(require("fs"));
function getProtonDir() {
    return path.join((0, platform_utils_1.getDefaultInstallDir)(), 'proton');
}
function isProtonInstalled() {
    const dir = getProtonDir();
    // Check for Proton binary in the expected directory structure
    const protonBinary = path.join(dir, 'proton');
    const protonDistDir = path.join(dir, 'dist', 'bin', 'proton');
    const binaryExists = fs.existsSync(protonBinary) || fs.existsSync(protonDistDir);
    if (!binaryExists) {
        return false;
    }
    // Also check that required directories exist
    const baseInstallDir = (0, platform_utils_1.getDefaultInstallDir)();
    const requiredDirs = [
        path.join(baseInstallDir, '.wine-ark'),
        path.join(baseInstallDir, '.steam-compat'),
        path.join(baseInstallDir, '.steam'),
        path.join(os.homedir(), '.config', 'protonfixes')
    ];
    return requiredDirs.every(dirPath => fs.existsSync(dirPath));
}
function getProtonBinaryPath() {
    const dir = getProtonDir();
    const protonBinary = path.join(dir, 'proton');
    const protonDistBinary = path.join(dir, 'dist', 'bin', 'proton');
    if (fs.existsSync(protonBinary)) {
        return protonBinary;
    }
    else if (fs.existsSync(protonDistBinary)) {
        return protonDistBinary;
    }
    throw new Error('Proton binary not found. Please install Proton first.');
}
function installProton(callback, onData) {
    const dir = getProtonDir();
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    // Use a more recent and stable Proton version
    const url = 'https://github.com/GloriousEggroll/proton-ge-custom/releases/download/GE-Proton10-15/GE-Proton10-15.tar.gz';
    const fileName = 'GE-Proton10-15.tar.gz';
    const tarPath = path.join(dir, fileName);
    (0, installer_utils_1.runInstaller)({
        command: 'bash',
        args: ['-c', `curl -L "${url}" -o "${tarPath}"`],
        cwd: dir,
        phaseSplit: 50,
        parseProgress: (_data, lastPercent) => {
            // Just increment for each chunk
            return lastPercent < 50 ? lastPercent + 5 : null;
        },
        extractPhase: () => ({
            command: 'bash',
            args: ['-c', `tar -xzf "${tarPath}" -C "${dir}" --strip-components=1`],
            cwd: dir,
        }),
    }, (progress) => onData && onData(JSON.stringify(progress)), (err, output) => {
        if (!err) {
            // Make proton binary executable
            const protonBinary = path.join(dir, 'proton');
            if (fs.existsSync(protonBinary)) {
                try {
                    fs.chmodSync(protonBinary, '755');
                }
                catch (e) {
                    console.warn('Could not make proton binary executable:', e);
                }
            }
            // Create all necessary directories for Proton to work properly
            const baseInstallDir = (0, platform_utils_1.getDefaultInstallDir)();
            const requiredDirs = [
                path.join(baseInstallDir, '.wine-ark'), // Wine prefix for ARK
                path.join(baseInstallDir, '.steam-compat'), // Steam compatibility data
                path.join(baseInstallDir, '.steam'), // Steam client install path
                path.join(os.homedir(), '.config', 'protonfixes') // ProtonFixes config
            ];
            for (const dirPath of requiredDirs) {
                try {
                    if (!fs.existsSync(dirPath)) {
                        fs.mkdirSync(dirPath, { recursive: true });
                    }
                }
                catch (e) {
                    console.warn(`[proton-utils] Could not create directory ${dirPath}:`, e);
                }
            }
        }
        callback(err, output);
    });
}
/**
 * Ensure the proton prefix directory exists and is writable.
 * Proton expects to be able to create a lock file inside this prefix (pfx.lock).
 */
function ensureProtonPrefixExists() {
    const baseInstallDir = (0, platform_utils_1.getDefaultInstallDir)();
    const prefixDir = path.join(baseInstallDir, 'proton-prefix');
    try {
        if (!fs.existsSync(prefixDir)) {
            fs.mkdirSync(prefixDir, { recursive: true });
        }
        // Also ensure the standard Proton/Steam compatibility directories exist
        const requiredDirs = [
            path.join(baseInstallDir, '.wine-ark'),
            path.join(baseInstallDir, '.steam-compat'),
            path.join(baseInstallDir, '.steam'),
            path.join(process.env.HOME || os.homedir(), '.config', 'protonfixes')
        ];
        for (const dirPath of requiredDirs) {
            try {
                if (!fs.existsSync(dirPath)) {
                    fs.mkdirSync(dirPath, { recursive: true });
                }
            }
            catch (e) {
                console.warn(`[proton-utils] Could not ensure directory ${dirPath}:`, e);
            }
        }
        // Ensure permissions allow the current user to create files in the prefix
        try {
            fs.accessSync(prefixDir, fs.constants.W_OK | fs.constants.R_OK);
        }
        catch (e) {
            console.warn(`[proton-utils] Proton prefix directory not writable, attempting chmod: ${prefixDir}`);
            try {
                fs.chmodSync(prefixDir, 0o700);
            }
            catch (err) {
                console.warn('[proton-utils] Could not set permissions on proton prefix directory:', err);
            }
        }
    }
    catch (e) {
        console.warn('[proton-utils] Failed to ensure proton prefix exists:', e);
    }
}
