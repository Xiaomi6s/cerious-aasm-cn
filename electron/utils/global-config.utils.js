"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadGlobalConfig = loadGlobalConfig;
exports.saveGlobalConfig = saveGlobalConfig;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const platform_utils_1 = require("./platform.utils");
const DEFAULT_CONFIG = {
    startWebServerOnLoad: false,
    webServerPort: 3000,
    authenticationEnabled: false,
    authenticationUsername: '',
    authenticationPassword: '',
    maxBackupDownloadSizeMB: 100,
    serverDataDir: '', // Empty string means use default
    steamCmdDir: '', // Empty string means use default
    autoUpdateArkServer: false,
    updateWarningMinutes: 15,
    curseForgeApiKey: '',
};
function getConfigFilePath() {
    return path_1.default.join((0, platform_utils_1.getDefaultInstallDir)(), 'global-config.json');
}
function loadGlobalConfig() {
    try {
        const configFile = getConfigFilePath();
        if (fs_1.default.existsSync(configFile)) {
            const raw = fs_1.default.readFileSync(configFile, 'utf-8');
            return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
        }
        else {
            // Create config file with default values if it doesn't exist
            fs_1.default.mkdirSync(path_1.default.dirname(configFile), { recursive: true });
            fs_1.default.writeFileSync(configFile, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf-8');
            return { ...DEFAULT_CONFIG };
        }
    }
    catch (e) {
        // ignore
    }
    return { ...DEFAULT_CONFIG };
}
function saveGlobalConfig(config) {
    try {
        const configFile = getConfigFilePath();
        fs_1.default.mkdirSync(path_1.default.dirname(configFile), { recursive: true });
        fs_1.default.writeFileSync(configFile, JSON.stringify(config, null, 2), 'utf-8');
        return true;
    }
    catch (e) {
        return false;
    }
}
