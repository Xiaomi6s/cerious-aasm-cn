import { Component, ChangeDetectorRef } from '@angular/core';
import { NotificationService } from '../../core/services/notification.service';
import { UtilityService } from '../../core/services/utility.service';
import { NgFor, NgIf, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessagingService } from '../../core/services/messaging/messaging.service';
import { GlobalConfigService } from '../../core/services/global-config.service';
import { ServerInstanceService } from '../../core/services/server-instance.service';
import { ModalComponent } from '../../components/modal/modal.component';
import { Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [NgFor, NgIf, NgClass, ModalComponent, FormsModule],
  templateUrl: './settings.component.html'  
})
export class SettingsPageComponent {
  public isElectron: boolean;
  tabs: any[] = [];

  arkUpdateAvailable = false;
  webServerRunning = false;
  webServerPort = 3000;
  startWebServerOnLoad = false;
  authenticationEnabled = false;
  authenticationUsername = '';
  authenticationPassword = '';
  maxBackupDownloadSizeMB = 100;
  serverDataDir = '';
  steamCmdDir = '';
  autoUpdateArkServer = false;
  updateWarningMinutes = 15;
  // Backend-provided system info (populated when running in Electron)
  backendNodeVersion: string | null = null;
  backendElectronVersion: string | null = null;
  backendPlatform: string | null = null;
  backendConfigPath: string | null = null;
  subscriptions: Subscription[] = [];
  showSettings = true;

