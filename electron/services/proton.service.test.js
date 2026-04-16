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
const proton_service_1 = require("./proton.service");
const platformUtils = __importStar(require("../utils/platform.utils"));
const protonUtils = __importStar(require("../utils/proton.utils"));
describe('ProtonService', () => {
    let service;
    beforeEach(() => {
        service = new proton_service_1.ProtonService();
        jest.spyOn(platformUtils, 'getPlatform').mockReturnValue('linux');
    });
    afterEach(() => {
        jest.restoreAllMocks();
    });
    it('checkProtonInstalled returns installed on linux', async () => {
        jest.spyOn(protonUtils, 'isProtonInstalled').mockReturnValue(true);
        jest.spyOn(protonUtils, 'getProtonDir').mockReturnValue('/proton');
        const result = await service.checkProtonInstalled();
        expect(result.success).toBe(true);
        expect(result.installed).toBe(true);
        expect(result.path).toBe('/proton');
        expect(result.message).toBe('Proton is installed');
    });
    it('checkProtonInstalled returns not installed on linux', async () => {
        jest.spyOn(protonUtils, 'isProtonInstalled').mockReturnValue(false);
        const result = await service.checkProtonInstalled();
        expect(result.success).toBe(true);
        expect(result.installed).toBe(false);
        expect(result.path).toBeNull();
        expect(result.message).toBe('Proton not installed');
    });
    it('checkProtonInstalled returns installed on non-linux', async () => {
        jest.spyOn(platformUtils, 'getPlatform').mockReturnValue('windows');
        const result = await service.checkProtonInstalled();
        expect(result.success).toBe(true);
        expect(result.installed).toBe(true);
        expect(result.message).toBe('Proton not needed on Windows');
    });
    it('checkProtonInstalled handles error', async () => {
        jest.spyOn(protonUtils, 'isProtonInstalled').mockImplementation(() => { throw new Error('fail'); });
        const result = await service.checkProtonInstalled();
        expect(result.success).toBe(false);
        expect(result.error).toBe('fail');
    });
    it('installProton returns success on non-linux', async () => {
        jest.spyOn(platformUtils, 'getPlatform').mockReturnValue('windows');
        const result = await service.installProton();
        expect(result.success).toBe(true);
        expect(result.message).toBe('Proton not needed on Windows');
    });
    it('installProton returns already installed', async () => {
        jest.spyOn(protonUtils, 'isProtonInstalled').mockReturnValue(true);
        const result = await service.installProton();
        expect(result.success).toBe(true);
        expect(result.message).toBe('Proton is already installed');
    });
    it('installProton resolves success from installProton', async () => {
        jest.spyOn(protonUtils, 'isProtonInstalled').mockReturnValue(false);
        jest.spyOn(protonUtils, 'installProton').mockImplementation((cb, progressCb) => {
            cb(null, 'output');
        });
        const result = await service.installProton();
        expect(result.success).toBe(true);
        expect(result.message).toBe('Proton installed successfully');
        expect(result.output).toBe('output');
    });
    it('installProton resolves error from installProton', async () => {
        jest.spyOn(protonUtils, 'isProtonInstalled').mockReturnValue(false);
        jest.spyOn(protonUtils, 'installProton').mockImplementation((cb, progressCb) => {
            cb(new Error('fail'), undefined);
        });
        const result = await service.installProton();
        expect(result.success).toBe(false);
        expect(result.error).toBe('fail');
    });
    it('getProtonDirectory returns path', async () => {
        jest.spyOn(protonUtils, 'getProtonDir').mockReturnValue('/proton');
        const result = await service.getProtonDirectory();
        expect(result.success).toBe(true);
        expect(result.path).toBe('/proton');
    });
    it('getProtonDirectory handles error', async () => {
        jest.spyOn(protonUtils, 'getProtonDir').mockImplementation(() => { throw new Error('fail'); });
        const result = await service.getProtonDirectory();
        expect(result.success).toBe(false);
        expect(result.error).toBe('fail');
    });
    it('getPlatformInfo returns info for linux', async () => {
        jest.spyOn(protonUtils, 'isProtonInstalled').mockReturnValue(true);
        const result = await service.getPlatformInfo();
        expect(result.success).toBe(true);
        expect(result.platform).toBe('linux');
        expect(result.needsProton).toBe(true);
        expect(result.protonInstalled).toBe(true);
        expect(result.ready).toBe(true);
    });
    it('getPlatformInfo returns info for windows', async () => {
        jest.spyOn(platformUtils, 'getPlatform').mockReturnValue('windows');
        const result = await service.getPlatformInfo();
        expect(result.success).toBe(true);
        expect(result.platform).toBe('windows');
        expect(result.needsProton).toBe(false);
        expect(result.protonInstalled).toBe(true);
        expect(result.ready).toBe(true);
    });
    it('getPlatformInfo handles error', async () => {
        jest.spyOn(protonUtils, 'isProtonInstalled').mockImplementation(() => { throw new Error('fail'); });
        const result = await service.getPlatformInfo();
        expect(result.success).toBe(false);
        expect(result.error).toBe('fail');
        expect(result.ready).toBe(false);
    });
});
