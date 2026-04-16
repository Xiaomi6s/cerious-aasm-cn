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
const path = __importStar(require("path"));
const ark_path_utils_1 = require("./ark-path.utils");
const platformUtils = __importStar(require("../platform.utils"));
describe('ArkPathUtils', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('getArkServerDir', () => {
        it('returns default install dir + AASMServer', () => {
            jest.spyOn(platformUtils, 'getDefaultInstallDir').mockReturnValue('/base');
            expect(ark_path_utils_1.ArkPathUtils.getArkServerDir()).toBe(path.join('/base', 'AASMServer'));
        });
    });
    describe('getArkExecutablePath', () => {
        it('returns Windows exe path on windows', () => {
            jest.spyOn(platformUtils, 'getDefaultInstallDir').mockReturnValue('/base');
            jest.spyOn(platformUtils, 'getPlatform').mockReturnValue('windows');
            const expected = path.join('/base', 'AASMServer', 'ShooterGame', 'Binaries', 'Win64', 'ArkAscendedServer.exe');
            expect(ark_path_utils_1.ArkPathUtils.getArkExecutablePath()).toBe(expected);
        });
        it('returns Windows exe path on linux (for Proton)', () => {
            jest.spyOn(platformUtils, 'getDefaultInstallDir').mockReturnValue('/base');
            jest.spyOn(platformUtils, 'getPlatform').mockReturnValue('linux');
            const expected = path.join('/base', 'AASMServer', 'ShooterGame', 'Binaries', 'Win64', 'ArkAscendedServer.exe');
            expect(ark_path_utils_1.ArkPathUtils.getArkExecutablePath()).toBe(expected);
        });
    });
    describe('getArkConfigDir', () => {
        it('returns config dir path', () => {
            jest.spyOn(platformUtils, 'getDefaultInstallDir').mockReturnValue('/base');
            const expected = path.join('/base', 'AASMServer', 'ShooterGame', 'Saved', 'Config', 'WindowsServer');
            expect(ark_path_utils_1.ArkPathUtils.getArkConfigDir()).toBe(expected);
        });
    });
    describe('getArkSavedDir', () => {
        it('returns saved dir path', () => {
            jest.spyOn(platformUtils, 'getDefaultInstallDir').mockReturnValue('/base');
            const expected = path.join('/base', 'AASMServer', 'ShooterGame', 'Saved');
            expect(ark_path_utils_1.ArkPathUtils.getArkSavedDir()).toBe(expected);
        });
    });
    describe('getArkLogsDir', () => {
        it('returns logs dir path', () => {
            jest.spyOn(platformUtils, 'getDefaultInstallDir').mockReturnValue('/base');
            const expected = path.join('/base', 'AASMServer', 'ShooterGame', 'Saved', 'Logs');
            expect(ark_path_utils_1.ArkPathUtils.getArkLogsDir()).toBe(expected);
        });
    });
});
describe('ARK_PATH constants', () => {
    it('ARK_APP_ID is correct', () => {
        expect(ark_path_utils_1.ARK_APP_ID).toBe('2430930');
    });
    it('POLL_INTERVAL_MS is 30min', () => {
        expect(ark_path_utils_1.POLL_INTERVAL_MS).toBe(30 * 60 * 1000);
    });
});
