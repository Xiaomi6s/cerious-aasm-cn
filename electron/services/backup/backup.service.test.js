"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const backup_service_1 = require("./backup.service");
describe('BackupService', () => {
    it('should instantiate', () => {
        const service = new backup_service_1.BackupService();
        expect(service).toBeDefined();
    });
    // Add more tests for all public methods and error cases
});
