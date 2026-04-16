"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serverOperationsService = exports.ServerOperationsService = void 0;
const validation_utils_1 = require("../../utils/validation.utils");
const rcon_service_1 = require("../rcon.service");
/**
 * Server Operations Service - Handles RCON operations and other server operations
 */
class ServerOperationsService {
    /**
     * Establish an RCON connection to a running server instance
     */
    async connectRcon(instanceId) {
        try {
            if (!(0, validation_utils_1.validateInstanceId)(instanceId)) {
                return {
                    success: false,
                    error: 'Invalid instance ID',
                    instanceId,
                    connected: false
                };
            }
            const instance = await require('../../utils/ark/instance.utils').getInstance(instanceId);
            if (!instance) {
                return {
                    success: false,
                    error: 'Instance not found',
                    instanceId,
                    connected: false
                };
            }
            const result = await rcon_service_1.rconService.connectRcon(instanceId);
            const connected = result.connected;
            return {
                success: true,
                connected,
                instanceId
            };
        }
        catch (error) {
            console.error('[server-operations-service] Failed to connect RCON:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to connect RCON',
                instanceId,
                connected: false
            };
        }
    }
    /**
     * Disconnect the RCON connection from a server instance
     */
    async disconnectRcon(instanceId) {
        try {
            const result = await rcon_service_1.rconService.disconnectRcon(instanceId);
            return {
                success: true,
                connected: false,
                instanceId
            };
        }
        catch (error) {
            console.error('[server-operations-service] Failed to disconnect RCON:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to disconnect RCON',
                instanceId,
                connected: false
            };
        }
    }
    /**
     * Get RCON connection status
     */
    getRconStatus(instanceId) {
        const result = rcon_service_1.rconService.getRconStatus(instanceId);
        return {
            success: result.success,
            connected: result.connected,
            instanceId: result.instanceId
        };
    }
    /**
     * Execute an RCON command on a server instance
     */
    async executeRconCommand(instanceId, command) {
        try {
            if (!(0, validation_utils_1.validateInstanceId)(instanceId)) {
                return {
                    success: false,
                    error: 'Invalid instance ID',
                    instanceId
                };
            }
            if (!command || typeof command !== 'string') {
                return {
                    success: false,
                    error: 'Invalid command',
                    instanceId
                };
            }
            const result = await rcon_service_1.rconService.executeRconCommand(instanceId, command);
            return {
                success: result.success,
                response: result.response,
                error: result.error,
                instanceId
            };
        }
        catch (error) {
            console.error('[server-operations-service] Failed to execute RCON command:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to execute RCON command',
                instanceId
            };
        }
    }
    /**
     * Send a chat message to the server
     */
    async sendChatMessage(instanceId, message) {
        return await this.executeRconCommand(instanceId, `ServerChat ${message}`);
    }
    /**
     * Kick a player from the server
     */
    async kickPlayer(instanceId, playerName) {
        return await this.executeRconCommand(instanceId, `KickPlayer ${playerName}`);
    }
    /**
     * Ban a player from the server
     */
    async banPlayer(instanceId, playerName) {
        return await this.executeRconCommand(instanceId, `BanPlayer ${playerName}`);
    }
    /**
     * Unban a player from the server
     */
    async unbanPlayer(instanceId, playerName) {
        return await this.executeRconCommand(instanceId, `UnbanPlayer ${playerName}`);
    }
    /**
     * Save the world
     */
    async saveWorld(instanceId) {
        return await this.executeRconCommand(instanceId, 'SaveWorld');
    }
    /**
     * Get server info
     */
    async getServerInfo(instanceId) {
        return await this.executeRconCommand(instanceId, 'GetServerInfo');
    }
    /**
     * List all players
     */
    async listPlayers(instanceId) {
        return await this.executeRconCommand(instanceId, 'ListPlayers');
    }
    /**
     * Broadcast a message to all players
     */
    async broadcast(instanceId, message) {
        return await this.executeRconCommand(instanceId, `Broadcast ${message}`);
    }
    /**
     * Set the server message of the day
     */
    async setMessageOfTheDay(instanceId, message) {
        return await this.executeRconCommand(instanceId, `SetMessageOfTheDay ${message}`);
    }
    /**
     * Force a tribe to be wiped
     */
    async destroyTribe(instanceId, tribeId) {
        return await this.executeRconCommand(instanceId, `DestroyTribe ${tribeId}`);
    }
    /**
     * Force a player to be wiped
     */
    async destroyPlayer(instanceId, playerId) {
        return await this.executeRconCommand(instanceId, `DestroyPlayer ${playerId}`);
    }
    /**
     * Add a player to the whitelist (exclusive join list)
     */
    async allowPlayerToJoinNoCheck(instanceId, playerId) {
        return await this.executeRconCommand(instanceId, `cheat AllowPlayerToJoinNoCheck ${playerId}`);
    }
    /**
     * Remove a player from the whitelist (exclusive join list)
     */
    async disallowPlayerToJoinNoCheck(instanceId, playerId) {
        return await this.executeRconCommand(instanceId, `cheat DisallowPlayerToJoinNoCheck ${playerId}`);
    }
}
exports.ServerOperationsService = ServerOperationsService;
// Export singleton instance
exports.serverOperationsService = new ServerOperationsService();
