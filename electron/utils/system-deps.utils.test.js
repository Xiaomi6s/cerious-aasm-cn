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
const globals_1 = require("@jest/globals");
// Mock dependencies
globals_1.jest.mock('fs');
globals_1.jest.mock('path');
globals_1.jest.mock('child_process');
globals_1.jest.mock('./platform.utils');
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const platform_utils_1 = require("./platform.utils");
const mockedFs = fs;
const mockedPath = path;
const mockedSpawn = child_process_1.spawn;
const mockedGetPlatform = platform_utils_1.getPlatform;
// Import the module under test
const system_deps_utils_1 = require("./system-deps.utils");
describe('system-deps.utils', () => {
    beforeEach(() => {
        globals_1.jest.clearAllMocks();
        // Reset platform to linux for most tests
        mockedGetPlatform.mockReturnValue('linux');
    });
    describe('LINUX_DEPENDENCIES', () => {
        it('should contain all required dependencies', () => {
            expect(system_deps_utils_1.LINUX_DEPENDENCIES.length).toBe(6);
            expect(system_deps_utils_1.LINUX_DEPENDENCIES[0].name).toBe('cURL');
            expect(system_deps_utils_1.LINUX_DEPENDENCIES[1].name).toBe('Unzip');
            expect(system_deps_utils_1.LINUX_DEPENDENCIES[2].name).toBe('Tar');
            expect(system_deps_utils_1.LINUX_DEPENDENCIES[3].name).toBe('Xvfb');
            expect(system_deps_utils_1.LINUX_DEPENDENCIES[4].name).toBe('SteamCMD Dependencies (32-bit libraries)');
            expect(system_deps_utils_1.LINUX_DEPENDENCIES[5].name).toBe('Font Configuration');
        });
        it('should have correct structure for each dependency', () => {
            system_deps_utils_1.LINUX_DEPENDENCIES.forEach(dep => {
                expect(typeof dep.name).toBe('string');
                expect(dep.packageName).toBeDefined();
                expect(typeof dep.checkCommand).toBe('string');
                expect(typeof dep.description).toBe('string');
                expect(typeof dep.required).toBe('boolean');
            });
        });
    });
    describe('checkDependency', () => {
        let mockProc;
        beforeEach(() => {
            mockProc = {
                stdout: { on: globals_1.jest.fn() },
                stderr: { on: globals_1.jest.fn() },
                on: globals_1.jest.fn(),
                kill: globals_1.jest.fn()
            };
            mockedSpawn.mockReturnValue(mockProc);
        });
        it('should return installed true for non-linux platforms', async () => {
            mockedGetPlatform.mockReturnValue('windows');
            const result = await (0, system_deps_utils_1.checkDependency)(system_deps_utils_1.LINUX_DEPENDENCIES[0]);
            expect(result.installed).toBe(true);
            expect(result.version).toBe('N/A (not Linux)');
            expect(mockedSpawn).not.toHaveBeenCalled();
        });
        it('should return installed true when command succeeds', async () => {
            mockProc.on.mockImplementation((event, callback) => {
                if (event === 'close') {
                    callback(0); // Success code
                }
            });
            mockProc.stdout.on.mockImplementation((event, callback) => {
                if (event === 'data') {
                    callback('curl 7.68.0');
                }
            });
            const result = await (0, system_deps_utils_1.checkDependency)(system_deps_utils_1.LINUX_DEPENDENCIES[0]);
            expect(result.installed).toBe(true);
            expect(result.version).toBe('7.68.0');
            expect(mockedSpawn).toHaveBeenCalledWith('bash', ['-c', 'curl --version'], {
                stdio: ['ignore', 'pipe', 'pipe']
            });
        });
        it('should return installed false when command fails', async () => {
            mockProc.on.mockImplementation((event, callback) => {
                if (event === 'close') {
                    callback(1); // Failure code
                }
            });
            const result = await (0, system_deps_utils_1.checkDependency)(system_deps_utils_1.LINUX_DEPENDENCIES[0]);
            expect(result.installed).toBe(false);
            expect(result.version).toBeUndefined();
        });
        it('should handle timeout correctly', async () => {
            // Mock setTimeout to execute immediately
            globals_1.jest.useFakeTimers();
            mockProc.on.mockImplementation((event, callback) => {
                if (event === 'close') {
                    // Don't call callback to simulate hanging process
                }
            });
            const promise = (0, system_deps_utils_1.checkDependency)(system_deps_utils_1.LINUX_DEPENDENCIES[0]);
            // Fast-forward time past the timeout
            globals_1.jest.advanceTimersByTime(5000);
            const result = await promise;
            expect(result.installed).toBe(false);
            expect(mockProc.kill).toHaveBeenCalled();
            globals_1.jest.useRealTimers();
        });
        it('should extract version from first line when available', async () => {
            mockProc.on.mockImplementation((event, callback) => {
                if (event === 'close') {
                    callback(0);
                }
            });
            mockProc.stdout.on.mockImplementation((event, callback) => {
                if (event === 'data') {
                    callback('tar (GNU tar) 1.30\nCopyright (C) 2017 Free Software Foundation, Inc.');
                }
            });
            const result = await (0, system_deps_utils_1.checkDependency)(system_deps_utils_1.LINUX_DEPENDENCIES[2]); // Tar dependency
            expect(result.installed).toBe(true);
            expect(result.version).toBe('1.30');
        });
    });
    describe('checkAllDependencies', () => {
        it('should check all dependencies and return results', async () => {
            mockedGetPlatform.mockReturnValue('windows'); // Skip actual checks
            const results = await (0, system_deps_utils_1.checkAllDependencies)();
            expect(results.length).toBe(system_deps_utils_1.LINUX_DEPENDENCIES.length);
            results.forEach(result => {
                expect(result.dependency).toBeDefined();
                expect(result.installed).toBeDefined();
                expect(result.installed).toBe(true); // Non-linux returns true
            });
        });
    });
    describe('getPackageNameForDistribution', () => {
        beforeEach(() => {
            // Mock fs.existsSync for package manager detection
            mockedFs.existsSync.mockReturnValue(true);
        });
        it('should return string packageName directly', () => {
            const dep = {
                name: 'Test',
                packageName: 'test-package',
                checkCommand: 'test --version',
                description: 'Test package',
                required: true
            };
            const result = (0, system_deps_utils_1.getPackageNameForDistribution)(dep);
            expect(result).toBe('test-package');
        });
        it('should return apt package name when using apt', () => {
            const dep = system_deps_utils_1.LINUX_DEPENDENCIES[3]; // Xvfb with per-distro names
            const result = (0, system_deps_utils_1.getPackageNameForDistribution)(dep);
            expect(result).toBe('xvfb');
        });
        it('should return dnf package name when using dnf', () => {
            // Mock dnf as available, apt as not
            mockedFs.existsSync.mockImplementation((path) => String(path).includes('dnf'));
            const dep = system_deps_utils_1.LINUX_DEPENDENCIES[3]; // Xvfb
            const result = (0, system_deps_utils_1.getPackageNameForDistribution)(dep);
            expect(result).toBe('xorg-x11-server-Xvfb');
        });
        it('should fallback to first available package name when package manager not detected', () => {
            mockedFs.existsSync.mockReturnValue(false);
            const dep = system_deps_utils_1.LINUX_DEPENDENCIES[3]; // Xvfb
            const result = (0, system_deps_utils_1.getPackageNameForDistribution)(dep);
            expect(result).toBe('xvfb'); // First in the object
        });
    });
    describe('generateInstallInstructions', () => {
        beforeEach(() => {
            mockedFs.existsSync.mockReturnValue(true);
        });
        it('should generate apt instructions', () => {
            const missingDeps = [system_deps_utils_1.LINUX_DEPENDENCIES[0], system_deps_utils_1.LINUX_DEPENDENCIES[1]];
            const instructions = (0, system_deps_utils_1.generateInstallInstructions)(missingDeps);
            expect(instructions).toContain('sudo apt-get update && sudo apt-get install curl unzip');
        });
        it('should generate dnf instructions', () => {
            mockedFs.existsSync.mockImplementation((path) => String(path).includes('dnf'));
            const missingDeps = [system_deps_utils_1.LINUX_DEPENDENCIES[0]];
            const instructions = (0, system_deps_utils_1.generateInstallInstructions)(missingDeps);
            expect(instructions).toContain('sudo dnf install curl');
            expect(instructions).toContain('RPM Fusion repositories');
        });
        it('should generate pacman instructions', () => {
            mockedFs.existsSync.mockImplementation((path) => String(path).includes('pacman'));
            const missingDeps = [system_deps_utils_1.LINUX_DEPENDENCIES[0]];
            const instructions = (0, system_deps_utils_1.generateInstallInstructions)(missingDeps);
            expect(instructions).toContain('sudo pacman -S curl');
        });
        it('should handle unknown package manager', () => {
            mockedFs.existsSync.mockReturnValue(false);
            const missingDeps = [system_deps_utils_1.LINUX_DEPENDENCIES[0]];
            const instructions = (0, system_deps_utils_1.generateInstallInstructions)(missingDeps);
            expect(instructions).toContain('Could not detect package manager');
        });
    });
    describe('getPackageManagerInfo', () => {
        it('should return null for non-linux platforms', () => {
            mockedGetPlatform.mockReturnValue('windows');
            const result = (0, system_deps_utils_1.getPackageManagerInfo)();
            expect(result).toBeNull();
        });
        it('should detect apt package manager', () => {
            mockedFs.existsSync.mockImplementation((path) => path.includes('apt'));
            const result = (0, system_deps_utils_1.getPackageManagerInfo)();
            expect(result).toEqual({
                manager: 'apt',
                installCmd: 'apt-get install -y',
                updateCmd: 'apt-get update'
            });
        });
        it('should detect dnf package manager', () => {
            mockedFs.existsSync.mockImplementation((path) => path.includes('dnf'));
            const result = (0, system_deps_utils_1.getPackageManagerInfo)();
            expect(result).toEqual({
                manager: 'dnf',
                installCmd: 'dnf install -y',
                updateCmd: 'dnf makecache',
                installExtra: ''
            });
        });
        it('should detect pacman package manager', () => {
            mockedFs.existsSync.mockImplementation((path) => path.includes('pacman'));
            const result = (0, system_deps_utils_1.getPackageManagerInfo)();
            expect(result).toEqual({
                manager: 'pacman',
                installCmd: 'pacman -S --noconfirm',
                updateCmd: 'pacman -Sy'
            });
        });
        it('should return null when no package manager detected', () => {
            mockedFs.existsSync.mockReturnValue(false);
            const result = (0, system_deps_utils_1.getPackageManagerInfo)();
            expect(result).toBeNull();
        });
    });
    describe('installMissingDependencies', () => {
        let mockSudoProc;
        let mockProc;
        beforeEach(() => {
            mockProc = {
                stdout: { on: globals_1.jest.fn() },
                stderr: { on: globals_1.jest.fn() },
                on: globals_1.jest.fn(),
                kill: globals_1.jest.fn()
            };
            mockSudoProc = {
                stdout: { on: globals_1.jest.fn() },
                stderr: { on: globals_1.jest.fn() },
                stdin: { write: globals_1.jest.fn(), end: globals_1.jest.fn() },
                on: globals_1.jest.fn(),
                kill: globals_1.jest.fn()
            };
            // Mock spawn for both regular commands and sudo commands
            mockedSpawn.mockImplementation((...args) => {
                const command = args[0];
                if (command === 'sudo') {
                    return mockSudoProc;
                }
                return mockProc;
            });
            mockedFs.existsSync.mockReturnValue(true);
        });
        it('should return success for non-linux platforms', async () => {
            mockedGetPlatform.mockReturnValue('windows');
            const result = await (0, system_deps_utils_1.installMissingDependencies)([], 'password', globals_1.jest.fn());
            expect(result.success).toBe(true);
            expect(result.message).toContain('Not running on Linux');
        });
        it('should return success when no dependencies to install', async () => {
            const result = await (0, system_deps_utils_1.installMissingDependencies)([], 'password', globals_1.jest.fn());
            expect(result.success).toBe(true);
            expect(result.message).toContain('All dependencies already installed');
        });
        it('should return failure when package manager not detected', async () => {
            mockedFs.existsSync.mockReturnValue(false);
            const result = await (0, system_deps_utils_1.installMissingDependencies)([system_deps_utils_1.LINUX_DEPENDENCIES[0]], 'password', globals_1.jest.fn());
            expect(result.success).toBe(false);
            expect(result.message).toContain('Could not detect package manager');
        });
        it('should install dependencies successfully with apt', async () => {
            // Mock successful sudo commands
            mockSudoProc.on.mockImplementation((event, callback) => {
                if (event === 'close') {
                    callback(0); // Success
                }
            });
            const onProgress = globals_1.jest.fn();
            const missingDeps = [system_deps_utils_1.LINUX_DEPENDENCIES[0]]; // curl
            const result = await (0, system_deps_utils_1.installMissingDependencies)(missingDeps, 'password', onProgress);
            expect(result.success).toBe(true);
            expect(result.message).toContain('All dependencies installed successfully');
            expect(onProgress).toHaveBeenCalled();
            expect(mockedSpawn.mock.calls.length).toBeGreaterThan(1); // Should have called sudo at least once
        });
        it('should handle installation failure for required dependency', async () => {
            // Mock failed sudo command
            mockSudoProc.on.mockImplementation((event, callback) => {
                if (event === 'close') {
                    callback(1); // Failure
                }
            });
            const onProgress = globals_1.jest.fn();
            const missingDeps = [system_deps_utils_1.LINUX_DEPENDENCIES[0]]; // curl (required)
            const result = await (0, system_deps_utils_1.installMissingDependencies)(missingDeps, 'password', onProgress);
            expect(result.success).toBe(false);
            expect(result.message).toContain('Dependency installation failed');
        });
        it('should continue with optional dependency failure', async () => {
            // Mock successful dpkg, update but failed install
            let callCount = 0;
            mockSudoProc.on.mockImplementation((event, callback) => {
                if (event === 'close') {
                    callCount++;
                    if (callCount <= 2) {
                        callback(0); // dpkg and update succeed
                    }
                    else {
                        callback(1); // Install fails
                    }
                }
            });
            const onProgress = globals_1.jest.fn();
            const missingDeps = [system_deps_utils_1.LINUX_DEPENDENCIES[5]]; // Font Configuration (not required)
            const result = await (0, system_deps_utils_1.installMissingDependencies)(missingDeps, 'password', onProgress);
            expect(result.success).toBe(true); // Should succeed because Font Configuration is not required
            expect(result.details.some(detail => detail.includes('Failed to install'))).toBe(true);
        });
        it('should retry dnf installation with --allowerasing on failure', async () => {
            mockedFs.existsSync.mockImplementation((path) => String(path).includes('dnf'));
            // Mock successful update, failed first install, successful retry
            let callCount = 0;
            mockSudoProc.on.mockImplementation((event, callback) => {
                if (event === 'close') {
                    callCount++;
                    if (callCount === 1) {
                        callback(0); // Update succeeds
                    }
                    else if (callCount === 2) {
                        callback(1); // First install fails
                    }
                    else {
                        callback(0); // Retry succeeds
                    }
                }
            });
            const onProgress = globals_1.jest.fn();
            const missingDeps = [system_deps_utils_1.LINUX_DEPENDENCIES[0]]; // curl
            const result = await (0, system_deps_utils_1.installMissingDependencies)(missingDeps, 'password', onProgress);
            expect(result.success).toBe(true);
            expect(mockedSpawn.mock.calls.length).toBeGreaterThan(2); // Should have called update, install, and retry
        });
    });
    describe('validateSudoPassword', () => {
        let mockSudoProc;
        beforeEach(() => {
            mockSudoProc = {
                stdout: { on: globals_1.jest.fn() },
                stderr: { on: globals_1.jest.fn() },
                stdin: { write: globals_1.jest.fn(), end: globals_1.jest.fn() },
                on: globals_1.jest.fn(),
                kill: globals_1.jest.fn()
            };
            // Mock spawn for sudo commands
            mockedSpawn.mockImplementation((...args) => {
                const command = args[0];
                if (command === 'sudo') {
                    return mockSudoProc;
                }
                return {};
            });
        });
        it('should return true for valid sudo password', async () => {
            mockSudoProc.on.mockImplementation((event, callback) => {
                if (event === 'close') {
                    callback(0); // Success
                }
            });
            const result = await (0, system_deps_utils_1.validateSudoPassword)('correct-password');
            expect(result).toBe(true);
            expect(mockedSpawn.mock.calls.length).toBeGreaterThan(0);
        });
        it('should return false for invalid sudo password', async () => {
            mockSudoProc.on.mockImplementation((event, callback) => {
                if (event === 'close') {
                    callback(1); // Failure
                }
            });
            const result = await (0, system_deps_utils_1.validateSudoPassword)('wrong-password');
            expect(result).toBe(false);
        });
    });
});
