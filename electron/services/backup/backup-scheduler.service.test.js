"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const backup_scheduler_service_1 = require("./backup-scheduler.service");
describe('BackupSchedulerService', () => {
    it('should instantiate', () => {
        const service = new backup_scheduler_service_1.BackupSchedulerService();
        expect(service).toBeDefined();
    });
    // Add more tests for all public methods and error cases
});
