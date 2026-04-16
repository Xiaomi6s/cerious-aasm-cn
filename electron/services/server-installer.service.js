"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serverInstallerService = exports.ServerInstallerService = void 0;
const steamcmd_utils_1 = require("../utils/steamcmd.utils");
const proton_utils_1 = require("../utils/proton.utils");
const ark_utils_1 = require("../utils/ark.utils");
const ark_utils_2 = require("../utils/ark.utils");
const system_deps_utils_1 = require("../utils/system-deps.utils");
const platform_utils_1 = require("../utils/platform.utils");
class ServerInstallerService {
    // Helper to create progress with just phase tracking
    createProgress(step, message, phase, phasePercent, overallPhase) {
        return {
            step,
            message,
            phase,
            phasePercent,
            overallPhase
        };
    }
    /**
     * Install the game server and its dependencies
     * @param onProgress - Callback to receive progress updates
     * @param sudoPassword - Optional sudo password for installing dependencies
     * @returns A promise resolving to the result of the installation
     */
    async installServer(onProgress, sudoPassword) {
        const result = {
            success: false,
            message: '',
            details: {
                linuxDeps: { installed: false, message: '' },
                proton: { installed: false, message: '' },
                steamcmd: { installed: false, message: '' },
                arkServer: { installed: false, message: '' },
                validation: { passed: false, message: '' }
            }
        };
        try {
            const platform = (0, platform_utils_1.getPlatform)();
            // Phase 1: Check and install Linux dependencies on Linux only
            onProgress(this.createProgress('linux-deps-check', 'Checking Linux dependencies...', 'linux-deps', 0, 'Checking Linux Dependencies'));
            if (platform === 'linux') {
                const depStatus = await (0, system_deps_utils_1.checkAllDependencies)();
                const missingDeps = depStatus.filter((d) => !d.installed);
                const missingRequired = missingDeps.filter((d) => d.dependency.required);
                if (missingRequired.length > 0) {
                    if (!sudoPassword) {
                        result.details.linuxDeps.message = `Sudo password required to install missing dependencies: ${missingRequired.map(d => d.dependency.name).join(', ')}`;
                        throw new Error(`Sudo password required to install missing Linux dependencies: ${missingRequired.map(d => d.dependency.name).join(', ')}. Please check installation requirements first.`);
                    }
                    onProgress(this.createProgress('linux-deps-install', 'Installing Linux dependencies...', 'linux-deps', 10, 'Installing Linux Dependencies'));
                    const depsResult = await (0, system_deps_utils_1.installMissingDependencies)(missingDeps.map(d => d.dependency), sudoPassword, (depsProgress) => {
                        onProgress(this.createProgress(`linux-deps-${depsProgress.step}`, depsProgress.message, 'linux-deps', Math.max(10, depsProgress.percent), 'Installing Linux Dependencies'));
                    });
                    if (!depsResult.success) {
                        result.details.linuxDeps.message = depsResult.message;
                        const detailLines = depsResult.details.length > 0 ? '\n' + depsResult.details.join('\n') : '';
                        throw new Error(`Failed to install Linux dependencies: ${depsResult.message}${detailLines}`);
                    }
                    result.details.linuxDeps.installed = true;
                    result.details.linuxDeps.message = depsResult.message;
                }
                else {
                    result.details.linuxDeps.installed = true;
                    result.details.linuxDeps.message = 'All required Linux dependencies are already installed';
                }
            }
            else {
                result.details.linuxDeps.installed = true;
                result.details.linuxDeps.message = 'Linux dependencies not required on this platform';
            }
            onProgress(this.createProgress('linux-deps-complete', 'Linux dependencies ready', 'linux-deps', 100, 'Installing Linux Dependencies'));
            // Phase 1.5: Install Proton on Linux - Only reports 0% -> 100% completion, no granular progress
            onProgress(this.createProgress('proton-check', 'Checking Proton...', 'proton', 0, 'Installing Proton'));
            if (platform === 'linux') {
                if (!(0, proton_utils_1.isProtonInstalled)()) {
                    onProgress(this.createProgress('proton-install', 'Installing Proton...', 'proton', 10, 'Installing Proton'));
                    await new Promise((resolve, reject) => {
                        (0, proton_utils_1.installProton)((err) => {
                            if (err) {
                                result.details.proton.message = err.message;
                                reject(err);
                            }
                            else {
                                result.details.proton.installed = true;
                                result.details.proton.message = 'Proton installed successfully';
                                resolve();
                            }
                        }, (progress) => {
                            // Parse proton progress if needed - assume it gives us some percentage
                            const percent = Math.min(10 + (progress.length % 80), 100);
                            onProgress(this.createProgress('proton-install', 'Installing Proton...', 'proton', percent, 'Installing Proton'));
                        });
                    });
                }
                else {
                    result.details.proton.installed = true;
                    result.details.proton.message = 'Proton already installed';
                }
            }
            else {
                result.details.proton.installed = true;
                result.details.proton.message = 'Proton not required on this platform';
            }
            onProgress(this.createProgress('proton-complete', 'Proton ready', 'proton', 100, 'Installing Proton'));
            // Phase 2: Install SteamCMD - Reports its own 0-100% progress
            onProgress(this.createProgress('steamcmd-check', 'Checking SteamCMD...', 'steamcmd', 0, 'Installing SteamCMD'));
            if (!(0, steamcmd_utils_1.isSteamCmdInstalled)()) {
                onProgress(this.createProgress('steamcmd-install', 'Installing SteamCMD...', 'steamcmd', 10, 'Installing SteamCMD'));
                await new Promise((resolve, reject) => {
                    (0, steamcmd_utils_1.installSteamCmd)((err) => {
                        if (err) {
                            result.details.steamcmd.message = err.message;
                            reject(err);
                        }
                        else {
                            result.details.steamcmd.installed = true;
                            result.details.steamcmd.message = 'SteamCMD installed successfully';
                            resolve();
                        }
                    }, (progress) => {
                        // SteamCMD progress may be a string or an object; handle both safely
                        let percent = 50;
                        let message = '';
                        if (progress && typeof progress === 'object') {
                            if (typeof progress.percent === 'number')
                                percent = Math.max(10, Math.min(progress.percent, 100));
                            message = progress.message || (progress.step ? String(progress.step) : 'Installing SteamCMD...');
                        }
                        else {
                            message = String(progress || 'Installing SteamCMD...');
                            const percentMatch = message.match(/(\d+)%/);
                            if (percentMatch) {
                                percent = Math.max(10, Math.min(parseInt(percentMatch[1], 10), 100));
                            }
                        }
                        onProgress(this.createProgress('steamcmd-install', message, 'steamcmd', percent, 'Installing SteamCMD'));
                    });
                });
            }
            else {
                result.details.steamcmd.installed = true;
                result.details.steamcmd.message = 'SteamCMD already installed';
            }
            onProgress(this.createProgress('steamcmd-complete', 'SteamCMD ready', 'steamcmd', 100, 'Installing SteamCMD'));
            // Phase 3: Download/Install ARK Server - Reports 0-100% progress from Steam
            onProgress(this.createProgress('ark-download-start', 'Starting ARK server download...', 'ark-download', 0, 'Downloading ARK Server'));
            await new Promise((resolve, reject) => {
                (0, ark_utils_2.installArkServer)((err) => {
                    if (err) {
                        result.details.arkServer.message = err.message;
                        reject(err);
                    }
                    else {
                        result.details.arkServer.installed = true;
                        result.details.arkServer.message = 'ARK server installed successfully';
                        resolve();
                    }
                }, (progress) => {
                    // ARK download progress may be a string or an object; handle both safely
                    let percent = 0;
                    let message = '';
                    if (progress && typeof progress === 'object') {
                        if (typeof progress.percent === 'number')
                            percent = Math.max(0, Math.min(progress.percent, 100));
                        message = progress.message || (progress.step ? String(progress.step) : 'Downloading ARK server...');
                    }
                    else {
                        message = String(progress || 'Downloading ARK server...');
                        const percentMatch = message.match(/(\d+)%/);
                        if (percentMatch) {
                            percent = Math.max(0, Math.min(parseInt(percentMatch[1], 10), 100));
                        }
                    }
                    onProgress(this.createProgress('ark-download', message, 'ark-download', percent, 'Downloading ARK Server'));
                });
            });
            onProgress(this.createProgress('ark-download-complete', 'ARK server download complete', 'ark-download', 100, 'Downloading ARK Server'));
            // Phase 4: Validation - Quick validation that everything is accessible
            onProgress(this.createProgress('validation-start', 'Validating installation...', 'validation', 0, 'Validating Installation'));
            try {
                // Check if ARK server executable exists and is accessible
                const arkServerDir = ark_utils_1.ArkPathUtils.getArkServerDir();
                const arkExecutable = ark_utils_1.ArkPathUtils.getArkExecutablePath();
                // Simple validation: check if the directories and files exist
                const fs = require('fs-extra');
                if (!fs.existsSync(arkServerDir)) {
                    throw new Error(`ARK server directory not found: ${arkServerDir}`);
                }
                if (!fs.existsSync(arkExecutable)) {
                    throw new Error(`ARK server executable not found: ${arkExecutable}`);
                }
                result.details.validation.passed = true;
                result.details.validation.message = 'Installation validation successful';
                onProgress(this.createProgress('validation-complete', 'Installation validated successfully', 'validation', 100, 'Validating Installation'));
                // 发送最终完成消息，前端据此关闭弹窗
                onProgress({
                    step: '安装完成',
                    message: '服务器安装成功！',
                    phase: 'validation',
                    phasePercent: 100,
                    overallPhase: '安装完成'
                });
            }
            catch (validationError) {
                result.details.validation.message = validationError.message;
                throw new Error(`Installation validation failed: ${validationError.message}`);
            }
            // Success!
            result.success = true;
            result.message = 'Server installation completed successfully';
            return result;
        }
        catch (error) {
            result.success = false;
            result.message = error.message;
            console.error('[Server Installer] Installation failed:', error);
            return result;
        }
    }
}
exports.ServerInstallerService = ServerInstallerService;
// Export singleton instance
exports.serverInstallerService = new ServerInstallerService();
