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
exports.ArkLogUtils = void 0;
// --- Imports ---
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const ark_path_utils_1 = require("./ark-path.utils");
// --- Log Parsing Helpers ---
class ArkLogUtils {
    /**
     * Parse ARK server logs for useful information
     */
    static parseServerLogs(logContent) {
        const lines = logContent.split('\n');
        const result = {
            serverStarted: false,
            errors: [],
            warnings: [],
            playerJoins: [],
            playerLeaves: []
        };
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine)
                continue;
            // Check for server startup
            if (trimmedLine.includes('Server ready') || trimmedLine.includes('Listening on port')) {
                result.serverStarted = true;
            }
            // Check for errors
            if (trimmedLine.toLowerCase().includes('error')) {
                result.errors.push(trimmedLine);
            }
            // Check for warnings
            if (trimmedLine.toLowerCase().includes('warning')) {
                result.warnings.push(trimmedLine);
            }
            // Check for player events
            if (trimmedLine.includes('joined the game')) {
                result.playerJoins.push(trimmedLine);
            }
            if (trimmedLine.includes('left the game')) {
                result.playerLeaves.push(trimmedLine);
            }
        }
        return result;
    }
    /**
     * Get the latest log file for a server session
     */
    static getLatestLogFile(sessionName) {
        const logsDir = ark_path_utils_1.ArkPathUtils.getArkLogsDir();
        if (!fs.existsSync(logsDir)) {
            return null;
        }
        try {
            // ARK log files are named ShooterGame.log or ShooterGame_X.log, not by session name
            const logFiles = fs.readdirSync(logsDir)
                .filter(file => /^ShooterGame(\_\d+)?\.log$/.test(file) && !file.includes('BACKUP') && !file.includes('backup'))
                .map(file => ({
                name: file,
                path: path.join(logsDir, file),
                stats: fs.statSync(path.join(logsDir, file))
            }))
                .sort((a, b) => b.stats.mtime.getTime() - a.stats.mtime.getTime());
            // Try to find a log file that contains our session name
            for (const logFile of logFiles) {
                try {
                    const content = fs.readFileSync(logFile.path, 'utf8');
                    if (content.includes(`SessionName=${sessionName}`) || content.includes(sessionName)) {
                        return logFile.path;
                    }
                }
                catch (error) {
                    // Continue to next file if this one can't be read
                    continue;
                }
            }
            // If no session-specific log found, return the most recent ShooterGame log
            return logFiles.length > 0 ? logFiles[0].path : null;
        }
        catch (error) {
            console.error('[ark-utils] Failed to get latest log file:', error);
            return null;
        }
    }
}
exports.ArkLogUtils = ArkLogUtils;
