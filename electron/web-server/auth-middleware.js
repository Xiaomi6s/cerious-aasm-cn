"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSessionToken = generateSessionToken;
exports.sessionAuth = sessionAuth;
exports.ensureAuthInitialized = ensureAuthInitialized;
exports.createSession = createSession;
exports.destroySession = destroySession;
exports.isAuthenticated = isAuthenticated;
const crypto_1 = __importDefault(require("crypto"));
const session_store_utils_1 = require("../utils/session-store.utils");
const auth_config_1 = require("./auth-config");
// =============================================================================
// CONSTANTS
// =============================================================================
const SESSION_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours
// =============================================================================
// SESSION MANAGEMENT
// =============================================================================
/**
 * Generate a secure session token
 */
function generateSessionToken() {
    return crypto_1.default.randomBytes(32).toString('hex');
}
/**
 * Session-based authentication middleware
 */
function sessionAuth(req, res, next) {
    const authConfig = (0, auth_config_1.getAuthConfig)();
    // Skip auth if not enabled
    if (!authConfig.enabled) {
        return next();
    }
    // Skip auth for login/logout endpoints (remove /api prefix since middleware is already scoped)
    if (req.path === '/login' || req.path === '/logout' || req.path === '/auth-status') {
        return next();
    }
    // Check for session token in cookies
    const sessionToken = req.headers.cookie?.split(';')
        .find(c => c.trim().startsWith('session='))
        ?.split('=')[1];
    if (!sessionToken || !(0, session_store_utils_1.hasSession)(sessionToken)) {
        res.status(401).json({ error: 'Authentication required', requiresLogin: true });
        return;
    }
    // Check session expiry
    const session = (0, session_store_utils_1.getSession)(sessionToken);
    if (!session) {
        res.status(401).json({ error: 'Invalid session', requiresLogin: true });
        return;
    }
    const now = new Date();
    const sessionAge = now.getTime() - session.created.getTime();
    if (sessionAge > SESSION_MAX_AGE) {
        (0, session_store_utils_1.deleteSession)(sessionToken);
        res.status(401).json({ error: 'Session expired', requiresLogin: true });
        return;
    }
    // Valid session
    req.user = { username: session.username };
    next();
}
// =============================================================================
// MIDDLEWARE
// =============================================================================
/**
 * Middleware to ensure auth is initialized
 */
async function ensureAuthInitialized(req, res, next) {
    // Wait for auth to be initialized if it isn't already
    while (!(0, auth_config_1.isAuthInitialized)()) {
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    next();
}
/**
 * Create and set a session for a user
 */
function createSession(res, username) {
    const sessionToken = generateSessionToken();
    (0, session_store_utils_1.setSession)(sessionToken, {
        username,
        created: new Date()
    });
    // Set session cookie (secure for local environment)
    res.cookie('session', sessionToken, {
        httpOnly: true,
        secure: false, // Keep false for local HTTP environment
        sameSite: 'strict', // CSRF protection
        maxAge: SESSION_MAX_AGE
    });
}
/**
 * Destroy a session
 */
function destroySession(req, res) {
    const sessionToken = req.headers.cookie?.split(';')
        .find((c) => c.trim().startsWith('session='))
        ?.split('=')[1];
    if (sessionToken) {
        (0, session_store_utils_1.deleteSession)(sessionToken);
    }
    // Clear cookie by setting it to expire immediately
    res.cookie('session', '', {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        path: '/',
        expires: new Date(0)
    });
}
/**
 * Check if user is authenticated
 */
function isAuthenticated(req) {
    const sessionToken = req.headers.cookie?.split(';')
        .find((c) => c.trim().startsWith('session='))
        ?.split('=')[1];
    return !!(sessionToken && (0, session_store_utils_1.hasSession)(sessionToken));
}
