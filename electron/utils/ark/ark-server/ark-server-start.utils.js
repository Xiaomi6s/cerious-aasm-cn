"use strict";
// ark-server-start.utils.ts
// Utility functions for starting ARK server instances
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
exports.startArkServerInstance = startArkServerInstance;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const network_utils_1 = require("../../network.utils");
const instance_utils_1 = require("../../ark/instance.utils");
const ark_server_logging_utils_1 = require("./ark-server-logging.utils");
const ark_server_process_utils_1 = require("./ark-server-process.utils");
const ark_server_state_utils_1 = require("./ark-server-state.utils");
// --- Helper Functions ---
function generateRandomPassword(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let pwd = '';
    for (let i = 0; i < length; i++) {
        pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pwd;
}
function getInstanceSaveDir(instanceDir) {
    return path.join(instanceDir, 'SavedArks');
}
/**
 * Validates that required ports are available
 */
async function validateServerPorts(config, onLog) {
    const gamePort = config.gamePort || 7777;
    const rconPort = config.rconPort || 27020;
    const gamePortInUse = await (0, network_utils_1.isPortInUse)(gamePort);
    if (gamePortInUse) {
        const error = `Game port ${gamePort} is already in use.`;
        if (onLog)
            onLog(`[ERROR] ${error}`);
        return { valid: false, error };
    }
    const rconPortInUse = await (0, network_utils_1.isPortInUse)(rconPort);
    if (rconPortInUse) {
        const error = `RCON port ${rconPort} is already in use.`;
        if (onLog)
            onLog(`[ERROR] ${error}`);
        return { valid: false, error };
    }
    const queryPort = config.queryPort || 27015;
    const queryPortInUse = await (0, network_utils_1.isPortInUse)(queryPort);
    if (queryPortInUse) {
        const error = `Query port ${queryPort} (Steam discovery) is already in use.`;
        if (onLog)
            onLog(`[ERROR] ${error}`);
        return { valid: false, error };
    }
    return { valid: true };
}
/**
 * Prepares server configuration and generates missing values
 */
function prepareServerConfig(instanceDir, config) {
    // Generate a random RCON password if missing
    if (!config.rconPassword) {
        config.rconPassword = generateRandomPassword(16);
        // Save it back to config.json
        try {
            const configPath = path.join(instanceDir, 'config.json');
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
        }
        catch (e) {
            console.error('[ark-server-utils] Failed to save generated RCON password:', e);
        }
    }
    return config;
}
/**
 * Start an Ark server instance by instanceId. Config and save files are isolated per instance.
 * @param instanceId The unique ID of the server instance
 * @param onLog Callback for log output
 * @param onState Callback for state changes
 * @returns true if started, false if already running or not installed
 */
async function startArkServerInstance(instanceId, onLog, onState) {
    try {
        // 1. Load instance config (instance directory should already exist)
        const { instanceDir, config } = (0, instance_utils_1.loadInstanceConfig)(instanceId);
        // 2. Validate that required ports are available
        const portValidation = await validateServerPorts(config, onLog);
        if (!portValidation.valid) {
            return { started: false, portError: portValidation.error };
        }
        // 3. Clean up old log files for this session
        (0, ark_server_logging_utils_1.cleanupOldLogFiles)(config, onLog);
        // 4. Prepare server configuration
        const preparedConfig = prepareServerConfig(instanceDir, config);
        // 5. Spawn the server process
        const { proc } = (0, ark_server_process_utils_1.spawnServerProcess)(instanceId, instanceDir, preparedConfig);
        // 6. Set initial state
        (0, ark_server_state_utils_1.setInstanceState)(instanceId, 'starting');
        if (onState)
            onState('starting');
        // 7. Setup log tailing
        const logTail = (0, ark_server_logging_utils_1.setupLogTailing)(instanceId, instanceDir, preparedConfig, onLog, onState);
        // 8. Setup process event handlers
        (0, ark_server_process_utils_1.setupProcessEventHandlers)(instanceId, proc, logTail, onLog, onState);
        return { started: true };
    }
    catch (error) {
        console.error('[ark-server-utils] Failed to start ARK server instance:', error);
        (0, ark_server_state_utils_1.setInstanceState)(instanceId, 'error');
        if (onState)
            onState('error');
        return { started: false, portError: error instanceof Error ? error.message : 'Unknown error' };
    }
}
