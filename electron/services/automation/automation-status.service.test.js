"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const automation_status_service_1 = require("./automation-status.service");
describe('AutomationStatusService', () => {
    let automations;
    let service;
    beforeEach(() => {
        automations = new Map();
        service = new automation_status_service_1.AutomationStatusService(automations);
    });
    it('should create automation if not present', async () => {
        expect(automations.size).toBe(0);
        await service.getAutomationStatus('id');
        expect(automations.size).toBe(1);
        expect(automations.get('id')).toBeDefined();
    });
    it('should get autostart instance ids', () => {
        automations.set('id1', {
            serverId: 'id1',
            settings: { autoStartOnAppLaunch: true },
            restartAttempts: 0,
            manuallyStopped: false,
            status: { isMonitoring: false, isScheduled: false }
        });
        automations.set('id2', {
            serverId: 'id2',
            settings: { autoStartOnAppLaunch: false },
            restartAttempts: 0,
            manuallyStopped: false,
            status: { isMonitoring: false, isScheduled: false }
        });
        expect(service.getAutostartInstanceIds()).toEqual(['id1']);
    });
    it('should get automation status', async () => {
        automations.set('id', {
            serverId: 'id',
            settings: { autoStartOnAppLaunch: true },
            restartAttempts: 2,
            manuallyStopped: true,
            status: { isMonitoring: true, isScheduled: false },
            lastCrashTime: new Date(12345)
        });
        const result = await service.getAutomationStatus('id');
        expect(result.success).toBe(true);
        expect(result.status.settings.autoStartOnAppLaunch).toBe(true);
        expect(result.status.restartAttempts).toBe(2);
        expect(result.status.manuallyStopped).toBe(true);
        expect(result.status.status.isMonitoring).toBe(true);
        expect(result.status.lastCrashTime.getTime()).toBe(12345);
    });
    it('should handle errors in getAutomationStatus', async () => {
        // Simulate error by breaking the map
        service = new automation_status_service_1.AutomationStatusService(undefined);
        const spy = jest.spyOn(console, 'error').mockImplementation(() => { });
        const result = await service.getAutomationStatus('id');
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(spy).toHaveBeenCalled();
    });
    it('should set manuallyStopped', () => {
        automations.set('id', {
            serverId: 'id',
            settings: { autoStartOnAppLaunch: false },
            restartAttempts: 0,
            manuallyStopped: false,
            status: { isMonitoring: false, isScheduled: false }
        });
        service.setManuallyStopped('id', true);
        expect(automations.get('id').manuallyStopped).toBe(true);
        service.setManuallyStopped('id', false);
        expect(automations.get('id').manuallyStopped).toBe(false);
    });
    it('should do nothing if automation not found in setManuallyStopped', () => {
        expect(() => service.setManuallyStopped('missing', true)).not.toThrow();
    });
});
