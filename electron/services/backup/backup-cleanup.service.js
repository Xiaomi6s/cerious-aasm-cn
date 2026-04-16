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
exports.backupCleanupService = exports.BackupCleanupService = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const util_1 = require("util");
// File system operations
const readdir = (0, util_1.promisify)(fs.readdir);
const stat = (0, util_1.promisify)(fs.stat);
const unlink = (0, util_1.promisify)(fs.unlink);
class BackupCleanupService {
    /**
     * Cleanup old backups (internal implementation)
     */
    async cleanupOldBackups(serverPath, maxBackupsToKeep, getInstanceBackupsInternal) {
        try {
            const backups = await getInstanceBackupsInternal(serverPath);
            if (backups.length <= maxBackupsToKeep) {
                return; // Nothing to clean up
            }
            // Sort by creation date (oldest first for deletion)
            backups.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            const backupsToDelete = backups.slice(0, backups.length - maxBackupsToKeep);
            for (const backup of backupsToDelete) {
                try {
                    await unlink(backup.filePath);
                }
                catch (error) {
                    console.error(`[backup-cleanup] Failed to delete backup ${backup.filePath}:`, error);
                }
            }
        }
        catch (error) {
            console.error('[backup-cleanup] Failed to cleanup old backups:', error);
        }
    }
    /**
     * Clean up old ARK save files, keeping only the most recent ones
     * This helps prevent accumulation of automatic ARK game saves
     */
    async cleanupArkSaveFiles(serverPath, maxBackupsToKeep) {
        try {
            // ARK saves are in the instance's SavedArks directory
            // serverPath is already .../AASMServer/ShooterGame/Saved/Servers/{instanceId}
            const savedArksDir = path.join(serverPath, 'SavedArks');
            if (!fs.existsSync(savedArksDir)) {
                return; // No save directory exists
            }
            // Get all .ark.bak files from all map subdirectories
            const bakFiles = [];
            // Recursively search through SavedArks directory and subdirectories
            await this.collectBakFiles(savedArksDir, bakFiles);
            if (bakFiles.length <= maxBackupsToKeep) {
                return; // Nothing to clean up
            }
            // Sort by modification time (oldest first for deletion)
            bakFiles.sort((a, b) => a.modifiedTime.getTime() - b.modifiedTime.getTime());
            const filesToDelete = bakFiles.slice(0, bakFiles.length - maxBackupsToKeep);
            for (const file of filesToDelete) {
                try {
                    await unlink(file.filePath);
                }
                catch (error) {
                    console.error(`[backup-cleanup] Failed to delete ARK save file ${file.filePath}:`, error);
                }
            }
        }
        catch (error) {
            console.error('[backup-cleanup] Failed to cleanup ARK save files:', error);
        }
    }
    /**
     * Recursively collect all .ark.bak files from the SavedArks directory and subdirectories
     */
    async collectBakFiles(dirPath, bakFiles) {
        try {
            const items = await readdir(dirPath);
            for (const item of items) {
                const itemPath = path.join(dirPath, item);
                const stats = await stat(itemPath);
                if (stats.isDirectory()) {
                    // Recursively search subdirectories
                    await this.collectBakFiles(itemPath, bakFiles);
                }
                else if (stats.isFile() && item.toLowerCase().endsWith('.bak')) {
                    // Found a .ark.bak file
                    bakFiles.push({
                        filePath: itemPath,
                        modifiedTime: stats.mtime
                    });
                }
            }
        }
        catch (error) {
            console.warn(`[backup-cleanup] Could not read directory ${dirPath}:`, error);
        }
    }
}
exports.BackupCleanupService = BackupCleanupService;
exports.backupCleanupService = new BackupCleanupService();
