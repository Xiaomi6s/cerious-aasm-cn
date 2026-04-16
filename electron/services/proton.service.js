"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProtonService = void 0;
const proton_utils_1 = require("../utils/proton.utils");
const platform_utils_1 = require("../utils/platform.utils");
/**
 * Proton Service
 * Handles Proton installation and management for Linux platforms
 */
class ProtonService {
    /**
     * Check if Proton is installed (Linux only)
     * @returns A promise resolving to an object indicating if Proton is installed
     */
    async checkProtonInstalled() {
        try {
            if ((0, platform_utils_1.getPlatform)() !== 'linux') {
                return {
                    success: true,
                    installed: true,
                    message: 'Proton not needed on Windows',
                    path: null
                };
            }
            const installed = (0, proton_utils_1.isProtonInstalled)();
            return {
                success: true,
                installed,
                path: installed ? (0, proton_utils_1.getProtonDir)() : null,
                message: installed ? 'Proton is installed' : 'Proton not installed'
            };
        }
        catch (error) {
            console.error('[Proton Service] Error checking Proton installation:', error);
            return {
                success: false,
                installed: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                path: null
            };
        }
    }
    /**
     * @param progressCallback - Optional callback to receive progress updates during installation
     * @returns A promise resolving to an object indicating the result of the installation
     */
    async installProton(progressCallback) {
        try {
            if ((0, platform_utils_1.getPlatform)() !== 'linux') {
                return {
                    success: true,
                    message: 'Proton not needed on Windows'
                };
            }
            if ((0, proton_utils_1.isProtonInstalled)()) {
                return {
                    success: true,
                    message: 'Proton is already installed'
                };
            }
            return new Promise((resolve) => {
                (0, proton_utils_1.installProton)((err, output) => {
                    if (err) {
                        console.error('[Proton Service] Proton installation failed:', err);
                        resolve({
                            success: false,
                            error: err.message || 'Unknown error during Proton installation'
                        });
                    }
                    else {
                        resolve({
                            success: true,
                            message: 'Proton installed successfully',
                            output
                        });
                    }
                }, (data) => {
                    // Call progress callback if provided
                    if (progressCallback) {
                        progressCallback(data);
                    }
                });
            });
        }
        catch (error) {
            console.error('[Proton Service] Error starting Proton installation:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Get the Proton directory path.
     * @returns A promise resolving to an object containing the Proton directory path
     */
    async getProtonDirectory() {
        try {
            const path = (0, proton_utils_1.getProtonDir)();
            return {
                success: true,
                path
            };
        }
        catch (error) {
            console.error('[Proton Service] Error getting Proton directory:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                path: null
            };
        }
    }
    /**
     * Get platform information and Proton readiness
     * @returns A promise resolving to an object containing platform info and Proton status
     */
    async getPlatformInfo() {
        try {
            const platform = (0, platform_utils_1.getPlatform)();
            const needsProton = platform === 'linux';
            const protonInstalled = needsProton ? (0, proton_utils_1.isProtonInstalled)() : true;
            return {
                success: true,
                platform,
                needsProton,
                protonInstalled,
                ready: !needsProton || protonInstalled
            };
        }
        catch (error) {
            console.error('[Proton Service] Error getting platform info:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                platform: 'unknown',
                needsProton: false,
                protonInstalled: false,
                ready: false
            };
        }
    }
}
exports.ProtonService = ProtonService;
