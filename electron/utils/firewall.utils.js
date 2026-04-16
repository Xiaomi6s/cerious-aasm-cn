"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.execAsync = void 0;
exports.isWindowsFirewallEnabled = isWindowsFirewallEnabled;
exports.checkFirewallRule = checkFirewallRule;
exports.createFirewallRule = createFirewallRule;
exports.removeFirewallRule = removeFirewallRule;
exports.createApplicationRule = createApplicationRule;
exports.setupArkServerFirewall = setupArkServerFirewall;
exports.setupWebServerFirewall = setupWebServerFirewall;
exports.hasAdminPrivileges = hasAdminPrivileges;
exports.getExistingArkRules = getExistingArkRules;
exports.cleanupArkRules = cleanupArkRules;
exports.getLinuxFirewallInstructions = getLinuxFirewallInstructions;
const child_process_1 = require("child_process");
const util_1 = require("util");
const platform_utils_1 = require("./platform.utils");
exports.execAsync = (0, util_1.promisify)(child_process_1.exec);
const APP_NAME = 'Cerious AASM';
const ARK_SERVER_RULE_PREFIX = 'ARK Server';
/**
 * Check if Windows Firewall is enabled
 */
async function isWindowsFirewallEnabled() {
    if ((0, platform_utils_1.getPlatform)() !== 'windows')
        return false;
    try {
        const { stdout } = await (0, exports.execAsync)('netsh advfirewall show allprofiles state');
        return stdout.includes('State                                 ON');
    }
    catch (error) {
        console.warn('[firewall-utils] Could not check Windows Firewall status:', error);
        return false;
    }
}
/**
 * Check if a firewall rule exists for a specific port
 */
async function checkFirewallRule(port, protocol = 'UDP') {
    if ((0, platform_utils_1.getPlatform)() !== 'windows') {
        return { ruleExists: false, error: 'Not Windows platform' };
    }
    try {
        const ruleName = `${ARK_SERVER_RULE_PREFIX} ${protocol} ${port}`;
        const { stdout } = await (0, exports.execAsync)(`netsh advfirewall firewall show rule name="${ruleName}"`);
        const ruleExists = stdout.includes('Rule Name:') && stdout.includes(ruleName);
        return { ruleExists, ruleName: ruleExists ? ruleName : undefined };
    }
    catch (error) {
        // Rule doesn't exist or error occurred
        return { ruleExists: false };
    }
}
/**
 * Create Windows Firewall rule for a specific port
 */
async function createFirewallRule(port, protocol = 'UDP', description) {
    if ((0, platform_utils_1.getPlatform)() !== 'windows') {
        return false;
    }
    try {
        const ruleName = `${ARK_SERVER_RULE_PREFIX} ${protocol} ${port}`;
        const desc = description || `Allow ${protocol} traffic on port ${port} for ARK server`;
        const command = `netsh advfirewall firewall add rule name="${ruleName}" dir=in action=allow protocol=${protocol} localport=${port} description="${desc}"`;
        await (0, exports.execAsync)(command);
        return true;
    }
    catch (error) {
        console.error(`[firewall-utils] Failed to create firewall rule for ${protocol} port ${port}:`, error);
        return false;
    }
}
/**
 * Remove Windows Firewall rule for a specific port
 */
async function removeFirewallRule(port, protocol = 'UDP') {
    if ((0, platform_utils_1.getPlatform)() !== 'windows') {
        return false;
    }
    try {
        const ruleName = `${ARK_SERVER_RULE_PREFIX} ${protocol} ${port}`;
        const command = `netsh advfirewall firewall delete rule name="${ruleName}"`;
        await (0, exports.execAsync)(command);
        return true;
    }
    catch (error) {
        console.error(`[firewall-utils] Failed to remove firewall rule for ${protocol} port ${port}:`, error);
        return false;
    }
}
/**
 * Create application-based firewall rule (triggers Windows firewall prompt)
 * This allows the entire application to communicate through the firewall
 */
async function createApplicationRule(applicationPath) {
    if ((0, platform_utils_1.getPlatform)() !== 'windows') {
        return false;
    }
    try {
        const appPath = applicationPath || process.execPath;
        const ruleName = `${APP_NAME} Application`;
        // Remove existing rule first
        try {
            await (0, exports.execAsync)(`netsh advfirewall firewall delete rule name="${ruleName}"`);
        }
        catch {
            // Ignore if rule doesn't exist
        }
        const command = `netsh advfirewall firewall add rule name="${ruleName}" dir=in action=allow program="${appPath}" description="Allow ${APP_NAME} application network access"`;
        await (0, exports.execAsync)(command);
        return true;
    }
    catch (error) {
        console.error(`[firewall-utils] Failed to create application firewall rule:`, error);
        return false;
    }
}
/**
 * Setup firewall rules for ARK server (Game + Query + RCON ports)
 */
