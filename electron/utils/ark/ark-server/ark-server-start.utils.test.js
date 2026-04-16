"use strict";
// ark-server-start.utils.test.ts
// Unit tests for ARK server start utility
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
jest.mock('fs');
jest.mock('path', () => ({
    join: jest.fn((...args) => args.join('/')),
    basename: jest.fn((p) => p.split('/').pop())
}));
jest.mock('child_process', () => ({ spawn: jest.fn() }));
jest.mock('../../platform.utils', () => ({
    getPlatform: jest.fn(),
    getDefaultInstallDir: jest.fn()
}));
jest.mock('../ark-args.utils', () => ({ buildArkServerArgs: jest.fn() }));
jest.mock('../../network.utils', () => ({ isPortInUse: jest.fn() }));
jest.mock('../../ark/instance.utils', () => ({
    getDefaultInstancesBaseDir: jest.fn(),
    getInstancesBaseDir: jest.fn(),
    loadInstanceConfig: jest.fn()
}));
jest.mock('./ark-server-install.utils', () => ({ getArkServerDir: jest.fn() }));
jest.mock('./ark-server-paths.utils', () => ({
    getArkExecutablePath: jest.fn(),
    getArkConfigDir: jest.fn(),
    prepareArkServerCommand: jest.fn()
}));
jest.mock('./ark-server-logging.utils', () => ({
    cleanupOldLogFiles: jest.fn(),
    setupLogTailing: jest.fn(() => ({}))
}));
jest.mock('./ark-server-process.utils', () => ({
    spawnServerProcess: jest.fn(() => ({ proc: {} })),
    setupProcessEventHandlers: jest.fn()
}));
jest.mock('./ark-server-state.utils', () => ({
    setInstanceState: jest.fn(),
    getInstanceState: jest.fn(),
    arkServerProcesses: {}
}));
const fs = __importStar(require("fs"));
const networkUtils = __importStar(require("../../network.utils"));
const instanceUtils = __importStar(require("../../ark/instance.utils"));
const stateUtils = __importStar(require("./ark-server-state.utils"));
const startUtils = __importStar(require("./ark-server-start.utils"));
describe('ark-server-start.utils', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('startArkServerInstance', () => {
        it('starts server successfully', async () => {
            jest.spyOn(instanceUtils, 'loadInstanceConfig').mockReturnValue({
                instanceDir: '/instance',
                config: { gamePort: 7777, queryPort: 27015, rconPort: 27020 }
            });
            jest.spyOn(networkUtils, 'isPortInUse').mockResolvedValue(false);
            const onLog = jest.fn();
            const onState = jest.fn();
            const result = await startUtils.startArkServerInstance('id', onLog, onState);
            expect(result.started).toBe(true);
            expect(stateUtils.setInstanceState).toHaveBeenCalledWith('id', 'starting');
            expect(onState).toHaveBeenCalledWith('starting');
        });
        it('returns error if game port is in use', async () => {
            jest.spyOn(instanceUtils, 'loadInstanceConfig').mockReturnValue({
                instanceDir: '/instance',
                config: { gamePort: 7777, queryPort: 27015, rconPort: 27020 }
            });
            jest.spyOn(networkUtils, 'isPortInUse').mockResolvedValueOnce(true);
            const result = await startUtils.startArkServerInstance('id');
            expect(result.started).toBe(false);
            expect(result.portError).toMatch(/Game port/);
        });
        it('returns error if rcon port is in use', async () => {
            jest.spyOn(instanceUtils, 'loadInstanceConfig').mockReturnValue({
                instanceDir: '/instance',
                config: { gamePort: 7777, queryPort: 27015, rconPort: 27020 }
            });
            jest.spyOn(networkUtils, 'isPortInUse').mockResolvedValueOnce(false).mockResolvedValueOnce(true);
            const result = await startUtils.startArkServerInstance('id');
            expect(result.started).toBe(false);
            expect(result.portError).toMatch(/RCON port/);
        });
        it('returns error if query port is in use', async () => {
            jest.spyOn(instanceUtils, 'loadInstanceConfig').mockReturnValue({
                instanceDir: '/instance',
                config: { gamePort: 7777, queryPort: 27015, rconPort: 27020 }
            });
            jest.spyOn(networkUtils, 'isPortInUse').mockResolvedValueOnce(false).mockResolvedValueOnce(false).mockResolvedValueOnce(true);
            const result = await startUtils.startArkServerInstance('id');
            expect(result.started).toBe(false);
            expect(result.portError).toMatch(/Query port/);
        });
        it('handles errors thrown during startup', async () => {
            jest.spyOn(instanceUtils, 'loadInstanceConfig').mockImplementation(() => { throw new Error('fail'); });
            const onState = jest.fn();
            const result = await startUtils.startArkServerInstance('id', undefined, onState);
            expect(result.started).toBe(false);
            expect(result.portError).toBe('fail');
            expect(stateUtils.setInstanceState).toHaveBeenCalledWith('id', 'error');
            expect(onState).toHaveBeenCalledWith('error');
        });
        it('generates rconPassword if missing and writes config', async () => {
            const config = { gamePort: 7777, queryPort: 27015, rconPort: 27020 };
            jest.spyOn(instanceUtils, 'loadInstanceConfig').mockReturnValue({ instanceDir: '/instance', config });
            jest.spyOn(networkUtils, 'isPortInUse').mockResolvedValue(false);
            jest.spyOn(fs, 'writeFileSync').mockImplementation(() => { });
            await startUtils.startArkServerInstance('id');
            expect(config.rconPassword).toBeDefined();
            expect(fs.writeFileSync).toHaveBeenCalledWith('/instance/config.json', expect.stringContaining('rconPassword'), 'utf8');
        });
    });
    describe('internal helpers', () => {
        // Internal helpers are not exported, so cannot be tested directly unless using rewire or similar
    });
});
