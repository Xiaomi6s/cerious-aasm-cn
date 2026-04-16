"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
// Mock the services
globals_1.jest.mock('../services/messaging.service', () => ({
    messagingService: {
        on: globals_1.jest.fn(),
        sendToOriginator: globals_1.jest.fn(),
    },
}));
globals_1.jest.mock('../services/platform.service', () => ({
    platformService: {
        getNodeVersion: globals_1.jest.fn(),
        getElectronVersion: globals_1.jest.fn(),
        getPlatform: globals_1.jest.fn(),
        getConfigPath: globals_1.jest.fn(),
    },
}));
const messaging_service_1 = require("../services/messaging.service");
const platform_service_1 = require("../services/platform.service");
const mockMessagingService = messaging_service_1.messagingService;
const mockPlatformService = platform_service_1.platformService;
describe('system-info-handler', () => {
    let getSystemInfoHandler;
    let mockSender;
    beforeAll(() => {
        // Import the handler to register the event listeners
        require('./system-info-handler');
        // Store the handler for testing
        getSystemInfoHandler = mockMessagingService.on.mock.calls.find(call => call[0] === 'get-system-info')?.[1];
    });
    beforeEach(() => {
        globals_1.jest.clearAllMocks();
        // Mock console.error to suppress expected errors from error handling tests
        globals_1.jest.spyOn(console, 'error').mockImplementation(() => { });
        mockSender = { id: 'test-sender' };
    });
    afterEach(() => {
        globals_1.jest.restoreAllMocks();
    });
    describe('get-system-info handler', () => {
        it('should handle get-system-info successfully', async () => {
            const payload = { requestId: 'test-request-123' };
            const mockSystemInfo = {
                nodeVersion: '18.17.0',
                electronVersion: '25.0.0',
                platform: 'Windows',
                configPath: 'C:\\Users\\user\\AppData\\Roaming\\Cerious AASM'
            };
            mockPlatformService.getNodeVersion.mockReturnValue(mockSystemInfo.nodeVersion);
            mockPlatformService.getElectronVersion.mockReturnValue(mockSystemInfo.electronVersion);
            mockPlatformService.getPlatform.mockReturnValue(mockSystemInfo.platform);
            mockPlatformService.getConfigPath.mockReturnValue(mockSystemInfo.configPath);
            expect(getSystemInfoHandler).toBeDefined();
            getSystemInfoHandler(payload, mockSender);
            expect(mockPlatformService.getNodeVersion).toHaveBeenCalled();
            expect(mockPlatformService.getElectronVersion).toHaveBeenCalled();
            expect(mockPlatformService.getPlatform).toHaveBeenCalled();
            expect(mockPlatformService.getConfigPath).toHaveBeenCalled();
            expect(mockMessagingService.sendToOriginator).toHaveBeenCalledWith('get-system-info', {
                nodeVersion: mockSystemInfo.nodeVersion,
                electronVersion: mockSystemInfo.electronVersion,
                platform: mockSystemInfo.platform,
                configPath: mockSystemInfo.configPath,
                requestId: 'test-request-123'
            }, mockSender);
        });
        it('should handle get-system-info with undefined payload', async () => {
            const mockSystemInfo = {
                nodeVersion: '18.17.0',
                electronVersion: '25.0.0',
                platform: 'Linux',
                configPath: '/home/user/.config/Cerious AASM'
            };
            mockPlatformService.getNodeVersion.mockReturnValue(mockSystemInfo.nodeVersion);
            mockPlatformService.getElectronVersion.mockReturnValue(mockSystemInfo.electronVersion);
            mockPlatformService.getPlatform.mockReturnValue(mockSystemInfo.platform);
            mockPlatformService.getConfigPath.mockReturnValue(mockSystemInfo.configPath);
            getSystemInfoHandler(undefined, mockSender);
            expect(mockPlatformService.getNodeVersion).toHaveBeenCalled();
            expect(mockPlatformService.getElectronVersion).toHaveBeenCalled();
            expect(mockPlatformService.getPlatform).toHaveBeenCalled();
            expect(mockPlatformService.getConfigPath).toHaveBeenCalled();
            expect(mockMessagingService.sendToOriginator).toHaveBeenCalledWith('get-system-info', {
                nodeVersion: mockSystemInfo.nodeVersion,
                electronVersion: mockSystemInfo.electronVersion,
                platform: mockSystemInfo.platform,
                configPath: mockSystemInfo.configPath,
                requestId: undefined
            }, mockSender);
        });
        it('should handle get-system-info with null versions', async () => {
            const payload = { requestId: 'test-request-456' };
            const mockSystemInfo = {
                nodeVersion: null,
                electronVersion: null,
                platform: 'macOS',
                configPath: '/Users/user/Library/Application Support/Cerious AASM'
            };
            mockPlatformService.getNodeVersion.mockReturnValue(mockSystemInfo.nodeVersion);
            mockPlatformService.getElectronVersion.mockReturnValue(mockSystemInfo.electronVersion);
            mockPlatformService.getPlatform.mockReturnValue(mockSystemInfo.platform);
            mockPlatformService.getConfigPath.mockReturnValue(mockSystemInfo.configPath);
            getSystemInfoHandler(payload, mockSender);
            expect(mockPlatformService.getNodeVersion).toHaveBeenCalled();
            expect(mockPlatformService.getElectronVersion).toHaveBeenCalled();
            expect(mockPlatformService.getPlatform).toHaveBeenCalled();
            expect(mockPlatformService.getConfigPath).toHaveBeenCalled();
            expect(mockMessagingService.sendToOriginator).toHaveBeenCalledWith('get-system-info', {
                nodeVersion: null,
                electronVersion: null,
                platform: mockSystemInfo.platform,
                configPath: mockSystemInfo.configPath,
                requestId: 'test-request-456'
            }, mockSender);
        });
        it('should handle get-system-info error', async () => {
            const payload = { requestId: 'test-request-789' };
            const errorMessage = 'Platform service unavailable';
            mockPlatformService.getNodeVersion.mockImplementation(() => {
                throw new Error(errorMessage);
            });
            getSystemInfoHandler(payload, mockSender);
            expect(mockPlatformService.getNodeVersion).toHaveBeenCalled();
            expect(mockMessagingService.sendToOriginator).toHaveBeenCalledWith('get-system-info', { error: errorMessage, requestId: 'test-request-789' }, mockSender);
        });
        it('should handle get-system-info with non-Error exception', async () => {
            const payload = { requestId: 'test-request-000' };
            mockPlatformService.getNodeVersion.mockImplementation(() => {
                throw 'String error';
            });
            getSystemInfoHandler(payload, mockSender);
            expect(mockPlatformService.getNodeVersion).toHaveBeenCalled();
            expect(mockMessagingService.sendToOriginator).toHaveBeenCalledWith('get-system-info', { error: 'String error', requestId: 'test-request-000' }, mockSender);
        });
    });
});
