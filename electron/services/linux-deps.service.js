"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LinuxDepsService = void 0;
const system_deps_utils_1 = require("../utils/system-deps.utils");
const platform_utils_1 = require("../utils/platform.utils");
/**
 * Linux Dependencies Service
 * Handles Linux dependency checking, validation, and installation
 */
class LinuxDepsService {
    /**
     * Check for missing Linux dependencies
     * @returns A promise resolving to an object indicating the result of the dependency check
     */
    async checkDependencies() {
        try {
            if ((0, platform_utils_1.getPlatform)() !== 'linux') {
                return {
                    success: true,
                    platform: 'non-linux',
                    dependencies: [],
                    missing: [],
                    missingRequired: [],
                    allDepsInstalled: true,
                    canProceed: true,
                    message: 'Linux dependency check not required on this platform'
                };
            }
            const results = await (0, system_deps_utils_1.checkAllDependencies)();
            const missing = results.filter(r => !r.installed);
            const missingRequired = missing.filter(r => r.dependency.required);
            return {
                success: true,
                platform: 'linux',
                dependencies: results,
                missing: missing.map(r => r.dependency),
                missingRequired: missingRequired.map(r => r.dependency),
                allDepsInstalled: missing.length === 0,
                canProceed: missingRequired.length === 0,
                message: missing.length === 0
                    ? 'All Linux dependencies are installed'
                    : `Missing ${missing.length} dependencies (${missingRequired.length} required)`
            };
        }
        catch (error) {
            console.error('[Linux Deps Service] Error checking dependencies:', error);
            return {
                success: false,
                platform: (0, platform_utils_1.getPlatform)(),
                dependencies: [],
                missing: [],
                missingRequired: [],
                allDepsInstalled: false,
                canProceed: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Validate sudo password
     * @param password - The sudo password to validate
     * @returns A promise resolving to an object indicating the result of the validation
     */
    async validateSudoPassword(password) {
        if (!password) {
            return {
                valid: false,
                error: 'Password is required'
            };
        }
        try {
            const valid = await (0, system_deps_utils_1.validateSudoPassword)(password);
            return {
                valid,
                error: valid ? null : 'Invalid sudo password'
            };
        }
        catch (error) {
            console.error('[Linux Deps Service] Error validating sudo password:', error);
            return {
                valid: false,
                error: error instanceof Error ? error.message : 'Password validation failed'
            };
        }
    }
    /**
     * Install missing Linux dependencies
     * @param password - The sudo password for installation
     * @param dependencies - The list of dependencies to install
     * @param progressCallback - Callback function to receive installation progress updates
     * @returns A promise resolving to an object indicating success or failure of the installation
     */
    async installDependencies(password, dependencies, progressCallback) {
        try {
            if ((0, platform_utils_1.getPlatform)() !== 'linux') {
                return {
                    success: true,
                    message: 'Linux dependency installation not required on this platform',
                    details: []
                };
            }
            if (!password) {
                return {
                    success: false,
                    error: 'Sudo password is required for dependency installation',
                    details: []
                };
            }
            if (!dependencies || !Array.isArray(dependencies)) {
                return {
                    success: false,
                    error: 'Dependencies list is required',
                    details: []
                };
            }
            // First validate the password
            const passwordValid = await (0, system_deps_utils_1.validateSudoPassword)(password);
            if (!passwordValid) {
                return {
                    success: false,
                    error: 'Invalid sudo password',
                    details: []
                };
            }
            // Install dependencies with progress updates
            const result = await (0, system_deps_utils_1.installMissingDependencies)(dependencies, password, progressCallback || (() => { }));
            return result;
        }
        catch (error) {
            console.error('[Linux Deps Service] Error installing dependencies:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error during installation',
                details: []
            };
        }
    }
    /**
     * Get list of available Linux dependencies
     * @returns A list of available Linux dependencies
     */
    getAvailableDependencies() {
        return {
            dependencies: system_deps_utils_1.LINUX_DEPENDENCIES,
            platform: (0, platform_utils_1.getPlatform)()
        };
    }
}
exports.LinuxDepsService = LinuxDepsService;
