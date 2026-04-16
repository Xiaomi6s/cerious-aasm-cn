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
const platform_service_1 = require("./platform.service");
const path = __importStar(require("path"));
jest.mock('os', () => ({
    homedir: jest.fn(() => '/home/user')
}));
describe('PlatformService', () => {
    let service;
    beforeEach(() => {
        service = new platform_service_1.PlatformService();
        jest.spyOn(path, 'join').mockImplementation((...args) => args.join('/'));
        // os.homedir is already mocked above
    });
    afterEach(() => {
        jest.restoreAllMocks();
    });
    it('getNodeVersion returns node version', () => {
        const version = service.getNodeVersion();
        expect(typeof version).toBe('string');
    });
    it('getElectronVersion returns electron version', () => {
        const version = service.getElectronVersion();
        expect(typeof version === 'string' || version === null).toBe(true);
    });
    it('getPlatform returns Windows', () => {
        Object.defineProperty(process, 'platform', { value: 'win32' });
        expect(service.getPlatform()).toBe('Windows');
    });
    it('getPlatform returns macOS', () => {
        Object.defineProperty(process, 'platform', { value: 'darwin' });
        expect(service.getPlatform()).toBe('macOS');
    });
    it('getPlatform returns Linux', () => {
        Object.defineProperty(process, 'platform', { value: 'linux' });
        expect(service.getPlatform()).toBe('Linux');
    });
    it('getPlatform returns unknown for other', () => {
        Object.defineProperty(process, 'platform', { value: 'other' });
        expect(service.getPlatform()).toBe('other');
    });
    it('getConfigPath returns Electron app path if available', () => {
        const appMock = { getPath: jest.fn().mockReturnValue('/appData') };
        global.app = appMock;
        const svc = new platform_service_1.PlatformService();
        expect(svc.getConfigPath()).toContain('Cerious AASM');
    });
    it('getConfigPath returns Windows path', () => {
        Object.defineProperty(process, 'platform', { value: 'win32' });
        expect(service.getConfigPath()).toContain('Cerious AASM');
    });
    it('getConfigPath returns Linux path', () => {
        Object.defineProperty(process, 'platform', { value: 'linux' });
        expect(service.getConfigPath()).toContain('Cerious AASM');
    });
    it('getConfigPath returns macOS path', () => {
        Object.defineProperty(process, 'platform', { value: 'darwin' });
        expect(service.getConfigPath()).toContain('Cerious AASM');
    });
});