  async ngOnInit() {
    // Track whether any server instances are running/starting
    this.subscriptions.push(
      this.serverInstanceService.getInstances().subscribe(instances => {
        this.hasRunningServers = instances.some(i => {
          const state = (i.state || i.status || '').toLowerCase();
          return state === 'running' || state === 'starting';
        });
        this.cdr.markForCheck();
      })
    );

    // Load config first
    const cfg: any = await this.configService.loadConfig();
    if (cfg) {
      this.webServerPort = cfg.webServerPort;
      this.startWebServerOnLoad = cfg.startWebServerOnLoad;
      this.authenticationEnabled = cfg.authenticationEnabled;
      this.authenticationUsername = cfg.authenticationUsername;
      this.authenticationPassword = cfg.authenticationPassword;
      this.maxBackupDownloadSizeMB = cfg.maxBackupDownloadSizeMB;
      this.serverDataDir = cfg.serverDataDir || '';
      this.steamCmdDir = cfg.steamCmdDir || '';
      this.autoUpdateArkServer = cfg.autoUpdateArkServer || false;
      this.updateWarningMinutes = cfg.updateWarningMinutes || 15;
      this.cdr.markForCheck();
    }

    // Reactively update UI on any global-config broadcast
    this.subscriptions.push(this.messaging.receiveMessage('global-config').subscribe((cfg: any) => {
      this.webServerPort = cfg.webServerPort;
      this.startWebServerOnLoad = cfg.startWebServerOnLoad;
      this.authenticationEnabled = cfg.authenticationEnabled;
      this.authenticationUsername = cfg.authenticationUsername;
      this.authenticationPassword = cfg.authenticationPassword;
      this.maxBackupDownloadSizeMB = cfg.maxBackupDownloadSizeMB;
      this.serverDataDir = cfg.serverDataDir || '';
      this.steamCmdDir = cfg.steamCmdDir || '';
      this.autoUpdateArkServer = cfg.autoUpdateArkServer || false;
      this.updateWarningMinutes = cfg.updateWarningMinutes || 15;
      this.cdr.markForCheck();
    })
  );
  this.subscriptions.push(this.messaging.receiveMessage('ark-update-status').subscribe((msg: any) => {
      if (msg?.hasUpdate) {
        this.updateArkUpdateBadge();
      } else {
        this.clearArkUpdateBadge();
      }
    }));
    // Always refresh web server status on init if Electron
    if (this.isElectron) {
      // Listen for backend polling events
      this.subscriptions.push(this.messaging.receiveMessage('web-server-status').subscribe((msg: any) => {
        this.webServerRunning = !!msg?.running;
        if (typeof msg?.port === 'number') {
          this.webServerPort = msg.port;
        }
        this.cdr.markForCheck();
      }));
      // Initial status request
      this.messaging.sendMessage('web-server-status', {});
    }

    // Request system info from backend to display accurate platform/node/electron versions
    this.subscriptions.push(
      this.messaging.sendMessage('get-system-info', {}).subscribe({
        next: (res: any) => {
          if (res) {
            this.backendNodeVersion = res.nodeVersion || null;
            this.backendElectronVersion = res.electronVersion || null;
            this.backendPlatform = res.platform || null;
            this.backendConfigPath = res.configPath || null;
            this.cdr.markForCheck();
          }
        },
        error: (err) => {
          console.error('Failed to get system info:', err);
          // ignore - fall back to client-side heuristics
        }
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.installSub?.unsubscribe();
  }

  activeTab = 'server-installation';

  // Modal and progress state
  showInstallModal = false;
  installProgress: { percent: number, step: string, message: string, phase?: string, success?: boolean, failed?: boolean, blocked?: boolean } | null = null;
  private installSub?: Subscription;
  
  // Sudo password collection state
  showSudoPasswordModal = false;
  sudoPassword = '';
  pendingInstallTarget = '';
  hasRunningServers = false;

  constructor(
    private messaging: MessagingService,
    private cdr: ChangeDetectorRef,
    private utility: UtilityService,
    private notification: NotificationService,
    private configService: GlobalConfigService,
    private serverInstanceService: ServerInstanceService
  ) {
    this.isElectron = this.utility.getPlatform() === 'Electron';
    this.tabs = [
      { id: 'server-installation', label: '服务器安装', icon: 'dns', showUpdateBadge: false },
      { id: 'general', label: 'General', icon: 'settings' },
      ...(this.isElectron ? [{ id: 'web-server', label: 'Web 服务器', icon: 'cloud' }] : []),
      { id: 'about', label: 'About', icon: 'info' }
    ];
  }

  private updateArkUpdateBadge() {
    this.arkUpdateAvailable = true;
    this.notification.info('有新的 ARK 服务器更新可用！', '有可用更新');
    // Set badge on tab
    const tab = this.tabs.find(t => t.id === 'server-installation');
    if (tab) tab.showUpdateBadge = true;
    this.cdr.markForCheck();
  }

  private clearArkUpdateBadge() {
    this.arkUpdateAvailable = false;
    // Remove badge from tab
    const tab = this.tabs.find(t => t.id === 'server-installation');
    if (tab) tab.showUpdateBadge = false;
    this.cdr.markForCheck();
  }

  selectTab(tabId: string) {
    this.activeTab = tabId;
  }

  getActiveTabLabel() {
    return this.tabs.find(tab => tab.id === this.activeTab)?.label || '';
  }

  onInstallServer() {
    // First check installation requirements
    this.checkInstallationRequirements('server');
  }

  checkInstallationRequirements(target: string) {
    this.subscriptions.push(
      this.messaging.sendMessage('check-install-requirements', { target }).subscribe({
        next: (response: any) => {
          if (response.requiresSudo && !response.canProceed) {
            // Need sudo password
            this.pendingInstallTarget = target;
            this.sudoPassword = '';
            this.showSudoPasswordModal = true;
            this.cdr.markForCheck();
          } else {
            // Can proceed directly with installation
            this.startInstallation(target);
          }
        },
        error: (error) => {
          this.notification.error('检查安装要求失败：' + error.message, '安装错误');
        }
      })
    );
  }

  onSudoPasswordConfirm() {
    if (!this.sudoPassword.trim()) {
      this.notification.warning('请输入您的 sudo 密码', '需要密码');
      return;
    }
    
    this.showSudoPasswordModal = false;
    this.startInstallation(this.pendingInstallTarget, this.sudoPassword);
    
    // Clear sensitive data
    this.sudoPassword = '';
    this.pendingInstallTarget = '';
    this.cdr.markForCheck();
  }

  onSudoPasswordCancel() {
    this.showSudoPasswordModal = false;
    this.sudoPassword = '';
    this.pendingInstallTarget = '';
    this.cdr.markForCheck();
  }

  private startInstallation(target: string, sudoPassword?: string) {
    this.showInstallModal = true;
    this.installProgress = { percent: 0, step: 'Starting', message: 'Initializing install...' };
    if (this.installSub) this.installSub.unsubscribe();
    this.installSub = this.messaging.receiveMessage('install').subscribe((msg: any) => {
      const progress = msg?.data;
      if (!progress) return;

      // Show toast for concurrent-install warning
      if (progress.message?.includes('already in progress')) {
        this.notification.warning(progress.message, '安装警告');
        this.onCloseInstall();
        return;
      }

      // Handle error state – show toast and update modal with failure details
      if (progress.step === 'error' || progress.error) {
        const errorMsg = progress.message || progress.error || 'Installation failed. Check server logs for details.';
        this.notification.error(errorMsg, '安装失败');
        this.installProgress = {
          percent: this.installProgress?.percent ?? 0,
          step: '安装失败',
          message: errorMsg,
          phase: progress.phase || 'error',
          success: false,
          failed: true
        };
        this.cdr.markForCheck();
        return;
      }

      // Handle cancellation
      if (progress.cancelled) {
        this.showInstallModal = false;
        this.installProgress = null;
        this.cdr.markForCheck();
        return;
      }

      if (progress.step) {
        const isComplete = progress.phase === 'validation' && progress.overallPhase === '安装完成';
        this.installProgress = {
            percent: isComplete ? 100 : (progress.phasePercent ?? 0),
            step: isComplete ? '安装完成' : (progress.overallPhase || ''),
            message: progress.message || '',
            phase: progress.phase || '',
            success: isComplete ? true : undefined
        };
        if (isComplete) {
          this.notification.success('服务器安装完成', '安装成功');
          setTimeout(() => {
            this.showInstallModal = false;
            this.installProgress = null;
            if (this.installSub) this.installSub.unsubscribe();
            this.cdr.markForCheck();
          }, 1500);
        }
        this.cdr.markForCheck();
      }
    });
    
    // Start installation with sudo password if provided
    const installPayload = sudoPassword ? { target, sudoPassword } : { target };
    this.subscriptions.push(this.messaging.sendMessage('install', installPayload).subscribe());
  }

  onCloseInstall() {
    this.showInstallModal = false;
    if (this.installSub) this.installSub.unsubscribe();
  }

  onCancelInstall() {
    this.onCloseInstall();
    this.installProgress = null;
    this.subscriptions.push(this.messaging.sendMessage('cancel-install', { target: 'server' }).subscribe());
  }

  onOpenConfigDirectory() {
    if (!this.isElectron) return;
    this.subscriptions.push(this.messaging.sendMessage('open-config-directory', {}).subscribe());
  }

  onCheckForUpdates() {
    this.notification.info('Checking for ARK server updates...', '检查更新');
    this.subscriptions.push(this.messaging.sendMessage('check-ark-update', {}).subscribe({
      next: (response: any) => {
        if (response?.hasUpdate) {
          this.updateArkUpdateBadge();
        } else {
          this.clearArkUpdateBadge();
          this.notification.info('ARK server is up to date.', '检查更新');
        }
      },
      error: () => {
        this.notification.error('检查 ARK 服务器更新失败。', '检查更新');
      }
    }));
  }

  getBuildDate() {
    return new Date().toLocaleDateString();
  }

  getAppVersion() {
    return environment.version || '1.0.9';
  }

  getPlatform() {
    // Prefer backend-provided platform when available
    if (this.backendPlatform) return this.backendPlatform;
    if (typeof navigator !== 'undefined') {
      const platform = navigator.platform || navigator.userAgent;
      if (platform.includes('Win')) return 'Windows';
      if (platform.includes('Mac')) return 'macOS';
      if (platform.includes('Linux')) return 'Linux';
    }
    return 'Unknown';
  }

  getNodeVersion() {
    // Prefer backend-provided value (more accurate in Electron)
    if (this.backendNodeVersion) return this.backendNodeVersion;
    // In Electron, we can access process.versions in renderer; fallback to that if available
    if (this.isElectron && typeof (globalThis as any).process !== 'undefined') {
      return (globalThis as any).process.versions?.node || 'Unknown';
    }
    return 'Not Available (Browser)';
  }

  getElectronVersion() {
    if (this.backendElectronVersion) return this.backendElectronVersion;
    if (this.isElectron && typeof (globalThis as any).process !== 'undefined') {
      return (globalThis as any).process.versions?.electron || 'Unknown';
    }
    return 'Not Available (Browser)';
  }

  getConfigPath() {
    if (this.backendConfigPath) return this.backendConfigPath;
    if (this.isElectron && typeof (globalThis as any).process !== 'undefined') {
      try {
        const os = (globalThis as any).require('os');
        const path = (globalThis as any).require('path');
        return path.join(os.homedir(), 'AppData', 'Roaming', 'Cerious AASM');
      } catch (e) {
        return 'Unknown';
      }
    }
    return 'N/A (Browser Mode - No Local Config)';
  }

  onStartWebServer() {
    this.configService.webServerPort = this.webServerPort;
    this.subscriptions.push(this.messaging.sendMessage('start-web-server', { port: this.webServerPort }).subscribe({
      next: (res: any) => {
        this.webServerRunning = true;
        this.notification.success(`Web server started on port ${this.webServerPort}`, 'Web 服务器');
        this.cdr.markForCheck();
      },
      error: () => {
        this.webServerRunning = false;
        this.notification.error('启动 Web 服务器失败。', 'Web 服务器');
        this.cdr.markForCheck();
      }
    }));
  }

  onPortChange(newPort: number) {
    this.webServerPort = newPort;
    this.configService.webServerPort = newPort;
  }

  onStartOnLoadChange(newValue: boolean) {
    this.startWebServerOnLoad = newValue;
    this.configService.startWebServerOnLoad = newValue;
  }

  onStopWebServer() {
    this.subscriptions.push(this.messaging.sendMessage('stop-web-server', {}).subscribe({
      next: (res: any) => {
        this.webServerRunning = false;
        this.notification.info('Web server stopped.', 'Web 服务器');
        this.cdr.markForCheck();
      },
      error: () => {
        this.notification.error('停止 Web 服务器失败。', 'Web 服务器');
        this.cdr.markForCheck();
      }
    }));
  }

  onAuthenticationEnabledChange(newValue: boolean) {
    if (newValue) {
      // First, enable authentication to show the fields
      this.authenticationEnabled = true;
      this.configService.authenticationEnabled = true;
      
      // Then check if validation is needed - if fields are empty, show helpful message
      if (!this.authenticationUsername.trim() || !this.authenticationPassword.trim()) {
        this.notification.info('请在下方输入用户名和密码以完成身份验证设置', '身份验证');
        return;
      }
      
      // If we have both username and password, show success message
      this.notification.success('身份验证已启用。重启 Web 服务器以使更改生效。', '身份验证');
    } else {
      // Disabling authentication
      this.authenticationEnabled = false;
      this.configService.authenticationEnabled = false;
      
      // Clear username and password when disabling
      this.authenticationUsername = '';
      this.authenticationPassword = '';
      this.configService.authenticationUsername = '';
      this.configService.authenticationPassword = '';
      
      this.notification.info('Authentication disabled.', '身份验证');
    }
  }

  onAuthenticationUsernameChange(newValue: string) {
    this.authenticationUsername = newValue;
    this.configService.authenticationUsername = newValue;
    
    // Only show feedback when user finishes editing (on blur)
    if (this.authenticationEnabled && newValue.trim() && this.authenticationPassword.trim()) {
      this.notification.success('身份验证现已配置。重启 Web 服务器以使更改生效。', '身份验证');
    } else if (this.authenticationEnabled && !newValue.trim() && this.authenticationPassword.trim()) {
      this.notification.warning('身份验证需要用户名', '身份验证');
    }
  }

  onAuthenticationPasswordChange(newValue: string) {
    this.authenticationPassword = newValue;
    this.configService.authenticationPassword = newValue;
    
    // Only show feedback when user finishes editing (on blur)
    if (this.authenticationEnabled && newValue.trim() && this.authenticationUsername.trim()) {
      this.notification.success('身份验证现已配置。重启 Web 服务器以使更改生效。', '身份验证');
    } else if (this.authenticationEnabled && !newValue.trim() && this.authenticationUsername.trim()) {
      this.notification.warning('身份验证需要密码', '身份验证');
    }
  }

  onMaxBackupDownloadSizeChange(newValue: string) {
    const sizeValue = parseInt(newValue, 10);
    if (!isNaN(sizeValue) && sizeValue >= 1 && sizeValue <= 2048) {
      this.maxBackupDownloadSizeMB = sizeValue;
      this.configService.maxBackupDownloadSizeMB = sizeValue;
      this.notification.success(`Backup download size limit set to ${sizeValue}MB`, '设置');
    } else {
      this.notification.warning('Invalid size limit. Please enter a value between 1 and 2048 MB.', '设置');
      // Reset to current value
      setTimeout(() => {
        this.maxBackupDownloadSizeMB = this.configService.maxBackupDownloadSizeMB || 100;
      }, 100);
    }
  }

  onServerDataDir(path: string) {
    this.serverDataDir = path;
    this.configService.serverDataDir = path;
    this.notification.success('服务器数据目录已更新', '设置');
  }

  clearServerDataDir() {
    this.serverDataDir = '';
    this.configService.serverDataDir = '';
    this.notification.info('Server Data Directory reset to default. Restart required.', '设置');
  }

  onAutoUpdateArkServerChange(event: any) {
    const val = (event && typeof event === 'object' && event.target) ? event.target.checked : event;
    this.autoUpdateArkServer = val;
    this.configService.autoUpdateArkServer = val;
    this.notification.info(`Auto-Update Ark Server is now ${val ? 'Enabled' : 'Disabled'}`, '设置');
  }

  onUpdateWarningMinutesChange(val: string) {
    const minutes = parseInt(val, 10);
    if (!isNaN(minutes) && minutes >= 1 && minutes <= 60) {
      this.updateWarningMinutes = minutes;
      this.configService.updateWarningMinutes = minutes;
      this.notification.success(`Update Warning set to ${minutes} minutes`, '设置');
    } else {
      this.notification.warning('Invalid warning time (1-60 minutes).', '设置');
      setTimeout(() => {
        this.updateWarningMinutes = this.configService.updateWarningMinutes || 15;
      }, 100);
    }
  }

  selectServerDataDir() {
    if (!this.isElectron) return;
    this.messaging.sendMessage('select-directory', { title: '选择服务器数据目录' })
      .subscribe({
        next: (result: any) => {
          if (result && result.path) {
            this.onServerDataDir(result.path);
          } else if (result && result.error) {
            this.notification.error(result.error, '目录选择失败');
          }
        },
        error: (err: any) => {
          console.error('Failed to select directory:', err);
          this.notification.error('选择目录失败', '错误');
        }
      });
  }

  onSteamCmdDir(path: string) {
    this.steamCmdDir = path;
    this.saveGlobalConfig();
    this.notification.success('SteamCMD 目录已更新。需要重启。', '设置');
  }

  clearSteamCmdDir() {
    this.steamCmdDir = '';
    this.saveGlobalConfig();
    this.notification.success('SteamCMD 目录已重置为默认', '更改将在重启后生效');
    this.cdr.markForCheck();
  }

  selectSteamCmdDir() {
    this.subscriptions.push(this.messaging.sendMessage('select-directory', {}).subscribe((result: any) => {
      if (result && result.directory) {
        this.steamCmdDir = result.directory;
        this.saveGlobalConfig();
        this.notification.success('SteamCMD 目录已更新', '更改将在重启后生效');
        this.cdr.markForCheck();
      } else if (result && result.error) {
        this.notification.error(result.error, '选择目录失败');
      }
    }));
  }

  saveGlobalConfig() {
    const config = {
      authenticationEnabled: this.authenticationEnabled,
      authenticationUsername: this.authenticationUsername,
      authenticationPassword: this.authenticationPassword,
      maxBackupDownloadSizeMB: this.maxBackupDownloadSizeMB,
      serverDataDir: this.serverDataDir,
      steamCmdDir: this.steamCmdDir,
      autoUpdateArkServer: this.autoUpdateArkServer,
      updateWarningMinutes: this.updateWarningMinutes
    };

    this.subscriptions.push(this.messaging.sendMessage('save-global-config', config).subscribe((response: any) => {
      if (response && response.success) {
        // Notification handled by specific action methods
      } else {
        this.notification.error(response?.error || 'Failed to save configuration', 'Error');
      }
    }));
  }

}