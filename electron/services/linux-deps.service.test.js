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
const linux_deps_service_1 = require("./linux-deps.service");
const systemDepsUtils = __importStar(require("../utils/system-deps.utils"));
const platformUtils = __importStar(require("../utils/platform.utils"));
describe('LinuxDepsService', () => {
    let service;
    beforeEach(() => {
        service = new linux_deps_service_1.LinuxDepsService();
        jest.spyOn(platformUtils, 'getPlatform').mockReturnValue('linux');
    });
    afterEach(() => {
        jest.restoreAllMocks();
    });
    it('checkDependencies returns all installed', async () => {
        jest.spyOn(systemDepsUtils, 'checkAllDependencies').mockResolvedValue([
            { installed: true, dependency: { name: 'dep', packageName: 'pkg', checkCommand: 'cmd', description: 'desc', required: true } }
        ]);
        const result = await service.checkDependencies();
        expect(result.success).toBe(true);
        expect(result.allDepsInstalled).toBe(true);
        expect(result.canProceed).toBe(true);
        expect(result.message).toContain('All Linux dependencies are installed');
    });
    it('checkDependencies returns missing dependencies', async () => {
        jest.spyOn(systemDepsUtils, 'checkAllDependencies').mockResolvedValue([
            { installed: false, dependency: { name: 'dep', packageName: 'pkg', checkCommand: 'cmd', description: 'desc', required: true } }
        ]);
        const result = await service.checkDependencies();
        expect(result.success).toBe(true);
        expect(result.allDepsInstalled).toBe(false);
        expect(result.canProceed).toBe(false);
        expect(result.missing[0].name).toBe('dep');
    });
    it('checkDependencies handles error', async () => {
        jest.spyOn(systemDepsUtils, 'checkAllDependencies').mockRejectedValue(new Error('fail'));
        const result = await service.checkDependencies();
        expect(result.success).toBe(false);
        expect(result.error).toBe('fail');
    });
    it('validateSudoPassword returns valid', async () => {
        jest.spyOn(systemDepsUtils, 'validateSudoPassword').mockResolvedValue(true);
        const result = await service.validateSudoPassword('pass');
        expect(result.valid).toBe(true);
        expect(result.error).toBeNull();
    });
    it('validateSudoPassword returns invalid', async () => {
        jest.spyOn(systemDepsUtils, 'validateSudoPassword').mockResolvedValue(false);
        const result = await service.validateSudoPassword('pass');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Invalid sudo password');
    });
    it('validateSudoPassword handles error', async () => {
        jest.spyOn(systemDepsUtils, 'validateSudoPassword').mockRejectedValue(new Error('fail'));
        const result = await service.validateSudoPassword('pass');
        expect(result.valid).toBe(false);
        expect(result.error).toBe('fail');
    });
    it('installDependencies returns success on non-linux', async () => {
        jest.spyOn(platformUtils, 'getPlatform').mockReturnValue('windows');
        const result = await service.installDependencies('pass', []);
        expect(result.success).toBe(true);
        expect(result.message).toContain('not required');
    });
    it('installDependencies fails with no password', async () => {
        const result = await service.installDependencies('', []);
        expect(result.success).toBe(false);
        expect(result.error).toBe('Sudo password is required for dependency installation');
    });
    it('installDependencies fails with no dependencies', async () => {
        const result = await service.installDependencies('pass', undefined);
        expect(result.success).toBe(false);
        expect(result.error).toBe('Dependencies list is required');
    });
    it('installDependencies fails with invalid password', async () => {
        jest.spyOn(systemDepsUtils, 'validateSudoPassword').mockResolvedValue(false);
        const result = await service.installDependencies('pass', []);
        expect(result.success).toBe(false);
        expect(result.error).toBe('Invalid sudo password');
    });
    it('installDependencies returns result from installMissingDependencies', async () => {
        jest.spyOn(systemDepsUtils, 'validateSudoPassword').mockResolvedValue(true);
        jest.spyOn(systemDepsUtils, 'installMissingDependencies').mockResolvedValue({ success: true, message: 'done', details: [] });
        const result = await service.installDependencies('pass', [{ name: 'dep', packageName: 'pkg', checkCommand: 'cmd', description: 'desc', required: true }]);
        expect(result.success).toBe(true);
    });
    it('installDependencies handles error', async () => {
        jest.spyOn(systemDepsUtils, 'validateSudoPassword').mockResolvedValue(true);
        jest.spyOn(systemDepsUtils, 'installMissingDependencies').mockRejectedValue(new Error('fail'));
        const result = await service.installDependencies('pass', [{ name: 'dep', packageName: 'pkg', checkCommand: 'cmd', description: 'desc', required: true }]);
        expect(result.success).toBe(false);
        expect(result.error).toBe('fail');
    });
    it('getAvailableDependencies returns dependencies and platform', () => {
        systemDepsUtils.LINUX_DEPENDENCIES = [{ name: 'dep', packageName: 'pkg', checkCommand: 'cmd', description: 'desc', required: true }];
        const result = service.getAvailableDependencies();
        expect(result.dependencies[0].name).toBe('dep');
        expect(result.platform).toBe('linux');
    });
});
