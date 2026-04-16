"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.installService = exports.InstallService = void 0;
const steamcmd_utils_1 = require("../utils/steamcmd.utils");
const proton_utils_1 = require("../utils/proton.utils");
const server_installer_service_1 = require("./server-installer.service");
const installer_utils_1 = require("../utils/installer.utils");
const system_deps_utils_1 = require("../utils/system-deps.utils");
const platform_utils_1 = require("../utils/platform.utils");
const validation_utils_1 = require("../utils/validation.utils");
/**
 * Install Service - Handles all business logic for software installation
 */
class InstallService {
    constructor() {
        // Remove any stale install lock on startup
        (0, installer_utils_1.removeInstallLock)();
    }
    /**
     * Check installation requirements for a given target
     * @param target - The component to be installed (e.g., 'server', 'steamcmd', 'proton')
     * @returns A promise resolving to an object indicating if sudo is required, missing dependencies, and if installation can proceed
     */
    async checkInstallRequirements(target) {
        try {
            if (target !== 'server') {
                // For non-server installs, no special requirements
                return {
                    success: true,
                    requiresSudo: false,
                    missingDependencies: [],
                    canProceed: true,
                    message: 'No special requirements for this installation'
                };
            }
            // Check if we're on Linux and need dependencies
            if ((0, platform_utils_1.getPlatform)() === 'linux') {
                const depResults = await (0, system_deps_utils_1.checkAllDependencies)();
                const missingDeps = depResults.filter(r => !r.installed);
                const missingRequired = missingDeps.filter(r => r.dependency.required);
                if (missingRequired.length > 0) {
                    return {
                        success: true,
                        requiresSudo: true,
                        missingDependencies: missingRequired.map(r => r.dependency),
                        canProceed: false,
                        message: `Missing required Linux dependencies: ${missingRequired.map(r => r.dependency.name).join(', ')}. Sudo password required for installation.`
                    };
                }
            }
            // No special requirements needed
            return {
                success: true,
                requiresSudo: false,
                missingDependencies: [],
                canProceed: true,
                message: 'All installation requirements met'
            };
        }
        catch (error) {
            return {
                success: false,
                requiresSudo: false,
                missingDependencies: [],
                canProceed: false,
                message: '',
                error: error instanceof Error ? error.message : 'Unknown error during requirements check'
            };
        }
    }
    /**
     * Validate installation parameters
     * @param target - The component to be installed (e.g., 'server', 'steamcmd', 'proton')
     * @param sudoPassword - The sudo password for installation (if required)
     * @returns An object indicating if the parameters are valid and any error messages
     */
    validateInstallParams(target, sudoPassword) {
        // Validate target
        if (!target || typeof target !== 'string') {
            return { isValid: false, error: 'Invalid install target' };
        }
        // Sanitize target
        const sanitizedTarget = (0, validation_utils_1.sanitizeString)(target);
        // Validate sudo password if provided
        if (sudoPassword !== undefined && sudoPassword !== null && typeof sudoPassword !== 'string') {
            return { isValid: false, error: 'Invalid sudo password format' };
        }
        return { isValid: true, sanitizedTarget };
    }
    /**
     * Install server with comprehensive setup
     * @param progressCallback - Callback function to receive progress updates
     * @param sudoPassword - The sudo password for installation (if required)
     * @returns A promise resolving to an object indicating success or failure of the installation
     */
    async installServerComprehensive(progressCallback, sudoPassword) {
        // Prevent concurrent installs (file-based lock)
        if ((0, installer_utils_1.isInstallLocked)()) {
            return {
                status: 'error',
                target: 'server',
                error: 'An install is already in progress. Please cancel it before starting a new one.'
            };
        }
        (0, installer_utils_1.createInstallLock)();
        try {
            return new Promise((resolve) => {
                server_installer_service_1.serverInstallerService.installServer((progress) => {
                    // Send detailed progress with phase information
                    const progressData = {
                        phasePercent: progress.phasePercent,
                        step: progress.step,
                        message: progress.message,
                        phase: progress.phase,
                        overallPhase: progress.overallPhase
                    };
                    progressCallback(progressData);
                }, sudoPassword).then((result) => {
                    // Send final result
                    const finalProgress = {
                        phasePercent: 100,
                        step: 'complete',
                        message: result.message,
                        phase: 'validation',
                        overallPhase: 'Installation Complete',
                        success: result.success,
                        details: result.details
                    };
                    progressCallback(finalProgress);
                    (0, installer_utils_1.removeInstallLock)();
                    resolve({
                        status: result.success ? 'success' : 'error',
                        target: 'server',
                        message: result.message,
                        details: result.details
                    });
                }).catch((error) => {
                    progressCallback(`Error: ${error.message}`);
                    (0, installer_utils_1.removeInstallLock)();
                    resolve({ status: 'error', target: 'server', error: error.message });
                });
            });
        }
        catch (error) {
            (0, installer_utils_1.removeInstallLock)();
            return {
                status: 'error',
                target: 'server',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Install SteamCMD component
     * @param progressCallback - Callback function to receive progress updates
     * @param sudoPassword - The sudo password for installation (if required)
     * @returns A promise resolving to an object indicating success or failure of the installation
     */
    async installSteamCmdComponent(progressCallback) {
        // Prevent concurrent installs (file-based lock)
        if ((0, installer_utils_1.isInstallLocked)()) {
            return {
                status: 'error',
                target: 'steamcmd',
                error: 'An install is already in progress. Please cancel it before starting a new one.'
            };
        }
        if ((0, steamcmd_utils_1.isSteamCmdInstalled)()) {
            progressCallback('SteamCMD already installed.');
            return { status: 'success', target: 'steamcmd', message: 'SteamCMD already installed.' };
        }
        (0, installer_utils_1.createInstallLock)();
        // Check Linux dependencies for SteamCMD on Linux
        if ((0, platform_utils_1.getPlatform)() === 'linux') {
            progressCallback('Checking Linux dependencies for SteamCMD installation...');
            try {
                const depResults = await (0, system_deps_utils_1.checkAllDependencies)();
                const missingDeps = depResults.filter(r => !r.installed);
                const missingRequired = missingDeps.filter(r => r.dependency.required);
                if (missingRequired.length > 0) {
                    const missingNames = missingRequired.map(r => r.dependency.name).join(', ');
                    const installInstructions = (0, system_deps_utils_1.generateInstallInstructions)(missingRequired.map(r => r.dependency));
                    const errorMsg = `Error: Missing required Linux dependencies: ${missingNames}\n\n${installInstructions}`;
                    progressCallback(errorMsg);
                    (0, installer_utils_1.removeInstallLock)();
                    return { status: 'error', target: 'steamcmd', error: errorMsg };
                }
                if (missingDeps.length > 0) {
                    const optionalNames = missingDeps.map(r => r.dependency.name).join(', ');
                    progressCallback(`Warning: Optional dependencies missing: ${optionalNames}. Installation will continue.`);
                }
                progressCallback('All required dependencies satisfied. Starting SteamCMD installation...');
            }
            catch (error) {
                const errorMsg = `Error checking dependencies: ${error instanceof Error ? error.message : 'Unknown error'}`;
                progressCallback(errorMsg);
                (0, installer_utils_1.removeInstallLock)();
                return { status: 'error', target: 'steamcmd', error: errorMsg };
            }
        }
        return new Promise((resolve) => {
            (0, steamcmd_utils_1.installSteamCmd)((err, output) => {
                (0, installer_utils_1.removeInstallLock)();
                if (err) {
                    const errorMsg = `Error: ${err.message}`;
                    progressCallback(errorMsg);
                    resolve({ status: 'error', target: 'steamcmd', error: err.message });
                }
                else {
                    const successMsg = 'SteamCMD install completed successfully.';
                    progressCallback(successMsg);
                    resolve({ status: 'success', target: 'steamcmd', message: successMsg });
                }
            }, progressCallback);
        });
    }
    /**
     * Install Proton component
     * @param progressCallback - Callback function to receive progress updates
     * @param sudoPassword - The sudo password for installation (if required)
     * @returns A promise resolving to an object indicating success or failure of the installation
     */
    async installProtonComponent(progressCallback) {
        // Prevent concurrent installs (file-based lock)
        if ((0, installer_utils_1.isInstallLocked)()) {
            return {
                status: 'error',
                target: 'proton',
                error: 'An install is already in progress. Please cancel it before starting a new one.'
            };
        }
        if (process.platform !== 'linux') {
            const msg = 'Proton install is only required on Linux.';
            progressCallback(msg);
            return { status: 'success', target: 'proton', message: msg };
        }
        if ((0, proton_utils_1.isProtonInstalled)()) {
            const msg = 'Proton already installed.';
            progressCallback(msg);
            return { status: 'success', target: 'proton', message: msg };
        }
        (0, installer_utils_1.createInstallLock)();
        // Check Linux dependencies before installing Proton
        progressCallback('Checking Linux dependencies for Proton installation...');
        try {
            const depResults = await (0, system_deps_utils_1.checkAllDependencies)();
            const missingDeps = depResults.filter(r => !r.installed);
            const missingRequired = missingDeps.filter(r => r.dependency.required);
            if (missingRequired.length > 0) {
                const missingNames = missingRequired.map(r => r.dependency.name).join(', ');
                const installInstructions = (0, system_deps_utils_1.generateInstallInstructions)(missingRequired.map(r => r.dependency));
                const errorMsg = `Error: Missing required Linux dependencies: ${missingNames}\n\n${installInstructions}`;
                progressCallback(errorMsg);
                (0, installer_utils_1.removeInstallLock)();
                return { status: 'error', target: 'proton', error: errorMsg };
            }
            if (missingDeps.length > 0) {
                const optionalNames = missingDeps.map(r => r.dependency.name).join(', ');
                progressCallback(`Warning: Optional dependencies missing: ${optionalNames}. Installation will continue.`);
            }
            progressCallback('All required dependencies satisfied. Starting Proton installation...');
        }
        catch (error) {
            const errorMsg = `Error checking dependencies: ${error instanceof Error ? error.message : 'Unknown error'}`;
            progressCallback(errorMsg);
            (0, installer_utils_1.removeInstallLock)();
            return { status: 'error', target: 'proton', error: errorMsg };
        }
        return new Promise((resolve) => {
            (0, proton_utils_1.installProton)((err, output) => {
                (0, installer_utils_1.removeInstallLock)();
                if (err) {
                    const errorMsg = `Error: ${err.message}`;
                    progressCallback(errorMsg);
                    resolve({ status: 'error', target: 'proton', error: err.message });
                }
                else {
                    const successMsg = 'Proton install completed successfully.';
                    progressCallback(successMsg);
                    resolve({ status: 'success', target: 'proton', message: successMsg });
                }
            }, progressCallback);
        });
    }
    /**
     * Install a component
     * @param target - The component to be installed (e.g., 'server', 'steamcmd', 'proton')
     * @param progressCallback - Callback function to receive progress updates
     * @param sudoPassword - The sudo password for installation (if required)
     * @returns A promise resolving to an object indicating success or failure of the installation
     */
    async installComponent(target, progressCallback, sudoPassword) {
        const validation = this.validateInstallParams(target, sudoPassword);
        if (!validation.isValid) {
            return { status: 'error', target: target || 'unknown', error: validation.error };
        }
        const sanitizedTarget = validation.sanitizedTarget;
        switch (sanitizedTarget) {
            case 'server':
                return this.installServerComprehensive(progressCallback, sudoPassword);
            case 'steamcmd':
                return this.installSteamCmdComponent(progressCallback);
            case 'proton':
                return this.installProtonComponent(progressCallback);
            default:
                return { status: 'error', target: sanitizedTarget, error: `Unknown install target: ${sanitizedTarget}` };
        }
    }
    /**
     * Cancel installation
     * @param target - The component whose installation should be cancelled (e.g., 'server', 'steamcmd', 'proton')
     * @returns A promise resolving to an object indicating success or failure of the cancellation
     */
    cancelInstallation(target) {
        if (target === 'server') {
            (0, installer_utils_1.cancelInstaller)();
            (0, installer_utils_1.removeInstallLock)();
            return { success: true, target };
        }
        return { success: false, target };
    }
}
exports.InstallService = InstallService;
// Export singleton instance
exports.installService = new InstallService();
