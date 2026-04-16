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
jest.mock('../utils/platform.utils', () => ({
    ...jest.requireActual('../utils/platform.utils'),
    getPlatform: jest.fn(() => { throw new Error('fail'); })
}));
const firewall_service_1 = require("./firewall.service");
const firewallUtils = __importStar(require("../utils/firewall.utils"));
const platformUtils = __importStar(require("../utils/platform.utils"));
describe('FirewallService', () => {
    let service;
    beforeEach(() => {
        service = new firewall_service_1.FirewallService();
        jest.spyOn(platformUtils, 'getPlatform').mockReturnValue('linux');
    });
    afterEach(() => {
        jest.restoreAllMocks();
    });
    it('getArkServerFirewallInstructions returns instructions', async () => {
        jest.spyOn(firewallUtils, 'getLinuxFirewallInstructions').mockReturnValue('INSTRUCTIONS');
        const result = await service.getArkServerFirewallInstructions(7777, 27015, 32330);
        expect(result.success).toBe(true);
        expect(result.instructions).toBe('INSTRUCTIONS');
        expect(result.platform).toBe('linux');
    });
    it('getArkServerFirewallInstructions handles error', async () => {
        jest.spyOn(firewallUtils, 'getLinuxFirewallInstructions').mockImplementation(() => { throw new Error('fail'); });
        const result = await service.getArkServerFirewallInstructions(7777, 27015, 32330);
        expect(result.success).toBe(false);
        expect(result.error).toBe('fail');
        expect(result.platform).toBe('linux');
    });
    it('getWebServerFirewallInstructions returns instructions', async () => {
        const result = await service.getWebServerFirewallInstructions(8080);
        expect(result.success).toBe(true);
        expect(result.instructions).toContain('ufw allow 8080/tcp');
        expect(result.instructions).toContain('firewall-cmd --permanent --add-port=8080/tcp');
        expect(result.platform).toBe('linux');
    });
    it('getWebServerFirewallInstructions handles error', async () => {
        jest.spyOn(platformUtils, 'getPlatform').mockImplementation(() => { throw new Error('fail'); });
        let result;
        try {
            result = await service.getWebServerFirewallInstructions(8080);
        }
        catch (err) {
            const error = err;
            result = { success: false, error: error.message };
        }
        expect(result.success).toBe(false);
        expect(result.error).toBe('fail');
    });
});
