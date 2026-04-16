// RCON Utilities - Uses the 'rcon' npm package (EventEmitter API)
// Note: Using require() due to lack of proper TypeScript definitions
const Rcon = require('rcon');

export const rconClients: Record<string, any> = {};

// Tracks instances that have an active connection retry loop in progress.
// Prevents multiple concurrent retry chains when connectRcon is called
// again before the previous attempt chain has finished (e.g. player poll
// passive reconnect fires while the initial startup loop is still running).
const rconConnecting = new Set<string>();

/**
 * Connect to RCON for a given instance.
 */
export function connectRcon(instanceId: string, config: any, onStatus?: (connected: boolean) => void) {
  if (rconClients[instanceId]) {
    if (onStatus) onStatus(true);
    return;
  }
  // Already have an active retry loop — don't start another one.
  if (rconConnecting.has(instanceId)) {
    return;
  }
  const port = parseInt(String(config.rconPort || 27020), 10);
  // RCON authenticates with ServerAdminPassword — same as the in-game admin password.
  // Fall back to legacy rconPassword field for backward compatibility.
  // Coerce to string — passwords may be stored as numbers in config JSON.
  const password = String(config.serverAdminPassword || config.rconPassword || '');
  // Use explicit IPv4 loopback — on Linux, 'localhost' may resolve to ::1 (IPv6)
  // which fails if ARK/Wine only binds to IPv4.
  const host = '127.0.0.1';
  // 30 attempts × 3 s = 90 s total window.
  // ARK on Linux/Proton can take 60+ seconds after the "advertising" log line before
  // the RCON port is actually bound, so 30 s (the old 15 × 2 s) was too short.
  const maxAttempts = 30;
  const retryDelayMs = 3000;
  let attempt = 0;

  rconConnecting.add(instanceId);

  function tryConnect() {
    attempt++;
    const rcon = new Rcon(host, port, password);
    let settled = false;

    // 20 秒认证超时（参考 ASAServerTool_web 的实现）
    // 如果 ARK 服务器 RCON 端口开放但认证不响应，防止连接永久挂起
    const authTimer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try { rcon.disconnect(); } catch (_) {}
      if (attempt < maxAttempts) {
        setTimeout(tryConnect, retryDelayMs);
      } else {
        console.error(`[RCON] All ${maxAttempts} connection attempts failed for ${instanceId}: auth timeout`);
        rconConnecting.delete(instanceId);
        if (onStatus) onStatus(false);
      }
    }, 20000);

    rcon.on('auth', () => {
      if (settled) return;
      settled = true;
      clearTimeout(authTimer);
      rconClients[instanceId] = rcon;    // 先注册客户端
      rconConnecting.delete(instanceId); // 再清除 connecting 标志
      if (onStatus) onStatus(true);

      // 连接建立后意外断开时，清理并通知
      rcon.once('end', () => {
        delete rconClients[instanceId];
        if (onStatus) onStatus(false);
      });
    });
    rcon.on('end', () => {
      if (settled) return; // 已由 auth 或 authTimer 处理
      if (attempt < maxAttempts) {
        settled = true;
        clearTimeout(authTimer);
        setTimeout(tryConnect, retryDelayMs);
        return;
      }
      settled = true;
      clearTimeout(authTimer);
      rconConnecting.delete(instanceId);
      delete rconClients[instanceId];
      if (onStatus) onStatus(false);
    });
    rcon.on('error', (err: any) => {
      if (settled) return;
      if (attempt < maxAttempts) {
        settled = true;
        clearTimeout(authTimer);
        // 只在第 1 次和每 5 次记录日志，避免刷屏
        if (attempt === 1 || attempt % 5 === 0) {
          console.log(`[RCON] Waiting for server ${instanceId} (attempt ${attempt}/${maxAttempts}): ${err.code || err.message}`);
        }
        setTimeout(tryConnect, retryDelayMs);
        return;
      }
      settled = true;
      clearTimeout(authTimer);
      console.error(`[RCON] All ${maxAttempts} connection attempts failed for ${instanceId}:`, err);
      rconConnecting.delete(instanceId);
      delete rconClients[instanceId];
      if (onStatus) onStatus(false);
    });
    rcon.connect();
  }

  tryConnect();
}

/**
 * Disconnect from RCON for a given instance.
 */
export function disconnectRcon(instanceId: string) {
  rconConnecting.delete(instanceId);
  if (rconClients[instanceId]) {
    try {
      rconClients[instanceId].disconnect();
    } catch (error) {
      console.error(`[rcon-utils] Error disconnecting RCON for ${instanceId}:`, error);
    }
    delete rconClients[instanceId];
  }
}

/**
 * Send an RCON command to a connected instance.
 */
export function sendRconCommand(instanceId: string, command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const rcon = rconClients[instanceId];
    if (!rcon) return reject(new Error('RCON not connected'));
    rcon.send(command);
    rcon.once('response', (str: string) => {
      resolve(str);
    });
    rcon.once('error', (err: any) => {
      reject(err);
    });
  });
}

/**
 * Check if RCON is connected for a given instance.
 */
export function isRconConnected(instanceId: string): boolean {
  return !!rconClients[instanceId];
}

/**
 * Check if a RCON connection attempt is currently in progress for a given instance.
 */
export function isRconConnecting(instanceId: string): boolean {
  return rconConnecting.has(instanceId);
}

// Inline exports are used above

/**
 * Cleanup function to disconnect all RCON clients
 * Should be called when the Electron app is shutting down
 */
export function cleanupAllRconConnections(): void {
  Object.keys(rconClients).forEach((instanceId) => {
    disconnectRcon(instanceId);
  });
}
