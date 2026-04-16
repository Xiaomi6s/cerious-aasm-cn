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
exports.rconService = exports.RconService = void 0;
const rcon_utils_1 = require("../utils/rcon.utils");
const instanceUtils = __importStar(require("../utils/ark/instance.utils"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * 从实例的 GameUserSettings.ini 读取实际生效的 ServerAdminPassword。
 * ARK 服务器启动时会把命令行参数写入 INI，所以 INI 里的值才是 RCON 认证用的真实密码。
 * 返回 [cleanPassword, rawPassword]：clean 是截断 ? 后的值，raw 是 INI 里的原始值。
 */
function readAdminPasswordFromIni(instanceId) {
    try {
        const baseDir = instanceUtils.getInstancesBaseDir();
        const iniPath = path.join(baseDir, instanceId, 'Config', 'WindowsServer', 'GameUserSettings.ini');
        if (!fs.existsSync(iniPath))
            return { clean: null, raw: null };
        const content = fs.readFileSync(iniPath, 'utf-8');
        const match = content.match(/^ServerAdminPassword=(.+)$/m);
        if (!match)
            return { clean: null, raw: null };
        const raw = match[1].trim();
        const qIdx = raw.indexOf('?');
        const clean = qIdx >= 0 ? raw.substring(0, qIdx) : raw;
        return { clean, raw };
    }
    catch {
        return { clean: null, raw: null };
    }
}
/**
 * RCON Service - Handles all RCON-related operations
 * Encapsulates RCON connection management, command execution, and status tracking
 */
class RconService {
    /**
     * Connect RCON for a server instance
     * @param instanceId - The unique identifier of the server instance
     * @returns A promise resolving to an object indicating the result of the connection attempt
     */
    async connectRcon(instanceId) {
        try {
            if (!instanceId) {
                return {
                    success: false,
                    connected: false,
                    instanceId: instanceId || '',
                    error: 'Invalid instance ID'
                };
            }
            const instance = await instanceUtils.getInstance(instanceId);
            if (!instance) {
                return {
                    success: false,
                    connected: false,
                    instanceId,
                    error: 'Instance not found'
                };
            }
            if (!instance.rconPort || (!instance.serverAdminPassword && !instance.rconPassword)) {
                return {
                    success: false,
                    connected: false,
                    instanceId,
                    error: 'RCON not configured for this instance'
                };
            }
            // 优先从 INI 文件读取实际密码（ARK 启动后会把命令行参数写入 INI，INI 里的才是真实生效的密码）
            // raw: INI 原始值（可能含 ?MaxPlayers=70 等污染内容，但 ARK 内存里就是这个值）
            // clean: 截断 ? 后的干净密码（服务器重启后生效）
            const iniResult = readAdminPasswordFromIni(instanceId);
            const configPassword = instance.serverAdminPassword || instance.rconPassword || '';
            // 候选密码列表，按优先级排列：INI 原始值 > INI 干净值 > config 值
            const passwordCandidates = [
                iniResult.raw,
                iniResult.clean,
                configPassword
            ].filter((p, i, arr) => p && arr.indexOf(p) === i); // 去重去空
            if (passwordCandidates.length === 0) {
                return { success: false, connected: false, instanceId, error: 'No password configured' };
            }
            // 用第一个候选密码（INI 原始值）构建连接配置
            const effectivePassword = passwordCandidates[0];
            const instanceWithEffectivePassword = { ...instance, serverAdminPassword: effectivePassword, rconPassword: effectivePassword };
            return new Promise((resolve) => {
                // If already connected, resolve immediately
                if ((0, rcon_utils_1.isRconConnected)(instanceId)) {
                    resolve({ success: true, connected: true, instanceId });
                    return;
                }
                // If a retry loop is already running, wait for it to finish
                if ((0, rcon_utils_1.isRconConnecting)(instanceId)) {
                    const waitInterval = setInterval(() => {
                        if ((0, rcon_utils_1.isRconConnected)(instanceId)) {
                            clearInterval(waitInterval);
                            resolve({ success: true, connected: true, instanceId });
                        }
                        else if (!(0, rcon_utils_1.isRconConnecting)(instanceId)) {
                            clearInterval(waitInterval);
                            resolve({ success: true, connected: false, instanceId, error: 'RCON connection failed' });
                        }
                    }, 500);
                    return;
                }
                (0, rcon_utils_1.connectRcon)(instanceId, instanceWithEffectivePassword, (isConnected) => {
                    resolve({
                        success: true,
                        connected: isConnected,
                        instanceId,
                        error: isConnected ? undefined : 'Failed to establish RCON connection'
                    });
                });
            });
        }
        catch (error) {
            console.error('[rcon-service] Failed to connect RCON:', error);
            return {
                success: false,
                connected: false,
                instanceId,
                error: error instanceof Error ? error.message : 'Failed to connect RCON'
            };
        }
    }
    /**
     * Disconnect RCON for a server instance
     * @param instanceId - The unique identifier of the server instance
     * @returns A promise resolving to an object indicating the result of the disconnection attempt
     */
    async disconnectRcon(instanceId) {
        try {
            await (0, rcon_utils_1.disconnectRcon)(instanceId);
            return {
                success: true,
                connected: false,
                instanceId
            };
        }
        catch (error) {
            console.error('[rcon-service] Failed to disconnect RCON:', error);
            return {
                success: false,
                connected: false,
                instanceId,
                error: error instanceof Error ? error.message : 'Failed to disconnect RCON'
            };
        }
    }
    /**
     * Get RCON connection status for a server instance
     * @param instanceId - The unique identifier of the server instance
     * @returns A promise resolving to an object containing the RCON status
     */
    getRconStatus(instanceId) {
        const connected = (0, rcon_utils_1.isRconConnected)(instanceId);
        return {
            success: true,
            connected,
            instanceId
        };
    }
    /**
     * Execute an RCON command on a server instance
     * @param instanceId - The unique identifier of the server instance
     * @param command - The RCON command to execute
     * @returns A promise resolving to an object indicating the result of the command execution
     */
    async executeRconCommand(instanceId, command) {
        try {
            if (!instanceId || !command) {
                return {
                    success: false,
                    instanceId: instanceId || '',
                    error: 'Invalid instance ID or command'
                };
            }
            if (!(0, rcon_utils_1.isRconConnected)(instanceId)) {
                return {
                    success: false,
                    instanceId,
                    error: 'RCON not connected for this instance'
                };
            }
            const response = await (0, rcon_utils_1.sendRconCommand)(instanceId, command);
            return {
                success: true,
                response,
                instanceId
            };
        }
        catch (error) {
            console.error('[rcon-service] Failed to execute RCON command:', error);
            return {
                success: false,
                instanceId,
                error: error instanceof Error ? error.message : 'Failed to execute RCON command'
            };
        }
    }
    /**
     * Get list of online players
     */
    async getOnlinePlayers(instanceId) {
        const result = await this.executeRconCommand(instanceId, 'ListPlayers');
        if (!result.success || !result.response)
            return [];
        // Parse ARK Check format: "No Players Connected" or "0. Name, SteamID"
        if (result.response.includes('No Players Connected'))
            return [];
        const lines = result.response.split('\n');
        const players = [];
        for (const line of lines) {
            // Regex for "0. PlayerName, 12345678"
            const match = line.match(/\d+\.\s+(.+),\s+(\d+)/);
            if (match) {
                players.push({
                    name: match[1],
                    steamId: match[2]
                });
            }
        }
        return players;
    }
    /**
     * Auto-connect RCON with callback for status updates
     * @param instanceId - The unique identifier of the server instance
     * @param onStatusChange - Optional callback to receive connection status updates
     */
    async autoConnectRcon(instanceId, onStatusChange) {
        try {
            const instance = await instanceUtils.getInstance(instanceId);
            if (instance && instance.rconPort && (instance.rconPassword || instance.serverAdminPassword)) {
                const iniPassword = readAdminPasswordFromIni(instanceId);
                const effectivePassword = iniPassword || instance.serverAdminPassword || instance.rconPassword;
                const instanceWithEffectivePassword = { ...instance, serverAdminPassword: effectivePassword, rconPassword: effectivePassword };
                (0, rcon_utils_1.connectRcon)(instanceId, instanceWithEffectivePassword, (connected) => {
                    if (onStatusChange) {
                        onStatusChange(connected);
                    }
                });
            }
        }
        catch (error) {
            console.warn('[rcon-service] Auto-connect RCON failed:', error);
            if (onStatusChange) {
                onStatusChange(false);
            }
        }
    }
    /**
     *
     * @param instanceId - The unique identifier of the server instance
     * @returns A promise that resolves when the force disconnect attempt is complete
     * Force disconnect RCON without throwing errors
     */
    async forceDisconnectRcon(instanceId) {
        try {
            await (0, rcon_utils_1.disconnectRcon)(instanceId);
        }
        catch (error) {
            console.warn('[rcon-service] Force disconnect RCON failed, continuing...', error);
        }
    }
}
exports.RconService = RconService;
// Export singleton instance
exports.rconService = new RconService();
