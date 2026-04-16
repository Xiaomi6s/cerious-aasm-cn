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
exports.extractProcKilled = exports.procKilled = exports.currentExtractProc = exports.currentProc = void 0;
exports.resetInstallerState = resetInstallerState;
exports.isInstallLocked = isInstallLocked;
exports.createInstallLock = createInstallLock;
exports.removeInstallLock = removeInstallLock;
exports.forceClearInstallLock = forceClearInstallLock;
exports.cancelInstaller = cancelInstaller;
exports.runInstaller = runInstaller;
const pty = __importStar(require("node-pty"));
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const platform_utils_1 = require("./platform.utils");
exports.currentProc = null;
exports.currentExtractProc = null;
exports.procKilled = false;
exports.extractProcKilled = false;
// Reset function for testing
function resetInstallerState() {
    exports.currentProc = null;
    exports.currentExtractProc = null;
    exports.procKilled = false;
    exports.extractProcKilled = false;
}
// File-based lock for cross-process install prevention (use installDir)
const LOCK_FILE = path.join((0, platform_utils_1.getDefaultInstallDir)(), 'install.lock');
function isInstallLocked() {
    try {
        return fs.existsSync(LOCK_FILE);
    }
    catch {
        return false;
    }
}
function createInstallLock() {
    try {
        fs.ensureFileSync(LOCK_FILE);
        fs.writeFileSync(LOCK_FILE, String(Date.now()));
    }
    catch { }
}
function removeInstallLock() {
    try {
        if (fs.existsSync(LOCK_FILE))
            fs.removeSync(LOCK_FILE);
    }
    catch { }
}
// Emergency: forcibly clear the lock (e.g., via admin UI)
function forceClearInstallLock() {
    removeInstallLock();
}
function cancelInstaller() {
    if (exports.currentProc) {
        try {
            exports.procKilled = true;
            exports.currentProc.kill();
        }
        catch (e) {
            // ignore
        }
        exports.currentProc = null;
    }
    if (exports.currentExtractProc) {
        try {
            exports.extractProcKilled = true;
            // Remove all listeners to prevent further event handling after kill
            if (typeof exports.currentExtractProc.removeAllListeners === 'function') {
                exports.currentExtractProc.removeAllListeners();
            }
            exports.currentExtractProc.kill();
        }
        catch (e) {
            // ignore
        }
        exports.currentExtractProc = null;
    }
}
function runInstaller(options, onProgress, onDone) {
    let output = '';
    let lastPercent = 0;
    const phaseSplit = options.phaseSplit ?? 50;
    onProgress({ percent: 0, step: 'download', message: 'Checking Ark Server...' });
    let proc;
    try {
        proc = pty.spawn(options.command, options.args, { cwd: options.cwd });
    }
    catch (spawnErr) {
        const msg = spawnErr?.message || String(spawnErr);
        onProgress({ percent: 0, step: 'error', message: `Failed to start process: ${msg}` });
        return onDone(new Error(`Failed to start process "${options.command}": ${msg}`));
    }
    exports.procKilled = false;
    exports.currentProc = proc;
    proc.onData((data) => {
        if (exports.procKilled || !exports.currentProc)
            return;
        try {
            output += data;
            let percent = lastPercent;
            if (options.parseProgress) {
                const parsed = options.parseProgress(data, lastPercent, options.estimatedTotal);
                if (parsed !== null && parsed > lastPercent) {
                    percent = parsed;
                    lastPercent = percent;
                    onProgress({ percent, step: 'download', message: `Downloading... (${percent}%)` });
                }
            }
        }
        catch (err) {
            // ignore errors after kill
        }
    });
    proc.onExit((result) => {
        if (exports.procKilled) {
            exports.currentProc = null;
            return;
        }
        exports.currentProc = null;
        const steamcmdSuccess = output.includes('Success! App') && output.includes('fully installed');
        if (result.exitCode !== 0 && !steamcmdSuccess) {
            onProgress({ percent: lastPercent, step: 'error', message: 'Failed to download.' });
            return onDone(new Error('Failed to download.'));
        }
        if (options.extractPhase) {
            const extractOpts = options.extractPhase();
            if (extractOpts) {
                let extractPercent = phaseSplit;
                onProgress({ percent: extractPercent, step: 'extract', message: 'Download complete. Extracting...' });
                const extractProc = pty.spawn(extractOpts.command, extractOpts.args, { cwd: extractOpts.cwd });
                exports.extractProcKilled = false;
                exports.currentExtractProc = extractProc;
                extractProc.onData((data) => {
                    if (exports.extractProcKilled || !exports.currentExtractProc)
                        return;
                    try {
                        output += data;
                        if (extractPercent < 99) {
                            extractPercent += 5;
                            if (extractPercent > 99)
                                extractPercent = 99;
                            onProgress({ percent: extractPercent, step: 'extract', message: 'Extracting...' });
                        }
                    }
                    catch (err) {
                        // ignore errors after kill
                    }
                });
                extractProc.onExit((res) => {
                    if (exports.extractProcKilled) {
                        exports.currentExtractProc = null;
                        return;
                    }
                    exports.currentExtractProc = null;
                    if (res.exitCode !== 0) {
                        onProgress({ percent: extractPercent, step: 'error', message: 'Failed to extract.' });
                        return onDone(new Error('Failed to extract.'));
                    }
                    onProgress({ percent: 100, step: 'complete', message: 'Extraction complete.' });
                    onDone(null, output);
                });
            }
        }
        else {
            onProgress({ percent: 100, step: 'complete', message: 'Download complete.' });
            onDone(null, output);
        }
    });
}
// Inline exports above; no bottom export list required
