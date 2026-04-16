"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginHandler = loginHandler;
exports.logoutHandler = logoutHandler;
exports.authStatusHandler = authStatusHandler;
exports.setupAuthRoutes = setupAuthRoutes;
const validation_utils_1 = require("../utils/validation.utils");
const auth_config_1 = require("./auth-config");
const auth_middleware_1 = require("./auth-middleware");
/**
 * Setup authentication routes on the Express app
 */
// Pure handler for login
async function loginHandler(req, res) {
    const { username, password } = req.body;
    const validation = (0, validation_utils_1.validateAuthInput)(username, password);
    if (!validation.valid) {
        res.status(400).json({ success: false, error: validation.error });
        return;
    }
    const authConfig = (0, auth_config_1.getAuthConfig)();
    if (!authConfig.enabled) {
        res.json({ success: true, message: 'Authentication not required' });
        return;
    }
    if (!authConfig.username || !authConfig.passwordHash) {
        console.error('[Auth] Authentication is enabled but username or password hash is missing');
        res.status(500).json({ success: false, error: 'Authentication configuration error' });
        return;
    }
    const cleanUsername = (0, validation_utils_1.sanitizeString)(username);
    const cleanPassword = (0, validation_utils_1.sanitizeString)(password);
    if (cleanUsername === authConfig.username && await (0, auth_config_1.verifyPassword)(cleanPassword, authConfig.passwordHash)) {
        (0, auth_middleware_1.createSession)(res, cleanUsername);
        res.json({ success: true, message: 'Login successful' });
        return;
    }
    res.status(401).json({ success: false, error: 'Invalid credentials' });
}
// Pure handler for logout
function logoutHandler(req, res) {
    (0, auth_middleware_1.destroySession)(req, res);
    res.json({ success: true, message: 'Logged out successfully' });
}
// Pure handler for auth status
function authStatusHandler(req, res) {
    const authConfig = (0, auth_config_1.getAuthConfig)();
    if (!authConfig.enabled) {
        res.json({
            requiresAuth: false,
            authenticated: true,
            message: 'Authentication not enabled'
        });
        return;
    }
    const authenticated = (0, auth_middleware_1.isAuthenticated)(req);
    res.json({
        requiresAuth: true,
        authenticated,
        message: authenticated ? 'Authenticated' : 'Not authenticated'
    });
}
function setupAuthRoutes(app) {
    app.post('/api/login', auth_middleware_1.ensureAuthInitialized, loginHandler);
    app.post('/api/logout', auth_middleware_1.ensureAuthInitialized, logoutHandler);
    app.get('/api/auth-status', auth_middleware_1.ensureAuthInitialized, authStatusHandler);
}
