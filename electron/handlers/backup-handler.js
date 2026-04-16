"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeBackupSystem = initializeBackupSystem;
const messaging_service_1 = require("../services/messaging.service");
const backup_service_1 = require("../services/backup/backup.service");
/**
 * Initializes the backup system. This function should be called during the app startup
 * to ensure that the backup service is properly set up before handling any backup-related requests.
 */
async function initializeBackupSystem() {
    await backup_service_1.backupService.initializeBackupSystem();
}
/**
 * Handles the 'create-backup' message event from the messaging service.
 *
 * When triggered, this handler invokes the BackupService to create a new backup.
 * It then sends the result back to the originator of the message, including details such as
 * success status and any error information.
 * In case of unexpected errors during the backup creation, it logs the error and sends a failure
 * response to the originator.
 *
 * @param payload - The payload received with the message, expected to contain `instanceId`,
 *                  `type`, `name`, and `requestId`.
 * @param sender - The sender of the message, used to route the response.
 */
messaging_service_1.messagingService.on('create-backup', async (payload, sender) => {
    const { instanceId, type, name, requestId } = payload;
    try {
        const result = await backup_service_1.backupService.createBackup(instanceId, type, name);
        if (result.success) {
            messaging_service_1.messagingService.sendToOriginator('create-backup', {
                success: true,
                backupId: result.backupId,
                message: result.message,
                requestId
            }, sender);
        }
        else {
            messaging_service_1.messagingService.sendToOriginator('create-backup', {
                success: false,
                error: result.error,
                requestId
            }, sender);
        }
    }
    catch (error) {
        console.error('[backup-handler] Failed to handle create-backup:', error);
        messaging_service_1.messagingService.sendToOriginator('create-backup', {
            success: false,
            error: error?.message || 'Failed to create backup',
            requestId
        }, sender);
    }
});
/**
 * Handles the 'get-backup-list' message event from the messaging service.
 *
 * When triggered, this handler invokes the BackupService to retrieve the list of backups.
 * It then sends the result back to the originator of the message, including details such as
 * success status and any error information.
 * In case of unexpected errors during the backup list retrieval, it logs the error and sends a failure
 * response to the originator.
 *
 * @param payload - The payload received with the message, expected to contain `instanceId` and `requestId`.
 * @param sender - The sender of the message, used to route the response.
 */
messaging_service_1.messagingService.on('get-backup-list', async (payload, sender) => {
    const { instanceId, requestId } = payload;
    try {
        const result = await backup_service_1.backupService.getBackupList(instanceId);
        if (result.success) {
            messaging_service_1.messagingService.sendToOriginator('get-backup-list', {
                success: true,
                backups: result.backups,
                requestId
            }, sender);
        }
        else {
            messaging_service_1.messagingService.sendToOriginator('get-backup-list', {
                success: false,
                error: result.error,
                requestId
            }, sender);
        }
    }
    catch (error) {
        console.error('[backup-handler] Failed to handle get-backup-list:', error);
        messaging_service_1.messagingService.sendToOriginator('get-backup-list', {
            success: false,
            error: error?.message || 'Failed to get backup list',
            requestId
        }, sender);
    }
});
/**
 * Handles the 'restore-backup' message event from the messaging service.
 *
 * When triggered, this handler invokes the BackupService to restore a backup.
 * It then sends the result back to the originator of the message, including details such as
 * success status and any error information.
 * In case of unexpected errors during the backup restoration, it logs the error and sends a failure
 * response to the originator.
 *
 * @param payload - The payload received with the message, expected to contain `instanceId`,
 *                  `backupId`, and `requestId`.
 * @param sender - The sender of the message, used to route the response.
 */
messaging_service_1.messagingService.on('restore-backup', async (payload, sender) => {
    const { instanceId, backupId, requestId } = payload;
    try {
        const result = await backup_service_1.backupService.restoreBackup(instanceId, backupId);
        if (result.success) {
            messaging_service_1.messagingService.sendToOriginator('restore-backup', {
                success: true,
                message: result.message,
                requestId
            }, sender);
        }
        else {
            messaging_service_1.messagingService.sendToOriginator('restore-backup', {
                success: false,
                error: result.error,
                requestId
            }, sender);
        }
    }
    catch (error) {
        console.error('[backup-handler] Failed to handle restore-backup:', error);
        messaging_service_1.messagingService.sendToOriginator('restore-backup', {
            success: false,
            error: error?.message || 'Failed to restore backup',
            requestId
        }, sender);
    }
});
/**
 * Handles the 'delete-backup' message event from the messaging service.
 *
 * When triggered, this handler invokes the BackupService to delete a backup.
 * It then sends the result back to the originator of the message, including details such as
 * success status and any error information.
 * In case of unexpected errors during the backup deletion, it logs the error and sends a failure
 * response to the originator.
 *
 * @param payload - The payload received with the message, expected to contain `backupId` and `requestId`.
 * @param sender - The sender of the message, used to route the response.
 */
