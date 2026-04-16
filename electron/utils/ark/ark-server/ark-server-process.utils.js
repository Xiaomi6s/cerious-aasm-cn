"use strict";
// ark-server-process.utils.ts
// Utility functions for ARK server process management
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
exports.spawnServerProcess = spawnServerProcess;
exports.setupProcessEventHandlers = setupProcessEventHandlers;
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const child_process_1 = require("child_process");
const platform_utils_1 = require("../../platform.utils");
const ark_args_utils_1 = require("../ark-args.utils");
const ark_server_install_utils_1 = require("./ark-server-install.utils");
const ark_server_paths_utils_1 = require("./ark-server-paths.utils");
const ark_server_state_utils_1 = require("./ark-server-state.utils");
/**
 * Spawns the ARK server process
 */
function spawnServerProcess(instanceId, instanceDir, config) {
    // Prefer the instance's own exe copy so Windows DLL search loads AsaApi/plugins
    // from the instance-specific Win64 folder rather than the shared install.
    const instanceWin64 = path.join(instanceDir, 'ShooterGame', 'Binaries', 'Win64');
    const instanceExe = path.join(instanceWin64, 'ArkAscendedServer.exe');
    const sharedExe = (0, ark_server_paths_utils_1.getArkExecutablePath)();
    const useInstanceExe = (0, platform_utils_1.getPlatform)() === 'windows' && fs.existsSync(instanceExe);
    const arkExecutable = useInstanceExe ? instanceExe : sharedExe;
    if (!fs.existsSync(arkExecutable)) {
        throw new Error('Ark server not installed');
    }
    // Build command line args from config (ensure rconPassword is used)
    const args = (0, ark_args_utils_1.buildArkServerArgs)({ ...config, serverAdminPassword: undefined });
    // Prepare cross-platform command
    const commandInfo = (0, ark_server_paths_utils_1.prepareArkServerCommand)(arkExecutable, args);
    // Format save/config/log directories for env (use forward slashes for cross-platform compatibility)
    const formattedSaveDir = getInstanceSaveDir(instanceDir).replace(/\\/g, '/');
    const formattedConfigDir = instanceDir.replace(/\\/g, '/');
    const formattedLogDir = path.join((0, ark_server_install_utils_1.getArkServerDir)(), 'ShooterGame', 'Saved', 'Logs').replace(/\\/g, '/');
    // Use detailed spawn options for best compatibility
    // On Windows: run from instance Win64 dir so DLL search order finds per-instance AsaApi/plugins first.
    // On Linux/Proton: run from shared ARK install dir (Proton handles library loading differently).
    let spawnOptions = {
        cwd: useInstanceExe ? instanceWin64 : ((0, platform_utils_1.getPlatform)() === 'windows' ? instanceDir : (0, ark_server_install_utils_1.getArkServerDir)()),
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
            ...process.env,
            ...(commandInfo.env || {}), // Add Proton env vars on Linux
            PYTHONUNBUFFERED: '1',
            ARK_LOG_FLUSH: '1',
            _NO_DEBUG_HEAP: '1',
            MALLOC_CHECK_: '0',
            ARK_SAVE_PATH: formattedSaveDir,
            ARK_CONFIG_PATH: formattedConfigDir,
            ARK_LOG_PATH: formattedLogDir
        },
        shell: false,
        detached: (0, platform_utils_1.getPlatform)() === 'linux', // Create process group on Linux for proper cleanup
        windowsHide: true
    };
    // On Linux, prevent any stdio from attaching so no console windows are opened
    if ((0, platform_utils_1.getPlatform)() === 'linux') {
        spawnOptions.stdio = ['ignore', 'ignore', 'ignore'];
        spawnOptions.detached = true; // double-down on detaching
    }
    const proc = (0, child_process_1.spawn)(commandInfo.command, commandInfo.args, spawnOptions);
    ark_server_state_utils_1.arkServerProcesses[instanceId] = proc;
    return { proc, commandInfo };
}
/**
 * Sets up process event handlers
 */
function setupProcessEventHandlers(instanceId, proc, logTail, onLog, onState) {
    // Fallback: still capture stdout/stderr if any
    proc.stdout?.on('data', (data) => { if (onLog)
        onLog('[STDOUT] ' + data.toString()); });
    proc.stderr?.on('data', (data) => { if (onLog)
        onLog('[STDERR] ' + data.toString()); });
    proc.on('close', (code) => {
        if (onLog)
            onLog(`[PROCESS EXIT] Ark server exited with code ${code}`);
        (0, ark_server_state_utils_1.setInstanceState)(instanceId, 'stopped');
        if (onState)
            onState('stopped');
        delete ark_server_state_utils_1.arkServerProcesses[instanceId];
        if (logTail)
            logTail.close();
    });
    proc.on('error', (err) => {
        if (onLog)
            onLog('[ERROR] ' + err.message);
        (0, ark_server_state_utils_1.setInstanceState)(instanceId, 'error');
        if (onState)
            onState('error');
        delete ark_server_state_utils_1.arkServerProcesses[instanceId];
        if (logTail)
            logTail.close();
    });
}
function getInstanceSaveDir(instanceDir) {
    return path.join(instanceDir, 'SavedArks');
}
