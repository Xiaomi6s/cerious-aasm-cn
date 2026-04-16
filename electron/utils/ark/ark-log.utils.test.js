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
/// <reference types="jest" />
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const ark_path_utils_1 = require("./ark-path.utils");
const ark_log_utils_1 = require("./ark-log.utils");
describe('ArkLogUtils', () => {
    describe('parseServerLogs', () => {
        it('should detect server started', () => {
            const log = 'Server ready\nListening on port 7777';
            const result = ark_log_utils_1.ArkLogUtils.parseServerLogs(log);
            expect(result.serverStarted).toBe(true);
        });
        it('should collect errors and warnings', () => {
            const log = 'Error: Something broke\nWarning: Something odd';
            const result = ark_log_utils_1.ArkLogUtils.parseServerLogs(log);
            expect(result.errors).toContain('Error: Something broke');
            expect(result.warnings).toContain('Warning: Something odd');
        });
        it('should collect player joins and leaves', () => {
            const log = 'Bob joined the game\nAlice left the game';
            const result = ark_log_utils_1.ArkLogUtils.parseServerLogs(log);
            expect(result.playerJoins).toContain('Bob joined the game');
            expect(result.playerLeaves).toContain('Alice left the game');
        });
        it('should handle empty log', () => {
            const result = ark_log_utils_1.ArkLogUtils.parseServerLogs('');
            expect(result.serverStarted).toBe(false);
            expect(result.errors).toEqual([]);
            expect(result.warnings).toEqual([]);
            expect(result.playerJoins).toEqual([]);
            expect(result.playerLeaves).toEqual([]);
        });
        it('should not detect server started if not present', () => {
            const result = ark_log_utils_1.ArkLogUtils.parseServerLogs('foo\nbar');
            expect(result.serverStarted).toBe(false);
        });
    });
    describe('getLatestLogFile', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });
        it('should return null if logs dir does not exist', () => {
            jest.spyOn(ark_path_utils_1.ArkPathUtils, 'getArkLogsDir').mockReturnValue('/logs');
            jest.spyOn(fs, 'existsSync').mockReturnValue(false);
            expect(ark_log_utils_1.ArkLogUtils.getLatestLogFile('session')).toBeNull();
        });
        it('should return null if no log files', () => {
            jest.spyOn(ark_path_utils_1.ArkPathUtils, 'getArkLogsDir').mockReturnValue('/logs');
            jest.spyOn(fs, 'existsSync').mockReturnValue(true);
            jest.spyOn(fs, 'readdirSync').mockReturnValue([]);
            expect(ark_log_utils_1.ArkLogUtils.getLatestLogFile('session')).toBeNull();
        });
        it('should return most recent log if no session match', () => {
            jest.spyOn(ark_path_utils_1.ArkPathUtils, 'getArkLogsDir').mockReturnValue('/logs');
            jest.spyOn(fs, 'existsSync').mockReturnValue(true);
            function mockDirent(name) {
                return {
                    name: Buffer.from(name),
                    parentPath: '',
                    isFile: () => true,
                    isDirectory: () => false,
                    isBlockDevice: () => false,
                    isCharacterDevice: () => false,
                    isSymbolicLink: () => false,
                    isFIFO: () => false,
                    isSocket: () => false,
                };
            }
            jest.spyOn(fs, 'readdirSync').mockImplementation((() => [
                'ShooterGame.log',
                'ShooterGame_1.log'
            ]));
            jest.spyOn(path, 'join').mockImplementation((...args) => args.join('/'));
            jest.spyOn(fs, 'statSync').mockImplementation((file) => {
                const stats = jest.requireActual('fs').statSync(__filename);
                const fileName = String(file);
                stats.mtime = new Date(fileName.includes('1') ? 1000 : 2000);
                return stats;
            });
            jest.spyOn(fs, 'readFileSync').mockImplementation((file) => {
                return '';
            });
            expect(ark_log_utils_1.ArkLogUtils.getLatestLogFile('session')).toBe('/logs/ShooterGame.log');
        });
        it('should return log file matching session name', () => {
            jest.spyOn(ark_path_utils_1.ArkPathUtils, 'getArkLogsDir').mockReturnValue('/logs');
            jest.spyOn(fs, 'existsSync').mockReturnValue(true);
            jest.spyOn(fs, 'readdirSync').mockImplementation((() => [
                'ShooterGame.log',
                'ShooterGame_1.log'
            ]));
            jest.spyOn(path, 'join').mockImplementation((...args) => args.join('/'));
            jest.spyOn(fs, 'statSync').mockImplementation((file) => {
                const stats = jest.requireActual('fs').statSync(__filename);
                const fileName = String(file);
                stats.mtime = new Date(fileName.includes('1') ? 1000 : 2000);
                return stats;
            });
            jest.spyOn(fs, 'readFileSync').mockImplementation((file) => {
                const fileName = String(file);
                return fileName.includes('1') ? 'SessionName=session' : '';
            });
            expect(ark_log_utils_1.ArkLogUtils.getLatestLogFile('session')).toBe('/logs/ShooterGame_1.log');
        });
        it('should skip unreadable log files', () => {
            jest.spyOn(ark_path_utils_1.ArkPathUtils, 'getArkLogsDir').mockReturnValue('/logs');
            jest.spyOn(fs, 'existsSync').mockReturnValue(true);
            jest.spyOn(fs, 'readdirSync').mockImplementation((() => [
                'ShooterGame.log',
                'ShooterGame_1.log'
            ]));
            jest.spyOn(path, 'join').mockImplementation((...args) => args.join('/'));
            jest.spyOn(fs, 'statSync').mockImplementation((file) => {
                const stats = jest.requireActual('fs').statSync(__filename);
                const fileName = String(file);
                stats.mtime = new Date(fileName.includes('1') ? 1000 : 2000);
                return stats;
            });
            jest.spyOn(fs, 'readFileSync').mockImplementation((file) => {
                const fileName = String(file);
                if (fileName.includes('1'))
                    throw new Error('fail');
                return '';
            });
            expect(ark_log_utils_1.ArkLogUtils.getLatestLogFile('session')).toBe('/logs/ShooterGame.log');
        });
        it('should handle error in try/catch and return null', () => {
            jest.spyOn(ark_path_utils_1.ArkPathUtils, 'getArkLogsDir').mockReturnValue('/logs');
            jest.spyOn(fs, 'existsSync').mockReturnValue(true);
            jest.spyOn(fs, 'readdirSync').mockImplementation(() => { throw new Error('fail'); });
            expect(ark_log_utils_1.ArkLogUtils.getLatestLogFile('session')).toBeNull();
        });
    });
});