messaging_service_1.messagingService.on('delete-backup', async (payload, sender) => {
    const { backupId, requestId } = payload;
    try {
        const result = await backup_service_1.backupService.deleteBackup(backupId);
        if (result.success) {
            messaging_service_1.messagingService.sendToOriginator('delete-backup', {
                success: true,
                message: result.message,
                requestId
            }, sender);
        }
        else {
            messaging_service_1.messagingService.sendToOriginator('delete-backup', {
                success: false,
                error: result.error,
                requestId
            }, sender);
        }
    }
    catch (error) {
        console.error('[backup-handler] Failed to handle delete-backup:', error);
        messaging_service_1.messagingService.sendToOriginator('delete-backup', {
            success: false,
            error: error?.message || 'Failed to delete backup',
            requestId
        }, sender);
    }
});
/**
 * Handles the 'get-backup-settings' message event from the messaging service.
 *
 * When triggered, this handler invokes the BackupService to retrieve the backup settings.
 * It then sends the result back to the originator of the message, including details such as
 * success status and any error information.
 * In case of unexpected errors during the backup settings retrieval, it logs the error and sends a failure
 * response to the originator.
 *
 * @param payload - The payload received with the message, expected to contain `instanceId` and `requestId`.
 * @param sender - The sender of the message, used to route the response.
 */
messaging_service_1.messagingService.on('get-backup-settings', async (payload, sender) => {
    const { instanceId, requestId } = payload;
    try {
        const result = await backup_service_1.backupService.getBackupSettings(instanceId);
        if (result.success) {
            messaging_service_1.messagingService.sendToOriginator('get-backup-settings', {
                success: true,
                settings: result.settings,
                requestId
            }, sender);
        }
        else {
            messaging_service_1.messagingService.sendToOriginator('get-backup-settings', {
                success: false,
                error: result.error,
                requestId
            }, sender);
        }
    }
    catch (error) {
        console.error('[backup-handler] Failed to handle get-backup-settings:', error);
        messaging_service_1.messagingService.sendToOriginator('get-backup-settings', {
            success: false,
            error: error?.message || 'Failed to get backup settings',
            requestId
        }, sender);
    }
});
/**
 * Handles the 'save-backup-settings' message event from the messaging service.
 *
 * When triggered, this handler invokes the BackupService to save the backup settings.
 * It then sends the result back to the originator of the message, including details such as
 * success status and any error information.
 * In case of unexpected errors during the backup settings saving, it logs the error and sends a failure
 * response to the originator.
 *
 * @param payload - The payload received with the message, expected to contain `instanceId`, `settings`,
 *                  and `requestId`.
 * @param sender - The sender of the message, used to route the response.
 */
messaging_service_1.messagingService.on('save-backup-settings', async (payload, sender) => {
    const { instanceId, settings, requestId } = payload;
    try {
        const result = await backup_service_1.backupService.saveBackupSettings(instanceId, settings);
        if (result.success) {
            messaging_service_1.messagingService.sendToOriginator('save-backup-settings', {
                success: true,
                message: result.message,
                requestId
            }, sender);
        }
        else {
            messaging_service_1.messagingService.sendToOriginator('save-backup-settings', {
                success: false,
                error: result.error,
                requestId
            }, sender);
        }
    }
    catch (error) {
        console.error('[backup-handler] Failed to handle save-backup-settings:', error);
        messaging_service_1.messagingService.sendToOriginator('save-backup-settings', {
            success: false,
            error: error?.message || 'Failed to save backup settings',
            requestId
        }, sender);
    }
});
/**
 * Handles the 'start-backup-scheduler' message event from the messaging service.
 *
 * When triggered, this handler invokes the BackupService to start the backup scheduler.
 * It then sends the result back to the originator of the message, including details such as
 * success status and any error information.
 * In case of unexpected errors during the backup scheduler starting, it logs the error and sends a failure
 * response to the originator.
 *
 * @param payload - The payload received with the message, expected to contain `instanceId` and `requestId`.
 * @param sender - The sender of the message, used to route the response.
 */
