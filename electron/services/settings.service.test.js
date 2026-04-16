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
const settings_service_1 = require("./settings.service");
const globalConfigUtils = __importStar(require("../utils/global-config.utils"));
const validationUtils = __importStar(require("../utils/validation.utils"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const platformUtils = __importStar(require("../utils/platform.utils"));
jest.mock('bcrypt', () => ({
    hash: jest.fn().mockResolvedValue('hashed')
}));
describe('SettingsService', () => {
    let service;
    beforeEach(() => {
        service = new settings_service_1.SettingsService();
        jest.spyOn(globalConfigUtils, 'loadGlobalConfig').mockReturnValue({
            startWebServerOnLoad: false,
            webServerPort: 3000,
            authenticationEnabled: false,
            authenticationUsername: '',
            authenticationPassword: '',
            maxBackupDownloadSizeMB: 100
        });
        jest.spyOn(globalConfigUtils, 'saveGlobalConfig').mockReturnValue(true);
        jest.spyOn(validationUtils, 'validatePort').mockReturnValue(true);
        jest.spyOn(validationUtils, 'sanitizeString').mockImplementation((s) => s);
        jest.spyOn(path, 'join').mockImplementation((...args) => args.join('/'));
        jest.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
        jest.spyOn(fs, 'writeFileSync').mockImplementation(() => { });
        jest.spyOn(platformUtils, 'getDefaultInstallDir').mockReturnValue('/install');
        // bcrypt.hash is already mocked above
    });
    afterEach(() => {
        jest.restoreAllMocks();
    });
    it('getGlobalConfig returns config', () => {
        expect(service.getGlobalConfig()).toEqual({
            startWebServerOnLoad: false,
            webServerPort: 3000,
            authenticationEnabled: false,
            authenticationUsername: '',
            authenticationPassword: '',
            maxBackupDownloadSizeMB: 100
        });
    });
    it('updateGlobalConfig returns success and updated config', async () => {
        const result = await service.updateGlobalConfig({ webServerPort: 3000 });
        expect(result.success).toBe(true);
        expect(result.updatedConfig).toEqual({
            startWebServerOnLoad: false,
            webServerPort: 3000,
            authenticationEnabled: false,
            authenticationUsername: '',
            authenticationPassword: '',
            maxBackupDownloadSizeMB: 100
        });
    });
    it('updateGlobalConfig returns error for invalid config', async () => {
        const result = await service.updateGlobalConfig(null);
        expect(result.success).toBe(false);
        expect(result.error).toBe('Invalid config object');
    });
    it('updateGlobalConfig returns error for invalid port', async () => {
        validationUtils.validatePort.mockReturnValue(false);
        const result = await service.updateGlobalConfig({ webServerPort: 1 });
        expect(result.success).toBe(false);
        expect(result.error).toBe('Invalid web server port');
    });
    it('updateGlobalConfig returns error if save fails', async () => {
        globalConfigUtils.saveGlobalConfig.mockReturnValue(false);
        const result = await service.updateGlobalConfig({ webServerPort: 3000 });
        expect(result.success).toBe(false);
        expect(result.error).toBe('Failed to save configuration');
    });
    it('getWebServerAuthConfig returns correct config', () => {
        const config = { authenticationEnabled: true, authenticationUsername: 'user', authenticationPassword: 'pass' };
        expect(service.getWebServerAuthConfig(config)).toEqual({ enabled: true, username: 'user', password: 'pass' });
    });
    it('updateWebServerAuth saves config and sends to process', async () => {
        const apiProcess = { killed: false, send: jest.fn() };
        await service.updateWebServerAuth({ authenticationEnabled: true, authenticationUsername: 'user', authenticationPassword: 'pass' }, apiProcess);
        expect(fs.mkdirSync).toHaveBeenCalled();
        expect(fs.writeFileSync).toHaveBeenCalled();
        expect(apiProcess.send).toHaveBeenCalledWith({ type: 'update-auth-config', authConfig: { enabled: true, username: 'user', password: 'pass' } });
    });
    it('updateWebServerAuth does not send if process killed', async () => {
        const apiProcess = { killed: true, send: jest.fn() };
        await service.updateWebServerAuth({ authenticationEnabled: true, authenticationUsername: 'user', authenticationPassword: 'pass' }, apiProcess);
        expect(apiProcess.send).not.toHaveBeenCalled();
    });
});
