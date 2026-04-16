"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
// Mock the services
globals_1.jest.mock('../services/messaging.service', () => ({
    messagingService: {
        on: globals_1.jest.fn(),
        sendToOriginator: globals_1.jest.fn(),
        sendToAll: globals_1.jest.fn(),
    },
}));
globals_1.jest.mock('../services/settings.service', () => ({
    settingsService: {
        getGlobalConfig: globals_1.jest.fn(),
        updateGlobalConfig: globals_1.jest.fn(),
        updateWebServerAuth: globals_1.jest.fn(),
    },
}));
const messaging_service_1 = require("../services/messaging.service");
const settings_service_1 = require("../services/settings.service");
const mockMessagingService = messaging_service_1.messagingService;
const mockSettingsService = settings_service_1.settingsService;
describe('settings-handler', () => {
    let mockSender;
    let getConfigHandler;
    let setConfigHandler;
    beforeAll(() => {
        // Import the handler to register the event listeners
        require('./settings-handler');
        // Store the handlers for testing
        getConfigHandler = mockMessagingService.on.mock.calls.find(call => call[0] === 'get-global-config')?.[1];
        setConfigHandler = mockMessagingService.on.mock.calls.find(call => call[0] === 'set-global-config')?.[1];
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
    describe('get-global-config handler', () => {
        it('should handle get-global-config successfully', async () => {
            const payload = { requestId: 'test-request-123' };
            const mockConfig = { webServerPort: 3000, authenticationEnabled: true };
            mockSettingsService.getGlobalConfig.mockReturnValue(mockConfig);
            expect(getConfigHandler).toBeDefined();
            await getConfigHandler(payload, mockSender);
            expect(mockSettingsService.getGlobalConfig).toHaveBeenCalled();
            expect(mockMessagingService.sendToOriginator).toHaveBeenCalledWith('get-global-config', { ...mockConfig, requestId: 'test-request-123' }, mockSender);
            expect(mockMessagingService.sendToAll).toHaveBeenCalledWith('global-config', mockConfig);
        });
        it('should handle get-global-config with undefined payload', async () => {
            const mockConfig = { webServerPort: 3000, authenticationEnabled: true };
            mockSettingsService.getGlobalConfig.mockReturnValue(mockConfig);
            await getConfigHandler(undefined, mockSender);
            expect(mockSettingsService.getGlobalConfig).toHaveBeenCalled();
            expect(mockMessagingService.sendToOriginator).toHaveBeenCalledWith('get-global-config', { ...mockConfig, requestId: undefined }, mockSender);
            expect(mockMessagingService.sendToAll).toHaveBeenCalledWith('global-config', mockConfig);
        });
        it('should handle get-global-config error', async () => {
            const payload = { requestId: 'test-request-123' };
            const errorMessage = 'Failed to load config';
            mockSettingsService.getGlobalConfig.mockImplementation(() => {
                throw new Error(errorMessage);
            });
            await getConfigHandler(payload, mockSender);
            expect(mockSettingsService.getGlobalConfig).toHaveBeenCalled();
            expect(mockMessagingService.sendToOriginator).toHaveBeenCalledWith('get-global-config', { error: errorMessage, requestId: 'test-request-123' }, mockSender);
            expect(mockMessagingService.sendToAll).not.toHaveBeenCalled();
        });
        it('should handle get-global-config with non-Error exception', async () => {
            const payload = { requestId: 'test-request-123' };
            mockSettingsService.getGlobalConfig.mockImplementation(() => {
                throw 'String error';
            });
            await getConfigHandler(payload, mockSender);
            expect(mockSettingsService.getGlobalConfig).toHaveBeenCalled();
            expect(mockMessagingService.sendToOriginator).toHaveBeenCalledWith('get-global-config', { error: 'String error', requestId: 'test-request-123' }, mockSender);
            expect(mockMessagingService.sendToAll).not.toHaveBeenCalled();
        });
    });
    describe('set-global-config handler', () => {
        it('should handle set-global-config successfully', async () => {
            const payload = { config: { webServerPort: 3001 }, requestId: 'test-request-456' };
            const mockResult = { success: true, updatedConfig: { webServerPort: 3001, authenticationEnabled: false } };
            mockSettingsService.updateGlobalConfig.mockResolvedValue(mockResult);
            expect(setConfigHandler).toBeDefined();
            await setConfigHandler(payload, mockSender);
            expect(mockSettingsService.updateGlobalConfig).toHaveBeenCalledWith({ webServerPort: 3001 });
            expect(mockMessagingService.sendToOriginator).toHaveBeenCalledWith('set-global-config', { success: true, error: undefined, requestId: 'test-request-456' }, mockSender);
            expect(mockSettingsService.updateWebServerAuth).toHaveBeenCalledWith(mockResult.updatedConfig, undefined);
            expect(mockMessagingService.sendToAll).toHaveBeenCalledWith('global-config', mockResult.updatedConfig);
        });
        it('should handle set-global-config with undefined payload', async () => {
            const mockResult = { success: true, updatedConfig: { webServerPort: 3000 } };
            mockSettingsService.updateGlobalConfig.mockResolvedValue(mockResult);
            await setConfigHandler(undefined, mockSender);
            expect(mockSettingsService.updateGlobalConfig).toHaveBeenCalledWith(undefined);
            expect(mockMessagingService.sendToOriginator).toHaveBeenCalledWith('set-global-config', { success: true, error: undefined, requestId: undefined }, mockSender);
            expect(mockSettingsService.updateWebServerAuth).toHaveBeenCalledWith(mockResult.updatedConfig, undefined);
            expect(mockMessagingService.sendToAll).toHaveBeenCalledWith('global-config', mockResult.updatedConfig);
        });
        it('should handle set-global-config failure', async () => {
            const payload = { config: { invalidPort: 99999 }, requestId: 'test-request-789' };
            const mockResult = { success: false, error: 'Invalid web server port' };
            mockSettingsService.updateGlobalConfig.mockResolvedValue(mockResult);
            await setConfigHandler(payload, mockSender);
            expect(mockSettingsService.updateGlobalConfig).toHaveBeenCalledWith({ invalidPort: 99999 });
            expect(mockMessagingService.sendToOriginator).toHaveBeenCalledWith('set-global-config', { success: false, error: 'Invalid web server port', requestId: 'test-request-789' }, mockSender);
            expect(mockSettingsService.updateWebServerAuth).not.toHaveBeenCalled();
            expect(mockMessagingService.sendToAll).not.toHaveBeenCalled();
        });
        it('should handle set-global-config error', async () => {
            const payload = { config: { webServerPort: 3001 }, requestId: 'test-request-999' };
            const errorMessage = 'Database connection failed';
            mockSettingsService.updateGlobalConfig.mockRejectedValue(new Error(errorMessage));
            await setConfigHandler(payload, mockSender);
            expect(mockSettingsService.updateGlobalConfig).toHaveBeenCalledWith({ webServerPort: 3001 });
            expect(mockMessagingService.sendToOriginator).toHaveBeenCalledWith('set-global-config', { success: false, error: errorMessage, requestId: 'test-request-999' }, mockSender);
            expect(mockSettingsService.updateWebServerAuth).not.toHaveBeenCalled();
            expect(mockMessagingService.sendToAll).not.toHaveBeenCalled();
        });
        it('should handle set-global-config with non-Error exception', async () => {
            const payload = { config: { webServerPort: 3001 }, requestId: 'test-request-000' };
            mockSettingsService.updateGlobalConfig.mockRejectedValue('String error');
            await setConfigHandler(payload, mockSender);
            expect(mockSettingsService.updateGlobalConfig).toHaveBeenCalledWith({ webServerPort: 3001 });
            expect(mockMessagingService.sendToOriginator).toHaveBeenCalledWith('set-global-config', { success: false, error: 'String error', requestId: 'test-request-000' }, mockSender);
            expect(mockSettingsService.updateWebServerAuth).not.toHaveBeenCalled();
            expect(mockMessagingService.sendToAll).not.toHaveBeenCalled();
        });
    });
});
