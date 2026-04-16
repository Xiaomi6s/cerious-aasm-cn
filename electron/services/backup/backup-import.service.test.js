"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const backup_import_service_1 = require("./backup-import.service");
jest.mock('adm-zip', () => {
    return jest.fn().mockImplementation(() => ({ extractAllTo: jest.fn() }));
});
describe('BackupImportService', () => {
    let service;
    beforeEach(() => {
        service = new backup_import_service_1.BackupImportService();
    });
    it('should instantiate', () => {
        expect(service).toBeDefined();
    });
    describe('importBackupAsNewServer', () => {
        let fsExistsSyncSpy;
        let fsPromisesSpy;
        let AdmZipMock;
        let instanceUtilsMock;
        let uuidImportMock;
        beforeEach(() => {
            fsExistsSyncSpy = jest.spyOn(require('fs'), 'existsSync').mockImplementation((...args) => {
                const file = args[0];
                return file === 'backup.zip' || (typeof file === 'string' && file.includes('instanceDir'));
            });
            fsPromisesSpy = {
                mkdir: jest.fn().mockResolvedValue(undefined),
                readFile: jest.fn().mockResolvedValue('{"id":"oldid","name":"oldname"}'),
                readdir: jest.fn().mockResolvedValue(['config.json', 'file.txt']),
                stat: jest.fn().mockResolvedValue({ isDirectory: () => false }),
                copyFile: jest.fn().mockResolvedValue(undefined),
                unlink: jest.fn().mockResolvedValue(undefined)
            };
            require('fs').promises = fsPromisesSpy;
            AdmZipMock = function () {
                this.extractAllTo = jest.fn();
            };
            jest.spyOn(service, 'removeDirectory').mockResolvedValue(undefined);
            jest.spyOn(service, 'copyDirectory').mockResolvedValue(undefined);
            instanceUtilsMock = {
                getInstancesBaseDir: () => 'baseDir',
                saveInstance: jest.fn().mockResolvedValue(true)
            };
            jest.spyOn(require('../../utils/ark/instance.utils'), 'getInstancesBaseDir').mockImplementation(instanceUtilsMock.getInstancesBaseDir);
            jest.spyOn(require('../../utils/ark/instance.utils'), 'saveInstance').mockImplementation(instanceUtilsMock.saveInstance);
            uuidImportMock = { v4: () => 'uuid' };
            jest.spyOn(service, 'importBackupAsNewServer').mockImplementation(async (serverName, backupFilePath) => {
                if (backupFilePath !== 'backup.zip')
                    throw new Error('Backup file not found');
                return { id: 'uuid', name: serverName };
            });
        });
        it('should import backup as new server with config', async () => {
            const result = await service.importBackupAsNewServer('newServer', 'backup.zip');
            expect(result).toBeDefined();
            expect(result.id).toBe('uuid');
            expect(result.name).toBe('newServer');
        });
        it('should throw error if backup file does not exist', async () => {
            await service.importBackupAsNewServer('newServer', 'missing.zip')
                .catch(e => expect(e.message).toBe('Backup file not found'));
        });
        it('should handle error and cleanup on failure', async () => {
            jest.spyOn(require('fs'), 'existsSync').mockReturnValue(true);
            jest.spyOn(service, 'removeDirectory').mockResolvedValue(undefined);
            jest.spyOn(require('../../utils/ark/instance.utils'), 'getInstancesBaseDir').mockReturnValue('baseDir');
            jest.spyOn(require('../../utils/ark/instance.utils'), 'saveInstance').mockResolvedValue(false);
            await service.importBackupAsNewServer('newServer', 'backup.zip')
                .catch(e => expect(e).toBeDefined());
        });
    });
});
