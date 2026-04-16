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
const install_service_1 = require("./install.service");
const platformUtils = __importStar(require("../utils/platform.utils"));
const installerUtils = __importStar(require("../utils/installer.utils"));
const systemDepsUtils = __importStar(require("../utils/system-deps.utils"));
describe('InstallService', () => {
    let service;
    let progressCallback;
    beforeEach(() => {
        jest.spyOn(installerUtils, 'removeInstallLock').mockImplementation(() => { });
        service = new install_service_1.InstallService();
        progressCallback = jest.fn();
        jest.spyOn(platformUtils, 'getPlatform').mockReturnValue('linux');
        jest.spyOn(installerUtils, 'isInstallLocked').mockReturnValue(false);
        jest.spyOn(installerUtils, 'createInstallLock').mockImplementation(() => { });
    });
    afterEach(() => {
        jest.restoreAllMocks();
    });
    it('checkInstallRequirements returns no requirements for non-server', async () => {
        const result = await service.checkInstallRequirements('steamcmd');
        expect(result.success).toBe(true);
        expect(result.canProceed).toBe(true);
        expect(result.message).toContain('No special requirements');
    });
    it('checkInstallRequirements returns missing dependencies for server', async () => {
        jest.spyOn(systemDepsUtils, 'checkAllDependencies').mockResolvedValue([
            {
                installed: false,
                dependency: {
                    name: 'dep1',
                    packageName: 'dep1-pkg',
                    checkCommand: 'dep1 --version',
                    description: 'desc1',
                    required: true
                }
            },
            {
                installed: true,
                dependency: {
                    name: 'dep2',
                    packageName: 'dep2-pkg',
                    checkCommand: 'dep2 --version',
                    description: 'desc2',
                    required: false
                }
            }
        ]);
        const result = await service.checkInstallRequirements('server');
        expect(result.success).toBe(true);
        expect(result.requiresSudo).toBe(true);
        expect(result.canProceed).toBe(false);
        expect(result.missingDependencies[0].name).toBe('dep1');
    });
    it('validateInstallParams validates and sanitizes', () => {
        const result = service.validateInstallParams('server', 'pass');
        expect(result.isValid).toBe(true);
        expect(result.sanitizedTarget).toBeDefined();
    });
    it('validateInstallParams fails for bad target', () => {
        const result = service.validateInstallParams(undefined);
        expect(result.isValid).toBe(false);
    });
    it('validateInstallParams fails for bad sudo password', () => {
        const result = service.validateInstallParams('server', 123);
        expect(result.isValid).toBe(false);
    });
    it('installComponent calls correct installer for server', async () => {
        jest.spyOn(service, 'installServerComprehensive').mockResolvedValue({ status: 'success', target: 'server' });
        const result = await service.installComponent('server', progressCallback, 'pass');
        expect(result.status).toBe('success');
        expect(result.target).toBe('server');
    });
    it('installComponent calls correct installer for steamcmd', async () => {
        jest.spyOn(service, 'installSteamCmdComponent').mockResolvedValue({ status: 'success', target: 'steamcmd' });
        const result = await service.installComponent('steamcmd', progressCallback);
        expect(result.status).toBe('success');
        expect(result.target).toBe('steamcmd');
    });
    it('installComponent calls correct installer for proton', async () => {
        jest.spyOn(service, 'installProtonComponent').mockResolvedValue({ status: 'success', target: 'proton' });
        const result = await service.installComponent('proton', progressCallback);
        expect(result.status).toBe('success');
        expect(result.target).toBe('proton');
    });
    it('installComponent returns error for unknown target', async () => {
        const result = await service.installComponent('unknown', progressCallback);
        expect(result.status).toBe('error');
        expect(result.error).toContain('Unknown install target');
    });
    it('cancelInstallation cancels server install', () => {
        jest.spyOn(installerUtils, 'cancelInstaller').mockImplementation(() => { });
        const result = service.cancelInstallation('server');
        expect(result.success).toBe(true);
        expect(result.target).toBe('server');
    });
    it('cancelInstallation fails for non-server', () => {
        const result = service.cancelInstallation('steamcmd');
        expect(result.success).toBe(false);
        expect(result.target).toBe('steamcmd');
    });
});
