"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ark_args_utils_1 = require("./ark-args.utils");
describe('ark-args.utils', () => {
    describe('buildArkServerArgs', () => {
        it('should return default args for empty config', () => {
            const args = (0, ark_args_utils_1.buildArkServerArgs)({});
            expect(args).toContain('-ServerPlatform=PC');
        });
        it('should use serverPlatform if set', () => {
            const args = (0, ark_args_utils_1.buildArkServerArgs)({ serverPlatform: 'XSX' });
            expect(args).toContain('-ServerPlatform=XSX');
        });
        it('should convert crossplay array to platform string', () => {
            const args = (0, ark_args_utils_1.buildArkServerArgs)({ crossplay: ['Steam (PC)', 'Xbox (XSX)'] });
            expect(args).toContain('-ServerPlatform=PC+XSX');
        });
        it('should add cluster flags if set', () => {
            const config = {
                noTransferFromFiltering: true,
                preventDownloadSurvivors: true,
                preventDownloadItems: true,
                preventDownloadDinos: true,
                preventUploadSurvivors: true,
                preventUploadItems: true,
                preventUploadDinos: true
            };
            const args = (0, ark_args_utils_1.buildArkServerArgs)(config);
            expect(args).toContain('-NoTransferFromFiltering');
            expect(args).toContain('-PreventDownloadSurvivors');
            expect(args).toContain('-PreventDownloadItems');
            expect(args).toContain('-PreventDownloadDinos');
            expect(args).toContain('-PreventUploadSurvivors');
            expect(args).toContain('-PreventUploadItems');
            expect(args).toContain('-PreventUploadDinos');
        });
    });
    describe('getArkMapName', () => {
        it('should return mapName from config', () => {
            expect((0, ark_args_utils_1.getArkMapName)({ mapName: 'Valguero_P' })).toBe('Valguero_P');
        });
        it('should return default map if not set', () => {
            expect((0, ark_args_utils_1.getArkMapName)({})).toBe('TheIsland_WP');
        });
    });
    describe('getArkLaunchParameters', () => {
        it('should handle enabledMods array', () => {
            const config = { mods: [], enabledMods: ['123', '456'] };
            const params = (0, ark_args_utils_1.getArkLaunchParameters)(config);
            expect(params).toContain('-mods=123,456');
            expect(params).toContain('-automanagedmods');
        });
        it('should handle legacy mods array with objects', () => {
            const config = { mods: [{ id: '789', enabled: true }, { id: '101', enabled: false }] };
            const params = (0, ark_args_utils_1.getArkLaunchParameters)(config);
            expect(params).toContain('-mods=789');
            expect(params).toContain('-automanagedmods');
        });
        it('should handle mods array with string IDs', () => {
            const config = { mods: ['202', '303'] };
            const params = (0, ark_args_utils_1.getArkLaunchParameters)(config);
            expect(params).toContain('-mods=202,303');
            expect(params).toContain('-automanagedmods');
        });
        it('should add additional launchParameters from config', () => {
            const config = { launchParameters: '-foo -bar' };
            const params = (0, ark_args_utils_1.getArkLaunchParameters)(config);
            expect(params).toContain('-foo');
            expect(params).toContain('-bar');
        });
        it('should return empty array if no mods or launchParameters', () => {
            expect((0, ark_args_utils_1.getArkLaunchParameters)({})).toEqual([]);
        });
    });
});