async function setupArkServerFirewall(gamePort, queryPort, rconPort) {
    const rulesCreated = [];
    const errors = [];
    // Game port (UDP)
    if (await createFirewallRule(gamePort, 'UDP', `ARK Server Game Port ${gamePort}`)) {
        rulesCreated.push(`Game UDP ${gamePort}`);
    }
    else {
        errors.push(`Failed to create game port rule (UDP ${gamePort})`);
    }
    // Query port (UDP) - Steam server discovery
    if (queryPort && queryPort !== gamePort) {
        if (await createFirewallRule(queryPort, 'UDP', `ARK Server Query Port ${queryPort}`)) {
            rulesCreated.push(`Query UDP ${queryPort}`);
        }
        else {
            errors.push(`Failed to create query port rule (UDP ${queryPort})`);
        }
    }
    // RCON port (TCP)
    if (rconPort) {
        if (await createFirewallRule(rconPort, 'TCP', `ARK Server RCON Port ${rconPort}`)) {
            rulesCreated.push(`RCON TCP ${rconPort}`);
        }
        else {
            errors.push(`Failed to create RCON port rule (TCP ${rconPort})`);
        }
    }
    return {
        success: errors.length === 0,
        rulesCreated,
        errors
    };
}
/**
 * Setup firewall rule for web server
 */
async function setupWebServerFirewall(port) {
    return await createFirewallRule(port, 'TCP', `${APP_NAME} Web Server Port ${port}`);
}
/**
 * Check if user has administrator privileges (required for firewall changes)
 */
async function hasAdminPrivileges() {
    if ((0, platform_utils_1.getPlatform)() !== 'windows') {
        return false;
    }
    try {
        // Try to run a command that requires admin privileges
        await (0, exports.execAsync)('net session');
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Get all existing ARK server firewall rules
 */
async function getExistingArkRules() {
    if ((0, platform_utils_1.getPlatform)() !== 'windows') {
        return [];
    }
    try {
        const { stdout } = await (0, exports.execAsync)('netsh advfirewall firewall show rule name=all');
        const lines = stdout.split('\n');
        const arkRules = [];
        for (const line of lines) {
            if (line.includes('Rule Name:') && line.includes(ARK_SERVER_RULE_PREFIX)) {
                const ruleName = line.replace('Rule Name:', '').trim();
                arkRules.push(ruleName);
            }
        }
        return arkRules;
    }
    catch (error) {
        console.error('[firewall-utils] Failed to get existing ARK rules:', error);
        return [];
    }
}
/**
 * Clean up all ARK server firewall rules
 */
async function cleanupArkRules() {
    if ((0, platform_utils_1.getPlatform)() !== 'windows') {
        return false;
    }
    try {
        const existingRules = await getExistingArkRules();
        for (const ruleName of existingRules) {
            try {
                await (0, exports.execAsync)(`netsh advfirewall firewall delete rule name="${ruleName}"`);
            }
            catch (error) {
                console.warn(`[firewall-utils] Failed to remove rule ${ruleName}:`, error);
            }
        }
        return true;
    }
    catch (error) {
        console.error('[firewall-utils] Failed to cleanup ARK firewall rules:', error);
        return false;
    }
}
/**
 * Provide Linux firewall guidance
 */
function getLinuxFirewallInstructions(ports) {
    const { game, query, rcon } = ports;
    let instructions = `# Linux Firewall Configuration for ARK Server\n\n`;
    // UFW instructions
    instructions += `# For UFW (Ubuntu/Debian):\n`;
    instructions += `sudo ufw allow ${game}/udp  # Game port\n`;
    if (query && query !== game) {
        instructions += `sudo ufw allow ${query}/udp  # Query port (Steam discovery)\n`;
    }
    if (rcon) {
        instructions += `sudo ufw allow ${rcon}/tcp  # RCON port\n`;
    }
    instructions += `\n`;
    // Firewalld instructions
    instructions += `# For firewalld (CentOS/RHEL/Fedora):\n`;
    instructions += `sudo firewall-cmd --permanent --add-port=${game}/udp\n`;
    if (query && query !== game) {
        instructions += `sudo firewall-cmd --permanent --add-port=${query}/udp\n`;
    }
    if (rcon) {
        instructions += `sudo firewall-cmd --permanent --add-port=${rcon}/tcp\n`;
    }
    instructions += `sudo firewall-cmd --reload\n`;
    return instructions;
}
