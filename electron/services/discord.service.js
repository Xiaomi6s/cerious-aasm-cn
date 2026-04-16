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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.discordService = exports.DiscordService = void 0;
const axios_1 = __importDefault(require("axios"));
const instanceUtils = __importStar(require("../utils/ark/instance.utils"));
class DiscordService {
    /**
     * Send a notification to Discord via Webhook
     * @param instanceId - Server Instance ID
     * @param eventType - Type of event (start, stop, crash, update, join, leave)
     * @param message - The message description
     * @param details - Optional details (e.g. Build ID, Player Name)
     */
    async sendNotification(instanceId, eventType, message, details) {
        try {
            const instance = await instanceUtils.getInstance(instanceId);
            if (!instance)
                return;
            // Check if Discord settings exist and feature is enabled
            const discordConfig = instance.discordConfig;
            if (!discordConfig || !discordConfig.enabled || !discordConfig.webhookUrl)
                return;
            // Check if this specific event type is enabled
            if (!this.shouldSendNotification(discordConfig, eventType))
                return;
            const serverName = instance.sessionName || instance.name || instanceId;
            const color = this.getErrorColor(eventType);
            const payload = {
                username: "Cerious AASM",
                avatar_url: "https://i.imgur.com/4M34hi2.png", // Generic server icon or app icon
                embeds: [{
                        title: `Server Notification: ${serverName}`,
                        description: message,
                        color: color,
                        fields: details ? [{ name: "Details", value: details }] : [],
                        timestamp: new Date().toISOString(),
                        footer: {
                            text: `Instance: ${instanceId}`
                        }
                    }]
            };
            await axios_1.default.post(discordConfig.webhookUrl, payload);
        }
        catch (error) {
            console.error(`[discord-service] Failed to send webhook for ${instanceId}:`, error);
        }
    }
    shouldSendNotification(config, eventType) {
        if (!config.notifications)
            return true; // Default to true if detailed settings missing
        switch (eventType) {
            case 'start': return config.notifications.serverStart !== false;
            case 'stop': return config.notifications.serverStop !== false;
            case 'crash': return config.notifications.serverCrash !== false;
            case 'update': return config.notifications.serverUpdate !== false;
            case 'join': return config.notifications.serverJoin !== false;
            case 'leave': return config.notifications.serverLeave !== false;
            default: return true;
        }
    }
    getErrorColor(eventType) {
        switch (eventType) {
            case 'start': return 0x00FF00; // Green
            case 'stop': return 0xFFA500; // Orange
            case 'crash': return 0xFF0000; // Red
            case 'update': return 0x00FFFF; // Cyan
            case 'join': return 0x00AA00; // Dark Green
            case 'leave': return 0xAA0000; // Dark Red
            default: return 0x7289DA; // Blurple
        }
    }
}
exports.DiscordService = DiscordService;
exports.discordService = new DiscordService();
