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
const installUtils = __importStar(require("./ark-server-install.utils"));
const fs = __importStar(require("fs"));
const installer_utils_1 = require("../../installer.utils");
jest.mock('fs');
jest.mock('../../installer.utils');
describe('ark-server-install.utils', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('getArkServerDir', () => {
        it('should return a path string', () => {
            const dir = installUtils.getArkServerDir();
            expect(typeof dir).toBe('string');
            expect(dir).toContain('AASMServer');
        });
    });
    describe('isArkServerInstalled', () => {
        it('should return true if executable exists', () => {
            fs.existsSync.mockReturnValue(true);
            expect(installUtils.isArkServerInstalled()).toBe(true);
        });
        it('should return false if executable does not exist', () => {
            fs.existsSync.mockReturnValue(false);
            expect(installUtils.isArkServerInstalled()).toBe(false);
        });
    });
    describe('getCurrentInstalledVersion', () => {
        it('should return version from version.txt', async () => {
            fs.existsSync.mockImplementation((file) => file.includes('version.txt'));
            fs.readFileSync.mockReturnValue('1.2.3');
            const version = await installUtils.getCurrentInstalledVersion();
            expect(version).toBe('1.2.3');
        });
        it('should return buildid from manifest if version.txt missing', async () => {
            // Simulate version.txt missing, steamapps and manifest present
            fs.existsSync.mockImplementation((file) => {
                if (typeof file === 'string') {
                    if (file.endsWith('version.txt'))
                        return false;
                    if (file.endsWith('steamapps'))
                        return true;
                    if (file.includes('appmanifest'))
                        return true;
                }
                return false;
            });
            fs.readFileSync.mockReturnValue('"buildid" "456789"');
            const version = await installUtils.getCurrentInstalledVersion();
            expect(version).toBe('456789');
        });
        it('should return null if no version found', async () => {
            fs.existsSync.mockReturnValue(false);
            const version = await installUtils.getCurrentInstalledVersion();
            expect(version).toBeNull();
        });
        it('should handle errors gracefully', async () => {
            fs.existsSync.mockImplementation(() => { throw new Error('fail'); });
            const version = await installUtils.getCurrentInstalledVersion();
            expect(version).toBeNull();
        });
    });
    describe('installArkServer', () => {
        it('should call runInstaller with correct options', () => {
            fs.existsSync.mockReturnValue(true);
            const callback = jest.fn();
            installUtils.installArkServer(callback);
            expect(installer_utils_1.runInstaller).toHaveBeenCalled();
        });
        it('should call callback with error if SteamCMD missing', () => {
            fs.existsSync.mockReturnValue(false);
            const callback = jest.fn();
            installUtils.installArkServer(callback);
            expect(callback).toHaveBeenCalledWith(expect.any(Error));
        });
    });
    describe('pollArkServerUpdates', () => {
        it('should return null if getLatestServerVersion returns null', async () => {
            // Patch getLatestServerVersion to return null
            const orig = installUtils.getLatestServerVersion;
            installUtils.getLatestServerVersion = async () => null;
            const result = await installUtils.pollArkServerUpdates();
            expect(result).toBeNull();
            installUtils.getLatestServerVersion = orig;
        });
    });
});
