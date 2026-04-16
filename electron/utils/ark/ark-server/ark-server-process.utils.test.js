"use strict";
// ark-server-process.utils.test.ts
// Unit tests for ARK server process management
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
    join: jest.fn((...args) => args.join('/'))
}));
jest.mock('child_process', () => ({
    spawn: jest.fn()
}));
jest.mock('../../platform.utils', () => ({
    getPlatform: jest.fn()
}));
jest.mock('../ark-args.utils', () => ({
    buildArkServerArgs: jest.fn()
}));
jest.mock('./ark-server-install.utils', () => ({
    getArkServerDir: jest.fn()
}));
jest.mock('./ark-server-paths.utils', () => ({
    getArkExecutablePath: jest.fn(),
    prepareArkServerCommand: jest.fn()
}));
jest.mock('./ark-server-state.utils', () => ({
    setInstanceState: jest.fn(),
    arkServerProcesses: {}
}));
const fs = __importStar(require("fs"));
const processUtils = require('./ark-server-process.utils');
const { arkServerProcesses } = require('./ark-server-state.utils');
const { buildArkServerArgs } = require('../ark-args.utils');
const { spawn } = require('child_process');
const { setInstanceState } = require('./ark-server-state.utils');
const arkServerPaths = require('./ark-server-paths.utils');
describe('ark-server-process.utils', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        Object.keys(arkServerProcesses).forEach(k => delete arkServerProcesses[k]);
    });
    describe('spawnServerProcess', () => {
        it('throws if executable does not exist', () => {
            arkServerPaths.getArkExecutablePath.mockReturnValue('/ark.exe');
            jest.spyOn(fs, 'existsSync').mockReturnValue(false);
            expect(() => processUtils.spawnServerProcess('id', '/instance', {})).toThrow('Ark server not installed');
        });
    });
    describe('setupProcessEventHandlers', () => {
        it('handles stdout, stderr, close, and error events', () => {
            const onLog = jest.fn();
            const onState = jest.fn();
            const logTail = { close: jest.fn() };
            const proc = {
                stdout: { on: jest.fn((event, cb) => { if (event === 'data')
                        cb(Buffer.from('out')); }) },
                stderr: { on: jest.fn((event, cb) => { if (event === 'data')
                        cb(Buffer.from('err')); }) },
                on: jest.fn((event, cb) => {
                    if (event === 'close')
                        cb(0);
                    if (event === 'error')
                        cb(new Error('fail'));
                })
            };
            processUtils.setupProcessEventHandlers('id', proc, logTail, onLog, onState);
            expect(onLog).toHaveBeenCalledWith('[STDOUT] out');
            expect(onLog).toHaveBeenCalledWith('[STDERR] err');
            expect(onLog).toHaveBeenCalledWith('[PROCESS EXIT] Ark server exited with code 0');
            expect(onLog).toHaveBeenCalledWith('[ERROR] fail');
            expect(onState).toHaveBeenCalledWith('stopped');
            expect(onState).toHaveBeenCalledWith('error');
            expect(logTail.close).toHaveBeenCalledTimes(2);
            expect(setInstanceState).toHaveBeenCalledWith('id', 'stopped');
            expect(setInstanceState).toHaveBeenCalledWith('id', 'error');
            expect(arkServerProcesses['id']).toBeUndefined();
        });
    });
});
