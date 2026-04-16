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
exports.schedulerService = exports.SchedulerService = void 0;
const rcon_service_1 = require("./rcon.service");
const instanceUtils = __importStar(require("../utils/ark/instance.utils"));
class SchedulerService {
    constructor() {
        this.intervals = {};
        this.activeBroadcasts = {};
    }
    /**
     * Initialize schedule for an instance
     */
    async initSchedule(instanceId) {
        const instance = await instanceUtils.getInstance(instanceId);
        if (!instance || !instance.broadcasts)
            return;
        this.activeBroadcasts[instanceId] = instance.broadcasts;
        this.startScheduler(instanceId);
    }
    /**
     * Start the scheduler loop for a specific instance
     */
    startScheduler(instanceId) {
        if (this.intervals[instanceId])
            clearInterval(this.intervals[instanceId]);
        // Check every minute
        this.intervals[instanceId] = setInterval(() => {
            this.checkBroadcasts(instanceId);
        }, 60 * 1000);
    }
    /**
     * Stop scheduler for an instance
     */
    stopScheduler(instanceId) {
        if (this.intervals[instanceId]) {
            clearInterval(this.intervals[instanceId]);
            delete this.intervals[instanceId];
        }
    }
    /**
     * Check and run pending broadcasts
     */
    async checkBroadcasts(instanceId) {
        const broadcasts = this.activeBroadcasts[instanceId];
        if (!broadcasts)
            return;
        const now = Date.now();
        for (const job of broadcasts) {
            if (!job.enabled)
                continue;
            if (!job.nextRun || now >= job.nextRun) {
                // Run Broadcast
                await rcon_service_1.rconService.executeRconCommand(instanceId, `Broadcast ${job.message}`);
                // Schedule next run
                job.nextRun = now + (job.intervalMinutes * 60 * 1000);
            }
        }
    }
    /**
     * Update valid broadcasts list
     */
    updateBroadcasts(instanceId, broadcasts) {
        this.activeBroadcasts[instanceId] = broadcasts;
        // Reset nextRun for new jobs or keep existing logic
        // For simplicity, we just update the ref.
    }
}
exports.SchedulerService = SchedulerService;
exports.schedulerService = new SchedulerService();
