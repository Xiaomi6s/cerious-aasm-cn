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
const steamcmdUtils = __importStar(require("../steamcmd.utils"));
const installerUtils = __importStar(require("../installer.utils"));
const ark_install_utils_1 = require("./ark-install.utils");
describe('ark-install.utils', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('getArkServerDir', () => {
        it('should return server dir from ArkPathUtils', () => {
            jest.spyOn(ark_path_utils_1.ArkPathUtils, 'getArkServerDir').mockReturnValue('/ark/server');
            expect((0, ark_install_utils_1.getArkServerDir)()).toBe('/ark/server');
        });
    });
    describe('isArkServerInstalled', () => {
        it('should return true if executable exists', () => {
            jest.spyOn(ark_path_utils_1.ArkPathUtils, 'getArkExecutablePath').mockReturnValue('/ark/server/ark.exe');
            jest.spyOn(fs, 'existsSync').mockReturnValue(true);
            expect((0, ark_install_utils_1.isArkServerInstalled)()).toBe(true);
        });
        it('should return false if executable does not exist', () => {
            jest.spyOn(ark_path_utils_1.ArkPathUtils, 'getArkExecutablePath').mockReturnValue('/ark/server/ark.exe');
            jest.spyOn(fs, 'existsSync').mockReturnValue(false);
            expect((0, ark_install_utils_1.isArkServerInstalled)()).toBe(false);
        });
    });
    describe('getCurrentInstalledVersion', () => {
        it('should return version from version.txt', async () => {
            jest.spyOn(ark_path_utils_1.ArkPathUtils, 'getArkServerDir').mockReturnValue('/ark/server');
            jest.spyOn(fs, 'existsSync').mockImplementation((file) => file === '/ark/server/version.txt');
            jest.spyOn(fs, 'readFileSync').mockReturnValue('1.2.3\n');
            await expect((0, ark_install_utils_1.getCurrentInstalledVersion)()).resolves.toBe('1.2.3');
        });
        it('should return null if no version found', async () => {
            jest.spyOn(ark_path_utils_1.ArkPathUtils, 'getArkServerDir').mockReturnValue('/ark/server');
            jest.spyOn(fs, 'existsSync').mockReturnValue(false);
            await expect((0, ark_install_utils_1.getCurrentInstalledVersion)()).resolves.toBeNull();
        });
        it('should return null on error', async () => {
            jest.spyOn(ark_path_utils_1.ArkPathUtils, 'getArkServerDir').mockImplementation(() => { throw new Error('fail'); });
            await expect((0, ark_install_utils_1.getCurrentInstalledVersion)()).resolves.toBeNull();
        });
    });
    describe('installArkServer', () => {
        it('should callback error if steamcmd not found', () => {
            jest.spyOn(steamcmdUtils, 'getSteamCmdDir').mockReturnValue('/steamcmd');
            jest.spyOn(fs, 'existsSync').mockReturnValue(false);
            const cb = jest.fn();
            (0, ark_install_utils_1.installArkServer)(cb);
            expect(cb).toHaveBeenCalledWith(expect.any(Error));
        });
        it('should call runInstaller with correct options if steamcmd exists', () => {
            jest.spyOn(steamcmdUtils, 'getSteamCmdDir').mockReturnValue('/steamcmd');
            jest.spyOn(fs, 'existsSync').mockImplementation((file) => file === '/steamcmd/steamcmd.exe' || file === '/ark/server');
            jest.spyOn(path, 'join').mockImplementation((...args) => args.join('/'));
            jest.spyOn(installerUtils, 'runInstaller').mockImplementation((opts, onProgress, onDone) => {
                onProgress({ percent: 50, step: 'downloading', message: 'Mock progress' });
                onDone(null, 'done');
            });
            jest.spyOn(ark_path_utils_1.ArkPathUtils, 'getArkServerDir').mockReturnValue('/ark/server');
            const cb = jest.fn();
            const onData = jest.fn();
            (0, ark_install_utils_1.installArkServer)(cb, onData);
            expect(installerUtils.runInstaller).toHaveBeenCalled();
            expect(cb).toHaveBeenCalledWith(null, 'done');
            expect(onData).toHaveBeenCalledWith({ percent: 50, step: 'downloading', message: 'Mock progress' });
        });
    });
});