messaging_service_1.messagingService.on('start-backup-scheduler', async (payload, sender) => {
    const { instanceId, requestId } = payload;
    try {
        const result = await backup_service_1.backupService.startBackupScheduler(instanceId);
        if (result.success) {
            messaging_service_1.messagingService.sendToOriginator('start-backup-scheduler', {
                success: true,
                message: result.message,
                requestId
            }, sender);
        }
        else {
            messaging_service_1.messagingService.sendToOriginator('start-backup-scheduler', {
                success: false,
                error: result.error,
                requestId
            }, sender);
        }
    }
    catch (error) {
        console.error('[backup-handler] Failed to handle start-backup-scheduler:', error);
        messaging_service_1.messagingService.sendToOriginator('start-backup-scheduler', {
            success: false,
            error: error?.message || 'Failed to start backup scheduler',
            requestId
        }, sender);
    }
});
/**
 * Handles the 'stop-backup-scheduler' message event from the messaging service.
 *
 * When triggered, this handler invokes the BackupService to stop the backup scheduler.
 * It then sends the result back to the originator of the message, including details such as
 * success status and any error information.
 * In case of unexpected errors during the backup scheduler stopping, it logs the error and sends a failure
 * response to the originator.
 *
 * @param payload - The payload received with the message, expected to contain `instanceId` and `requestId`.
 * @param sender - The sender of the message, used to route the response.
 */
messaging_service_1.messagingService.on('stop-backup-scheduler', async (payload, sender) => {
    const { instanceId, requestId } = payload;
    try {
        const result = await backup_service_1.backupService.stopBackupScheduler(instanceId);
        if (result.success) {
            messaging_service_1.messagingService.sendToOriginator('stop-backup-scheduler', {
                success: true,
                message: result.message,
                requestId
            }, sender);
        }
        else {
            messaging_service_1.messagingService.sendToOriginator('stop-backup-scheduler', {
                success: false,
                error: result.error,
                requestId
            }, sender);
        }
    }
    catch (error) {
        console.error('[backup-handler] Failed to handle stop-backup-scheduler:', error);
        messaging_service_1.messagingService.sendToOriginator('stop-backup-scheduler', {
            success: false,
            error: error?.message || 'Failed to stop backup scheduler',
            requestId
        }, sender);
    }
});
/**
 * Handles the 'get-scheduler-status' message event from the messaging service.
 *
 * When triggered, this handler invokes the BackupService to get the status of the backup scheduler.
 * It then sends the result back to the originator of the message, including details such as
 * success status and any error information.
 * In case of unexpected errors during the backup scheduler status retrieval, it logs the error and sends a failure
 * response to the originator.
 *
 * @param payload - The payload received with the message, expected to contain `instanceId` and `requestId`.
 * @param sender - The sender of the message, used to route the response.
 */
messaging_service_1.messagingService.on('get-scheduler-status', async (payload, sender) => {
    const { instanceId, requestId } = payload;
    try {
        const result = await backup_service_1.backupService.getSchedulerStatus(instanceId);
        if (result.success) {
            messaging_service_1.messagingService.sendToOriginator('get-scheduler-status', {
                success: true,
                isRunning: result.isRunning,
                nextBackup: result.nextBackup,
                requestId
            }, sender);
        }
        else {
            messaging_service_1.messagingService.sendToOriginator('get-scheduler-status', {
                success: false,
                error: result.error,
                requestId
            }, sender);
        }
    }
    catch (error) {
        console.error('[backup-handler] Failed to handle get-scheduler-status:', error);
        messaging_service_1.messagingService.sendToOriginator('get-scheduler-status', {
            success: false,
            error: error?.message || 'Failed to get scheduler status',
            requestId
        }, sender);
    }
});
/**
 * Handles the 'download-backup' message event from the messaging service.
 *
 * When triggered, this handler invokes the BackupService to download a specific backup.
 * It then sends the result back to the originator of the message, including details such as
 * success status and any error information.
 * In case of unexpected errors during the backup download, it logs the error and sends a failure
 * response to the originator.
 *
 * @param payload - The payload received with the message, expected to contain `instanceId`, `backupId`, and `requestId`.
 * @param sender - The sender of the message, used to route the response.
 */
messaging_service_1.messagingService.on('download-backup', async (payload, sender) => {
    const { instanceId, backupId, requestId } = payload;
    try {
        const result = await backup_service_1.backupService.downloadBackup(instanceId, backupId);
        if (result.success) {
            messaging_service_1.messagingService.sendToOriginator('download-backup', {
                success: true,
                filePath: result.filePath,
                fileName: result.fileName,
                requestId
            }, sender);
        }
        else {
            messaging_service_1.messagingService.sendToOriginator('download-backup', {
                success: false,
                error: result.error,
                requestId
            }, sender);
        }
    }
    catch (error) {
        console.error('[backup-handler] Failed to handle download-backup:', error);
        messaging_service_1.messagingService.sendToOriginator('download-backup', {
            success: false,
            error: error?.message || 'Failed to prepare backup download',
            requestId
        }, sender);
    }
});
