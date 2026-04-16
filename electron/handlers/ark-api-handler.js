"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const messaging_service_1 = require("../services/messaging.service");
const ark_api_plugin_service_1 = require("../services/ark-api-plugin.service");
/**
 * List installed ArkApi plugins for a server instance.
 * Payload: { instanceId, requestId }
 */
messaging_service_1.messagingService.on('list-ark-api-plugins', async (payload, sender) => {
    const { instanceId, requestId } = payload || {};
    try {
        const plugins = ark_api_plugin_service_1.arkApiPluginService.listPlugins(instanceId);
        messaging_service_1.messagingService.sendToOriginator('list-ark-api-plugins', { success: true, plugins, requestId }, sender);
    }
    catch (error) {
        const errorMsg = error.message;
        console.error('[ark-api-handler] list-ark-api-plugins error:', errorMsg);
        messaging_service_1.messagingService.sendToOriginator('list-ark-api-plugins', { success: false, error: errorMsg, requestId }, sender);
    }
});
/**
 * Remove (uninstall) an ArkApi plugin.
 * Payload: { instanceId, folderName, requestId }
 */
messaging_service_1.messagingService.on('remove-ark-api-plugin', async (payload, sender) => {
    const { instanceId, folderName, requestId } = payload || {};
    try {
        ark_api_plugin_service_1.arkApiPluginService.removePlugin(instanceId, folderName);
        messaging_service_1.messagingService.sendToOriginator('remove-ark-api-plugin', { success: true, folderName, requestId }, sender);
    }
    catch (error) {
        const errorMsg = error.message;
        console.error('[ark-api-handler] remove-ark-api-plugin error:', errorMsg);
        messaging_service_1.messagingService.sendToOriginator('remove-ark-api-plugin', { success: false, error: errorMsg, requestId }, sender);
    }
});
/**
 * Fetch the latest AsaApi release metadata from GitHub.
 * Payload: { requestId }
 */
messaging_service_1.messagingService.on('get-asaapi-latest', async (payload, sender) => {
    const { requestId } = payload || {};
    try {
        const release = await ark_api_plugin_service_1.arkApiPluginService.getLatestAsaApiRelease();
        messaging_service_1.messagingService.sendToOriginator('get-asaapi-latest', { success: true, ...release, requestId }, sender);
    }
    catch (error) {
        const errorMsg = error.message;
        console.error('[ark-api-handler] get-asaapi-latest error:', errorMsg);
        messaging_service_1.messagingService.sendToOriginator('get-asaapi-latest', { success: false, error: errorMsg, requestId }, sender);
    }
});
/**
 * Download and install AsaApi for a server instance.
 * Payload: { instanceId, downloadUrl, requestId }
 */
messaging_service_1.messagingService.on('download-asaapi', async (payload, sender) => {
    const { instanceId, downloadUrl, requestId } = payload || {};
    try {
        messaging_service_1.messagingService.sendToOriginator('download-asaapi-progress', { status: 'downloading', requestId }, sender);
        await ark_api_plugin_service_1.arkApiPluginService.downloadAsaApi(instanceId, downloadUrl);
        messaging_service_1.messagingService.sendToOriginator('download-asaapi', { success: true, requestId }, sender);
    }
    catch (error) {
        const errorMsg = error.message;
        console.error('[ark-api-handler] download-asaapi error:', errorMsg);
        messaging_service_1.messagingService.sendToOriginator('download-asaapi', { success: false, error: errorMsg, requestId }, sender);
    }
});
/**
 * Install a plugin from a local ZIP file path (Electron exposes file.path on File objects).
 * Payload: { instanceId, zipPath, requestId }
 */
messaging_service_1.messagingService.on('install-plugin-from-zip', async (payload, sender) => {
    const { instanceId, zipPath, requestId } = payload || {};
    try {
        ark_api_plugin_service_1.arkApiPluginService.installPluginFromZipPath(instanceId, zipPath);
        messaging_service_1.messagingService.sendToOriginator('install-plugin-from-zip', { success: true, requestId }, sender);
    }
    catch (error) {
        const errorMsg = error.message;
        console.error('[ark-api-handler] install-plugin-from-zip error:', errorMsg);
        messaging_service_1.messagingService.sendToOriginator('install-plugin-from-zip', { success: false, error: errorMsg, requestId }, sender);
    }
});
/**
 * Install a plugin by downloading a ZIP from a URL.
 * Payload: { instanceId, url, requestId }
 */
messaging_service_1.messagingService.on('install-plugin-from-url', async (payload, sender) => {
    const { instanceId, url, requestId } = payload || {};
    try {
        await ark_api_plugin_service_1.arkApiPluginService.installPluginFromUrl(instanceId, url);
        messaging_service_1.messagingService.sendToOriginator('install-plugin-from-url', { success: true, requestId }, sender);
    }
    catch (error) {
        const errorMsg = error.message;
        console.error('[ark-api-handler] install-plugin-from-url error:', errorMsg);
        messaging_service_1.messagingService.sendToOriginator('install-plugin-from-url', { success: false, error: errorMsg, requestId }, sender);
    }
});
