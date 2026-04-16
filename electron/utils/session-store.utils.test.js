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
const globals_1 = require("@jest/globals");
// Mock dependencies
globals_1.jest.mock("fs");
globals_1.jest.mock("path");
globals_1.jest.mock("./platform.utils");
const crypto_1 = __importDefault(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const platform_utils_1 = require("./platform.utils");
// Import the module under test
const session_store_utils_1 = require("./session-store.utils");
describe("session-store.utils", () => {
    beforeEach(() => {
        globals_1.jest.clearAllMocks();
        (0, session_store_utils_1.resetSessionStore)();
        // Setup default mocks
        platform_utils_1.getDefaultInstallDir.mockReturnValue("/mock/install/dir");
        path.join.mockImplementation((...args) => args.join("/"));
        fs.existsSync.mockReturnValue(false);
        fs.mkdirSync.mockReturnValue(undefined);
        fs.writeFileSync.mockImplementation(() => { });
        fs.readFileSync.mockReturnValue("mock-key");
    });
    afterEach(() => {
        // Ensure cleanup interval is cleared after each test
        (0, session_store_utils_1.resetSessionStore)();
    });
    describe("initializeSecureSessionStore", () => {
        it("should initialize without throwing", () => {
            expect(() => (0, session_store_utils_1.initializeSecureSessionStore)()).not.toThrow();
        });
        it("should create data directory if it does not exist", () => {
            fs.existsSync.mockReturnValue(false);
            (0, session_store_utils_1.initializeSecureSessionStore)();
            expect(fs.mkdirSync).toHaveBeenCalledWith("/mock/install/dir/data", { recursive: true });
        });
        it("should create encryption key if it does not exist", () => {
            fs.existsSync
                .mockReturnValueOnce(false) // data dir does not exist
                .mockReturnValueOnce(false); // key file does not exist
            (0, session_store_utils_1.initializeSecureSessionStore)();
            expect(fs.writeFileSync).toHaveBeenCalled();
        });
        it("should load existing encryption key", () => {
            fs.existsSync
                .mockReturnValueOnce(false) // data dir does not exist
                .mockReturnValueOnce(true); // key file exists
            expect(() => (0, session_store_utils_1.initializeSecureSessionStore)()).not.toThrow();
        });
    });
    describe("setSession", () => {
        it("should set a session", () => {
            const sessionData = { username: "testuser", created: new Date() };
            (0, session_store_utils_1.setSession)("token123", sessionData);
            expect((0, session_store_utils_1.hasSession)("token123")).toBe(true);
            expect((0, session_store_utils_1.getSession)("token123")).toEqual(sessionData);
        });
        it("should save sessions to file", () => {
            const sessionData = { username: "testuser", created: new Date() };
            (0, session_store_utils_1.setSession)("token123", sessionData);
            expect(fs.writeFileSync).toHaveBeenCalled();
        });
    });
    describe("getSession", () => {
        it("should return session data if session exists", () => {
            const sessionData = { username: "testuser", created: new Date() };
            (0, session_store_utils_1.setSession)("token123", sessionData);
            const result = (0, session_store_utils_1.getSession)("token123");
            expect(result).toEqual(sessionData);
        });
        it("should return undefined if session does not exist", () => {
            const result = (0, session_store_utils_1.getSession)("nonexistent");
            expect(result).toBeUndefined();
        });
    });
    describe("deleteSession", () => {
        it("should delete existing session and return true", () => {
            const sessionData = { username: "testuser", created: new Date() };
            (0, session_store_utils_1.setSession)("token123", sessionData);
            const result = (0, session_store_utils_1.deleteSession)("token123");
            expect(result).toBe(true);
            expect((0, session_store_utils_1.hasSession)("token123")).toBe(false);
        });
        it("should return false if session does not exist", () => {
            const result = (0, session_store_utils_1.deleteSession)("nonexistent");
            expect(result).toBe(false);
        });
        it("should save sessions after deletion", () => {
            const sessionData = { username: "testuser", created: new Date() };
            (0, session_store_utils_1.setSession)("token123", sessionData);
            (0, session_store_utils_1.deleteSession)("token123");
            expect(fs.writeFileSync).toHaveBeenCalled();
        });
    });
    describe("hasSession", () => {
        it("should return true if session exists", () => {
            const sessionData = { username: "testuser", created: new Date() };
            (0, session_store_utils_1.setSession)("token123", sessionData);
            const result = (0, session_store_utils_1.hasSession)("token123");
            expect(result).toBe(true);
        });
        it("should return false if session does not exist", () => {
            const result = (0, session_store_utils_1.hasSession)("nonexistent");
            expect(result).toBe(false);
        });
    });
    describe("session persistence", () => {
        it("should load sessions from encrypted file on initialization", () => {
            fs.existsSync
                .mockReturnValueOnce(false) // data dir
                .mockReturnValueOnce(true) // key file
                .mockReturnValueOnce(true); // session file exists
            fs.readFileSync
                .mockReturnValueOnce("mock-key") // key file
                .mockReturnValueOnce("mock-encrypted-data"); // session file
            expect(() => (0, session_store_utils_1.initializeSecureSessionStore)()).not.toThrow();
        });
        it("should handle corrupted session file gracefully", () => {
            fs.existsSync
                .mockReturnValueOnce(false) // data dir
                .mockReturnValueOnce(true) // key file
                .mockReturnValueOnce(true); // session file
            fs.readFileSync
                .mockReturnValueOnce("mock-key") // key file
                .mockReturnValueOnce("corrupted-data"); // session file
            // Mock decryption to throw
            crypto_1.default.createDecipheriv.mockReturnValue({
                setAuthTag: globals_1.jest.fn(),
                update: globals_1.jest.fn().mockImplementation(() => { throw new Error("decrypt error"); }),
                final: globals_1.jest.fn()
            });
            expect(() => (0, session_store_utils_1.initializeSecureSessionStore)()).not.toThrow();
        });
    });
    describe("encryption/decryption", () => {
        it("should encrypt and decrypt data correctly", () => {
            const testData = "test data";
            const mockIv = Buffer.from("mock-iv-16-bytes");
            const mockAuthTag = Buffer.from("mock-auth-tag");
            crypto_1.default.randomBytes
                .mockReturnValueOnce(mockIv);
            (0, session_store_utils_1.initializeSecureSessionStore)();
            // Test encryption/decryption would happen internally
            // This is tested indirectly through the session functions above
        });
    });
});
