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
const messaging_service_1 = require("../services/messaging.service");
const config_import_export_service_1 = require("../services/config-import-export.service");
const instanceUtils = __importStar(require("../utils/ark/instance.utils"));
const server_management_service_1 = require("../services/server-instance/server-management.service");
/**
 * Handle export-server-config: Export a server's configuration as a ZIP containing INI files.
 *
 * @param payload.id - Server instance ID to export
 */
messaging_service_1.messagingService.on('export-server-config', async (payload, sender) => {
    const { id, requestId } = payload || {};
    try {
        if (!id) {
            throw new Error('Server instance ID is required');
        }
        const config = instanceUtils.getInstance(id);
        if (!config) {
            throw new Error(`Server instance not found: ${id}`);
        }
        const zipResult = config_import_export_service_1.configImportExportService.exportConfigAsZip(config);
        if (!zipResult.success) {
            throw new Error(zipResult.error || 'Failed to create ZIP');
        }
        const suggestedFileName = `${config.name || 'server'}-config.zip`;
        messaging_service_1.messagingService.sendToOriginator('export-server-config', {
            success: true,
            base64: zipResult.base64,
            suggestedFileName,
            requestId
        }, sender);
    }
    catch (error) {
        console.error('[config-import-export-handler] Export failed:', error);
        messaging_service_1.messagingService.sendToOriginator('export-server-config', {
            success: false,
            error: error?.message || 'Failed to export config',
            requestId
        }, sender);
    }
});
/**
 * Handle import-server-config: Import server configuration from an INI file.
 *
 * @param payload.targetId - Optional: existing server instance ID to merge settings into
 * @param payload.content - Raw INI content
 * @param payload.fileName - File name (e.g. GameUserSettings.ini or Game.ini)
 */
messaging_service_1.messagingService.on('import-server-config', async (payload, sender) => {
    const { targetId, content, fileName, requestId } = payload || {};
    try {
        if (!content) {
            throw new Error('No INI content provided');
        }
        const files = [];
        files.push({ fileName: fileName || 'GameUserSettings.ini', content });
        const result = config_import_export_service_1.configImportExportService.importFromIni(files);
        if (!result.success)
            throw new Error(result.error);
        const importedConfig = result.config;
        const warnings = result.warnings || [];
        // If a target server ID is provided, merge into that server's config
        if (targetId) {
            const existing = instanceUtils.getInstance(targetId);
            if (!existing) {
                throw new Error(`Target server not found: ${targetId}`);
            }
            // Merge imported config over existing, preserving identity fields
            const merged = {
                ...existing,
                ...importedConfig,
                id: existing.id,
                name: existing.name,
            };
            const saveResult = await server_management_service_1.serverManagementService.saveInstance(merged);
            if (!saveResult.success) {
                throw new Error(saveResult.error || 'Failed to save merged config');
            }
            const allInstances = await server_management_service_1.serverManagementService.getAllInstances();
            messaging_service_1.messagingService.sendToAll('server-instances', allInstances.instances);
            messaging_service_1.messagingService.sendToAll('server-instance-updated', saveResult.instance);
            messaging_service_1.messagingService.sendToOriginator('import-server-config', {
                success: true,
                config: saveResult.instance,
                merged: true,
                warnings,
                requestId
            }, sender);
        }
        else {
            messaging_service_1.messagingService.sendToOriginator('import-server-config', {
                success: true,
                config: importedConfig,
                merged: false,
                warnings,
                requestId
            }, sender);
        }
        messaging_service_1.messagingService.sendToAll('notification', {
            type: 'success',
            message: `Server configuration imported successfully.${warnings.length > 0 ? ` (${warnings.length} warnings)` : ''}`
        });
    }
    catch (error) {
        console.error('[config-import-export-handler] Import failed:', error);
        messaging_service_1.messagingService.sendToOriginator('import-server-config', {
            success: false,
            error: error?.message || 'Failed to import config',
            requestId
        }, sender);
    }
});
