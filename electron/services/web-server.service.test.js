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
const web_server_service_1 = require("./web-server.service");
const globalConfigUtils = __importStar(require("../utils/global-config.utils"));
const networkUtils = __importStar(require("../utils/network.utils"));
const messaging_service_1 = require("./messaging.service");
const path = __importStar(require("path"));
const electron_1 = require("electron");
describe('WebServerService', () => {
    let service;
    beforeEach(() => {
        service = new web_server_service_1.WebServerService();
        jest.spyOn(path, 'join').mockImplementation((...args) => args.join('/'));
        jest.spyOn(electron_1.app, 'getAppPath').mockReturnValue('/app');
        jest.spyOn(globalConfigUtils, 'loadGlobalConfig').mockReturnValue({
            authenticationEnabled: true,
            authenticationUsername: 'user',
            authenticationPassword: 'pass',
            webServerPort: 3000,
            startWebServerOnLoad: true,
            maxBackupDownloadSizeMB: 100
        });
        jest.spyOn(networkUtils, 'isPortInUse').mockResolvedValue(false);
        jest.spyOn(messaging_service_1.messagingService, 'broadcastToWebClients').mockImplementation(() => { });
    });
    afterEach(() => {
        jest.restoreAllMocks();
    });
    it('getStatus returns running and port', () => {
        expect(service.getStatus()).toEqual({ running: false, port: 3000 });
    });
    it('isStarting returns false by default', () => {
        expect(service.isStarting()).toBe(false);
    });
    it('cleanup resets state and kills process', () => {
        const killMock = jest.fn();
        service.apiProcess = { kill: killMock };
        service.statusPollingInterval = setInterval(() => { }, 1000);
        service.cleanup();
        expect(killMock).toHaveBeenCalled();
        expect(service.apiProcess).toBeNull();
        expect(service.statusPollingInterval).toBeNull();
        expect(service.getStatus().running).toBe(false);
    });
    it('startWebServer returns already starting if webServerStarting', async () => {
        service.webServerStarting = true;
        const result = await service.startWebServer(3000);
        expect(result.success).toBe(true);
        expect(result.message).toContain('already starting');
    });
    it('startWebServer returns already running if apiProcess exists and running', async () => {
        service.apiProcess = { on: jest.fn(), kill: jest.fn() };
        service.webServerRunning = true;
        service.webServerPort = 3000;
        const result = await service.startWebServer(3000);
        expect(result.success).toBe(true);
        expect(result.message).toContain('already running');
    });
    it('stopWebServer returns success if not running', async () => {
        service.apiProcess = null;
        const result = await service.stopWebServer();
        expect(result.success).toBe(true);
        expect(result.message).toContain('not running');
    });
    it('stopWebServer kills process and resolves', async () => {
        const onMock = jest.fn((event, cb) => { if (event === 'exit')
            cb(); });
        let exitCallback;
        const onMockExit = jest.fn((event, cb) => { if (event === 'exit')
            exitCallback = cb; });
        const killMock = jest.fn(() => { if (exitCallback)
            exitCallback(); });
        service.apiProcess = { on: onMockExit, kill: killMock };
        const result = await service.stopWebServer();
        expect(killMock).toHaveBeenCalled();
        expect(result.success).toBe(true);
        expect(result.message).toContain('stopped successfully');
    });
});
