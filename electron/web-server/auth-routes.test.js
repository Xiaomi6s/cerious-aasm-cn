"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const auth_routes_1 = require("./auth-routes");
const validation_utils_1 = require("../utils/validation.utils");
const auth_config_1 = require("./auth-config");
const auth_middleware_1 = require("./auth-middleware");
const node_mocks_http_1 = __importDefault(require("node-mocks-http"));
// Use jest.mock with factory to override all relevant exports with jest.fn mocks
jest.mock('../utils/validation.utils', () => {
    const actual = jest.requireActual('../utils/validation.utils');
    return {
        ...actual,
        validateAuthInput: jest.fn(() => ({ valid: true })),
        sanitizeString: jest.fn((str) => str),
    };
});
jest.mock('../web-server/auth-config', () => {
    const actual = jest.requireActual('../web-server/auth-config');
    return {
        ...actual,
        getAuthConfig: jest.fn(() => ({ enabled: true, username: 'testuser', passwordHash: 'hashedpassword' })),
        verifyPassword: jest.fn(() => Promise.resolve(true)),
    };
});
jest.mock('../web-server/auth-middleware', () => {
    const actual = jest.requireActual('../web-server/auth-middleware');
    return {
        ...actual,
        ensureAuthInitialized: jest.fn((req, res, next) => next()),
        createSession: jest.fn(),
        destroySession: jest.fn(),
        isAuthenticated: jest.fn(() => false),
    };
});
const validationUtils = require('../utils/validation.utils');
const authConfigModule = require('../web-server/auth-config');
const authMiddlewareModule = require('../web-server/auth-middleware');
const { createRequest, createResponse } = require('node-mocks-http');
jest.mock('express');
const mockExpress = require('express');
describe('auth-routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('loginHandler', () => {
        it('should return 400 if validation fails', async () => {
            validation_utils_1.validateAuthInput.mockReturnValue({ valid: false, error: 'Missing fields' });
            const req = node_mocks_http_1.default.createRequest({ method: 'POST', body: { username: '', password: '' } });
            const res = node_mocks_http_1.default.createResponse();
            await (0, auth_routes_1.loginHandler)(req, res);
            expect(res.statusCode).toBe(400);
            expect(res._getJSONData()).toEqual({ success: false, error: 'Missing fields' });
        });
        it('should return success if auth is disabled', async () => {
            validation_utils_1.validateAuthInput.mockReturnValue({ valid: true });
            auth_config_1.getAuthConfig.mockReturnValue({ enabled: false });
            const req = node_mocks_http_1.default.createRequest({ method: 'POST', body: { username: 'user', password: 'pass' } });
            const res = node_mocks_http_1.default.createResponse();
            await (0, auth_routes_1.loginHandler)(req, res);
            expect(res._getJSONData()).toEqual({ success: true, message: 'Authentication not required' });
        });
        it('should return 500 if config is missing', async () => {
            validation_utils_1.validateAuthInput.mockReturnValue({ valid: true });
            auth_config_1.getAuthConfig.mockReturnValue({ enabled: true });
            const req = node_mocks_http_1.default.createRequest({ method: 'POST', body: { username: 'user', password: 'pass' } });
            const res = node_mocks_http_1.default.createResponse();
            await (0, auth_routes_1.loginHandler)(req, res);
            expect(res.statusCode).toBe(500);
            expect(res._getJSONData()).toEqual({ success: false, error: 'Authentication configuration error' });
        });
        it('should return 401 if credentials are invalid', async () => {
            validation_utils_1.validateAuthInput.mockReturnValue({ valid: true });
            auth_config_1.getAuthConfig.mockReturnValue({ enabled: true, username: 'user', passwordHash: 'hash' });
            auth_config_1.verifyPassword.mockResolvedValue(false);
            const req = node_mocks_http_1.default.createRequest({ method: 'POST', body: { username: 'user', password: 'wrong' } });
            const res = node_mocks_http_1.default.createResponse();
            await (0, auth_routes_1.loginHandler)(req, res);
            expect(res.statusCode).toBe(401);
            expect(res._getJSONData()).toEqual({ success: false, error: 'Invalid credentials' });
        });
        it('should return success and create session if credentials are valid', async () => {
            validation_utils_1.validateAuthInput.mockReturnValue({ valid: true });
            auth_config_1.getAuthConfig.mockReturnValue({ enabled: true, username: 'user', passwordHash: 'hash' });
            auth_config_1.verifyPassword.mockResolvedValue(true);
            const req = node_mocks_http_1.default.createRequest({ method: 'POST', body: { username: 'user', password: 'pass' } });
            const res = node_mocks_http_1.default.createResponse();
            await (0, auth_routes_1.loginHandler)(req, res);
            expect(auth_middleware_1.createSession).toHaveBeenCalledWith(res, 'user');
            expect(res._getJSONData()).toEqual({ success: true, message: 'Login successful' });
        });
    });
});
describe('logoutHandler', () => {
    it('should destroy session and return success', () => {
        const req = node_mocks_http_1.default.createRequest({ method: 'POST' });
        const res = node_mocks_http_1.default.createResponse();
        (0, auth_routes_1.logoutHandler)(req, res);
        expect(auth_middleware_1.destroySession).toHaveBeenCalledWith(req, res);
        expect(res._getJSONData()).toEqual({ success: true, message: 'Logged out successfully' });
    });
});
describe('authStatusHandler', () => {
    it('should return not required if auth is disabled', () => {
        auth_config_1.getAuthConfig.mockReturnValue({ enabled: false });
        const req = node_mocks_http_1.default.createRequest({ method: 'GET' });
        const res = node_mocks_http_1.default.createResponse();
        (0, auth_routes_1.authStatusHandler)(req, res);
        expect(res._getJSONData()).toEqual({
            requiresAuth: false,
            authenticated: true,
            message: 'Authentication not enabled'
        });
    });
    it('should return authenticated status', () => {
        auth_config_1.getAuthConfig.mockReturnValue({ enabled: true });
        auth_middleware_1.isAuthenticated.mockReturnValue(true);
        const req = node_mocks_http_1.default.createRequest({ method: 'GET' });
        const res = node_mocks_http_1.default.createResponse();
        (0, auth_routes_1.authStatusHandler)(req, res);
        expect(res._getJSONData()).toEqual({
            requiresAuth: true,
            authenticated: true,
            message: 'Authenticated'
        });
    });
    it('should return not authenticated status', () => {
        auth_config_1.getAuthConfig.mockReturnValue({ enabled: true });
        auth_middleware_1.isAuthenticated.mockReturnValue(false);
        const req = node_mocks_http_1.default.createRequest({ method: 'GET' });
        const res = node_mocks_http_1.default.createResponse();
        (0, auth_routes_1.authStatusHandler)(req, res);
        expect(res._getJSONData()).toEqual({
            requiresAuth: true,
            authenticated: false,
            message: 'Not authenticated'
        });
    });
});
