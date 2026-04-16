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
const server_installer_service_1 = require("./server-installer.service");
const platformUtils = __importStar(require("../utils/platform.utils"));
const systemDepsUtils = __importStar(require("../utils/system-deps.utils"));
const protonUtils = __importStar(require("../utils/proton.utils"));
const steamcmdUtils = __importStar(require("../utils/steamcmd.utils"));
const arkUtils = __importStar(require("../utils/ark.utils"));
jest.mock('fs-extra', () => ({
    existsSync: jest.fn(() => true)
}));
jest.mock('../utils/ark.utils', () => ({
    installArkServer: jest.fn((cb, progressCb) => cb(null)),
    ArkPathUtils: {
        getArkServerDir: jest.fn(() => '/ark/server'),
        getArkExecutablePath: jest.fn(() => '/ark/server/ark.exe')
    }
}));
describe('ServerInstallerService', () => {
    let service;
    let progressCallback;
    beforeEach(() => {
        service = new server_installer_service_1.ServerInstallerService();
        progressCallback = jest.fn();
        jest.spyOn(platformUtils, 'getPlatform').mockReturnValue('linux');
        jest.spyOn(systemDepsUtils, 'checkAllDependencies').mockResolvedValue([]);
        jest.spyOn(systemDepsUtils, 'installMissingDependencies').mockResolvedValue({ success: true, message: 'done', details: [] });
        jest.spyOn(protonUtils, 'isProtonInstalled').mockReturnValue(true);
        jest.spyOn(protonUtils, 'installProton').mockImplementation((cb, progressCb) => cb(null));
        jest.spyOn(steamcmdUtils, 'isSteamCmdInstalled').mockReturnValue(true);
        jest.spyOn(steamcmdUtils, 'installSteamCmd').mockImplementation((cb, progressCb) => cb(null));
        // existsSync is already mocked above
        // arkUtils.installArkServer and ArkPathUtils are already mocked above
    });
    afterEach(() => {
        jest.restoreAllMocks();
    });
    it('installServer completes successfully', async () => {
        const result = await service.installServer(progressCallback, 'pass');
        expect(result.success).toBe(true);
        expect(result.message).toContain('completed successfully');
        expect(progressCallback).toHaveBeenCalled();
    });
    it('installServer fails if validation fails', async () => {
        jest.spyOn(require('fs-extra'), 'existsSync').mockImplementation((p) => p !== '/ark/server/ark.exe');
        const result = await service.installServer(progressCallback, 'pass');
        expect(result.success).toBe(false);
        expect(result.message).toContain('Installation validation failed');
    });
    it('installServer fails if missing dependencies and no sudo password', async () => {
        jest.spyOn(systemDepsUtils, 'checkAllDependencies').mockResolvedValue([
            { installed: false, dependency: { name: 'dep', packageName: 'pkg', checkCommand: 'cmd', description: 'desc', required: true } }
        ]);
        const result = await service.installServer(progressCallback);
        expect(result.success).toBe(false);
        expect(result.message).toContain('Sudo password required');
    });
    it('installServer fails if installMissingDependencies fails', async () => {
        jest.spyOn(systemDepsUtils, 'checkAllDependencies').mockResolvedValue([
            { installed: false, dependency: { name: 'dep', packageName: 'pkg', checkCommand: 'cmd', description: 'desc', required: true } }
        ]);
        jest.spyOn(systemDepsUtils, 'installMissingDependencies').mockResolvedValue({ success: false, message: 'fail', details: [] });
        const result = await service.installServer(progressCallback, 'pass');
        expect(result.success).toBe(false);
        expect(result.message).toContain('Failed to install Linux dependencies');
    });
    it('installServer fails if installProton fails', async () => {
        jest.spyOn(protonUtils, 'isProtonInstalled').mockReturnValue(false);
        jest.spyOn(protonUtils, 'installProton').mockImplementation((cb, progressCb) => cb(new Error('fail')));
        const result = await service.installServer(progressCallback, 'pass');
        expect(result.success).toBe(false);
        expect(result.message).toContain('fail');
    });
    it('installServer fails if installSteamCmd fails', async () => {
        jest.spyOn(steamcmdUtils, 'isSteamCmdInstalled').mockReturnValue(false);
        jest.spyOn(steamcmdUtils, 'installSteamCmd').mockImplementation((cb, progressCb) => cb(new Error('fail')));
        const result = await service.installServer(progressCallback, 'pass');
        expect(result.success).toBe(false);
        expect(result.message).toContain('fail');
    });
    it('installServer fails if installArkServer fails', async () => {
        jest.spyOn(arkUtils, 'installArkServer').mockImplementation((cb, progressCb) => cb(new Error('fail')));
        const result = await service.installServer(progressCallback, 'pass');
        expect(result.success).toBe(false);
        expect(result.message).toContain('fail');
    });
});
