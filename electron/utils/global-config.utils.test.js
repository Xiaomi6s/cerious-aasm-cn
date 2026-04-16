"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Mock modules before importing
jest.mock('path');
jest.mock('../utils/platform.utils');
const mockedPath = require('path');
const mockedFs = require('fs');
const { getDefaultInstallDir } = require('../utils/platform.utils');
// Import after mocks are set up
const global_config_utils_1 = require("../utils/global-config.utils");
const mockDefaultInstallDir = '/mock/install/dir';
const mockConfigFile = '/mock/install/global-config.json';
const mockDefaultConfig = {
    startWebServerOnLoad: false,
    webServerPort: 3000,
    authenticationEnabled: false,
    authenticationUsername: '',
    authenticationPassword: '',
    maxBackupDownloadSizeMB: 100
};
const mockCustomConfig = {
    startWebServerOnLoad: true,
    webServerPort: 8080,
    authenticationEnabled: true,
    authenticationUsername: 'admin',
    authenticationPassword: 'password123',
    maxBackupDownloadSizeMB: 200
};
describe('global-config.utils', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Setup default mocks
        getDefaultInstallDir.mockReturnValue(mockDefaultInstallDir);
        mockedPath.join.mockImplementation((...args) => {
            if (args.length === 2 && args[0] === mockDefaultInstallDir && args[1] === 'global-config.json') {
                return mockConfigFile;
            }
            // For other calls, return a simple join
            return args.join('/');
        });
        mockedPath.dirname.mockImplementation((filePath) => {
            if (filePath === mockConfigFile) {
                return '/mock/install';
            }
            return '/default/dir';
        });
        // Ensure fs mocks don't throw
        mockedFs.writeFileSync.mockImplementation(() => undefined);
        mockedFs.mkdirSync.mockImplementation(() => undefined);
        mockedFs.existsSync.mockImplementation(() => false);
        mockedFs.readFileSync.mockImplementation(() => '{}');
    });
    describe('loadGlobalConfig', () => {
        it('should load config from existing file and merge with defaults', () => {
            const configJson = JSON.stringify({
                startWebServerOnLoad: true,
                webServerPort: 8080
            });
            mockedFs.existsSync.mockReturnValue(true);
            mockedFs.readFileSync.mockReturnValue(configJson);
            const result = (0, global_config_utils_1.loadGlobalConfig)();
            expect(mockedFs.existsSync).toHaveBeenCalledWith(mockConfigFile);
            expect(mockedFs.readFileSync).toHaveBeenCalledWith(mockConfigFile, 'utf-8');
            expect(result).toEqual({
                ...mockDefaultConfig,
                startWebServerOnLoad: true,
                webServerPort: 8080
            });
        });
        it('should create default config file when it does not exist', () => {
            mockedFs.existsSync.mockReturnValue(false);
            const result = (0, global_config_utils_1.loadGlobalConfig)();
            expect(mockedFs.existsSync).toHaveBeenCalledWith(mockConfigFile);
            expect(mockedFs.mkdirSync).toHaveBeenCalledWith('/mock/install', { recursive: true });
            expect(mockedFs.writeFileSync).toHaveBeenCalledWith(mockConfigFile, JSON.stringify(mockDefaultConfig, null, 2), 'utf-8');
            expect(result).toEqual(mockDefaultConfig);
        });
        it('should return default config when file exists but JSON parsing fails', () => {
            mockedFs.existsSync.mockReturnValue(true);
            mockedFs.readFileSync.mockReturnValue('invalid json');
            const result = (0, global_config_utils_1.loadGlobalConfig)();
            expect(result).toEqual(mockDefaultConfig);
        });
        it('should return default config when file read fails', () => {
            mockedFs.existsSync.mockReturnValue(true);
            mockedFs.readFileSync.mockImplementation(() => {
                throw new Error('Read error');
            });
            const result = (0, global_config_utils_1.loadGlobalConfig)();
            expect(result).toEqual(mockDefaultConfig);
        });
        it('should return default config when directory creation fails during initial setup', () => {
            mockedFs.existsSync.mockReturnValue(false);
            mockedFs.mkdirSync.mockImplementation(() => {
                throw new Error('Mkdir error');
            });
            const result = (0, global_config_utils_1.loadGlobalConfig)();
            expect(result).toEqual(mockDefaultConfig);
        });
        it('should return default config when file write fails during initial setup', () => {
            mockedFs.existsSync.mockReturnValue(false);
            mockedFs.writeFileSync.mockImplementation(() => {
                throw new Error('Write error');
            });
            const result = (0, global_config_utils_1.loadGlobalConfig)();
            expect(result).toEqual(mockDefaultConfig);
        });
        it('should handle empty config file', () => {
            mockedFs.existsSync.mockReturnValue(true);
            mockedFs.readFileSync.mockReturnValue('');
            const result = (0, global_config_utils_1.loadGlobalConfig)();
            expect(result).toEqual(mockDefaultConfig);
        });
        it('should handle config file with partial overrides', () => {
            const configJson = JSON.stringify({
                authenticationEnabled: true,
                authenticationUsername: 'testuser'
            });
            mockedFs.existsSync.mockReturnValue(true);
            mockedFs.readFileSync.mockReturnValue(configJson);
            const result = (0, global_config_utils_1.loadGlobalConfig)();
            expect(result).toEqual({
                ...mockDefaultConfig,
                authenticationEnabled: true,
                authenticationUsername: 'testuser'
            });
        });
    });
    describe('saveGlobalConfig', () => {
        it('should save config successfully and return true', () => {
            const configToSave = { ...mockDefaultConfig };
            const result = (0, global_config_utils_1.saveGlobalConfig)(configToSave);
            expect(mockedFs.mkdirSync).toHaveBeenCalledWith('/mock/install', { recursive: true });
            expect(mockedFs.writeFileSync).toHaveBeenCalledWith(mockConfigFile, JSON.stringify(configToSave, null, 2), 'utf-8');
            expect(result).toBe(true);
        });
        it('should return false when directory creation fails', () => {
            mockedFs.mkdirSync.mockImplementation(() => {
                throw new Error('Mkdir error');
            });
            const result = (0, global_config_utils_1.saveGlobalConfig)(mockCustomConfig);
            expect(result).toBe(false);
        });
        it('should return false when file write fails', () => {
            mockedFs.writeFileSync.mockImplementation(() => {
                throw new Error('Write error');
            });
            const result = (0, global_config_utils_1.saveGlobalConfig)(mockCustomConfig);
            expect(result).toBe(false);
        });
        it('should handle saving empty config object', () => {
            const emptyConfig = {};
            const result = (0, global_config_utils_1.saveGlobalConfig)(emptyConfig);
            expect(mockedFs.writeFileSync).toHaveBeenCalledWith(mockConfigFile, JSON.stringify(emptyConfig, null, 2), 'utf-8');
            expect(result).toBe(true);
        });
        it('should handle saving config with special characters', () => {
            const configWithSpecialChars = {
                ...mockDefaultConfig,
                authenticationUsername: 'user@domain.com',
                authenticationPassword: 'pass!@#$%^&*()'
            };
            const result = (0, global_config_utils_1.saveGlobalConfig)(configWithSpecialChars);
            expect(mockedFs.writeFileSync).toHaveBeenCalledWith(mockConfigFile, JSON.stringify(configWithSpecialChars, null, 2), 'utf-8');
            expect(result).toBe(true);
        });
    });
    describe('integration scenarios', () => {
        it('should handle round-trip save and load', () => {
            // Mock save operation
            const configToSave = { ...mockCustomConfig };
            // First save
            const saveResult = (0, global_config_utils_1.saveGlobalConfig)(configToSave);
            expect(saveResult).toBe(true);
            // Then load
            mockedFs.existsSync.mockReturnValue(true);
            mockedFs.readFileSync.mockReturnValue(JSON.stringify(configToSave));
            const loadedConfig = (0, global_config_utils_1.loadGlobalConfig)();
            expect(loadedConfig).toEqual({
                ...mockDefaultConfig,
                ...configToSave
            });
        });
        it('should handle config file in different directory', () => {
            const differentDir = '/different/path';
            const differentConfigFile = '/different/path/global-config.json';
            getDefaultInstallDir.mockReturnValue(differentDir);
            mockedPath.join.mockImplementation((...args) => {
                if (args[0] === differentDir && args[1] === 'global-config.json') {
                    return differentConfigFile;
                }
                return args.join('/');
            });
            mockedPath.dirname.mockReturnValue('/different');
            mockedFs.existsSync.mockReturnValue(false);
            const result = (0, global_config_utils_1.loadGlobalConfig)();
            expect(mockedFs.mkdirSync).toHaveBeenCalledWith('/different', { recursive: true });
            expect(mockedFs.writeFileSync).toHaveBeenCalledWith(differentConfigFile, JSON.stringify(mockDefaultConfig, null, 2), 'utf-8');
            expect(result).toEqual(mockDefaultConfig);
        });
    });
});
