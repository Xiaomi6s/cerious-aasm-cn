# Linux 上方舟服务器的 Wine/Proton 兼容性

## 概览

从《方舟：生存飞升》服务器版本 **83.21** 开始，专属服务器在 Linux 上的 Wine/Proton 环境下运行时，会在启动期间出现严重的卡死现象。本文档解释了该问题、修复方法以及配置选项。

## 问题

### 症状
- 服务器进程启动但在打印约 41 行日志后卡死
- 卡死前的最后一条日志记录: `[LogSentrySdk: Verbose: request handled in XXXms]`
- 服务器消耗极少的 CPU 并且看起来完全挂起
- 没有生成错误消息或崩溃转储
- 此问题影响 **所有** 版本的 Cerious AASM（并非特定于本应用程序）

### 根本原因
方舟服务器 v83.21+ 引入了与 Wine/Proton 的 Windows 兼容层的兼容性问题：

1. **Sentry SDK 初始化挂起**：虚幻引擎的崩溃报告系统 (Sentry) 由于 Wine 的网络堆栈问题在 HTTP 请求期间挂起。
2. **挂起检测系统**：虚幻引擎的挂起检测机制本身在 Wine 下运行时会导致卡死。
3. **Steam API 冲突**：不必要的 Steam API 集成干扰了 Wine 的进程管理。
4. **RHI 线程问题**：渲染硬件接口 (Render Hardware Interface) 线程在 Wine 的线程实现中导致死锁。

## 修复方法

Cerious AASM 现在会在 Linux 上自动应用 Wine/Proton 兼容性修复：

### 1. Wine DLL 覆盖
**文件**: `electron/utils/ark/ark-server/ark-server-paths.utils.ts`

强制为关键的网络和加密库使用原生的 Wine 实现：
```typescript
WINEDLLOVERRIDES: 'mshtml=d;winhttp=n,b;bcrypt=n,b;crypt32=n,b'
```

- `mshtml=d`: 禁用 IE/HTML 渲染（不需要）
- `winhttp=n,b`: 原生 Wine HTTP 实现
- `bcrypt=n,b`: 原生 Wine 加密
- `crypt32=n,b`: 原生 Wine 证书处理

### 2. 虚幻引擎兼容性标志
**文件**: `electron/utils/ark/ark-args.utils.ts`

在 Linux 上自动添加这些命令行标志：
```typescript
-NoHangDetection  // 禁用挂起检测系统
-NOSTEAM          // 禁用 Steam API
-norhithread      // 禁用 RHI 渲染线程
```

在以下情况下，这些标志会被 **自动应用**：
- 平台为 Linux
- `disableWineCompatFlags` 未设置为 `true`

## 配置选项

### 禁用兼容性标志（仅限高级用户）

如果这些标志导致您的特定设置出现问题，您可以禁用它们：

**在服务器配置 JSON 中**:
```json
{
  "id": "my-server",
  "name": "My ARK Server",
  "disableWineCompatFlags": true
}
```

**警告**: 禁用这些标志可能会导致服务器在方舟 v83.21+ 的启动期间卡死。仅在以下情况下禁用：
- 您正在使用带有修复程序的自定义 Wine/Proton 构建
- 您已将方舟服务器降级到 < v83.21
- 您正在测试替代的解决方法

## 验证

应用修复后，验证服务器是否成功启动：

1. 通过 Cerious AASM 启动您的方舟服务器
2. 监控日志文件: `~/.local/share/cerious-aasm/AASMServer/ShooterGame/Saved/Logs/ShooterGame.log`
3. 服务器应越过 Sentry 初始化行
4. 寻找启动完成的指示，例如：
   - `[LogWorld: Log: Bringing World /Game/Maps/TheIsland_WP.TheIsland_WP up for play`
   - `[LogNet: Log: Game class is 'ShooterGameMode'`

## 故障排除

### 服务器仍然卡死

1. **检查 Wine 版本**: 确保您使用的是 GE-Proton 10-15 或更高版本
2. **验证已应用标志**: 使用 `ps aux | grep ArkAscendedServer` 检查服务器进程
3. **检查 Wine 容器 (Prefix)**: 删除并重新创建: `rm -rf ~/.local/share/cerious-aasm/.wine-ark`
4. **启用调试日志**: 临时添加到 `ark-server-paths.utils.ts`:
   ```typescript
   PROTON_LOG: '1',
   WINEDEBUG: '+timestamp,+seh'
   ```
   在 `~/steam-*.log` 中检查日志

### 性能问题

如果服务器运行但存在性能问题：

1. 尝试逐个禁用标志以找出罪魁祸首
2. 首先在没有 `-norhithread` 的情况下进行测试（最不可能影响专属服务器）
3. 考虑升级 Proton 版本
4. 检查 Wine/Proton 的 GitHub issues 以获取针对方舟的修复

## 技术细节

### 为什么这会影响所有版本

卡死是由 **方舟服务器可执行文件本身**（版本 83.21+）引起的，而不是 Cerious AASM 代码。这意味着：
- 回退 Cerious AASM 版本没有帮助
- 在方舟服务器降级或 Wine/Proton 修复之前，该问题将一直存在
- 所有在 Wine 下运行方舟的服务器管理工具都会受到影响

### 平台检测

修复是特定于平台的：
- **Windows**: 原生执行，不需要标志
- **Linux**: 自动应用 Wine/Proton 兼容性标志

### 未来的方舟更新

监控方舟服务器的更新，以获取：
- 内置的 Wine/Proton 支持
- 修复 Wine 兼容性的 Sentry SDK 更新
- 虚幻引擎官方的 `-NoWine` 或类似标志

## 参考资料

- 方舟服务器版本: 83.21+
- Proton 版本: GE-Proton 10-15
- 发现问题: 2026年3月1日
- 应用修复: 2026年3月1日

## 贡献

如果您发现替代的修复或解决方法，请贡献：
1. 在干净的 Wine 容器 (prefix) 上进行彻底测试
2. 记录哪些方舟服务器版本有效
3. 注意任何副作用或对性能的影响
4. 提交包含您的发现的 pull request
