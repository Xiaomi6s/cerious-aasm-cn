"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.messagingService = exports.MessagingService = void 0;
const events_1 = require("events");
const ws_1 = __importDefault(require("ws"));
const crypto_1 = require("crypto");
// Use CommonJS require for WebSocketServer to avoid TS type import issues
const WebSocketServer = require('ws').Server;
let ipcMain;
let BrowserWindow;
// Check if we're in the main Electron process (not a forked child process)
const isMainElectronProcess = !!(process && process.versions && process.versions.electron && !process.env.ELECTRON_RUN_AS_NODE);
if (isMainElectronProcess) {
    try {
        // Note: Using require() for conditional loading in different process contexts
        ({ ipcMain, BrowserWindow } = require('electron'));
    }
    catch (error) {
        console.warn('[MessagingService] Failed to import electron:', error);
    }
}
class MessagingService extends events_1.EventEmitter {
    // Public getters for handler access
    getWebContentsList() {
        return this.webContentsList;
    }
    getWsServer() {
        return this.wsServer;
    }
    constructor() {
        super();
        this.wsServer = null;
        this.webContentsList = new Set();
        this.apiProcess = null;
    }
    /**
     * Set the child process used for web client broadcasts.
     * @param apiProcess - The child process running the API server
     */
    setApiProcess(apiProcess) {
        this.apiProcess = apiProcess;
    }
    /**
     * Emit an event to all listeners.
     * @param event - The event name
     * @param args - The event arguments
     * @returns True if the event had listeners, false otherwise
     */
    emit(event, ...args) {
        return super.emit(event, ...args);
    }
    /**
     * Add a webContents instance for IPC messaging.
     * @param webContents - The webContents to add for IPC messaging
     */
    addWebContents(webContents) {
        this.webContentsList.add(webContents);
        // Remove when destroyed
        webContents.on('destroyed', () => {
            this.webContentsList.delete(webContents);
        });
    }
    /**
     * Attach a WebSocket server to the HTTP server.
     * @param httpServer - The HTTP server to attach the WebSocket server to
     */
    attachWebSocketServer(httpServer) {
        this.wsServer = new WebSocketServer({ server: httpServer, path: '/ws' });
        this.wsServer.on('connection', (ws) => {
            ws._cid = (0, crypto_1.randomUUID)(); // assign a unique client id
            ws.send(JSON.stringify({ channel: 'welcome', cid: ws._cid }));
            ws.on('message', (data) => {
                try {
                    const { channel, payload } = JSON.parse(data.toString());
                    // Proxy all messages to Electron main process via IPC
                    if (typeof process !== 'undefined' && typeof process.send === 'function') {
                        process.send({ type: 'messaging-event', channel, payload, cid: ws._cid });
                    }
                    else {
                        // Fallback: handle locally (for main process or test)
                        this.handleMessage(channel, payload, ws).then((response) => {
                            ws.send(JSON.stringify({ channel, response }));
                        });
                    }
                }
                catch (err) {
                    // Ignore JSON parse errors
                }
            });
            ws.on('close', () => { });
            ws.on('error', (err) => { });
        });
    }
    /**
     * Handle incoming messages from clients.
     * @param channel - The channel the message was sent on
     * @param payload - The message payload
     * @param sender - The sender of the message
     * @returns A promise resolving to the response
     */
    async handleMessage(channel, payload, sender) {
        // Emit for listeners in main process with sender context
        this.emit(channel, payload, sender);
        // Optionally, handle and return a response
        return { status: 'received', channel, payload };
    }
    /**
     * Send a message to the originator of an event.
     * @param channel - The channel to send the message on
     * @param data - The message data
     * @param sender - The sender of the message
     */
    sendToOriginator(channel, data, sender) {
        if (sender && typeof sender.send === 'function') {
            // Electron IPC sender
            sender.send(channel, data);
        }
        else {
            // No valid sender (web API) - send to all WebSocket clients
            this.sendToAllWebSockets(channel, data);
        }
    }
    /**
     * Broadcast a message to all connected web clients via the API process.
     * @param channel - The channel to broadcast on
     * @param data - The message data
     * @param excludeCid - Optional client ID to exclude from the broadcast
     */
    broadcastToWebClients(channel, data, excludeCid) {
        if (this.apiProcess) {
            this.apiProcess.send({ type: 'broadcast-web', channel, data, excludeCid });
        }
    }
    /**
     * Send a message to all renderer processes.
     * @param channel - The channel to send on
     * @param data - The message data
     */
    sendToAllRenderers(channel, data) {
        for (const wc of this.webContentsList) {
            if (wc && typeof wc.send === 'function') {
                wc.send(channel, data);
            }
        }
    }
    /**
     * Send a message to all WebSocket clients.
     * @param channel - The channel to send on
     * @param data - The message data
     * @param excludeCid - Optional client ID to exclude from the broadcast
     */
    sendToAllWebSockets(channel, data, excludeCid) {
        if (!this.wsServer) {
            return;
        }
        let sent = 0;
        const clients = Array.from(this.wsServer.clients).filter((client) => client.readyState === ws_1.default.OPEN);
        clients.forEach((client) => {
            if (excludeCid && client._cid === excludeCid)
                return;
            client.send(JSON.stringify({ channel, data }));
            sent++;
        });
    }
    /**
     * Send a message to all connected clients.
     * @param channel - The channel to send on
     * @param data - The message data
     */
    sendToAll(channel, data) {
        this.sendToAllRenderers(channel, data);
        this.broadcastToWebClients(channel, data);
    }
    /**
    * Send a message to all renderers and web clients except the sender.
    * @param channel The channel to send on
    * @param data The data to send
    * @param sender The sender to exclude (webContents or WebSocket)
    */
    sendToAllOthers(channel, data, sender) {
        // Exclude sender renderer if sender is a renderer
        if (sender && typeof sender.send === 'function' && this.webContentsList.has(sender)) {
            for (const wc of this.webContentsList) {
                if (wc && typeof wc.send === 'function' && wc !== sender) {
                    wc.send(channel, data);
                }
            }
        }
        else {
            for (const wc of this.webContentsList) {
                if (wc && typeof wc.send === 'function') {
                    wc.send(channel, data);
                }
            }
        }
        // Exclude sender WebSocket client if sender has a cid (ws._cid or sender.cid)
        let excludeCid = undefined;
        if (sender && sender._cid) {
            excludeCid = sender._cid;
        }
        else if (sender && sender.cid) {
            excludeCid = sender.cid;
        }
        this.sendToAllWebSockets(channel, data, excludeCid);
        this.broadcastToWebClients(channel, data, excludeCid);
    }
}
exports.MessagingService = MessagingService;
exports.messagingService = new MessagingService();
