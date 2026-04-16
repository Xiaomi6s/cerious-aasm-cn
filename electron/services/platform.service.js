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
exports.platformService = exports.PlatformService = void 0;
const os = __importStar(require("os"));
const path = __importStar(require("path"));
let app = undefined;
try {
    app = require('electron').app;
}
catch (e) {
    app = undefined;
}
class PlatformService {
    /**
     * Get the Node.js version.
     * @returns The Node.js version
     */
    getNodeVersion() {
        return process?.versions?.node || null;
    }
    /**
     * Get the Electron version.
     * @returns The Electron version
     */
    getElectronVersion() {
        return process?.versions?.electron || null;
    }
    /**
     * Get the operating system platform.
     * @returns The operating system platform (Windows, macOS, Linux, etc.)
     */
    getPlatform() {
        const platform = process.platform || 'unknown';
        if (platform === 'win32')
            return 'Windows';
        if (platform === 'darwin')
            return 'macOS';
        if (platform === 'linux')
            return 'Linux';
        return platform;
    }
    /**
     * Get the path to the configuration directory.
     * @returns The path to the configuration directory
     */
    getConfigPath() {
        try {
            if (app && typeof app.getPath === 'function') {
                const base = app.getPath('appData') || app.getPath('userData');
                return path.join(base, 'Cerious AASM');
            }
            const platform = process.platform;
            const home = os.homedir();
            if (platform === 'win32')
                return path.join(home, 'AppData', 'Roaming', 'Cerious AASM');
            if (platform === 'linux')
                return path.join(home, '.config', 'Cerious AASM');
            if (platform === 'darwin')
                return path.join(home, 'Library', 'Application Support', 'Cerious AASM');
        }
        catch (e) {
            // fallback
        }
        return 'Unknown';
    }
}
exports.PlatformService = PlatformService;
exports.platformService = new PlatformService();
