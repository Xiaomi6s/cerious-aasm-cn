"use strict";
/**
 * Application Logger
 *
 * Wraps electron-log to provide:
 *   - Timestamped, levelled log lines in the console
 *   - Persistent log file in {userData}/logs/cerious-aasm.log  (10 MB, then rotates)
 *   - Global console.* override so every existing call site is automatically captured
 *
 * Import this module ONCE, as early as possible in main.ts, before any other imports.
 */
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
exports.getLogFilePath = getLogFilePath;
const main_1 = __importDefault(require("electron-log/main"));
const electron_1 = require("electron");
const path = __importStar(require("path"));
// ── File transport ──────────────────────────────────────────────────────────────
main_1.default.transports.file.level = 'debug';
main_1.default.transports.file.maxSize = 10 * 1024 * 1024; // 10 MB → rotate
main_1.default.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}]{scope} {text}';
// Resolved lazily so app.getPath() is available (called on first write, after app ready)
main_1.default.transports.file.resolvePathFn = () => path.join(electron_1.app.getPath('userData'), 'logs', 'cerious-aasm.log');
// ── Console transport ───────────────────────────────────────────────────────────
main_1.default.transports.console.level = process.env['NODE_ENV'] === 'development' ? 'debug' : 'info';
main_1.default.transports.console.format = '[{h}:{i}:{s}.{ms}] [{level}]{scope} {text}';
// ── IPC bridge (enables renderer / web-server process logs to route here) ──────
main_1.default.initialize();
// ── Override global console.* ───────────────────────────────────────────────────
// All existing console.log / .warn / .error calls throughout the codebase
// automatically route through electron-log and are written to the log file.
console.log = main_1.default.log.bind(main_1.default);
console.info = main_1.default.info.bind(main_1.default);
console.warn = main_1.default.warn.bind(main_1.default);
console.error = main_1.default.error.bind(main_1.default);
console.debug = main_1.default.debug.bind(main_1.default);
/** Absolute path to the active log file (available after app ready). */
function getLogFilePath() {
    return main_1.default.transports.file.getFile().path;
}
exports.default = main_1.default;
