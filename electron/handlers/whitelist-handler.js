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
const whitelist_service_1 = require("../services/whitelist.service");
const instance_utils_1 = require("../utils/ark/instance.utils");
const path = __importStar(require("path"));
/**
 * Whitelist Handler - Manages whitelist-related message events
 */
/**
 * Load whitelist for a specific instance
 */
messaging_service_1.messagingService.on('load-whitelist', async (payload, sender) => {
    try {
        const { instanceId } = payload;
        if (!instanceId) {
            messaging_service_1.messagingService.sendToOriginator('load-whitelist', {
                success: false,
                error: 'Instance ID is required'
            }, sender);
            return;
        }
        const instanceDir = path.join((0, instance_utils_1.getInstancesBaseDir)(), instanceId);
        const result = whitelist_service_1.whitelistService.loadWhitelistFromInstance(instanceDir);
        messaging_service_1.messagingService.sendToOriginator('load-whitelist', {
            success: result.success,
            playerIds: result.playerIds || [],
            message: result.message,
            error: result.error
        }, sender);
    }
    catch (error) {
        console.error('[whitelist-handler] Failed to load whitelist:', error);
        messaging_service_1.messagingService.sendToOriginator('load-whitelist', {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to load whitelist'
        }, sender);
    }
});
/**
 * Add player to whitelist
 */
messaging_service_1.messagingService.on('add-to-whitelist', async (payload, sender) => {
    try {
        const { instanceId, playerId } = payload;
        if (!instanceId || !playerId) {
            messaging_service_1.messagingService.sendToOriginator('add-to-whitelist', {
                success: false,
                error: 'Instance ID and Player ID are required'
            }, sender);
            return;
        }
        const instanceDir = path.join((0, instance_utils_1.getInstancesBaseDir)(), instanceId);
        const result = whitelist_service_1.whitelistService.addToInstanceWhitelist(instanceDir, playerId.trim());
        messaging_service_1.messagingService.sendToOriginator('add-to-whitelist', {
            success: result.success,
            playerIds: result.playerIds || [],
            message: result.message,
            error: result.error
        }, sender);
    }
    catch (error) {
        console.error('[whitelist-handler] Failed to add player to whitelist:', error);
        messaging_service_1.messagingService.sendToOriginator('add-to-whitelist', {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to add player to whitelist'
        }, sender);
    }
});
/**
 * Remove player from whitelist
 */
messaging_service_1.messagingService.on('remove-from-whitelist', async (payload, sender) => {
    try {
        const { instanceId, playerId } = payload;
        if (!instanceId || !playerId) {
            messaging_service_1.messagingService.sendToOriginator('remove-from-whitelist', {
                success: false,
                error: 'Instance ID and Player ID are required'
            }, sender);
            return;
        }
        const instanceDir = path.join((0, instance_utils_1.getInstancesBaseDir)(), instanceId);
        const result = whitelist_service_1.whitelistService.removeFromInstanceWhitelist(instanceDir, playerId.trim());
        messaging_service_1.messagingService.sendToOriginator('remove-from-whitelist', {
            success: result.success,
            playerIds: result.playerIds || [],
            message: result.message,
            error: result.error
        }, sender);
    }
    catch (error) {
        console.error('[whitelist-handler] Failed to remove player from whitelist:', error);
        messaging_service_1.messagingService.sendToOriginator('remove-from-whitelist', {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to remove player from whitelist'
        }, sender);
    }
});
/**
 * Clear entire whitelist
 */
messaging_service_1.messagingService.on('clear-whitelist', async (payload, sender) => {
    try {
        const { instanceId } = payload;
        if (!instanceId) {
            messaging_service_1.messagingService.sendToOriginator('clear-whitelist', {
                success: false,
                error: 'Instance ID is required'
            }, sender);
            return;
        }
        const instanceDir = path.join((0, instance_utils_1.getInstancesBaseDir)(), instanceId);
        const result = whitelist_service_1.whitelistService.clearInstanceWhitelist(instanceDir);
        messaging_service_1.messagingService.sendToOriginator('clear-whitelist', {
            success: result.success,
            playerIds: result.playerIds || [],
            message: result.message,
            error: result.error
        }, sender);
    }
    catch (error) {
        console.error('[whitelist-handler] Failed to clear whitelist:', error);
        messaging_service_1.messagingService.sendToOriginator('clear-whitelist', {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to clear whitelist'
        }, sender);
    }
});
console.log('[whitelist-handler] Whitelist message handlers registered');
