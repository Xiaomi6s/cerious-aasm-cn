"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ark_server_cleanup_utils_1 = require("./ark-server-cleanup.utils");
const ark_server_state_utils_1 = require("./ark-server-state.utils");
jest.mock('../../platform.utils');
jest.mock('child_process', () => ({
    execSync: jest.fn(),
    spawn: jest.fn(() => ({
        on: jest.fn(),
        kill: jest.fn(),
        pid: 1234,
        killed: false
    }))
}));
const mockExecSync = require('child_process').execSync;
const mockSpawn = require('child_process').spawn;
function createMockProcess(pid = 1234, killed = false) {
    return {
        pid,
        killed,
        kill: jest.fn(),
        on: jest.fn()
    };
}
describe('ark-server-cleanup.utils', () => {
    let platformSpy;
    beforeEach(() => {
        jest.clearAllMocks();
        Object.keys(ark_server_state_utils_1.arkServerProcesses).forEach(key => delete ark_server_state_utils_1.arkServerProcesses[key]);
        platformSpy = jest.spyOn(require('../../platform.utils'), 'getPlatform');
    });
    function createChildProcessMock(pid = 1234, killed = false) {
        return {
            pid,
            killed,
            kill: jest.fn(),
            on: jest.fn(),
            stdin: null,
            stdout: null,
            stderr: null,
            stdio: [],
            exitCode: null,
            signalCode: null,
            connected: true,
            spawnargs: [],
            spawnfile: '',
            send: jest.fn(),
            disconnect: jest.fn(),
            unref: jest.fn(),
            ref: jest.fn(),
            addListener: jest.fn(),
            emit: jest.fn(),
            once: jest.fn(),
            prependListener: jest.fn(),
            prependOnceListener: jest.fn(),
            removeAllListeners: jest.fn(),
            removeListener: jest.fn(),
            listeners: jest.fn(),
            eventNames: jest.fn(),
            getMaxListeners: jest.fn(),
            setMaxListeners: jest.fn(),
        };
    }
    describe('cleanupAllArkServers', () => {
        it('should kill all processes on Windows', () => {
            platformSpy.mockReturnValue('windows');
            const proc1 = createChildProcessMock(111, false);
            const proc2 = createChildProcessMock(222, false);
            ark_server_state_utils_1.arkServerProcesses['inst1'] = proc1;
            ark_server_state_utils_1.arkServerProcesses['inst2'] = proc2;
            (0, ark_server_cleanup_utils_1.cleanupAllArkServers)();
            expect(proc1.kill).toHaveBeenCalledWith('SIGTERM');
            expect(proc2.kill).toHaveBeenCalledWith('SIGTERM');
            expect(Object.keys(ark_server_state_utils_1.arkServerProcesses).length).toBe(0);
        });
        it('should kill all processes and process groups on Linux', () => {
            platformSpy.mockReturnValue('linux');
            ark_server_state_utils_1.arkServerProcesses['inst1'] = createChildProcessMock(111, false);
            (0, ark_server_cleanup_utils_1.cleanupAllArkServers)();
            expect(Object.keys(ark_server_state_utils_1.arkServerProcesses).length).toBe(0);
            expect(mockExecSync).toHaveBeenCalledWith('pkill -f ArkAscendedServer', { stdio: 'ignore' });
            expect(mockExecSync).toHaveBeenCalledWith('pkill -f "proton.*ArkAscendedServer"', { stdio: 'ignore' });
            expect(mockExecSync).toHaveBeenCalledWith('pkill -f "Xvfb.*ArkAscendedServer"', { stdio: 'ignore' });
        });
        it('should handle errors gracefully', () => {
            platformSpy.mockReturnValue('windows');
            const proc = createChildProcessMock(111, false);
            proc.kill.mockImplementation(() => { throw new Error('fail'); });
            ark_server_state_utils_1.arkServerProcesses['inst1'] = proc;
            expect(() => (0, ark_server_cleanup_utils_1.cleanupAllArkServers)()).not.toThrow();
        });
    });
    describe('cleanupOrphanedArkProcesses', () => {
        it('should cleanup orphaned processes on Linux', () => {
            platformSpy.mockReturnValue('linux');
            (0, ark_server_cleanup_utils_1.cleanupOrphanedArkProcesses)();
            expect(mockExecSync).toHaveBeenCalledWith('pkill -f ArkAscendedServer', { stdio: 'ignore' });
            expect(mockExecSync).toHaveBeenCalledWith('pkill -f "proton.*ArkAscendedServer"', { stdio: 'ignore' });
            expect(mockExecSync).toHaveBeenCalledWith('pkill -f "Xvfb.*ArkAscendedServer"', { stdio: 'ignore' });
            expect(mockExecSync).toHaveBeenCalledWith('pkill -f "wine.*ArkAscendedServer"', { stdio: 'ignore' });
        });
        it('should cleanup orphaned processes on Windows', () => {
            platformSpy.mockReturnValue('windows');
            (0, ark_server_cleanup_utils_1.cleanupOrphanedArkProcesses)();
            expect(mockExecSync).toHaveBeenCalledWith('taskkill /F /IM ArkAscendedServer.exe', { stdio: 'ignore' });
        });
        it('should handle errors gracefully', () => {
            platformSpy.mockReturnValue('windows');
            mockExecSync.mockImplementation(() => { throw new Error('fail'); });
            expect(() => (0, ark_server_cleanup_utils_1.cleanupOrphanedArkProcesses)()).not.toThrow();
        });
    });
});
