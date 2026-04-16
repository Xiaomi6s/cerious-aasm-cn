"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Clear module cache to ensure fresh mocks
delete require.cache[require.resolve('../utils/firewall.utils')];
// Mock dependencies
jest.mock('child_process');
jest.mock('util');
jest.mock('../utils/platform.utils');
jest.mock('path');
const mockExec = require('child_process').exec;
const mockPromisify = require('util').promisify;
const mockPlatformUtils = require('../utils/platform.utils');
const mockPath = require('path');
// Create mock execAsync
const mockExecAsync = jest.fn();
mockPromisify.mockReturnValue(mockExecAsync);
// Now import after mocks are set up
const firewall_utils_1 = require("../utils/firewall.utils");
// Mock the execAsync function
jest.mocked(firewall_utils_1.execAsync).mockImplementation(mockExecAsync);
describe('firewall.utils', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Mock console.error to suppress expected errors from firewall rule creation failure tests
        jest.spyOn(console, 'error').mockImplementation(() => { });
        mockPlatformUtils.getPlatform.mockReturnValue('windows');
        mockPath.dirname.mockImplementation((p) => p.split('/').slice(0, -1).join('/'));
    });
    afterEach(() => {
        jest.restoreAllMocks();
    });
    describe('isWindowsFirewallEnabled', () => {
        it('should return false for non-Windows platforms', async () => {
            mockPlatformUtils.getPlatform.mockReturnValue('linux');
            const result = await (0, firewall_utils_1.isWindowsFirewallEnabled)();
            expect(result).toBe(false);
        });
        it('should return true when firewall is enabled', async () => {
            mockExecAsync.mockResolvedValue({ stdout: 'State                                 ON' });
            const result = await (0, firewall_utils_1.isWindowsFirewallEnabled)();
            expect(result).toBe(true);
            expect(mockExecAsync).toHaveBeenCalledWith('netsh advfirewall show allprofiles state');
        });
        it('should return false when firewall is disabled', async () => {
            mockExecAsync.mockResolvedValue({ stdout: 'State                                 OFF' });
            const result = await (0, firewall_utils_1.isWindowsFirewallEnabled)();
            expect(result).toBe(false);
        });
        it('should return false and log warning on error', async () => {
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });
            mockExecAsync.mockRejectedValue(new Error('Command failed'));
            const result = await (0, firewall_utils_1.isWindowsFirewallEnabled)();
            expect(result).toBe(false);
            expect(consoleSpy).toHaveBeenCalledWith('[firewall-utils] Could not check Windows Firewall status:', new Error('Command failed'));
            consoleSpy.mockRestore();
        });
    });
    describe('checkFirewallRule', () => {
        it('should return error for non-Windows platforms', async () => {
            mockPlatformUtils.getPlatform.mockReturnValue('linux');
            const result = await (0, firewall_utils_1.checkFirewallRule)(7777, 'UDP');
            expect(result).toEqual({ ruleExists: false, error: 'Not Windows platform' });
        });
        it('should return rule exists when found', async () => {
            const ruleName = 'ARK Server UDP 7777';
            mockExecAsync.mockResolvedValue({
                stdout: `Rule Name:    ${ruleName}\nEnabled:      Yes`
            });
            const result = await (0, firewall_utils_1.checkFirewallRule)(7777, 'UDP');
            expect(result).toEqual({ ruleExists: true, ruleName });
        });
        it('should return rule does not exist when not found', async () => {
            mockExecAsync.mockResolvedValue({ stdout: 'No rules match the specified criteria.' });
            const result = await (0, firewall_utils_1.checkFirewallRule)(7777, 'UDP');
            expect(result).toEqual({ ruleExists: false });
        });
        it('should return rule does not exist on command error', async () => {
            mockExecAsync.mockRejectedValue(new Error('Rule not found'));
            const result = await (0, firewall_utils_1.checkFirewallRule)(7777, 'UDP');
            expect(result).toEqual({ ruleExists: false });
        });
        it('should use TCP protocol when specified', async () => {
            mockExecAsync.mockResolvedValue({ stdout: 'No rules match the specified criteria.' });
            await (0, firewall_utils_1.checkFirewallRule)(27020, 'TCP');
            expect(mockExecAsync).toHaveBeenCalledWith('netsh advfirewall firewall show rule name="ARK Server TCP 27020"');
        });
    });
    describe('createFirewallRule', () => {
        it('should return false for non-Windows platforms', async () => {
            mockPlatformUtils.getPlatform.mockReturnValue('linux');
            const result = await (0, firewall_utils_1.createFirewallRule)(7777, 'UDP');
            expect(result).toBe(false);
        });
        it('should create rule successfully', async () => {
            mockExecAsync.mockResolvedValue({ stdout: '' });
            const result = await (0, firewall_utils_1.createFirewallRule)(7777, 'UDP', 'Test rule');
            expect(result).toBe(true);
            expect(mockExecAsync).toHaveBeenCalledWith('netsh advfirewall firewall add rule name="ARK Server UDP 7777" dir=in action=allow protocol=UDP localport=7777 description="Test rule"');
        });
        it('should use default description when not provided', async () => {
            mockExecAsync.mockResolvedValue({ stdout: '' });
            const result = await (0, firewall_utils_1.createFirewallRule)(7777, 'UDP');
            expect(result).toBe(true);
            expect(mockExecAsync).toHaveBeenCalledWith('netsh advfirewall firewall add rule name="ARK Server UDP 7777" dir=in action=allow protocol=UDP localport=7777 description="Allow UDP traffic on port 7777 for ARK server"');
        });
        it('should return false and log error on failure', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
            mockExecAsync.mockRejectedValue(new Error('Permission denied'));
            const result = await (0, firewall_utils_1.createFirewallRule)(7777, 'UDP');
            expect(result).toBe(false);
            expect(consoleSpy).toHaveBeenCalledWith('[firewall-utils] Failed to create firewall rule for UDP port 7777:', new Error('Permission denied'));
            consoleSpy.mockRestore();
        });
    });
    describe('removeFirewallRule', () => {
        it('should return false for non-Windows platforms', async () => {
            mockPlatformUtils.getPlatform.mockReturnValue('linux');
            const result = await (0, firewall_utils_1.removeFirewallRule)(7777, 'UDP');
            expect(result).toBe(false);
        });
        it('should remove rule successfully', async () => {
            mockExecAsync.mockResolvedValue({ stdout: '' });
            const result = await (0, firewall_utils_1.removeFirewallRule)(7777, 'UDP');
            expect(result).toBe(true);
            expect(mockExecAsync).toHaveBeenCalledWith('netsh advfirewall firewall delete rule name="ARK Server UDP 7777"');
        });
        it('should return false and log error on failure', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
            mockExecAsync.mockRejectedValue(new Error('Rule not found'));
            const result = await (0, firewall_utils_1.removeFirewallRule)(7777, 'UDP');
            expect(result).toBe(false);
            expect(consoleSpy).toHaveBeenCalledWith('[firewall-utils] Failed to remove firewall rule for UDP port 7777:', new Error('Rule not found'));
            consoleSpy.mockRestore();
        });
    });
    describe('createApplicationRule', () => {
        beforeEach(() => {
            // Mock process.execPath
            Object.defineProperty(process, 'execPath', {
                value: 'C:\\Program Files\\Cerious AASM\\app.exe',
                writable: true
            });
        });
        it('should return false for non-Windows platforms', async () => {
            mockPlatformUtils.getPlatform.mockReturnValue('linux');
            const result = await (0, firewall_utils_1.createApplicationRule)();
            expect(result).toBe(false);
        });
        it('should create application rule successfully', async () => {
            mockExecAsync.mockResolvedValue({ stdout: '' });
            const result = await (0, firewall_utils_1.createApplicationRule)();
            expect(result).toBe(true);
            expect(mockExecAsync).toHaveBeenCalledWith('netsh advfirewall firewall add rule name="Cerious AASM Application" dir=in action=allow program="C:\\Program Files\\Cerious AASM\\app.exe" description="Allow Cerious AASM application network access"');
        });
        it('should use custom application path when provided', async () => {
            mockExecAsync.mockResolvedValue({ stdout: '' });
            const customPath = 'C:\\Custom\\Path\\app.exe';
            const result = await (0, firewall_utils_1.createApplicationRule)(customPath);
            expect(result).toBe(true);
            const lastCall = mockExecAsync.mock.calls[mockExecAsync.mock.calls.length - 1][0];
            expect(lastCall).toContain(`program="${customPath}"`);
        });
        it('should remove existing rule before creating new one', async () => {
            mockExecAsync.mockResolvedValue({ stdout: '' });
            await (0, firewall_utils_1.createApplicationRule)();
            expect(mockExecAsync).toHaveBeenCalledWith('netsh advfirewall firewall delete rule name="Cerious AASM Application"');
            const lastCall = mockExecAsync.mock.calls[mockExecAsync.mock.calls.length - 1][0];
            expect(lastCall).toContain('netsh advfirewall firewall add rule name="Cerious AASM Application"');
        });
    });
    describe('setupArkServerFirewall', () => {
        it('should create all required rules successfully', async () => {
            mockExecAsync.mockResolvedValue({ stdout: '' });
            const result = await (0, firewall_utils_1.setupArkServerFirewall)(7777, 27015, 27020);
            expect(result.success).toBe(true);
            expect(result.rulesCreated).toEqual(['Game UDP 7777', 'Query UDP 27015', 'RCON TCP 27020']);
            expect(result.errors).toEqual([]);
        });
        it('should skip query port if same as game port', async () => {
            mockExecAsync.mockResolvedValue({ stdout: '' });
            const result = await (0, firewall_utils_1.setupArkServerFirewall)(7777, 7777, 27020);
            expect(result.success).toBe(true);
            expect(result.rulesCreated).toEqual(['Game UDP 7777', 'RCON TCP 27020']);
            expect(result.errors).toEqual([]);
        });
        it('should handle rule creation failures', async () => {
            mockExecAsync.mockRejectedValueOnce(new Error('Failed')).mockResolvedValue({ stdout: '' });
            const result = await (0, firewall_utils_1.setupArkServerFirewall)(7777, 27015, 27020);
            expect(result.success).toBe(false);
            expect(result.rulesCreated).toEqual(['Query UDP 27015', 'RCON TCP 27020']);
            expect(result.errors).toEqual(['Failed to create game port rule (UDP 7777)']);
        });
    });
    describe('setupWebServerFirewall', () => {
        it('should delegate to createFirewallRule', async () => {
            mockExecAsync.mockResolvedValue({ stdout: '' });
            const result = await (0, firewall_utils_1.setupWebServerFirewall)(8080);
            expect(result).toBe(true);
            expect(mockExecAsync).toHaveBeenCalledWith('netsh advfirewall firewall add rule name="ARK Server TCP 8080" dir=in action=allow protocol=TCP localport=8080 description="Cerious AASM Web Server Port 8080"');
        });
    });
    describe('hasAdminPrivileges', () => {
        it('should return false for non-Windows platforms', async () => {
            mockPlatformUtils.getPlatform.mockReturnValue('linux');
            const result = await (0, firewall_utils_1.hasAdminPrivileges)();
            expect(result).toBe(false);
        });
        it('should return true when admin privileges are available', async () => {
            mockExecAsync.mockResolvedValue({ stdout: '' });
            const result = await (0, firewall_utils_1.hasAdminPrivileges)();
            expect(result).toBe(true);
            expect(mockExecAsync).toHaveBeenCalledWith('net session');
        });
        it('should return false when admin privileges are not available', async () => {
            mockExecAsync.mockRejectedValue(new Error('Access denied'));
            const result = await (0, firewall_utils_1.hasAdminPrivileges)();
            expect(result).toBe(false);
        });
    });
    describe('getExistingArkRules', () => {
        it('should return empty array for non-Windows platforms', async () => {
            mockPlatformUtils.getPlatform.mockReturnValue('linux');
            const result = await (0, firewall_utils_1.getExistingArkRules)();
            expect(result).toEqual([]);
        });
        it('should return list of existing ARK rules', async () => {
            const mockOutput = `
Rule Name:    ARK Server UDP 7777
Rule Name:    ARK Server TCP 27020
Rule Name:    Some Other Rule
`;
            mockExecAsync.mockResolvedValue({ stdout: mockOutput });
            const result = await (0, firewall_utils_1.getExistingArkRules)();
            expect(result).toEqual(['ARK Server UDP 7777', 'ARK Server TCP 27020']);
        });
        it('should return empty array on error', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
            mockExecAsync.mockRejectedValue(new Error('Command failed'));
            const result = await (0, firewall_utils_1.getExistingArkRules)();
            expect(result).toEqual([]);
            expect(consoleSpy).toHaveBeenCalledWith('[firewall-utils] Failed to get existing ARK rules:', new Error('Command failed'));
            consoleSpy.mockRestore();
        });
    });
    describe('cleanupArkRules', () => {
        it('should return false for non-Windows platforms', async () => {
            mockPlatformUtils.getPlatform.mockReturnValue('linux');
            const result = await (0, firewall_utils_1.cleanupArkRules)();
            expect(result).toBe(false);
        });
        it('should remove all existing ARK rules successfully', async () => {
            const mockRules = ['ARK Server UDP 7777', 'ARK Server TCP 27020'];
            mockExecAsync
                .mockResolvedValueOnce({ stdout: `Rule Name:    ${mockRules[0]}\nRule Name:    ${mockRules[1]}` })
                .mockResolvedValue({ stdout: '' });
            const result = await (0, firewall_utils_1.cleanupArkRules)();
            expect(result).toBe(true);
            expect(mockExecAsync).toHaveBeenCalledWith('netsh advfirewall firewall delete rule name="ARK Server UDP 7777"');
            expect(mockExecAsync).toHaveBeenCalledWith('netsh advfirewall firewall delete rule name="ARK Server TCP 27020"');
        });
        it('should continue cleanup even if individual rule removal fails', async () => {
            const mockRules = ['ARK Server UDP 7777', 'ARK Server TCP 27020'];
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });
            mockExecAsync
                .mockResolvedValueOnce({ stdout: `Rule Name:    ${mockRules[0]}\nRule Name:    ${mockRules[1]}` })
                .mockRejectedValueOnce(new Error('Delete failed'))
                .mockResolvedValue({ stdout: '' });
            const result = await (0, firewall_utils_1.cleanupArkRules)();
            expect(result).toBe(true);
            expect(consoleSpy).toHaveBeenCalledWith('[firewall-utils] Failed to remove rule ARK Server UDP 7777:', new Error('Delete failed'));
            consoleSpy.mockRestore();
        });
        it('should return true when getting existing rules fails but returns empty array', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });
            mockExecAsync.mockRejectedValue(new Error('Command failed'));
            const result = await (0, firewall_utils_1.cleanupArkRules)();
            expect(result).toBe(true); // getExistingArkRules handles error gracefully
            expect(consoleSpy).toHaveBeenCalledWith('[firewall-utils] Failed to get existing ARK rules:', new Error('Command failed'));
            consoleSpy.mockRestore();
        });
    });
    describe('getLinuxFirewallInstructions', () => {
        it('should generate UFW and firewalld instructions', () => {
            const result = (0, firewall_utils_1.getLinuxFirewallInstructions)({
                game: 7777,
                query: 27015,
                rcon: 27020
            });
            expect(result).toContain('# Linux Firewall Configuration for ARK Server');
            expect(result).toContain('sudo ufw allow 7777/udp');
            expect(result).toContain('sudo ufw allow 27015/udp');
            expect(result).toContain('sudo ufw allow 27020/tcp');
            expect(result).toContain('sudo firewall-cmd --permanent --add-port=7777/udp');
            expect(result).toContain('sudo firewall-cmd --permanent --add-port=27015/udp');
            expect(result).toContain('sudo firewall-cmd --permanent --add-port=27020/tcp');
        });
        it('should skip query port if same as game port', () => {
            const result = (0, firewall_utils_1.getLinuxFirewallInstructions)({
                game: 7777,
                query: 7777,
                rcon: 27020
            });
            expect(result).toContain('sudo ufw allow 7777/udp');
            expect(result).not.toContain('sudo ufw allow 7777/udp  # Query port');
            expect(result).toContain('sudo ufw allow 27020/tcp');
        });
        it('should handle missing optional ports', () => {
            const result = (0, firewall_utils_1.getLinuxFirewallInstructions)({
                game: 7777
            });
            expect(result).toContain('sudo ufw allow 7777/udp');
            expect(result).not.toContain('27015');
            expect(result).not.toContain('27020');
        });
    });
    describe('Function Exports', () => {
        it('should export all functions', () => {
            expect(typeof firewall_utils_1.isWindowsFirewallEnabled).toBe('function');
            expect(typeof firewall_utils_1.checkFirewallRule).toBe('function');
            expect(typeof firewall_utils_1.createFirewallRule).toBe('function');
            expect(typeof firewall_utils_1.removeFirewallRule).toBe('function');
            expect(typeof firewall_utils_1.createApplicationRule).toBe('function');
            expect(typeof firewall_utils_1.setupArkServerFirewall).toBe('function');
            expect(typeof firewall_utils_1.setupWebServerFirewall).toBe('function');
            expect(typeof firewall_utils_1.hasAdminPrivileges).toBe('function');
            expect(typeof firewall_utils_1.getExistingArkRules).toBe('function');
            expect(typeof firewall_utils_1.cleanupArkRules).toBe('function');
            expect(typeof firewall_utils_1.getLinuxFirewallInstructions).toBe('function');
        });
    });
});
