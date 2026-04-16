"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const automation_config_service_1 = require("./automation-config.service");
jest.mock('../../utils/ark/instance.utils', () => ({
    getInstance: jest.fn(),
    saveInstance: jest.fn()
}));
const { getInstance, saveInstance } = require('../../utils/ark/instance.utils');
describe('AutomationConfigService', () => {
    let automations;
    let service;
    beforeEach(() => {
        automations = new Map();
        service = new automation_config_service_1.AutomationConfigService(automations);
        jest.clearAllMocks();
    });
    it('should create automation if not present', async () => {
        expect(automations.size).toBe(0);
        await service.configureAutostart('id', true, false);
        expect(automations.size).toBe(1);
        expect(automations.get('id')).toBeDefined();
    });
    it('should configure autostart and update instance', async () => {
        getInstance.mockReturnValue({});
        await service.configureAutostart('id', true, false);
        expect(automations.get('id').settings.autoStartOnAppLaunch).toBe(true);
        expect(automations.get('id').settings.autoStartOnBoot).toBe(false);
        expect(saveInstance).toHaveBeenCalled();
    });
    it('should handle missing instance in autostart', async () => {
        getInstance.mockReturnValue(undefined);
        const result = await service.configureAutostart('id', true, true);
        expect(result.success).toBe(true);
        expect(saveInstance).not.toHaveBeenCalled();
    });
    it('should handle autostart errors', async () => {
        getInstance.mockImplementation(() => { throw new Error('fail'); });
        const result = await service.configureAutostart('id', true, true);
        expect(result.success).toBe(false);
        expect(result.error).toBe('fail');
    });
    it('should configure crash detection and update instance', async () => {
        getInstance.mockReturnValue({});
        await service.configureCrashDetection('id', true, 123, 5);
        const settings = automations.get('id').settings;
        expect(settings.crashDetectionEnabled).toBe(true);
        expect(settings.crashDetectionInterval).toBe(123);
        expect(settings.maxRestartAttempts).toBe(5);
        expect(saveInstance).toHaveBeenCalled();
    });
    it('should handle missing instance in crash detection', async () => {
        getInstance.mockReturnValue(undefined);
        const result = await service.configureCrashDetection('id', false, 100, 2);
        expect(result.success).toBe(true);
        expect(saveInstance).not.toHaveBeenCalled();
    });
    it('should handle crash detection errors', async () => {
        getInstance.mockImplementation(() => { throw new Error('fail'); });
        const result = await service.configureCrashDetection('id', false, 100, 2);
        expect(result.success).toBe(false);
        expect(result.error).toBe('fail');
    });
    it('should configure scheduled restart and update instance', async () => {
        getInstance.mockReturnValue({});
        await service.configureScheduledRestart('id', true, 'weekly', '03:00', [1, 2], 10);
        const settings = automations.get('id').settings;
        expect(settings.scheduledRestartEnabled).toBe(true);
        expect(settings.restartFrequency).toBe('weekly');
        expect(settings.restartTime).toBe('03:00');
        expect(settings.restartDays).toEqual([1, 2]);
        expect(settings.restartWarningMinutes).toBe(10);
        expect(saveInstance).toHaveBeenCalled();
    });
    it('should handle missing instance in scheduled restart', async () => {
        getInstance.mockReturnValue(undefined);
        const result = await service.configureScheduledRestart('id', false, 'daily', '02:00', [0], 0);
        expect(result.success).toBe(true);
        expect(saveInstance).not.toHaveBeenCalled();
    });
    it('should handle scheduled restart errors', async () => {
        getInstance.mockImplementation(() => { throw new Error('fail'); });
        const result = await service.configureScheduledRestart('id', false, 'daily', '02:00', [0], 0);
        expect(result.success).toBe(false);
        expect(result.error).toBe('fail');
    });
});
