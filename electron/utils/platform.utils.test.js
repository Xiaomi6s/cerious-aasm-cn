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
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const electron_1 = require("electron");
const platform_utils_1 = require("../utils/platform.utils");
// Mock dependencies
jest.mock('os');
jest.mock('path');
jest.mock('electron', () => ({
    app: {
        getPath: jest.fn()
    }
}));
// Mock child_process module
jest.mock('child_process', () => ({
    execSync: jest.fn()
}));
const mockExecSync = require('child_process').execSync;
const mockOs = os;
const mockPath = path;
const mockApp = electron_1.app;
// Mock process.platform
const originalPlatform = process.platform;
Object.defineProperty(process, 'platform', {
    writable: true,
    value: originalPlatform
});
describe('Platform Utils', () => {
    beforeEach(() => {
        jest.resetAllMocks();
        // Reset process.platform to original value
        process.platform = originalPlatform;
    });
    describe('getPlatform', () => {
        it('should return "windows" for win32 platform', () => {
            process.platform = 'win32';
            expect((0, platform_utils_1.getPlatform)()).toBe('windows');
        });
        it('should return "linux" for linux platform', () => {
            process.platform = 'linux';
            expect((0, platform_utils_1.getPlatform)()).toBe('linux');
        });
        it('should throw error for unsupported platforms', () => {
            process.platform = 'darwin';
            expect(() => (0, platform_utils_1.getPlatform)()).toThrow('Only Windows and Linux are supported. Current platform: darwin');
        });
    });
    describe('isWindows', () => {
        it('should return true when platform is windows', () => {
            process.platform = 'win32';
            expect((0, platform_utils_1.isWindows)()).toBe(true);
        });
        it('should return false when platform is not windows', () => {
            process.platform = 'linux';
            expect((0, platform_utils_1.isWindows)()).toBe(false);
        });
    });
    describe('isLinux', () => {
        it('should return true when platform is linux', () => {
            process.platform = 'linux';
            expect((0, platform_utils_1.isLinux)()).toBe(true);
        });
        it('should return false when platform is not linux', () => {
            process.platform = 'win32';
            expect((0, platform_utils_1.isLinux)()).toBe(false);
        });
    });
    describe('getDefaultInstallDir', () => {
        it('should return Windows path when on Windows', () => {
            process.platform = 'win32';
            process.env.APPDATA = 'C:\\Users\\Test\\AppData\\Roaming';
            mockOs.homedir.mockReturnValue('C:\\Users\\Test');
            mockPath.join.mockReturnValue('C:\\Users\\Test\\AppData\\Roaming\\Cerious AASM');
            const result = (0, platform_utils_1.getDefaultInstallDir)();
            expect(result).toBe('C:\\Users\\Test\\AppData\\Roaming\\Cerious AASM');
            expect(mockPath.join).toHaveBeenCalledWith('C:\\Users\\Test\\AppData\\Roaming', 'Cerious AASM');
        });
        it('should return Linux path when on Linux', () => {
            process.platform = 'linux';
            mockOs.homedir.mockReturnValue('/home/test');
            mockPath.join.mockReturnValue('/home/test/.local/share/cerious-aasm');
            const result = (0, platform_utils_1.getDefaultInstallDir)();
            expect(result).toBe('/home/test/.local/share/cerious-aasm');
            expect(mockPath.join).toHaveBeenCalledWith('/home/test', '.local', 'share', 'cerious-aasm');
        });
        it('should use homedir fallback when APPDATA is not set on Windows', () => {
            process.platform = 'win32';
            delete process.env.APPDATA;
            mockOs.homedir.mockReturnValue('C:\\Users\\Test');
            mockPath.join.mockReturnValue('C:\\Users\\Test\\Cerious AASM');
            const result = (0, platform_utils_1.getDefaultInstallDir)();
            expect(result).toBe('C:\\Users\\Test\\Cerious AASM');
        });
    });
    describe('getUserDataPath', () => {
        it('should return Windows path when on Windows', () => {
            process.platform = 'win32';
            mockApp.getPath.mockReturnValue('C:\\Users\\Test\\AppData\\Roaming');
            mockPath.join.mockReturnValue('C:\\Users\\Test\\AppData\\Roaming\\Cerious AASM');
            const result = (0, platform_utils_1.getUserDataPath)(mockApp);
            expect(result).toBe('C:\\Users\\Test\\AppData\\Roaming\\Cerious AASM');
            expect(mockApp.getPath).toHaveBeenCalledWith('appData');
        });
        it('should return Linux path when on Linux', () => {
            process.platform = 'linux';
            mockOs.homedir.mockReturnValue('/home/test');
            mockPath.join.mockReturnValue('/home/test/.local/share/cerious-aasm');
            const result = (0, platform_utils_1.getUserDataPath)(mockApp);
            expect(result).toBe('/home/test/.local/share/cerious-aasm');
            expect(mockApp.getPath).not.toHaveBeenCalled();
        });
    });
    describe('getHomeDir', () => {
        it('should return the home directory', () => {
            mockOs.homedir.mockReturnValue('/home/test');
            expect((0, platform_utils_1.getHomeDir)()).toBe('/home/test');
            expect(mockOs.homedir).toHaveBeenCalled();
        });
    });
    describe('getTempDir', () => {
        it('should return the temp directory', () => {
            mockOs.tmpdir.mockReturnValue('/tmp');
            expect((0, platform_utils_1.getTempDir)()).toBe('/tmp');
            expect(mockOs.tmpdir).toHaveBeenCalled();
        });
    });
    describe('getArchitecture', () => {
        it('should return the system architecture', () => {
            mockOs.arch.mockReturnValue('x64');
            expect((0, platform_utils_1.getArchitecture)()).toBe('x64');
            expect(mockOs.arch).toHaveBeenCalled();
        });
    });
    describe('getTotalMemory', () => {
        it('should return total system memory', () => {
            mockOs.totalmem.mockReturnValue(8589934592); // 8GB
            expect((0, platform_utils_1.getTotalMemory)()).toBe(8589934592);
            expect(mockOs.totalmem).toHaveBeenCalled();
        });
    });
    describe('getFreeMemory', () => {
        it('should return free system memory', () => {
            mockOs.freemem.mockReturnValue(4294967296); // 4GB
            expect((0, platform_utils_1.getFreeMemory)()).toBe(4294967296);
            expect(mockOs.freemem).toHaveBeenCalled();
        });
    });
    describe('getCpuInfo', () => {
        it('should return CPU information', () => {
            const mockCpus = [{ model: 'Intel Core i7', speed: 3200, times: { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 } }];
            mockOs.cpus.mockReturnValue(mockCpus);
            const result = (0, platform_utils_1.getCpuInfo)();
            expect(result).toEqual(mockCpus);
            expect(mockOs.cpus).toHaveBeenCalled();
        });
    });
    describe('getUptime', () => {
        it('should return system uptime', () => {
            mockOs.uptime.mockReturnValue(3600); // 1 hour
            expect((0, platform_utils_1.getUptime)()).toBe(3600);
            expect(mockOs.uptime).toHaveBeenCalled();
        });
    });
    describe('getNetworkInterfaces', () => {
        it('should return network interfaces', () => {
            const mockInterfaces = {
                eth0: [{ address: '192.168.1.100', family: 'IPv4', netmask: '255.255.255.0', mac: '00:00:00:00:00:00', internal: false, cidr: '192.168.1.100/24' }]
            };
            mockOs.networkInterfaces.mockReturnValue(mockInterfaces);
            const result = (0, platform_utils_1.getNetworkInterfaces)();
            expect(result).toEqual(mockInterfaces);
            expect(mockOs.networkInterfaces).toHaveBeenCalled();
        });
    });
    describe('getEnvironmentPaths', () => {
        it('should return all environment paths', () => {
            process.platform = 'linux';
            mockOs.homedir.mockReturnValue('/home/test');
            mockOs.tmpdir.mockReturnValue('/tmp');
            mockOs.arch.mockReturnValue('x64');
            mockPath.join.mockReturnValue('/home/test/.local/share/cerious-aasm');
            const result = (0, platform_utils_1.getEnvironmentPaths)();
            expect(result).toEqual({
                home: '/home/test',
                temp: '/tmp',
                installDir: '/home/test/.local/share/cerious-aasm',
                platform: 'linux',
                arch: 'x64'
            });
        });
    });
    describe('getProcessMemoryUsage', () => {
        beforeEach(() => {
            mockExecSync.mockClear();
        });
        describe('on Windows', () => {
            beforeEach(() => {
                process.platform = 'win32';
            });
            it('should return memory usage in MB for valid Windows tasklist output', () => {
                mockExecSync.mockReturnValue('"ShooterGameServer.exe","1234","Console","1","15,234 K"');
                const result = (0, platform_utils_1.getProcessMemoryUsage)(1234);
                expect(result).toBe(15); // 15,234 KB = 15 MB (rounded)
                expect(mockExecSync).toHaveBeenCalledWith('tasklist /FI "PID eq 1234" /FO CSV /NH', { encoding: 'utf8' });
            });
            it('should return null when process not found', () => {
                mockExecSync.mockReturnValue('INFO: No tasks are running which match the specified criteria.');
                const result = (0, platform_utils_1.getProcessMemoryUsage)(9999);
                expect(result).toBeNull();
            });
            it('should return null when execSync throws an error', () => {
                mockExecSync.mockImplementation(() => {
                    throw new Error('Command failed');
                });
                const result = (0, platform_utils_1.getProcessMemoryUsage)(1234);
                expect(result).toBeNull();
            });
        });
        describe('on Linux', () => {
            beforeEach(() => {
                process.platform = 'linux';
            });
            it('should return null for Linux (memory monitoring not supported)', () => {
                const result = (0, platform_utils_1.getProcessMemoryUsage)(1234);
                expect(result).toBeNull();
                expect(mockExecSync).not.toHaveBeenCalled();
            });
            it('should return null when ps command fails', () => {
                mockExecSync.mockImplementation(() => {
                    throw new Error('Command failed');
                });
                const result = (0, platform_utils_1.getProcessMemoryUsage)(1234);
                expect(result).toBeNull();
            });
        });
    });
});
