"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeSecureSessionStore = initializeSecureSessionStore;
exports.setSession = setSession;
exports.getSession = getSession;
exports.deleteSession = deleteSession;
exports.hasSession = hasSession;
exports.resetSessionStore = resetSessionStore;
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const platform_utils_1 = require("./platform.utils");
// Module-level state
let sessions = new Map();
let sessionFile;
let encryptionKey;
let initialized = false;
let cleanupInterval = null;
/**
 * Initialize the secure session store
 * Must be called before using other functions
 */
function initializeSecureSessionStore() {
    if (initialized)
        return;
    // Use the installation directory for session storage. If older files exist in
    // the app folder (process.cwd()/data), migrate them on startup.
    const installDataDir = path_1.default.join((0, platform_utils_1.getDefaultInstallDir)(), 'data');
    const oldDataDir = path_1.default.join(process.cwd(), 'data');
    const oldSessionFile = path_1.default.join(oldDataDir, 'sessions.enc');
    const oldKeyFile = path_1.default.join(oldDataDir, 'session.key');
    const newSessionFile = path_1.default.join(installDataDir, 'sessions.enc');
    const newKeyFile = path_1.default.join(installDataDir, 'session.key');
    try {
        // Ensure install data dir exists
        if (!fs_1.default.existsSync(installDataDir)) {
            fs_1.default.mkdirSync(installDataDir, { recursive: true });
        }
        // Migrate existing files from old location if present and not already migrated
        if (fs_1.default.existsSync(oldSessionFile) && !fs_1.default.existsSync(newSessionFile)) {
            try {
                fs_1.default.renameSync(oldSessionFile, newSessionFile);
            }
            catch (e) {
                console.error('[Session] Failed to migrate sessions.enc:', e);
            }
        }
        if (fs_1.default.existsSync(oldKeyFile) && !fs_1.default.existsSync(newKeyFile)) {
            try {
                fs_1.default.renameSync(oldKeyFile, newKeyFile);
            }
            catch (e) {
                console.error('[Session] Failed to migrate session.key:', e);
            }
        }
    }
    catch (e) {
        console.error('[Session] Migration check failed:', e);
    }
    // Set the active file locations to the install directory
    sessionFile = newSessionFile;
    encryptionKey = getOrCreateEncryptionKey();
    loadSessions();
    // Clean up expired sessions every hour (only start once)
    if (!cleanupInterval) {
        cleanupInterval = setInterval(() => cleanupExpiredSessions(), 60 * 60 * 1000);
    }
    initialized = true;
}
/**
 * Get or create encryption key
 */
function getOrCreateEncryptionKey() {
    const keyFile = path_1.default.join((0, platform_utils_1.getDefaultInstallDir)(), 'data', 'session.key');
    // Ensure data directory exists
    const dataDir = path_1.default.dirname(keyFile);
    if (!fs_1.default.existsSync(dataDir)) {
        fs_1.default.mkdirSync(dataDir, { recursive: true });
    }
    if (fs_1.default.existsSync(keyFile)) {
        return fs_1.default.readFileSync(keyFile, 'utf8');
    }
    else {
        const key = crypto_1.default.randomBytes(32).toString('hex');
        try {
            fs_1.default.writeFileSync(keyFile, key, { mode: 0o600 }); // Restricted permissions
        }
        catch (e) {
            // On some platforms, mode may be ignored; still attempt to write
            fs_1.default.writeFileSync(keyFile, key);
        }
        return key;
    }
}
/**
 * Encrypt data
 */
function encrypt(data) {
    const iv = crypto_1.default.randomBytes(16);
    const cipher = crypto_1.default.createCipheriv('aes-256-gcm', Buffer.from(encryptionKey, 'hex'), iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}
/**
 * Decrypt data
 */
function decrypt(encryptedData) {
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    const decipher = crypto_1.default.createDecipheriv('aes-256-gcm', Buffer.from(encryptionKey, 'hex'), iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
/**
 * Load sessions from file
 */
function loadSessions() {
    try {
        if (fs_1.default.existsSync(sessionFile)) {
            const encryptedData = fs_1.default.readFileSync(sessionFile, 'utf8');
            if (encryptedData.trim()) {
                const decryptedData = decrypt(encryptedData);
                const sessionArray = JSON.parse(decryptedData);
                // Convert back to Map and validate dates
                for (const [token, data] of sessionArray) {
                    sessions.set(token, {
                        username: data.username,
                        created: new Date(data.created)
                    });
                }
            }
        }
    }
    catch (error) {
        console.error('[Session] Failed to load sessions:', error);
        sessions.clear();
    }
}
/**
 * Save sessions to file
 */
function saveSessions() {
    try {
        // Ensure data directory exists
        const dataDir = path_1.default.dirname(sessionFile);
        if (!fs_1.default.existsSync(dataDir)) {
            fs_1.default.mkdirSync(dataDir, { recursive: true });
        }
        const sessionArray = Array.from(sessions.entries());
        const encryptedData = encrypt(JSON.stringify(sessionArray));
        fs_1.default.writeFileSync(sessionFile, encryptedData, { mode: 0o600 });
    }
    catch (error) {
        console.error('[Session] Failed to save sessions:', error);
    }
}
/**
 * Clean up expired sessions
 */
function cleanupExpiredSessions() {
    const now = new Date();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    let cleaned = 0;
    for (const [token, session] of sessions.entries()) {
        const sessionAge = now.getTime() - session.created.getTime();
        if (sessionAge > maxAge) {
            sessions.delete(token);
            cleaned++;
        }
    }
    if (cleaned > 0) {
        saveSessions();
    }
}
/**
 * Set a session
 * @param token - Session token
 * @param data - Session data
 */
function setSession(token, data) {
    if (!initialized)
        initializeSecureSessionStore();
    sessions.set(token, data);
    saveSessions();
}
/**
 * Get a session
 * @param token - Session token
 * @returns Session data or undefined if not found
 */
function getSession(token) {
    if (!initialized)
        initializeSecureSessionStore();
    return sessions.get(token);
}
/**
 * Delete a session
 * @param token - Session token
 * @returns True if session was deleted
 */
function deleteSession(token) {
    if (!initialized)
        initializeSecureSessionStore();
    const result = sessions.delete(token);
    if (result) {
        saveSessions();
    }
    return result;
}
/**
 * Check if a session exists
 * @param token - Session token
 * @returns True if session exists
 */
function hasSession(token) {
    if (!initialized)
        initializeSecureSessionStore();
    return sessions.has(token);
}
/**
 * Reset the session store (for testing purposes)
 */
function resetSessionStore() {
    sessions.clear();
    initialized = false;
    sessionFile = '';
    encryptionKey = '';
    // Clear the cleanup interval
    if (cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
    }
}
