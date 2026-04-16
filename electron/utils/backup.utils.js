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
exports.BackupPathUtils = exports.BackupFilenameUtils = void 0;
const path = __importStar(require("path"));
/**
 * Backup Utilities - Helper Functions Only
 * Pure helper functions for backup filename management and path operations
 */
/**
 * Helper functions for filename-based backup management
 */
class BackupFilenameUtils {
    /**
     * Generate a backup filename
     * Manual backups: Use custom name only (e.g., "MyBackup.zip")
     * Scheduled backups: Include timestamp for uniqueness (e.g., "scheduled_20250916_230510_backup.zip")
     */
    static generateFilename(type, customName) {
        if (type === 'manual' && customName) {
            // For manual backups, use just the custom name
            const safeName = BackupFilenameUtils.sanitizeFilename(customName);
            return `${safeName}.zip`;
        }
        // For scheduled backups or manual without custom name, use timestamp format
        const utcTimestamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '').slice(0, 14); // YYYYMMDDHHMMSS in UTC
        const safeName = customName ? BackupFilenameUtils.sanitizeFilename(customName) : 'backup';
        return `${type}_${utcTimestamp}_${safeName}.zip`;
    }
    /**
     * Parse backup metadata from filename
     * Supports two formats:
     * 1. Manual backups: {customName}.zip (e.g., "MyBackup.zip")
     * 2. Scheduled backups: {type}_{utcTimestamp}_{customName}.zip (e.g., "scheduled_20250916230510_backup.zip")
     */
    static parseFilename(filename, filePath, instanceId, fallbackDate) {
        try {
            // Remove .zip extension
            const nameWithoutExt = filename.replace(/\.zip$/i, '');
            const parts = nameWithoutExt.split('_');
            // Check if this is a simple manual backup (no underscores or doesn't start with type)
            if (parts.length === 1 || (parts.length > 1 && parts[0] !== 'manual' && parts[0] !== 'scheduled')) {
                // Simple manual backup format: just the custom name
                // Use file mtime if provided, otherwise fall back to current time
                return {
                    id: nameWithoutExt,
                    instanceId,
                    name: nameWithoutExt,
                    createdAt: fallbackDate ?? new Date(),
                    size: 0, // Will be populated by caller with actual file size
                    type: 'manual',
                    filePath
                };
            }
            // Structured format: {type}_{timestamp}_{customName}
            if (parts.length < 3) {
                console.warn(`[backup-filename-utils] Invalid structured backup filename format: ${filename}`);
                return null;
            }
            const type = parts[0];
            const timestamp = parts[1];
            const customName = parts.slice(2).join('_');
            // Parse UTC timestamp (YYYYMMDDHHMMSS format)
            if (timestamp.length !== 14) {
                console.warn(`[backup-filename-utils] Invalid timestamp format in filename: ${filename}`);
                return null;
            }
            const year = parseInt(timestamp.substring(0, 4));
            const month = parseInt(timestamp.substring(4, 6)) - 1; // Month is 0-indexed
            const day = parseInt(timestamp.substring(6, 8));
            const hour = parseInt(timestamp.substring(8, 10));
            const minute = parseInt(timestamp.substring(10, 12));
            const second = parseInt(timestamp.substring(12, 14));
            const createdAt = new Date(Date.UTC(year, month, day, hour, minute, second));
            // Use filename without extension as ID (matches original behavior)
            const id = nameWithoutExt;
            return {
                id,
                instanceId,
                name: customName,
                createdAt,
                size: 0, // Will be populated by caller with actual file size
                type,
                filePath
            };
        }
        catch (error) {
            console.error(`[backup-filename-utils] Error parsing filename ${filename}:`, error);
            return null;
        }
    }
    /**
     * Sanitize a backup name for use in filenames
     * Removes only problematic characters, preserves spaces
     */
    static sanitizeFilename(name) {
        // Remove only invalid filename characters, preserve spaces
        return name
            .replace(/[<>:"/\\|?*]/g, '') // Remove invalid chars but keep spaces
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .trim() // Remove leading/trailing spaces
            .substring(0, 50); // Limit length
    }
    /**
     * Check if a filename matches backup file pattern
     * Supports both formats:
     * 1. Simple manual backups: *.zip
     * 2. Structured backups: (manual|scheduled)_timestamp_name.zip
     */
    static isBackupFile(filename) {
        // Must be a zip file
        if (!filename.toLowerCase().endsWith('.zip')) {
            return false;
        }
        // Check for structured format first
        if (/^(manual|scheduled)_\d{14}_.*\.zip$/i.test(filename)) {
            return true;
        }
        // For simple format, accept any .zip file that's not a system file
        const name = filename.toLowerCase();
        const systemFiles = ['thumbs.db.zip', 'desktop.ini.zip', '.ds_store.zip'];
        return !systemFiles.includes(name) && !name.startsWith('.');
    }
}
exports.BackupFilenameUtils = BackupFilenameUtils;
/**
 * Path calculation helpers
 */
class BackupPathUtils {
    /**
     * Get the backup directory for a specific instance
     */
    static getInstanceBackupDir(serverPath) {
        return path.join(serverPath, 'backups');
    }
    /**
     * Get the backup settings file path
     */
    static getSettingsFilePath(serverPath) {
        return path.join(serverPath, 'backup-settings.json');
    }
    /**
     * Get full backup file path
     */
    static getBackupFilePath(serverPath, filename) {
        return path.join(BackupPathUtils.getInstanceBackupDir(serverPath), filename);
    }
}
exports.BackupPathUtils = BackupPathUtils;
