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
exports.backupSettingsService = exports.BackupSettingsService = void 0;
const fs = __importStar(require("fs"));
const util_1 = require("util");
const backup_utils_1 = require("../../utils/backup.utils");
// File system operations
const readFile = (0, util_1.promisify)(fs.readFile);
const writeFile = (0, util_1.promisify)(fs.writeFile);
const mkdir = (0, util_1.promisify)(fs.mkdir);
class BackupSettingsService {
    /**
     * Get backup settings (internal implementation)
     */
    async getBackupSettingsInternal(instanceId, serverPath) {
        try {
            const settingsFile = backup_utils_1.BackupPathUtils.getSettingsFilePath(serverPath);
            if (!fs.existsSync(settingsFile)) {
                return null;
            }
            const content = await readFile(settingsFile, 'utf8');
            const settings = JSON.parse(content);
            return settings;
        }
        catch (error) {
            console.error('[backup-settings] Failed to get backup settings:', error);
            return null;
        }
    }
    /**
     * Save backup settings (internal implementation)
     */
    async saveBackupSettingsInternal(settings, serverPath) {
        try {
            const settingsFile = backup_utils_1.BackupPathUtils.getSettingsFilePath(serverPath);
            const backupDir = backup_utils_1.BackupPathUtils.getInstanceBackupDir(serverPath);
            // Ensure backup directory exists
            await mkdir(backupDir, { recursive: true });
            await writeFile(settingsFile, JSON.stringify(settings, null, 2));
        }
        catch (error) {
            console.error('[backup-settings] Failed to save backup settings:', error);
            throw error;
        }
    }
}
exports.BackupSettingsService = BackupSettingsService;
exports.backupSettingsService = new BackupSettingsService();
