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
const rcon_service_1 = require("./rcon.service");
const instanceUtils = __importStar(require("../utils/ark/instance.utils"));
const rconUtils = __importStar(require("../utils/rcon.utils"));
describe('RconService', () => {
    let service;
    beforeEach(() => {
        service = new rcon_service_1.RconService();
    });
    afterEach(() => {
        jest.restoreAllMocks();
    });
    it('connectRcon returns error for invalid instanceId', async () => {
        const result = await service.connectRcon('');
        expect(result.success).toBe(false);
        expect(result.error).toBe('Invalid instance ID');
    });
    it('connectRcon returns error for missing instance', async () => {
        jest.spyOn(instanceUtils, 'getInstance').mockResolvedValue(null);
        const result = await service.connectRcon('id');
        expect(result.success).toBe(false);
        expect(result.error).toBe('Instance not found');
    });
    it('connectRcon returns error for missing rcon config', async () => {
        jest.spyOn(instanceUtils, 'getInstance').mockResolvedValue({});
        const result = await service.connectRcon('id');
        expect(result.success).toBe(false);
        expect(result.error).toBe('RCON not configured for this instance');
    });
    it('connectRcon resolves success if connected', async () => {
        jest.spyOn(instanceUtils, 'getInstance').mockResolvedValue({ rconPort: 123, rconPassword: 'pass' });
        rconUtils.connectRcon = (id, inst, cb) => cb(true);
        const result = await service.connectRcon('id');
        expect(result.success).toBe(true);
        expect(result.connected).toBe(true);
        expect(result.error).toBeUndefined();
    });
    it('connectRcon resolves error if not connected', async () => {
        jest.spyOn(instanceUtils, 'getInstance').mockResolvedValue({ rconPort: 123, rconPassword: 'pass' });
        rconUtils.connectRcon = (id, inst, cb) => cb(false);
        const result = await service.connectRcon('id');
        expect(result.success).toBe(true);
        expect(result.connected).toBe(false);
        expect(result.error).toBe('Failed to establish RCON connection');
    });
    it('disconnectRcon resolves success', async () => {
        rconUtils.disconnectRcon = async (id) => { };
        const result = await service.disconnectRcon('id');
        expect(result.success).toBe(true);
        expect(result.connected).toBe(false);
    });
    it('disconnectRcon handles error', async () => {
        rconUtils.disconnectRcon = async (id) => { throw new Error('fail'); };
        const result = await service.disconnectRcon('id');
        expect(result.success).toBe(false);
        expect(result.error).toBe('fail');
    });
    it('getRconStatus returns status', () => {
        jest.spyOn(rconUtils, 'isRconConnected').mockReturnValue(true);
        const result = service.getRconStatus('id');
        expect(result.success).toBe(true);
        expect(result.connected).toBe(true);
    });
    it('executeRconCommand returns error for invalid params', async () => {
        const result = await service.executeRconCommand('', '');
        expect(result.success).toBe(false);
        expect(result.error).toBe('Invalid instance ID or command');
    });
    it('executeRconCommand returns error if not connected', async () => {
        jest.spyOn(rconUtils, 'isRconConnected').mockReturnValue(false);
        const result = await service.executeRconCommand('id', 'cmd');
        expect(result.success).toBe(false);
        expect(result.error).toBe('RCON not connected for this instance');
    });
    it('executeRconCommand resolves success', async () => {
        jest.spyOn(rconUtils, 'isRconConnected').mockReturnValue(true);
        jest.spyOn(rconUtils, 'sendRconCommand').mockResolvedValue('resp');
        const result = await service.executeRconCommand('id', 'cmd');
        expect(result.success).toBe(true);
        expect(result.response).toBe('resp');
    });
    it('executeRconCommand handles error', async () => {
        jest.spyOn(rconUtils, 'isRconConnected').mockReturnValue(true);
        jest.spyOn(rconUtils, 'sendRconCommand').mockRejectedValue(new Error('fail'));
        const result = await service.executeRconCommand('id', 'cmd');
        expect(result.success).toBe(false);
        expect(result.error).toBe('fail');
    });
    it('autoConnectRcon calls connectRcon and onStatusChange', async () => {
        jest.spyOn(instanceUtils, 'getInstance').mockResolvedValue({ rconPort: 123, rconPassword: 'pass' });
        rconUtils.connectRcon = (id, inst, cb) => cb(true);
        const cb = jest.fn();
        await service.autoConnectRcon('id', cb);
        expect(cb).toHaveBeenCalledWith(true);
    });
    it('autoConnectRcon handles error and calls onStatusChange(false)', async () => {
        jest.spyOn(instanceUtils, 'getInstance').mockRejectedValue(new Error('fail'));
        const cb = jest.fn();
        await service.autoConnectRcon('id', cb);
        expect(cb).toHaveBeenCalledWith(false);
    });
    it('forceDisconnectRcon calls disconnectRcon', async () => {
        const spy = jest.fn();
        rconUtils.disconnectRcon = spy;
        await service.forceDisconnectRcon('id');
        expect(spy).toHaveBeenCalledWith('id');
    });
    it('forceDisconnectRcon handles error', async () => {
        rconUtils.disconnectRcon = async (id) => { throw new Error('fail'); };
        await expect(service.forceDisconnectRcon('id')).resolves.toBeUndefined();
    });
});
