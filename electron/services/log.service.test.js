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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const log_service_1 = require("../services/log.service");
const ark_utils_1 = require("../utils/ark.utils");
// Mock the dependencies
jest.mock('fs');
jest.mock('path');
jest.mock('../utils/ark.utils');
const mockFs = fs;
const mockPath = path;
const mockArkPathUtils = ark_utils_1.ArkPathUtils;
describe('LogService', () => {
    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();
    });
    describe('clearArkLogFiles', () => {
        it('should clear all ARK log files when logs directory exists', () => {
            // Arrange
            const mockLogsDir = '/mock/ark/server/ShooterGame/Saved/Logs';
            const mockLogFiles = ['ShooterGame.log', 'ShooterGame_001.log', 'ShooterGame_002.log', 'not-a-log.txt'];
            mockArkPathUtils.getArkServerDir.mockReturnValue('/mock/ark/server');
            mockPath.join
                .mockReturnValueOnce(mockLogsDir) // logsDir path
                .mockReturnValueOnce(`${mockLogsDir}/ShooterGame.log`)
                .mockReturnValueOnce(`${mockLogsDir}/ShooterGame_001.log`)
                .mockReturnValueOnce(`${mockLogsDir}/ShooterGame_002.log`);
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readdirSync.mockReturnValue(mockLogFiles);
            mockFs.writeFileSync.mockImplementation(() => { });
            // Act
            log_service_1.LogService.clearArkLogFiles();
            // Assert
            expect(mockArkPathUtils.getArkServerDir).toHaveBeenCalled();
            expect(mockPath.join).toHaveBeenCalledWith('/mock/ark/server', 'ShooterGame', 'Saved', 'Logs');
            expect(mockFs.existsSync).toHaveBeenCalledWith(mockLogsDir);
            // Should clear the 3 log files but not the non-log file
            expect(mockFs.writeFileSync).toHaveBeenCalledTimes(3);
            expect(mockFs.writeFileSync).toHaveBeenCalledWith(`${mockLogsDir}/ShooterGame.log`, '', 'utf8');
            expect(mockFs.writeFileSync).toHaveBeenCalledWith(`${mockLogsDir}/ShooterGame_001.log`, '', 'utf8');
            expect(mockFs.writeFileSync).toHaveBeenCalledWith(`${mockLogsDir}/ShooterGame_002.log`, '', 'utf8');
        });
        it('should do nothing when logs directory does not exist', () => {
            // Arrange
            const mockLogsDir = '/mock/ark/server/ShooterGame/Saved/Logs';
            mockArkPathUtils.getArkServerDir.mockReturnValue('/mock/ark/server');
            mockPath.join.mockReturnValue(mockLogsDir);
            mockFs.existsSync.mockReturnValue(false);
            // Act
            log_service_1.LogService.clearArkLogFiles();
            // Assert
            expect(mockArkPathUtils.getArkServerDir).toHaveBeenCalled();
            expect(mockFs.existsSync).toHaveBeenCalledWith(mockLogsDir);
            expect(mockFs.readdirSync).not.toHaveBeenCalled();
            expect(mockFs.writeFileSync).not.toHaveBeenCalled();
        });
        it('should handle errors gracefully', () => {
            // Arrange
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
            mockArkPathUtils.getArkServerDir.mockImplementation(() => {
                throw new Error('Mock error');
            });
            // Act
            log_service_1.LogService.clearArkLogFiles();
            // Assert
            expect(consoleSpy).toHaveBeenCalledTimes(1);
            expect(consoleSpy).toHaveBeenCalledWith('[LogService] Failed to clear ARK log files:', new Error('Mock error'));
            // Cleanup
            consoleSpy.mockRestore();
        });
        it('should only clear files matching the ARK log pattern', () => {
            // Arrange
            const mockLogsDir = '/mock/ark/server/ShooterGame/Saved/Logs';
            const mockLogFiles = [
                'ShooterGame.log', // Should clear
                'ShooterGame_001.log', // Should clear
                'ShooterGame_123.log', // Should clear
                'random.log', // Should NOT clear
                'ShooterGame.txt', // Should NOT clear
                'some-other-file.log', // Should NOT clear
            ];
            mockArkPathUtils.getArkServerDir.mockReturnValue('/mock/ark/server');
            mockPath.join.mockReturnValue(mockLogsDir);
            mockFs.existsSync.mockReturnValue(true);
            mockFs.readdirSync.mockReturnValue(mockLogFiles);
            mockFs.writeFileSync.mockImplementation(() => { });
            // Act
            log_service_1.LogService.clearArkLogFiles();
            // Assert - should only clear files matching the pattern ShooterGame.log or ShooterGame_XXX.log
            expect(mockFs.writeFileSync).toHaveBeenCalledTimes(3);
        });
    });
});
