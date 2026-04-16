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
const ark_update_service_1 = require("./ark-update.service");
const steamcmdUtils = __importStar(require("../utils/steamcmd.utils"));
jest.mock('../utils/ark/ark-server.utils', () => ({
    getCurrentInstalledVersion: jest.fn().mockResolvedValue('12345')
}));
describe('ArkUpdateService', () => {
    let messagingService;
    let service;
    beforeEach(() => {
        messagingService = { sendToAll: jest.fn() };
        service = new ark_update_service_1.ArkUpdateService(messagingService);
        jest.spyOn(steamcmdUtils, 'isSteamCmdInstalled').mockReturnValue(true);
        jest.spyOn(steamcmdUtils, 'getSteamCmdDir').mockReturnValue('STEAMCMD_DIR');
        // getCurrentInstalledVersion is already mocked above
    });
    afterEach(() => {
        jest.restoreAllMocks();
    });
    it('initialize sets lastKnownBuildId and starts polling', async () => {
        service.pollAndNotify = jest.fn().mockResolvedValue('12346');
        jest.useFakeTimers();
        await service.initialize();
        expect(service['lastKnownBuildId']).toBe('12345');
        expect(service.pollAndNotify).toHaveBeenCalled();
        jest.useRealTimers();
    });
    it('checkForUpdate returns update result if new build', async () => {
        jest.spyOn(service, 'pollArkServerUpdates').mockResolvedValue('12346');
        const result = await service.checkForUpdate();
        expect(result.success).toBe(true);
        expect(result.hasUpdate).toBe(true);
        expect(result.buildId).toBe('12346');
    });
    it('checkForUpdate returns no update if null', async () => {
        jest.spyOn(service, 'pollArkServerUpdates').mockResolvedValue(null);
        const result = await service.checkForUpdate();
        expect(result.success).toBe(true);
        expect(result.hasUpdate).toBe(false);
    });
    it('checkForUpdate returns error on failure', async () => {
        jest.spyOn(service, 'pollArkServerUpdates').mockRejectedValue(new Error('fail'));
        const result = await service.checkForUpdate();
        expect(result.success).toBe(false);
        expect(result.hasUpdate).toBe(false);
        expect(result.error).toBe('fail');
    });
    it('pollArkServerUpdates returns new buildId if changed', async () => {
        // Simulate the effect by patching the method
        service['lastKnownBuildId'] = '12345';
        // Patch the method to simulate a new buildId
        service.getLatestServerVersion = jest.fn().mockResolvedValue('12346');
        const result = await service.pollArkServerUpdates();
        expect(result).toBe('12346');
        expect(service['lastKnownBuildId']).toBe('12346');
    });
    it('pollArkServerUpdates returns null if no change', async () => {
        service['lastKnownBuildId'] = '12345';
        service.getLatestServerVersion = jest.fn().mockResolvedValue('12345');
        const result = await service.pollArkServerUpdates();
        expect(result).toBeNull();
    });
    it('pollAndNotify sends update status', async () => {
        jest.spyOn(service, 'pollArkServerUpdates').mockResolvedValue('12346');
        await service.pollAndNotify();
        expect(messagingService.sendToAll).toHaveBeenCalledWith('ark-update-status', { hasUpdate: true, buildId: '12346' });
    });
    it('getLatestServerVersion returns null if SteamCMD not installed', async () => {
        steamcmdUtils.isSteamCmdInstalled.mockReturnValue(false);
        const result = await service['getLatestServerVersion']();
        expect(result).toBeNull();
    });
});
