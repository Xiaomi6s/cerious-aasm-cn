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
const ark_config_service_1 = require("./ark-config.service");
const fs = __importStar(require("fs"));
jest.spyOn(fs, 'copyFileSync').mockImplementation(() => { });
const path = __importStar(require("path"));
const ark_utils_1 = require("../utils/ark.utils");
jest.mock('fs');
jest.mock('path');
jest.mock('../utils/ark.utils');
describe('ArkConfigService', () => {
    let service;
    beforeEach(() => {
        service = new ark_config_service_1.ArkConfigService();
        jest.clearAllMocks();
    });
    it('getArkLaunchParameters returns array from config', () => {
        const config = { launchParameters: '--foo --bar' };
        expect(service.getArkLaunchParameters(config)).toEqual(['--foo', '--bar']);
    });
    it('getArkLaunchParameters returns empty array if not set', () => {
        expect(service.getArkLaunchParameters({})).toEqual([]);
    });
    it('getArkMapName returns mapName from config', () => {
        expect(service.getArkMapName({ mapName: 'TestMap' })).toBe('TestMap');
    });
    it('getArkMapName returns default if not set', () => {
        expect(service.getArkMapName({})).toBe('TheIsland_WP');
    });
    it('writeArkConfigFiles writes files and copies them', () => {
        // Simulate that source files exist so copyFileSync is called for both
        fs.existsSync.mockImplementation((filePath) => {
            if (filePath.includes('Config/WindowsServer/GameUserSettings.ini') || filePath.includes('Config/WindowsServer/Game.ini')) {
                return true;
            }
            return false;
        });
        jest.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
        jest.spyOn(fs, 'writeFileSync').mockImplementation(() => { });
        jest.spyOn(fs, 'copyFileSync').mockImplementation(() => { });
        ark_utils_1.ArkPathUtils.getArkServerDir.mockReturnValue('ARK_SERVER_DIR');
        path.join.mockImplementation((...args) => args.join('/'));
        // Provide a config that triggers copying
        const configWithCopy = { altSaveDirectoryName: 'AltDir', modSettings: { '123': { foo: 'bar' } }, copyFiles: true };
        expect(() => service.writeArkConfigFiles('INSTANCE_DIR', configWithCopy)).not.toThrow();
        expect(fs.mkdirSync).toHaveBeenCalled();
        expect(fs.writeFileSync).toHaveBeenCalled();
        expect(fs.copyFileSync).toHaveBeenCalled();
    });
});
