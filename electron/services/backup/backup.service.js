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
exports.backupService = exports.BackupService = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const util_1 = require("util");
const instanceUtils = __importStar(require("../../utils/ark/instance.utils"));
// Import refactored services
const backup_operations_service_1 = require("./backup-operations.service");
const backup_cleanup_service_1 = require("./backup-cleanup.service");
const backup_settings_service_1 = require("./backup-settings.service");
const backup_scheduler_service_1 = require("./backup-scheduler.service");
const backup_import_service_1 = require("./backup-import.service");
// File system operations
const mkdir = (0, util_1.promisify)(fs.mkdir);
const stat = (0, util_1.promisify)(fs.stat);
const readdir = (0, util_1.promisify)(fs.readdir);
const unlink = (0, util_1.promisify)(fs.unlink);
const readFile = (0, util_1.promisify)(fs.readFile);
const writeFile = (0, util_1.promisify)(fs.writeFile);
// Note: Using require() due to lack of proper TypeScript definitions for adm-zip
const AdmZip = require('adm-zip');
/**
 * Backup Service - Handles all business logic for server backup operations
 */
class BackupService {
    constructor() {
        this.operationsService = new backup_operations_service_1.BackupOperationsService();
        this.cleanupService = new backup_cleanup_service_1.BackupCleanupService();
        this.settingsService = new backup_settings_service_1.BackupSettingsService();
        this.schedulerService = new backup_scheduler_service_1.BackupSchedulerService();
        this.importService = new backup_import_service_1.BackupImportService();
        // Initialize will be called from the handler
    }
    /**
     * Get the server instance directory path
     */
    getInstanceServerPath(instanceId) {
        const baseDir = instanceUtils.getInstancesBaseDir();
        return path.join(baseDir, instanceId);
    }
    /**
     * Validate instance and get server path
     */
    async validateInstanceAndGetPath(instanceId) {
        if (!instanceId) {
            return null;
        }
        const instance = await instanceUtils.getInstance(instanceId);
        if (!instance) {
            return null;
        }
        const serverPath = this.getInstanceServerPath(instanceId);
        return { instance, serverPath };
    }
    /**
     * Initialize backup system and restore schedules
     */
    async initializeBackupSystem() {
        try {
            await this.restoreActiveSchedules();
        }
        catch (error) {
            console.error('[backup-service] Failed to initialize backup system:', error);
        }
    }
    /**
     * Restore active backup schedules on startup
     */
    async restoreActiveSchedules() {
        try {
            const instances = await instanceUtils.getAllInstances();
            for (const instance of instances) {
                const serverPath = this.getInstanceServerPath(instance.id);
                const settings = await this.settingsService.getBackupSettingsInternal(instance.id, serverPath);
                if (settings?.enabled) {
                    await this.schedulerService.startBackupSchedulerInternal(instance.id, settings, this.createBackup.bind(this));
                }
            }
        }
        catch (error) {
            console.error('[backup-service] Failed to restore active schedules:', error);
        }
    }
    /**
     * Create a new backup for a server instance, compressing all save data and configuration
     * @param instanceId - The unique identifier of the server instance to backup
     * @param type - The type of backup ('manual' for user-initiated, 'scheduled' for automated)
     * @param name - Optional custom name for the backup file
     * @returns Promise resolving to a BackupResult with success status and backup ID
     */
    async createBackup(instanceId, type, name) {
        try {
            const validation = await this.validateInstanceAndGetPath(instanceId);
            if (!validation) {
                return {
                    success: false,
                    error: !instanceId ? 'Instance ID is required' : 'Instance not found'
                };
            }
            const { serverPath } = validation;
            // Create the backup
            const metadata = await this.operationsService.createBackupInternal(instanceId, serverPath, type || 'manual', name);
            // Clean up old backups if settings exist
            const settings = await this.settingsService.getBackupSettingsInternal(instanceId, serverPath);
            if (settings) {
                await this.cleanupService.cleanupOldBackups(serverPath, settings.maxBackupsToKeep, this.operationsService.getInstanceBackupsInternal.bind(this.operationsService));
                // Also clean up ARK save files for scheduled backups
                if (type === 'scheduled') {
                    await this.cleanupService.cleanupArkSaveFiles(serverPath, settings.maxBackupsToKeep);
                }
            }
            return {
                success: true,
                backupId: metadata.id,
                message: 'Backup created successfully'
            };
        }
        catch (error) {
            console.error('[backup-service] Failed to create backup:', error);
            return {
                success: false,
                error: error?.message || 'Failed to create backup'
            };
        }
    }
    /**
     * Retrieve the list of all backups for a specific server instance
     * @param instanceId - The unique identifier of the server instance
     * @returns Promise resolving to a BackupListResult containing an array of backup metadata
     */
    async getBackupList(instanceId) {
        try {
            const validation = await this.validateInstanceAndGetPath(instanceId);
            if (!validation) {
                return {
                    success: false,
                    error: !instanceId ? 'Instance ID is required' : 'Instance not found'
                };
            }
            const { serverPath } = validation;
            const backups = await this.operationsService.getInstanceBackupsInternal(serverPath);
            return {
                success: true,
                backups
            };
        }
        catch (error) {
            console.error('[backup-service] Failed to get backup list:', error);
            return {
                success: false,
                error: error?.message || 'Failed to get backup list'
            };
        }
    }
    /**
     * Restore a server instance from a specific backup, replacing current save data and configuration
     * @param instanceId - The unique identifier of the server instance to restore to
     * @param backupId - The unique identifier of the backup to restore from
     * @returns Promise resolving to a BackupRestoreResult with success status and operation details
     */
    async restoreBackup(instanceId, backupId) {
        try {
            if (!instanceId || !backupId) {
                return {
                    success: false,
                    error: 'Instance ID and Backup ID are required'
                };
            }
            const validation = await this.validateInstanceAndGetPath(instanceId);
            if (!validation) {
                return {
                    success: false,
                    error: 'Instance not found'
                };
            }
            const { serverPath } = validation;
            // Check if backup exists
            const backups = await this.operationsService.getInstanceBackupsInternal(serverPath);
            const backup = backups.find((b) => b.id === backupId);
            if (!backup) {
                return {
                    success: false,
                    error: 'Backup not found'
                };
            }
            // Restore the backup
            await this.operationsService.restoreBackupInternal(backupId, serverPath);
            return {
                success: true,
                message: 'Backup restored successfully'
            };
        }
        catch (error) {
            console.error('[backup-service] Failed to restore backup:', error);
            return {
                success: false,
                error: error?.message || 'Failed to restore backup'
            };
        }
    }
    /**
     * Permanently delete a backup file from storage
     * @param backupId - The unique identifier of the backup to delete
     * @returns Promise resolving to a BackupResult confirming successful deletion
     */
    async deleteBackup(backupId) {
        try {
            if (!backupId) {
                return {
                    success: false,
                    error: 'Backup ID is required'
                };
            }
            // Search for the backup across all instances
            const allInstances = await instanceUtils.getAllInstances();
            let foundBackup = false;
            let backupServerPath = '';
            for (const instance of allInstances) {
                try {
                    const serverPath = this.getInstanceServerPath(instance.id);
                    const backups = await this.operationsService.getInstanceBackupsInternal(serverPath);
                    const backup = backups.find((b) => b.id === backupId);
                    if (backup) {
                        foundBackup = true;
                        backupServerPath = serverPath;
                        break;
                    }
                }
                catch (error) {
                    // Continue searching other instances if this one fails
                    console.warn(`[backup-service] Failed to check backups for instance ${instance.id}:`, error);
                }
            }
            if (!foundBackup) {
                return {
                    success: false,
                    error: 'Backup not found'
                };
            }
            // Delete the backup
            await this.operationsService.deleteBackupInternal(backupId, backupServerPath);
            return {
                success: true,
                message: 'Backup deleted successfully'
            };
        }
        catch (error) {
            console.error('[backup-service] Failed to delete backup:', error);
            return {
                success: false,
                error: error?.message || 'Failed to delete backup'
            };
        }
    }
    /**
     * Get backup settings for an instance
     */
    async getBackupSettings(instanceId) {
        try {
            const validation = await this.validateInstanceAndGetPath(instanceId);
            if (!validation) {
                return {
                    success: false,
                    error: !instanceId ? 'Instance ID is required' : 'Instance not found'
                };
            }
            const { serverPath } = validation;
            const settings = await this.settingsService.getBackupSettingsInternal(instanceId, serverPath);
            return {
                success: true,
                settings: settings || {
                    instanceId,
                    enabled: false,
                    frequency: 'daily',
                    time: '02:00',
                    maxBackupsToKeep: 5
                }
            };
        }
        catch (error) {
            console.error('[backup-service] Failed to get backup settings:', error);
            return {
                success: false,
                error: error?.message || 'Failed to get backup settings'
            };
        }
    }
    /**
     * Save backup settings for an instance
     */
    async saveBackupSettings(instanceId, settings) {
        try {
            if (!instanceId || !settings) {
                return {
                    success: false,
                    error: 'Instance ID and settings are required'
                };
            }
            const validation = await this.validateInstanceAndGetPath(instanceId);
            if (!validation) {
                return {
                    success: false,
                    error: 'Instance not found'
                };
            }
            const { serverPath } = validation;
            await this.settingsService.saveBackupSettingsInternal(settings, serverPath);
            // Update scheduler if settings changed
            if (settings.enabled) {
                await this.schedulerService.startBackupSchedulerInternal(instanceId, settings, this.createBackup.bind(this));
            }
            else {
                this.schedulerService.stopBackupSchedulerInternal(instanceId);
            }
            return {
                success: true,
                message: 'Backup settings saved successfully'
            };
        }
        catch (error) {
            console.error('[backup-service] Failed to save backup settings:', error);
            return {
                success: false,
                error: error?.message || 'Failed to save backup settings'
            };
        }
    }
    /**
     * Start backup scheduler for an instance
     */
    async startBackupScheduler(instanceId) {
        try {
            const validation = await this.validateInstanceAndGetPath(instanceId);
            if (!validation) {
                return {
                    success: false,
                    error: !instanceId ? 'Instance ID is required' : 'Instance not found'
                };
            }
            const { serverPath } = validation;
            const settings = await this.settingsService.getBackupSettingsInternal(instanceId, serverPath);
            if (!settings || !settings.enabled) {
                return {
                    success: false,
                    error: 'Backup settings not found or disabled'
                };
            }
            await this.schedulerService.startBackupSchedulerInternal(instanceId, settings, this.createBackup.bind(this));
            return {
                success: true,
                message: 'Backup scheduler started successfully'
            };
        }
        catch (error) {
            console.error('[backup-service] Failed to start backup scheduler:', error);
            return {
                success: false,
                error: error?.message || 'Failed to start backup scheduler'
            };
        }
    }
    /**
     * Stop backup scheduler for an instance
     */
    async stopBackupScheduler(instanceId) {
        try {
            if (!instanceId) {
                return {
                    success: false,
                    error: 'Instance ID is required'
                };
            }
            this.schedulerService.stopBackupSchedulerInternal(instanceId);
            return {
                success: true,
                message: 'Backup scheduler stopped successfully'
            };
        }
        catch (error) {
            console.error('[backup-service] Failed to stop backup scheduler:', error);
            return {
                success: false,
                error: error?.message || 'Failed to stop backup scheduler'
            };
        }
    }
    /**
     * Get backup scheduler status for an instance
     */
    async getSchedulerStatus(instanceId) {
        try {
            if (!instanceId) {
                return {
                    success: false,
                    error: 'Instance ID is required'
                };
            }
            const serverPath = this.getInstanceServerPath(instanceId);
            const settings = await this.settingsService.getBackupSettingsInternal(instanceId, serverPath);
            return await this.schedulerService.getSchedulerStatus(instanceId, settings);
        }
        catch (error) {
            console.error('[backup-service] Failed to get scheduler status:', error);
            return {
                success: false,
                error: error?.message || 'Failed to get scheduler status'
            };
        }
    }
    /**
     * Prepare a backup file for download by the client
     * @param instanceId - The unique identifier of the server instance the backup belongs to
     * @param backupId - The unique identifier of the backup to download
     * @returns Promise resolving to a BackupDownloadResult with file path and metadata for download
     */
    async downloadBackup(instanceId, backupId) {
        try {
            if (!instanceId || !backupId) {
                return {
                    success: false,
                    error: 'Instance ID and Backup ID are required'
                };
            }
            const validation = await this.validateInstanceAndGetPath(instanceId);
            if (!validation) {
                return {
                    success: false,
                    error: 'Instance not found'
                };
            }
            const { serverPath } = validation;
            // Check if backup exists
            const backups = await this.operationsService.getInstanceBackupsInternal(serverPath);
            const backup = backups.find((b) => b.id === backupId);
            if (!backup) {
                return {
                    success: false,
                    error: 'Backup not found'
                };
            }
            // Return the backup file path from metadata
            const fileName = path.basename(backup.filePath);
            return {
                success: true,
                filePath: backup.filePath,
                fileName
            };
        }
        catch (error) {
            console.error('[backup-service] Failed to prepare backup download:', error);
            return {
                success: false,
                error: error?.message || 'Failed to prepare backup download'
            };
        }
    }
    /**
     * Import a backup file as a new server instance
     */
    async importBackupAsNewServer(serverName, backupFilePath) {
        return await this.importService.importBackupAsNewServer(serverName, backupFilePath);
    }
}
exports.BackupService = BackupService;
// Export singleton instance
exports.backupService = new BackupService();
