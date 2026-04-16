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
exports.backupOperationsService = exports.BackupOperationsService = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const util_1 = require("util");
const backup_utils_1 = require("../../utils/backup.utils");
// File system operations
const mkdir = (0, util_1.promisify)(fs.mkdir);
const stat = (0, util_1.promisify)(fs.stat);
const readdir = (0, util_1.promisify)(fs.readdir);
const unlink = (0, util_1.promisify)(fs.unlink);
const readFile = (0, util_1.promisify)(fs.readFile);
const writeFile = (0, util_1.promisify)(fs.writeFile);
// Note: Using require() due to lack of proper TypeScript definitions for adm-zip
const AdmZip = require('adm-zip');
class BackupOperationsService {
    /**
     * Create a backup (internal implementation)
     */
    async createBackupInternal(instanceId, serverPath, type, customName) {
        try {
            const instanceBackupDir = backup_utils_1.BackupPathUtils.getInstanceBackupDir(serverPath);
            await mkdir(instanceBackupDir, { recursive: true });
            // Generate structured filename
            const backupFileName = backup_utils_1.BackupFilenameUtils.generateFilename(type, customName);
            const backupFilePath = path.join(instanceBackupDir, backupFileName);
            // Create the zip archive
            await this.createZipArchive(serverPath, backupFilePath, instanceId);
            // Get file size and parse metadata from filename
            const stats = await stat(backupFilePath);
            const metadata = backup_utils_1.BackupFilenameUtils.parseFilename(backupFileName, backupFilePath, instanceId);
            if (!metadata) {
                throw new Error('Failed to parse backup filename');
            }
            // Update size from file stats
            metadata.size = stats.size;
            return metadata;
        }
        catch (error) {
            console.error('[backup-operations] Failed to create backup:', error);
            throw error;
        }
    }
    /**
     * Create a zip archive excluding the backup folder
     */
    async createZipArchive(sourcePath, outputPath, instanceId) {
        try {
            const zip = new AdmZip();
            // Add all files and directories except backup folders
            await this.addToZip(zip, sourcePath, '', instanceId);
            // Write the zip file
            zip.writeZip(outputPath);
        }
        catch (error) {
            console.error('[backup-operations] Failed to create zip archive:', error);
            throw error;
        }
    }
    /**
     * Recursively add files to zip, excluding backup directories and junctions/symlinks.
     * Uses lstat() (not stat()) so junction points to the shared Content (~70 GB) and
     * Engine (~3 GB) directories are detected as symlinks and skipped rather than
     * traversed, which would otherwise read the entire game installation into memory.
     */
    async addToZip(zip, sourcePath, relativePath, instanceId) {
        try {
            const items = await readdir(sourcePath);
            // Files directly inside Binaries/Win64 are exe/dlls that are always re-copied
            // from the shared install on server start — skip them to avoid bloating the backup
            // with ~200 MB of deterministic binaries. Subdirectories (e.g. ArkApi/) are still
            // recursed so user-installed plugins are preserved.
            const isWin64Dir = /[/\\]ShooterGame[/\\]Binaries[/\\]Win64$/i.test(sourcePath);
            for (const item of items) {
                const itemPath = path.join(sourcePath, item);
                const itemRelativePath = relativePath ? path.join(relativePath, item) : item;
                // Use lstat so junction/symlink entries are not followed
                const lstats = await fs.promises.lstat(itemPath);
                // Skip backup directories
                if (item.toLowerCase().includes('backup')) {
                    continue;
                }
                // Skip symlinks and junctions — these point to the shared game installation
                // (Content ~70 GB, Engine ~3 GB) and must never be archived
                if (lstats.isSymbolicLink()) {
                    continue;
                }
                if (lstats.isDirectory()) {
                    // Recursively add real directory contents
                    await this.addToZip(zip, itemPath, itemRelativePath, instanceId);
                }
                else if (lstats.isFile()) {
                    // Skip raw exe/dll files in Win64 root — they are recoverable from the shared install
                    if (isWin64Dir)
                        continue;
                    const fileBuffer = await fs.promises.readFile(itemPath);
                    zip.addFile(itemRelativePath, fileBuffer);
                }
            }
        }
        catch (error) {
            console.error('[backup-operations] Failed to add items to zip:', error);
            throw error;
        }
    }
    /**
     * Get instance backups (internal implementation)
     */
    async getInstanceBackupsInternal(serverPath) {
        try {
            const instanceBackupDir = backup_utils_1.BackupPathUtils.getInstanceBackupDir(serverPath);
            if (!fs.existsSync(instanceBackupDir)) {
                return [];
            }
            const files = await readdir(instanceBackupDir);
            // Filter for backup ZIP files only
            const backupFiles = files.filter(f => backup_utils_1.BackupFilenameUtils.isBackupFile(f));
            const backups = [];
            for (const backupFile of backupFiles) {
                try {
                    const backupFilePath = path.join(instanceBackupDir, backupFile);
                    // Check if file exists and get stats
                    if (!fs.existsSync(backupFilePath)) {
                        continue;
                    }
                    const stats = await stat(backupFilePath);
                    // Parse metadata from filename
                    // Extract instanceId from serverPath
                    const instanceId = path.basename(path.dirname(instanceBackupDir));
                    const metadata = backup_utils_1.BackupFilenameUtils.parseFilename(backupFile, backupFilePath, instanceId, stats.mtime);
                    if (metadata) {
                        metadata.size = stats.size;
                        backups.push(metadata);
                    }
                }
                catch (error) {
                    console.error(`[backup-operations] Failed to process backup file ${backupFile}:`, error);
                }
            }
            // Sort by creation date (newest first)
            backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            return backups;
        }
        catch (error) {
            console.error('[backup-operations] Failed to get instance backups:', error);
            return [];
        }
    }
    /**
     * Restore backup (internal implementation)
     */
    async restoreBackupInternal(backupId, serverPath) {
        try {
            // Find the backup file by searching for files with matching ID
            const instanceBackupDir = backup_utils_1.BackupPathUtils.getInstanceBackupDir(serverPath);
            if (!fs.existsSync(instanceBackupDir)) {
                throw new Error(`Backup directory not found: ${instanceBackupDir}`);
            }
            const files = await readdir(instanceBackupDir);
            const backupFile = files.find(f => f.startsWith(backupId) && f.endsWith('.zip'));
            if (!backupFile) {
                throw new Error(`Backup with ID ${backupId} not found`);
            }
            const backupFilePath = path.join(instanceBackupDir, backupFile);
            // Check if backup file exists
            if (!fs.existsSync(backupFilePath)) {
                throw new Error(`Backup file not found: ${backupFilePath}`);
            }
            // Create temporary directory for extraction
            const tempDir = path.join(path.dirname(backupFilePath), `temp_${backupId}`);
            await mkdir(tempDir, { recursive: true });
            try {
                // Extract backup
                const zip = new AdmZip(backupFilePath);
                zip.extractAllTo(tempDir, true);
                // Remove existing server files (except backup folder)
                await this.clearServerDirectory(serverPath);
                // Copy extracted files to server directory
                await this.copyDirectory(tempDir, serverPath);
            }
            finally {
                // Clean up temporary directory
                await this.removeDirectory(tempDir);
            }
        }
        catch (error) {
            console.error('[backup-operations] Failed to restore backup:', error);
            throw error;
        }
    }
    /**
     * Delete backup (internal implementation)
     */
    async deleteBackupInternal(backupId, serverPath) {
        try {
            const instanceBackupDir = backup_utils_1.BackupPathUtils.getInstanceBackupDir(serverPath);
            if (!fs.existsSync(instanceBackupDir)) {
                throw new Error(`Backup directory not found: ${instanceBackupDir}`);
            }
            const files = await readdir(instanceBackupDir);
            // First try: exact filename match (new format)
            let backupFile = files.find(f => f === `${backupId}.zip`);
            // Second try: startsWith match (handles legacy or partial matches)
            if (!backupFile) {
                backupFile = files.find(f => f.startsWith(backupId) && f.endsWith('.zip'));
            }
            // Third try: search by parsing all backup files and matching ID (most robust)
            if (!backupFile) {
                const instanceId = path.basename(path.dirname(instanceBackupDir));
                for (const file of files) {
                    if (backup_utils_1.BackupFilenameUtils.isBackupFile(file)) {
                        const filePath = path.join(instanceBackupDir, file);
                        const metadata = backup_utils_1.BackupFilenameUtils.parseFilename(file, filePath, instanceId);
                        if (metadata && metadata.id === backupId) {
                            backupFile = file;
                            break;
                        }
                    }
                }
            }
            if (!backupFile) {
                throw new Error(`Backup with ID ${backupId} not found`);
            }
            const backupFilePath = path.join(instanceBackupDir, backupFile);
            await unlink(backupFilePath);
        }
        catch (error) {
            console.error('[backup-operations] Failed to delete backup:', error);
            throw error;
        }
    }
    /**
     * Clear server directory (except backup folders and symlinks/junctions)
     */
    async clearServerDirectory(serverPath) {
        try {
            const items = await readdir(serverPath);
            for (const item of items) {
                // Skip backup-related directories
                if (item.toLowerCase().includes('backup')) {
                    continue;
                }
                const itemPath = path.join(serverPath, item);
                const lstats = await fs.promises.lstat(itemPath);
                // Skip symlinks and junctions — these point to the shared game installation
                // (Content ~70 GB, Engine ~3 GB) and must not be removed during restore
                if (lstats.isSymbolicLink()) {
                    continue;
                }
                if (lstats.isDirectory()) {
                    await this.removeDirectory(itemPath);
                }
                else {
                    await unlink(itemPath);
                }
            }
        }
        catch (error) {
            console.error('[backup-operations] Failed to clear server directory:', error);
            throw error;
        }
    }
    /**
     * Copy directory recursively
     */
    async copyDirectory(source, destination) {
        try {
            await mkdir(destination, { recursive: true });
            const items = await readdir(source);
            for (const item of items) {
                const sourcePath = path.join(source, item);
                const destPath = path.join(destination, item);
                const stats = await stat(sourcePath);
                if (stats.isDirectory()) {
                    await this.copyDirectory(sourcePath, destPath);
                }
                else {
                    const fileBuffer = await readFile(sourcePath);
                    await writeFile(destPath, fileBuffer);
                }
            }
        }
        catch (error) {
            console.error('[backup-operations] Failed to copy directory:', error);
            throw error;
        }
    }
    /**
     * Remove directory recursively (skips symlinks/junctions)
     */
    async removeDirectory(dirPath) {
        try {
            if (!fs.existsSync(dirPath)) {
                return;
            }
            const items = await readdir(dirPath);
            for (const item of items) {
                const itemPath = path.join(dirPath, item);
                const lstats = await fs.promises.lstat(itemPath);
                if (lstats.isSymbolicLink()) {
                    await unlink(itemPath);
                }
                else if (lstats.isDirectory()) {
                    await this.removeDirectory(itemPath);
                }
                else {
                    await unlink(itemPath);
                }
            }
            fs.rmdirSync(dirPath);
        }
        catch (error) {
            console.error('[backup-operations] Failed to remove directory:', error);
            throw error;
        }
    }
}
exports.BackupOperationsService = BackupOperationsService;
exports.backupOperationsService = new BackupOperationsService();
