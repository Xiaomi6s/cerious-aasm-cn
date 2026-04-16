"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.arkServerProcesses = void 0;
exports.setInstanceState = setInstanceState;
exports.getInstanceState = getInstanceState;
exports.getNormalizedInstanceState = getNormalizedInstanceState;
// --- Instance State Management ---
const instanceStates = {};
function setInstanceState(instanceId, state) {
    instanceStates[instanceId] = state;
}
function getInstanceState(instanceId) {
    const state = instanceStates[instanceId] || null;
    return state;
}
/**
 * Get normalized instance state, mapping unknown/null to 'stopped'
 */
function getNormalizedInstanceState(instanceId) {
    const rawState = getInstanceState(instanceId);
    // Map unknown/null states to 'stopped' for better UX
    return rawState || 'stopped';
}
// --- Server Process Management ---
exports.arkServerProcesses = {};
