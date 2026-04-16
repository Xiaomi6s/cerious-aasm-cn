# 功能实现计划与差距分析

基于用户反馈（高级用户 / 集群管理员）以及对当前 `Cerious-AASM` 代码库（Angular 19+ 前端，Electron 后端）的代码分析。

## 当前状态分析

关于用户的请求，当前代码库存在以下限制：
*   **存储：** 路径被硬编码在 `electron/services/directory.service.ts` 中的 `getDefaultInstallDir()`，强制使用 `%AppData%`。
*   **共享文件：** 应用程序目前使用共享二进制文件的方法。`DirectoryService` 将所有实例指向单个 `ShooterGame` 安装的子目录。这节省了磁盘空间，但破坏了需要二进制文件夹（`Win64/ArkApi`）中按实例配置的 `ArkApi` 插件。
*   **自动化：** 后端服务存在（`AutomationService`、`CrashDetectionService`、`ScheduledRestartService`），但它们似乎在 UI 中没有完全暴露，或者缺乏所请求的特定“自动更新”组件。
*   **配置：** `ArkConfigService.ts` 使用硬编码的 `asaSettingsMapping` 数组。不在此数组中的设置无法更改。没有原始的 INI 读写能力。
*   **内存报告：** `ServerMonitoringService` 尝试轮询内存，但通常报告为“0MB”，这可能是因为在启动器生成实际游戏服务器后，`getProcessMemoryUsage` 未能锁定正确的子 PID。

---

## 优先功能列表与实现细节

### 1. 修复安装与存储（关键用户体验）
**问题：** 硬编码的 `%AppData%` 路径、隐晦的安装错误以及不一致的进度条。
**实现：**
*   **设置存储：** 修改 `DirectoryService.ts` 以从持久化的 `user-config.json`（与应用程序分离）读取存储 `installPath`。
*   **安装程序逻辑：** 更新 `electron/services/server-installer.service.ts` 以捕获特定的 SteamCMD 错误（磁盘空间、网络），并将结构化的错误代码显示到 UI，而不是一般的失败。
*   **UI 工作流：** 在 Angular 中添加“首次运行”向导，在初始化应用程序之前询问安装位置。

### 2. 实现“结构隔离”（服务器 API 支持）
**问题：** 共享二进制文件阻碍了需要每个服务器配置的服务器 API 插件的使用。
**实现：**
*   **策略：** 从“共享二进制文件”转移到“联接链接”（目录联接）。
*   **逻辑：** 创建新实例时：
    1.  为服务器创建一个特定的文件夹（例如，`servers/Instance_A`）。
    2.  使用 `fs.symlink`（或 Windows 上的 `mklink /J`）从“主”安装链接沉重的 `Content` 和 `ShooterGame/Binaries` 文件夹。
    3.  **例外：** 保持 `ShooterGame/Binaries/Win64/ArkApi` 和 `ShooterGame/Saved` 作为实例中*真实的*、独立的文件夹。 
*   **优势：** 插件按服务器工作（隔离配置），无效的 webhook 不会使整个集群崩溃，但磁盘空间使用率保持在较低水平（90% 共享）。

### 3. 高级 / INI 编辑器模式
**问题：** 高级用户无法配置硬编码映射中缺失的设置，也无法处理特定于模组的 INI 部分。
**实现：**
*   **后端：** 添加 `electron/services/ini-file.service.ts`。使用自定义解析器来保留注释（对于方舟配置导航至关重要）。
*   **API：** 创建端点 `getIniFile(instanceId, 'GameUserSettings.ini')` 和 `saveIniFile(...)`。
*   **前端：** 添加“专家模式”选项卡。使用 Monaco Editor 的 Angular 包装器（`ngx-monaco-editor`）为 `.ini` 文件提供语法高亮。
*   **切换开关：** 每个服务器添加一个通用的“由 AASM 管理”布尔值。如果为 `false`，则禁用 UI 表单字段，仅允许原始文本编辑。

### 4. 自动更新系统
**问题：** 在当前的自动化套件中完全缺失。
**实现：**
*   **新服务：** 创建 `electron/services/automation/auto-update.service.ts`。
*   **逻辑：**
    1.  **轮询：** 每 15-30 分钟运行 `steamcmd +login anonymous +app_info_update 2430930 +app_info_print 2430930 +quit`。
    2.  **比较：** 将 `buildid` 与当前安装的版本/本地清单进行比较。
    3.  **触发：** 如果不同，触发 `MessagingService` 警告玩家（RCON 广播），等待 15 分钟，发出 `ServerInstanceService.stop()`，运行 `ArkUpdateService`，最后 `ServerInstanceService.start()`。
    4.  **集群感知：** 顺序或有效地同时更新集群中所有链接的服务器，以尽量减少停机时间。

### 5. 健壮的进程管理（内存与停止逻辑）
**问题：** 报告 0MB 内存并在停止时挂起。
**实现：**
*   **内存：** `ShooterGameServer.exe` 会生成一个子进程。当前的 `process.pid` 可能指向启动器。使用 `ps-list` 查找具有相同名称且消耗最多内存的子进程。
*   **停止超时：** 在 `ServerInstanceService` 中，停止逻辑发送 `DoExit`。如果服务器正在保存，它将忽略此命令。
    *   **修复：** 首先发送 RCON `SaveWorld`。等待“World Saved”日志行（正则表达式匹配）。*然后* 发送 `DoExit`。
    *   **强制结束：** 添加硬超时（可配置，默认 2 分钟）。如果仍在运行，请在 PID 上使用 `tree-kill`。

### 6. 服务器 API 插件管理器
**问题：** 对于集群插件（跨服聊天、商店、权限）至关重要。
**实现：**
*   **集成：** 依赖于步骤 #2 中的隔离。
*   **下载：** 自动从 ArkServerApi 存储库下载最新的 `version.json`。
*   **UI：** 创建一个视图以列出 `.../Win64/ArkApi/Plugins` 中的文件夹。读取 `PluginInfo.json` 以在 UI 中显示版本/作者。

### 7. 集群控制“全部启动/停止”
**问题：** 逐个管理 4 个服务器很繁琐。
**实现：**
*   **批处理操作：** 添加 `ServerManagementService.startCluster(clusterId)`。
*   **交错：** 实现一个队列以防止 CPU 阻塞：启动服务器 1 -> 等待“Server is up”日志行 -> 启动服务器 2。

### 8. CurseForge 集成（锦上添花）
**问题：** 手动输入 ID 列表是过时的用户体验。
**实现：**
*   **前端：** 使用 CurseForge API 添加“模组浏览器”组件。
*   **后端：** 如有必要，通过 Electron 代理请求以避免 CORS 问题。
*   **操作：** “安装”按钮只需将 Mod ID 附加到 `GameUserSettings.ini` 中的 `ActiveMods` 字符串中。

---

## 优先级建议

1.  **P0 - 关键：** 修复存储位置（#1）和停止逻辑/进程管理（#5）。
2.  **P1 - 高：** 自动更新（#4）和服务器结构隔离（#2）。
3.  **P2 - 中：** INI 编辑器（#3）和集群控制（#7）。
4.  **P3 - 低：** CurseForge 集成（#8）。
