"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.firewallService = exports.FirewallService = void 0;
const firewall_utils_1 = require("../utils/firewall.utils");
const platform_utils_1 = require("../utils/platform.utils");
/**
 * Firewall Service - Provides Linux firewall configuration instructions
 * Windows firewall is handled automatically by the OS, this service only provides
 * manual configuration instructions for Linux users
 */
class FirewallService {
    /**
     * Get Linux firewall instructions for ARK server ports
     * @param gamePort - The game port for the ARK server
     * @param queryPort - The query port for the ARK server (Steam discovery)
     * @param rconPort - The RCON port for the ARK server
     * @returns An object containing the success status and firewall instructions
     */
    async getArkServerFirewallInstructions(gamePort, queryPort, rconPort) {
        try {
            const instructions = (0, firewall_utils_1.getLinuxFirewallInstructions)({
                game: gamePort,
                query: queryPort,
                rcon: rconPort
            });
            return {
                success: true,
                instructions,
                platform: (0, platform_utils_1.getPlatform)()
            };
        }
        catch (error) {
            console.error('[firewall-service] Error generating ARK server firewall instructions:', error);
            return {
                success: false,
                platform: (0, platform_utils_1.getPlatform)(),
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    /**
     * Get Linux firewall instructions for web server port
     * @param port - The web server port
     * @returns An object containing the success status and firewall instructions
     */
    async getWebServerFirewallInstructions(port) {
        try {
            let instructions = `# Linux Firewall Configuration for Web Server\n\n`;
            // UFW instructions
            instructions += `# For UFW (Ubuntu/Debian):\n`;
            instructions += `sudo ufw allow ${port}/tcp  # Web server port\n\n`;
            // Firewalld instructions
            instructions += `# For firewalld (CentOS/RHEL/Fedora):\n`;
            instructions += `sudo firewall-cmd --permanent --add-port=${port}/tcp\n`;
            instructions += `sudo firewall-cmd --reload\n`;
            return {
                success: true,
                instructions,
                platform: (0, platform_utils_1.getPlatform)()
            };
        }
        catch (error) {
            console.error('[firewall-service] Error generating web server firewall instructions:', error);
            return {
                success: false,
                platform: (0, platform_utils_1.getPlatform)(),
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}
exports.FirewallService = FirewallService;
// Export singleton instance
exports.firewallService = new FirewallService();
