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
exports.linuxPackageUpdaterService = exports.LinuxPackageUpdaterService = void 0;
const electron_1 = require("electron");
const axios_1 = __importDefault(require("axios"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const child_process_1 = require("child_process");
const messaging_service_1 = require("./messaging.service");
/**
 * LinuxPackageUpdaterService
 *
 * Provides auto-update support for .deb and .rpm Linux installations where
 * electron-updater is not available. Uses the GitHub Releases API to detect
 * new versions, downloads the correct package, and installs it via pkexec
 * (polkit privilege escalation) so the user only sees a native password prompt.
 *
 * Flow:
 *   1. Query GitHub Releases API for the latest release
 *   2. Compare tag version with the running app version
 *   3. Download the matching .deb or .rpm asset to a temp directory
 *   4. Broadcast download progress to the renderer via messagingService
 *   5. On "install" request, run `pkexec dpkg -i <file>` or `pkexec rpm -U <file>`
 *   6. Restart the application
 */
class LinuxPackageUpdaterService {
    constructor() {
        this.owner = 'ryoucerious';
        this.repo = 'cerious-aasm';
        this.downloadedPackagePath = null;
        this.latestVersion = null;
        this.updateDownloaded = false;
        this.packageFormat = this.detectPackageFormat();
    }
    // ---------------------------------------------------------------------------
    // Detection helpers
    // ---------------------------------------------------------------------------
    /**
     * Detect whether the host system uses dpkg (Debian/Ubuntu) or rpm (Fedora/RHEL/SUSE).
     * Returns null if neither is available.
     */
    detectPackageFormat() {
        try {
            // dpkg is the canonical indicator for Debian-family distros
            const dpkg = this.commandExistsSync('dpkg');
            if (dpkg)
                return 'deb';
        }
        catch { /* ignore */ }
        try {
            const rpm = this.commandExistsSync('rpm');
            if (rpm)
                return 'rpm';
        }
        catch { /* ignore */ }
        return null;
    }
    /**
     * Synchronously check whether a command exists on PATH.
     */
    commandExistsSync(cmd) {
        try {
            const { execSync } = require('child_process');
            execSync(`which ${cmd}`, { stdio: 'ignore' });
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Whether this service can operate (Linux + recognized package manager).
     */
    isSupported() {
        return process.platform === 'linux' && this.packageFormat !== null;
    }
    // ---------------------------------------------------------------------------
    // Version comparison
    // ---------------------------------------------------------------------------
    /**
     * Normalise a version tag (strip leading "v") and compare using semver-ish logic.
     * Returns true when remoteTag is newer than the running app version.
     */
    isNewerVersion(remoteTag) {
        const normalize = (v) => v.replace(/^v/, '');
        const remote = normalize(remoteTag);
        const current = normalize(electron_1.app.getVersion());
        // Split on '-' to separate semver core from pre-release
        const [remoteCore, remotePre] = remote.split('-');
        const [currentCore, currentPre] = current.split('-');
        const remoteParts = remoteCore.split('.').map(Number);
        const currentParts = currentCore.split('.').map(Number);
        for (let i = 0; i < Math.max(remoteParts.length, currentParts.length); i++) {
            const r = remoteParts[i] ?? 0;
            const c = currentParts[i] ?? 0;
            if (r > c)
                return true;
            if (r < c)
                return false;
        }
        // Same core version — compare pre-release (if any).
        // A version *without* pre-release is newer than one *with* (e.g., 1.0.0 > 1.0.0-beta.1).
        if (currentPre && !remotePre)
            return true;
        if (!currentPre && remotePre)
            return false;
        if (currentPre && remotePre) {
            return remotePre.localeCompare(currentPre, undefined, { numeric: true, sensitivity: 'base' }) > 0;
        }
        return false; // identical
    }
    // ---------------------------------------------------------------------------
    // GitHub Releases API
    // ---------------------------------------------------------------------------
    /**
     * Check GitHub for a newer release and notify the renderer.
     */
    async checkForUpdates() {
        try {
            messaging_service_1.messagingService.sendToAllRenderers('app-update-status', { status: 'checking' });
            const release = await this.fetchLatestRelease();
            if (!release) {
                messaging_service_1.messagingService.sendToAllRenderers('app-update-status', { status: 'error', error: 'Could not fetch latest release.' });
                return;
            }
            if (!this.isNewerVersion(release.tag_name)) {
                console.log(`[LinuxPackageUpdater] App is up to date (${electron_1.app.getVersion()})`);
                messaging_service_1.messagingService.sendToAllRenderers('app-update-status', { status: 'up-to-date', version: electron_1.app.getVersion() });
                return;
            }
            const asset = this.findMatchingAsset(release.assets);
            if (!asset) {
                console.warn(`[LinuxPackageUpdater] No .${this.packageFormat} asset found in release ${release.tag_name}`);
                messaging_service_1.messagingService.sendToAllRenderers('app-update-status', { status: 'error', error: `No .${this.packageFormat} package in the latest release.` });
                return;
            }
            const version = release.tag_name.replace(/^v/, '');
            this.latestVersion = version;
            console.log(`[LinuxPackageUpdater] Update available: v${version} (${asset.name})`);
            messaging_service_1.messagingService.sendToAllRenderers('app-update-status', {
                status: 'available',
                version,
                releaseNotes: release.body,
                releaseDate: release.published_at,
            });
            // Start downloading immediately (silent download)
            await this.downloadAsset(asset, version);
        }
        catch (err) {
            console.error('[LinuxPackageUpdater] Error checking for updates:', err.message);
            messaging_service_1.messagingService.sendToAllRenderers('app-update-status', { status: 'error', error: err.message });
        }
    }
    /**
     * Fetch the latest release from GitHub.
     */
    async fetchLatestRelease() {
        try {
            const url = `https://api.github.com/repos/${this.owner}/${this.repo}/releases/latest`;
            const resp = await axios_1.default.get(url, {
                headers: { Accept: 'application/vnd.github.v3+json', 'User-Agent': 'cerious-aasm-updater' },
                timeout: 15000,
            });
            return resp.data;
        }
        catch (err) {
            console.error('[LinuxPackageUpdater] GitHub API error:', err.message);
            return null;
        }
    }
    /**
     * Find the .deb or .rpm asset matching the current architecture.
     */
    findMatchingAsset(assets) {
        const arch = os.arch(); // 'x64', 'arm64', etc.
        const ext = this.packageFormat === 'deb' ? '.deb' : '.rpm';
        // Try to find an asset matching both extension and architecture
        const archPatterns = arch === 'x64' ? ['amd64', 'x86_64', 'x64'] : [arch, 'aarch64'];
        // First pass: match extension + arch
        for (const asset of assets) {
            const name = asset.name.toLowerCase();
            if (name.endsWith(ext) && archPatterns.some(p => name.includes(p))) {
                return asset;
            }
        }
        // Second pass: match extension only (single-arch releases)
        for (const asset of assets) {
            if (asset.name.toLowerCase().endsWith(ext)) {
                return asset;
            }
        }
        return null;
    }
    // ---------------------------------------------------------------------------
    // Download
    // ---------------------------------------------------------------------------
    /**
     * Download the release asset to a temporary directory, broadcasting progress.
     */
    async downloadAsset(asset, version) {
        const tmpDir = path.join(os.tmpdir(), 'cerious-aasm-update');
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
        }
        const destPath = path.join(tmpDir, asset.name);
        console.log(`[LinuxPackageUpdater] Downloading ${asset.name} to ${destPath}`);
        const resp = await axios_1.default.get(asset.browser_download_url, {
            responseType: 'stream',
            headers: { 'User-Agent': 'cerious-aasm-updater' },
            timeout: 300000, // 5 min timeout for large files
        });
        const totalBytes = parseInt(resp.headers['content-length'] ?? String(asset.size), 10);
        let receivedBytes = 0;
        const startTime = Date.now();
        const writer = fs.createWriteStream(destPath);
        await new Promise((resolve, reject) => {
            resp.data.on('data', (chunk) => {
                receivedBytes += chunk.length;
                const elapsed = (Date.now() - startTime) / 1000 || 1;
                const bytesPerSecond = receivedBytes / elapsed;
                const percent = totalBytes > 0 ? (receivedBytes / totalBytes) * 100 : 0;
                messaging_service_1.messagingService.sendToAllRenderers('app-update-status', {
                    status: 'downloading',
                    percent,
                    bytesPerSecond,
                    transferred: receivedBytes,
                    total: totalBytes,
                });
            });
            resp.data.pipe(writer);
            writer.on('finish', resolve);
            writer.on('error', reject);
            resp.data.on('error', reject);
        });
        this.downloadedPackagePath = destPath;
        this.updateDownloaded = true;
        console.log(`[LinuxPackageUpdater] Download complete: ${destPath}`);
        messaging_service_1.messagingService.sendToAllRenderers('app-update-status', {
            status: 'downloaded',
            version,
            releaseNotes: '',
            releaseDate: '',
        });
    }
    // ---------------------------------------------------------------------------
    // Install
    // ---------------------------------------------------------------------------
    /**
     * Install the downloaded package using pkexec for privilege escalation,
     * then relaunch the application.
     */
    quitAndInstall() {
        if (!this.updateDownloaded || !this.downloadedPackagePath) {
            console.warn('[LinuxPackageUpdater] No update downloaded yet.');
            return;
        }
        const pkgPath = this.downloadedPackagePath;
        const installCmd = this.packageFormat === 'deb'
            ? ['pkexec', 'dpkg', '-i', pkgPath]
            : ['pkexec', 'rpm', '-U', '--force', pkgPath];
        console.log(`[LinuxPackageUpdater] Installing: ${installCmd.join(' ')}`);
        const child = (0, child_process_1.spawn)(installCmd[0], installCmd.slice(1), {
            stdio: 'inherit',
            detached: true,
        });
        child.on('exit', (code) => {
            // Clean up the downloaded package
            try {
                fs.unlinkSync(pkgPath);
            }
            catch { /* ignore */ }
            if (code === 0) {
                console.log('[LinuxPackageUpdater] Package installed successfully. Relaunching...');
                electron_1.app.relaunch();
                electron_1.app.exit(0);
            }
            else {
                console.error(`[LinuxPackageUpdater] Install failed with exit code ${code}`);
                messaging_service_1.messagingService.sendToAllRenderers('app-update-status', {
                    status: 'error',
                    error: `Package installation failed (exit code ${code}). You may need to install manually.`,
                });
            }
        });
        child.on('error', (err) => {
            console.error('[LinuxPackageUpdater] Install spawn error:', err.message);
            messaging_service_1.messagingService.sendToAllRenderers('app-update-status', {
                status: 'error',
                error: `Failed to start installer: ${err.message}`,
            });
        });
    }
    /**
     * Returns whether an update has been downloaded and is ready to install.
     */
    isUpdateReady() {
        return this.updateDownloaded;
    }
}
exports.LinuxPackageUpdaterService = LinuxPackageUpdaterService;
// Export singleton
exports.linuxPackageUpdaterService = new LinuxPackageUpdaterService();
