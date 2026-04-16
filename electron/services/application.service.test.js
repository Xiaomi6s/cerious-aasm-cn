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
const application_service_1 = require("./application.service");
const globalConfigUtils = __importStar(require("../utils/global-config.utils"));
const webServerServiceModule = __importStar(require("./web-server.service"));
describe('ApplicationService', () => {
    let originalArgv;
    let mockStartWebServer;
    let mockLoadGlobalConfig;
    beforeEach(() => {
        originalArgv = [...process.argv];
        mockStartWebServer = jest.spyOn(webServerServiceModule.webServerService, 'startWebServer').mockResolvedValue({ success: true, message: 'started', port: 1234 });
        mockLoadGlobalConfig = jest.spyOn(globalConfigUtils, 'loadGlobalConfig').mockReturnValue({
            startWebServerOnLoad: true,
            webServerPort: 1234,
            authenticationEnabled: false,
            authenticationUsername: '',
            authenticationPassword: '',
            maxBackupDownloadSizeMB: 100
        });
    });
    afterEach(() => {
        process.argv = originalArgv;
        jest.restoreAllMocks();
    });
    it('parses command line args with defaults', () => {
        process.argv = ['node', 'main.js'];
        const service = new application_service_1.ApplicationService();
        expect(service.getCommandLineArgs()).toEqual({
            isHeadless: false,
            authEnabled: false,
            username: 'admin',
            password: '',
            port: 1234
        });
    });
    it('parses command line args with headless and port', () => {
        process.argv = ['node', 'main.js', '--headless', '--port=8080'];
        const service = new application_service_1.ApplicationService();
        expect(service.getCommandLineArgs()).toMatchObject({
            isHeadless: true,
            port: 8080
        });
    });
    it('parses command line args with auth', () => {
        process.argv = ['node', 'main.js', '--headless', '--auth-enabled', '--username=test', '--password=secret'];
        const service = new application_service_1.ApplicationService();
        expect(service.getCommandLineArgs()).toMatchObject({
            authEnabled: true,
            username: 'test',
            password: 'secret'
        });
    });
    it('returns isHeadless()', () => {
        process.argv = ['node', 'main.js', '--headless'];
        const service = new application_service_1.ApplicationService();
        expect(service.isHeadless()).toBe(true);
    });
    it('initializes application in headless mode with auth', async () => {
        process.argv = ['node', 'main.js', '--headless', '--auth-enabled', '--password=secret'];
        const service = new application_service_1.ApplicationService();
        await service.initializeApplication();
        expect(mockStartWebServer).toHaveBeenCalledWith(expect.any(Number), {
            enabled: true,
            username: 'admin',
            password: 'secret'
        });
    });
    it('initializes application in headless mode without auth', async () => {
        process.argv = ['node', 'main.js', '--headless'];
        const service = new application_service_1.ApplicationService();
        await service.initializeApplication();
        expect(mockStartWebServer).toHaveBeenCalledWith(expect.any(Number), {
            enabled: false,
            username: '',
            password: ''
        });
    });
    it('initializes application in GUI mode and starts web server if configured', async () => {
        process.argv = ['node', 'main.js'];
        const service = new application_service_1.ApplicationService();
        await service.initializeApplication();
        expect(mockStartWebServer).toHaveBeenCalledWith(1234);
    });
    it('exits with error if --auth-enabled is set without --password', () => {
        process.argv = ['node', 'main.js', '--headless', '--auth-enabled'];
        let exited = false;
        const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => { exited = true; return undefined; });
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
        const service = new application_service_1.ApplicationService();
        service.initializeApplication();
        expect(exited).toBe(true);
        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('requires --password'));
        exitSpy.mockRestore();
        errorSpy.mockRestore();
    });
});
