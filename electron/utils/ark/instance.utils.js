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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInstancesBaseDir = getInstancesBaseDir;
exports.getDefaultInstancesBaseDir = getDefaultInstancesBaseDir;
exports.getAllInstances = getAllInstances;
exports.getInstance = getInstance;
exports.saveInstance = saveInstance;
exports.deleteInstance = deleteInstance;
exports.loadInstanceConfig = loadInstanceConfig;
exports.getInstanceSaveDir = getInstanceSaveDir;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const platform_utils_1 = require("../platform.utils");
let uuidv4 = null;
// Fallback UUID generator for when the uuid package fails
function generateFallbackUuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
async function getUuidV4() {
    if (!uuidv4) {
        try {
            // Try multiple import methods for better packaged app compatibility
            let mod;
            try {
                mod = await import('uuid');
            }
            catch (error) {
                mod = require('uuid');
            }
            uuidv4 = mod.v4 || mod.default?.v4 || generateFallbackUuid;
        }
        catch (error) {
            // If all imports fail, use fallback
            uuidv4 = generateFallbackUuid;
        }
    }
    return uuidv4;
}
// Validate instance ID to prevent directory traversal and ensure proper format
function validateInstanceId(id) {
    if (!id || typeof id !== 'string') {
        return false;
    }
    // Allow only alphanumeric characters, hyphens, and underscores
    // This prevents directory traversal attempts like "../" or "../../"
    const validIdPattern = /^[a-zA-Z0-9_-]+$/;
    if (!validIdPattern.test(id)) {
        return false;
    }
    // Additional length check
    if (id.length > 50) {
        return false;
    }
    return true;
}
function getInstancesBaseDir() {
    // Use config if available, otherwise default
    try {
        const { loadGlobalConfig } = require('../global-config.utils');
        const config = loadGlobalConfig();
        if (config.serverDataDir) {
            return path.join(config.serverDataDir, 'AASMServer', 'ShooterGame', 'Saved', 'Servers');
        }
    }
    catch (e) {
        // Ignore error loading config (circular dependency or file not found), fall back to default
    }
    const installDir = (0, platform_utils_1.getDefaultInstallDir)();
    if (!installDir) {
        throw new Error('Could not determine install directory');
    }
    return path.join(installDir, 'AASMServer', 'ShooterGame', 'Saved', 'Servers');
}
// For compatibility with previous code, alias getDefaultInstancesBaseDir
function getDefaultInstancesBaseDir() {
    return getInstancesBaseDir();
}
const getInstanceConfigPath = (id) => {
    if (!validateInstanceId(id)) {
        throw new Error(`Invalid instance ID format: ${id}`);
    }
    return path.join(getInstancesBaseDir(), id, 'config.json');
};
async function getAllInstances() {
    const baseDir = getInstancesBaseDir();
    let justCreated = false;
    if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
        justCreated = true;
    }
    let instances = fs.readdirSync(baseDir)
        .filter(id => fs.existsSync(getInstanceConfigPath(id)))
        .map(id => {
        try {
            const config = JSON.parse(fs.readFileSync(getInstanceConfigPath(id), 'utf8'));
            return { id, ...config };
        }
        catch {
            return null;
        }
    })
        .filter(Boolean);
    // Sort by sortOrder so Start All / other bulk operations respect the user-defined order
    instances = instances.sort((a, b) => (a.sortOrder ?? Infinity) - (b.sortOrder ?? Infinity));
    // No default creation here; frontend is responsible for creating a default if needed
    return instances;
}
function getInstance(id) {
    if (!id || typeof id !== 'string') {
        console.warn('[server-instance-utils] getInstance called with invalid id:', id);
        return null;
    }
    const configPath = getInstanceConfigPath(id);
    if (!fs.existsSync(configPath))
        return null;
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}
async function saveInstance(instance) {
    // Check for duplicate name (case-insensitive)
    const all = await getAllInstances();
    const name = (instance.name || '').trim().toLowerCase();
    if (all.some(inst => inst.name && inst.name.trim().toLowerCase() === name && inst.id !== instance.id)) {
        // Duplicate name found
        return { error: 'A server with this name already exists.' };
    }
    const uuidGenerator = await getUuidV4();
    const id = instance.id || (uuidGenerator ? uuidGenerator() : generateFallbackUuid());
    const dir = path.join(getInstancesBaseDir(), id);
    fs.mkdirSync(dir, { recursive: true });
    // Always include the id in the config.json
    const instanceWithId = { ...instance, id };
    fs.writeFileSync(getInstanceConfigPath(id), JSON.stringify(instanceWithId, null, 2));
    return { ...instanceWithId };
}
function deleteInstance(id) {
    const dir = path.join(getInstancesBaseDir(), id);
    if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
        return true;
    }
    return false;
}
/**
 * Sets up instance directories and loads configuration
 */
function loadInstanceConfig(instanceId) {
    const baseDir = getDefaultInstancesBaseDir?.() || getInstancesBaseDir?.();
    if (!baseDir) {
        throw new Error('Instance folder missing');
    }
    const instanceDir = path.join(baseDir, instanceId);
    // Load instance config
    let config = {};
    const configPath = path.join(instanceDir, 'config.json');
    try {
        if (fs.existsSync(configPath)) {
            config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
    }
    catch (e) {
        console.error('[ark-server-utils] Failed to load instance config:', e);
    }
    return { instanceDir, config };
}
function getInstanceSaveDir(instanceDir) {
    return path.join(instanceDir, 'SavedArks');
}
// Inline exports declared above
