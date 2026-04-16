"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupAllArkServers = cleanupAllArkServers;
exports.cleanupOrphanedArkProcesses = cleanupOrphanedArkProcesses;
const child_process_1 = require("child_process");
const platform_utils_1 = require("../../platform.utils");
const ark_server_state_utils_1 = require("./ark-server-state.utils");
// --- Cleanup Functions ---
/**
 * Cleanup function to terminate all running ARK server processes
 * Should be called when the Electron app is shutting down
 */
function cleanupAllArkServers() {
    Object.keys(ark_server_state_utils_1.arkServerProcesses).forEach(instanceId => {
        const proc = ark_server_state_utils_1.arkServerProcesses[instanceId];
        if (proc && !proc.killed) {
            try {
                // On Linux with xvfb-run, we need to kill the entire process tree
                if ((0, platform_utils_1.getPlatform)() === 'linux') {
                    // Kill the process group to ensure xvfb and all child processes are terminated
                    try {
                        process.kill(-proc.pid, 'SIGTERM');
                    }
                    catch (e) {
                        // If process group kill fails, try individual process
                        proc.kill('SIGTERM');
                    }
                }
                else {
                    proc.kill('SIGTERM');
                }
                // Force kill after 5 seconds if still running
                setTimeout(() => {
                    if (!proc.killed) {
                        if ((0, platform_utils_1.getPlatform)() === 'linux') {
                            try {
                                process.kill(-proc.pid, 'SIGKILL');
                            }
                            catch (e) {
                                proc.kill('SIGKILL');
                            }
                            // Also clean up any remaining xvfb processes
                            try {
                                (0, child_process_1.spawn)('pkill', ['-f', `xvfb.*proton.*ArkAscendedServer`], { stdio: 'ignore' });
                            }
                            catch (e) {
                                // Ignore pkill errors
                            }
                        }
                        else {
                            proc.kill('SIGKILL');
                        }
                    }
                }, 5000);
            }
            catch (error) {
                console.error(`[ark-server-utils] Error terminating ARK server ${instanceId}:`, error);
            }
        }
    });
    // Clear the processes object
    Object.keys(ark_server_state_utils_1.arkServerProcesses).forEach(key => {
        delete ark_server_state_utils_1.arkServerProcesses[key];
    });
    // On Linux, also perform system-level cleanup for any orphaned processes
    if ((0, platform_utils_1.getPlatform)() === 'linux') {
        try {
            // Kill any remaining ARK server processes that might have been orphaned
            try {
                (0, child_process_1.execSync)('pkill -f ArkAscendedServer', { stdio: 'ignore' });
            }
            catch (e) {
                // Ignore if no processes found
            }
            // Kill any remaining Proton processes running ARK
            try {
                (0, child_process_1.execSync)('pkill -f "proton.*ArkAscendedServer"', { stdio: 'ignore' });
            }
            catch (e) {
                // Ignore if no processes found
            }
            // Kill any remaining xvfb processes that might be stuck
            try {
                (0, child_process_1.execSync)('pkill -f "Xvfb.*ArkAscendedServer"', { stdio: 'ignore' });
            }
            catch (e) {
                // Ignore if no processes found
            }
        }
        catch (e) {
            console.error('[ark-server-utils] System-level cleanup failed:', e);
        }
    }
}
/**
 * Cleanup orphaned ARK processes on startup (useful after crashes)
 * This is more aggressive than the normal cleanup and should be called on app startup
 */
function cleanupOrphanedArkProcesses() {
    if ((0, platform_utils_1.getPlatform)() === 'linux') {
        try {
            // Kill any ARK server processes
            try {
                (0, child_process_1.execSync)('pkill -f ArkAscendedServer', { stdio: 'ignore' });
            }
            catch (e) {
                // Ignore if no processes found
            }
            // Kill any Proton processes running ARK
            try {
                (0, child_process_1.execSync)('pkill -f "proton.*ArkAscendedServer"', { stdio: 'ignore' });
            }
            catch (e) {
                // Ignore if no processes found
            }
            // Kill any xvfb processes that might be stuck
            try {
                (0, child_process_1.execSync)('pkill -f "Xvfb.*ArkAscendedServer"', { stdio: 'ignore' });
            }
            catch (e) {
                // Ignore if no processes found
            }
            // Kill any wine processes that might be related to ARK (if somehow still present)
            try {
                (0, child_process_1.execSync)('pkill -f "wine.*ArkAscendedServer"', { stdio: 'ignore' });
            }
            catch (e) {
                // Ignore if no processes found
            }
        }
        catch (e) {
            console.error('[ark-server-utils] Orphaned process cleanup failed:', e);
        }
    }
    else {
        // On Windows, use taskkill for orphaned processes
        try {
            try {
                (0, child_process_1.execSync)('taskkill /F /IM ArkAscendedServer.exe', { stdio: 'ignore' });
            }
            catch (e) {
                // Ignore if no processes found
            }
        }
        catch (e) {
            console.error('[ark-server-utils] Windows orphaned process cleanup failed:', e);
        }
    }
}
