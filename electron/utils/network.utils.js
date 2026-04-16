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
exports.isPortInUse = isPortInUse;
const net = __importStar(require("net"));
const http = __importStar(require("http"));
function isPortInUse(port, host = '127.0.0.1') {
    return new Promise((resolve) => {
        // For web server ports, try HTTP request instead of just TCP connection
        // This ensures we're checking if the web server is actually responding
        if (port >= 3000 && port <= 9999) {
            const req = http.request({
                hostname: host,
                port: port,
                method: 'GET',
                path: '/',
                timeout: 2000
            }, (res) => {
                req.destroy();
                resolve(true); // Server is responding
            });
            req.on('error', (err) => {
                req.destroy();
                // If it's a connection refused, the port is not in use
                // If it's any other error (like 401, 404, etc.), the server is running
                resolve(err.code !== 'ECONNREFUSED');
            });
            req.on('timeout', () => {
                req.destroy();
                resolve(false);
            });
            req.end();
        }
        else {
            // For other ports, use original TCP socket method
            const socket = new net.Socket();
            socket.setTimeout(1000);
            socket.once('connect', () => {
                socket.destroy();
                resolve(true);
            });
            socket.once('timeout', () => {
                socket.destroy();
                resolve(false);
            });
            socket.once('error', (err) => {
                socket.destroy();
                resolve(false);
            });
            socket.connect(port, host);
        }
    });
}
