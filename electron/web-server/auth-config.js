"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadAuthConfig = loadAuthConfig;
exports.saveAuthConfig = saveAuthConfig;
exports.migrateAuthConfig = migrateAuthConfig;
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
exports.updateAuthConfig = updateAuthConfig;
exports.getAuthConfig = getAuthConfig;
exports.isAuthInitialized = isAuthInitialized;
exports.setAuthInitialized = setAuthInitialized;
exports.initializeAuthFromEnv = initializeAuthFromEnv;
exports.initializeAuth = initializeAuth;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const bcrypt = __importStar(require("bcryptjs"));
const platform_utils_1 = require("../utils/platform.utils");
// =============================================================================
// CONSTANTS & CONFIGURATION
// =============================================================================
const SALT_ROUNDS = 12;
// Global auth configuration state
let authConfig = {
    enabled: false,
    username: '',
    passwordHash: ''
};
// Auth config persistence - store config in the installation directory's data folder
const authConfigFile = path_1.default.join((0, platform_utils_1.getDefaultInstallDir)(), 'data', 'auth-config.json');
// Track initialization state
let authInitialized = false;
// =============================================================================
// AUTHENTICATION CONFIGURATION MANAGEMENT
// =============================================================================
/**
 * Load authentication configuration from disk
 */
function loadAuthConfig() {
    try {
        if (fs_1.default.existsSync(authConfigFile)) {
            const data = fs_1.default.readFileSync(authConfigFile, 'utf-8');
            const savedConfig = JSON.parse(data);
            authConfig = { ...authConfig, ...savedConfig };
        }
    }
    catch (error) {
        console.error('[Auth] Failed to load saved auth config:', error);
    }
}
/**
 * Save authentication configuration to disk
 */
function saveAuthConfig() {
    try {
        // Ensure data directory exists
        const dataDir = path_1.default.dirname(authConfigFile);
        if (!fs_1.default.existsSync(dataDir)) {
            fs_1.default.mkdirSync(dataDir, { recursive: true });
        }
        fs_1.default.writeFileSync(authConfigFile, JSON.stringify(authConfig, null, 2), { mode: 0o600 });
    }
    catch (error) {
        console.error('[Auth] Failed to save auth config:', error);
    }
}
/**
 * Migrate old auth config from app directory to install directory
 */
function migrateAuthConfig() {
    try {
        const oldAuthFile = path_1.default.join(process.cwd(), 'data', 'auth-config.json');
        const newAuthDir = path_1.default.dirname(authConfigFile);
        if (!fs_1.default.existsSync(newAuthDir)) {
            fs_1.default.mkdirSync(newAuthDir, { recursive: true });
        }
        if (fs_1.default.existsSync(oldAuthFile) && !fs_1.default.existsSync(authConfigFile)) {
            try {
                fs_1.default.renameSync(oldAuthFile, authConfigFile);
            }
            catch (e) {
                console.error('[Auth] Failed to migrate auth-config.json:', e);
            }
        }
    }
    catch (e) {
        console.error('[Auth] Auth config migration check failed:', e);
    }
}
// =============================================================================
// PASSWORD SECURITY
// =============================================================================
/**
 * Hash a password using bcrypt
 */
async function hashPassword(password) {
    if (!password || typeof password !== 'string') {
        throw new Error('Password must be a non-empty string');
    }
    return await bcrypt.hash(password, SALT_ROUNDS);
}
/**
 * Verify a password against a hash
 */
async function verifyPassword(password, hash) {
    if (!password || typeof password !== 'string') {
        return false;
    }
    if (!hash || typeof hash !== 'string') {
        return false;
    }
    try {
        return await bcrypt.compare(password, hash);
    }
    catch (error) {
        console.error('[Auth] Password verification error:', error);
        return false;
    }
}
// =============================================================================
// AUTHENTICATION CONFIGURATION
// =============================================================================
/**
 * Update authentication configuration
 */
function updateAuthConfig(config) {
    // Validate the configuration
    if (config.enabled) {
        if (!config.username || typeof config.username !== 'string') {
            console.error('[Auth] Invalid username in auth config');
            return;
        }
        if (!config.passwordHash || typeof config.passwordHash !== 'string') {
            console.error('[Auth] Invalid password hash in auth config');
            return;
        }
    }
    authConfig = { ...config };
    saveAuthConfig();
}
/**
 * Get current authentication configuration
 */
function getAuthConfig() {
    return { ...authConfig };
}
/**
 * Check if authentication is initialized
 */
function isAuthInitialized() {
    return authInitialized;
}
/**
 * Set authentication initialized state
 */
function setAuthInitialized(initialized) {
    authInitialized = initialized;
}
/**
 * Initialize authentication from environment variables (for headless mode)
 */
async function initializeAuthFromEnv() {
    // First, load any saved configuration
    loadAuthConfig();
    const authEnabled = process.env.AUTH_ENABLED === 'true';
    const authUsername = process.env.AUTH_USERNAME || 'admin';
    const authPassword = process.env.AUTH_PASSWORD || '';
    // Only override config if environment variables are explicitly set
    if (authEnabled && authPassword) {
        authConfig = {
            enabled: true,
            username: authUsername,
            passwordHash: await hashPassword(authPassword)
        };
        saveAuthConfig(); // Save the new config
    }
    else if (authEnabled && !authPassword) {
        console.error('[Auth] ERROR: AUTH_ENABLED is true but AUTH_PASSWORD is not set');
    }
}
/**
 * Initialize authentication system
 */
async function initializeAuth() {
    try {
        await initializeAuthFromEnv();
        authInitialized = true;
    }
    catch (error) {
        console.error('[Auth] Failed to initialize authentication:', error);
        authInitialized = true; // Set to true anyway to allow startup, but auth will be disabled
    }
}
// Initialize migration on startup
migrateAuthConfig();
