"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const automation_instances_service_1 = require("./automation-instances.service");
jest.mock('../../utils/ark/instance.utils', () => ({
    getAllInstances: jest.fn()
}));
const { getAllInstances } = require('../../utils/ark/instance.utils');
describe('AutomationInstancesService', () => {
    let automations;
    let service;
    beforeEach(() => {
        automations = new Map();
        service = new automation_instances_service_1.AutomationInstancesService(automations);
        jest.clearAllMocks();
    });
    it('should load automations from instances', async () => {
        getAllInstances.mockResolvedValue([
            {
                id: 'id1',
                autoStartOnAppLaunch: true,
                autoStartOnBoot: false,
                crashDetectionEnabled: true,
                crashDetectionInterval: 123,
                maxRestartAttempts: 5,
                scheduledRestartEnabled: true,
                restartFrequency: 'weekly',
                restartTime: '03:00',
                restartDays: [1, 2],
                restartWarningMinutes: 10
            },
            {
                id: 'id2',
                autoStartOnAppLaunch: false,
                autoStartOnBoot: true,
                crashDetectionEnabled: false,
                crashDetectionInterval: 60,
                maxRestartAttempts: 3,
                scheduledRestartEnabled: false,
                restartFrequency: 'daily',
                restartTime: '02:00',
                restartDays: [0],
                restartWarningMinutes: 5
            }
        ]);
        await service.loadAutomationFromInstances();
        expect(automations.size).toBe(2);
        expect(automations.get('id1')).toBeDefined();
        expect(automations.get('id2')).toBeDefined();
        expect(automations.get('id1').settings.restartFrequency).toBe('weekly');
        expect(automations.get('id2').settings.restartFrequency).toBe('daily');
    });
    it('should skip instances without id or autoStartOnAppLaunch', async () => {
        getAllInstances.mockResolvedValue([
            { id: undefined, autoStartOnAppLaunch: true },
            { id: 'id3', autoStartOnAppLaunch: undefined }
        ]);
        await service.loadAutomationFromInstances();
        expect(automations.size).toBe(0);
    });
    it('should handle empty instance list', async () => {
        getAllInstances.mockResolvedValue([]);
        await service.loadAutomationFromInstances();
        expect(automations.size).toBe(0);
    });
    it('should handle errors gracefully', async () => {
        getAllInstances.mockRejectedValue(new Error('fail'));
        const spy = jest.spyOn(console, 'error').mockImplementation(() => { });
        await service.loadAutomationFromInstances();
        expect(spy).toHaveBeenCalled();
        spy.mockRestore();
    });
});
