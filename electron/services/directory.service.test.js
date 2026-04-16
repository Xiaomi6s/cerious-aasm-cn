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
const directory_service_1 = require("./directory.service");
const platformUtils = __importStar(require("../utils/platform.utils"));
const instanceUtils = __importStar(require("../utils/ark/instance.utils"));
const validationUtils = __importStar(require("../utils/validation.utils"));
const electron = __importStar(require("electron"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
jest.mock('path', () => ({
    join: jest.fn((...args) => args.join('/')),
    resolve: jest.fn((...args) => args.join('/')),
    isAbsolute: jest.fn(() => true)
}));
jest.mock('electron', () => ({
    shell: {
        openPath: jest.fn()
    }
}));
describe('DirectoryService', () => {
    let service;
    beforeEach(() => {
        service = new directory_service_1.DirectoryService();
        jest.spyOn(platformUtils, 'getDefaultInstallDir').mockReturnValue('INSTALL_DIR');
        electron.shell.openPath.mockResolvedValue('');
        jest.spyOn(path, 'join').mockImplementation((...args) => args.join('/'));
        jest.spyOn(path, 'resolve').mockImplementation((...args) => args.join('/'));
    });
    afterEach(() => {
        jest.restoreAllMocks();
    });
    it('openConfigDirectory opens config dir', async () => {
        const result = await service.openConfigDirectory();
        expect(result.success).toBe(true);
        expect(result.configDir).toBe('INSTALL_DIR');
        expect(electron.shell.openPath).toHaveBeenCalledWith('INSTALL_DIR');
    });
    it('openConfigDirectory handles error', async () => {
        electron.shell.openPath.mockRejectedValue(new Error('fail'));
        const result = await service.openConfigDirectory();
        expect(result.success).toBe(false);
        expect(result.error).toBe('fail');
    });
    it('openInstanceDirectory validates instanceId', async () => {
        jest.spyOn(validationUtils, 'validateInstanceId').mockReturnValue(false);
        const result = await service.openInstanceDirectory('badid');
        expect(result.success).toBe(false);
        expect(result.error).toBe('Invalid instance ID');
    });
    it('openInstanceDirectory handles missing instance', async () => {
        jest.spyOn(validationUtils, 'validateInstanceId').mockReturnValue(true);
        jest.spyOn(instanceUtils, 'getInstance').mockResolvedValue(null);
        const result = await service.openInstanceDirectory('id');
        expect(result.success).toBe(false);
        expect(result.error).toBe('Instance not found');
    });
    it('openInstanceDirectory opens valid instance', async () => {
        jest.spyOn(validationUtils, 'validateInstanceId').mockReturnValue(true);
        jest.spyOn(instanceUtils, 'getInstance').mockResolvedValue({});
        jest.spyOn(service, 'validateDirectoryPath').mockReturnValue({ isValid: true });
        const result = await service.openInstanceDirectory('id');
        expect(result.success).toBe(true);
        expect(result.instanceId).toBe('id');
        expect(electron.shell.openPath).toHaveBeenCalled();
    });
    it('openInstanceDirectory fails security validation', async () => {
        jest.spyOn(validationUtils, 'validateInstanceId').mockReturnValue(true);
        jest.spyOn(instanceUtils, 'getInstance').mockResolvedValue({});
        jest.spyOn(service, 'validateDirectoryPath').mockReturnValue({ isValid: false, error: 'bad' });
        const result = await service.openInstanceDirectory('id');
        expect(result.success).toBe(false);
        expect(result.error).toBe('bad');
    });
    it('getServerInstancesBaseDirectory returns correct path', () => {
        expect(service.getServerInstancesBaseDirectory()).toContain('AASMServer');
    });
    it('getConfigDirectory returns install dir', () => {
        expect(service.getConfigDirectory()).toBe('INSTALL_DIR');
    });
    it('testDirectoryAccess returns accessible for valid dir', async () => {
        jest.spyOn(fs.promises, 'stat').mockResolvedValue({ isDirectory: () => true });
        jest.spyOn(fs.promises, 'readdir').mockResolvedValue([]);
        jest.spyOn(fs.promises, 'writeFile').mockResolvedValue(undefined);
        jest.spyOn(fs.promises, 'unlink').mockResolvedValue(undefined);
        const result = await service.testDirectoryAccess('dir');
        expect(result.accessible).toBe(true);
    });
    it('testDirectoryAccess returns error for non-directory', async () => {
        jest.spyOn(fs.promises, 'stat').mockResolvedValue({ isDirectory: () => false });
        const result = await service.testDirectoryAccess('dir');
        expect(result.accessible).toBe(false);
        expect(result.error).toBe('Path is not a directory');
    });
    it('testDirectoryAccess returns error for stat failure', async () => {
        jest.spyOn(fs.promises, 'stat').mockRejectedValue(new Error('fail'));
        const result = await service.testDirectoryAccess('dir');
        expect(result.accessible).toBe(false);
        expect(result.error).toBe('fail');
    });
    it('validateDirectoryPath returns valid for correct path', () => {
        const result = service.validateDirectoryPath('INSTALL_DIR/AASMServer/ShooterGame/Saved/Servers/id');
        expect(result.isValid).toBe(true);
    });
    it('validateDirectoryPath returns invalid for traversal', () => {
        const result = service.validateDirectoryPath('/etc/passwd');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Access denied');
    });
});
