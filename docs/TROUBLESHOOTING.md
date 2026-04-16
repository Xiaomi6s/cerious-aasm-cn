# 故障排除指南 - Cerious AASM

## 目录
1. [常见问题](#常见问题)
2. [安装问题](#安装问题)
3. [服务器问题](#服务器问题)
4. [网络与连接](#网络与连接)
5. [性能问题](#性能问题)
6. [备份与恢复问题](#备份与恢复问题)
7. [错误代码](#错误代码)
8. [日志分析](#日志分析)
9. [高级故障排除](#高级故障排除)
10. [获取支持](#获取支持)

## 常见问题

### 应用程序无法启动

**症状**: 应用程序无法启动或立即崩溃

**解决方案**:
1. **检查系统要求**:
   - Windows 10+ 或近期的 Linux 发行版
   - 最低 4GB 内存
   - 50GB 可用磁盘空间
   - 管理员权限

2. **更新依赖**:
   ```powershell
   # Windows - 更新 Visual C++ Redistributables
   # 从 Microsoft 网站下载
   
   # Linux - 更新系统库
   sudo apt update && sudo apt upgrade
   ```

3. **以管理员身份运行** (Windows):
   - 右键单击应用程序 → “以管理员身份运行”

4. **检查防病毒软件**:
   - 将安装目录列入白名单
   - 暂时禁用实时扫描

### SteamCMD 下载失败

**症状**: 初始设置失败，SteamCMD 无法下载

**解决方案**:
1. **检查互联网连接**:
   - 验证互联网连接是否稳定
   - 用其他下载进行测试

2. **防火墙配置**:
   ```powershell
   # Windows PowerShell（以管理员身份）
   New-NetFirewallRule -DisplayName "Cerious AASM" -Direction Inbound -Protocol TCP -LocalPort 27015-27020 -Action Allow
   New-NetFirewallRule -DisplayName "SteamCMD" -Direction Outbound -Program "C:\path\to\steamcmd.exe" -Action Allow
   ```

3. **手动安装 SteamCMD**:
   - 从 Valve 手动下载 SteamCMD
   - 解压到 `installation_directory/steamcmd/`
   - 重启应用程序

4. **代理/公司网络**:
   - 在应用程序设置中配置代理
   - 联系 IT 部门将 Steam 域名列入白名单

### 服务器文件无法下载

**症状**: 方舟服务器安装挂起或失败

**解决方案**:
1. **磁盘空间**:
   - 确保有 25GB+ 的可用空间用于方舟服务器文件
   - 清理临时文件

2. **Steam 登录问题**:
   - 重新启动 SteamCMD 下载
   - 检查 Steam 服务器状态

3. **部分下载恢复**:
   - 删除未完成的下载文件夹
   - 重新启动安装过程

4. **网络超时**:
   - 在配置中增加超时设置
   - 尝试在非高峰时段下载

## 安装问题

### Windows 安装问题

**错误**: “Windows 无法验证此软件的发布者”
- **解决方案**: 右键单击安装程序 → 属性 → 勾选“解除锁定” → 确定

**错误**: “此应用无法在你的电脑上运行”
- **解决方案**: 确保使用的是 64 位 Windows 10 或更高版本

**错误**: 缺少 DLL 文件
- **解决方案**: 安装 Visual C++ Redistributable 2019 或更高版本

### Linux 安装问题

**错误**: 权限被拒绝
```bash
# 修复权限
chmod +x cerious-aasm.AppImage
sudo chmod +x /opt/cerious-aasm/cerious-aasm
```

**错误**: 缺少依赖
```bash
# Ubuntu/Debian
sudo apt install libnss3 libatk-bridge2.0-0 libdrm2 libgtk-3-0

# CentOS/RHEL
sudo yum install nss atk at-spi2-atk gtk3
```

**错误**: AppImage 无法运行
```bash
# 启用 FUSE
sudo apt install fuse
sudo modprobe fuse

# 或直接提取并运行
./cerious-aasm.AppImage --appimage-extract
./squashfs-root/cerious-aasm
```

### Linux 无头模式崩溃 (`Gtk-ERROR: Can't create a GtkStyleContext without a display connection`)

**原因**: Electron 在原生二进制级别初始化 GTK，*早于*任何 JavaScript 运行。GTK 需要实时的显示连接（X11 或 Wayland）。在没有显示器的无头服务器上，无论是否带有 `--headless` 标志，进程都会立即崩溃并生成核心转储。

**修复方法**: 使用 `xvfb-run` 创建一个 GTK 可以连接的虚拟帧缓冲。

1. **安装 xvfb**:
   ```bash
   # Debian / Ubuntu
   sudo apt install xvfb

   # Fedora / RHEL / Rocky
   sudo dnf install xorg-x11-server-Xvfb
   ```

2. **AppImage / 系统安装的二进制文件** – 使用捆绑的辅助脚本:
   ```bash
   # 将辅助脚本复制到方便的位置
   sudo cp /path/to/cerious-aasm-headless-appimage.sh /usr/local/bin/cerious-aasm-headless
   sudo chmod +x /usr/local/bin/cerious-aasm-headless

   # 运行（脚本会自动检测二进制文件并添加 xvfb-run）
   cerious-aasm-headless --auth-enabled --password=admin123 --port=3000
   ```
   或者不使用脚本直接运行:
   ```bash
   xvfb-run -a cerious-aasm --no-sandbox --headless --auth-enabled --password=admin123 --port=3000
   ```

3. **源码 / 开发构建** – 使用现有的辅助脚本:
   ```bash
   ./scripts/cerious-aasm-headless.sh --auth-enabled --password=admin123 --port=3000
   ```
   脚本会检测到没有显示器并自动调用 `xvfb-run -a`。

4. **systemd 服务** – 在 `ExecStart` 行中添加 `xvfb-run` 包装器:
   ```ini
   [Service]
   ExecStart=/usr/bin/xvfb-run -a /usr/bin/cerious-aasm --no-sandbox --headless --auth-enabled --password=<password> --port=3000
   ```

## 服务器问题

### 服务器无法启动

**症状**: 尝试启动后服务器状态仍为“已停止”

**诊断步骤**:
1. **检查服务器日志**:
   - 打开应用程序中的日志部分
   - 查找服务器启动过程中的错误消息

2. **验证端口可用性**:
   ```powershell
   # Windows
   netstat -an | findstr "27015"
   
   # Linux
   netstat -ln | grep 27015
   ```

3. **检查文件完整性**:
   - 使用服务器设置中的“验证文件”选项
   - 如果验证失败则重新下载

**常见修复方法**:
- **端口冲突**: 在配置中更改服务器端口
- **文件损坏**: 验证/重新安装服务器文件
- **内存不足**: 增加系统内存或减少服务器数量
- **防火墙阻止**: 配置防火墙规则

### 服务器频繁崩溃

**症状**: 服务器意外停止，自动重启

**诊断步骤**:
1. **查看崩溃日志**:
   - 检查 `Logs/Crashes/` 目录
   - 寻找一致的错误模式

2. **监控系统资源**:
   - 检查崩溃前的内存使用情况
   - 监控 CPU 温度

**解决方案**:
- **内存问题**: 增加分配的内存或减少最大玩家数
- **模组冲突**: 逐个禁用模组以找出冲突项
- **过热**: 改善系统散热
- **计划重启**: 定期重启以防止内存泄漏

### 玩家无法连接

**症状**: 服务器显示在线但玩家无法加入

**诊断步骤**:
1. **测试本地连接**:
   - 尝试从同一台机器连接
   - 使用服务器 IP: `127.0.0.1:27015`

2. **检查外部连接**:
   - 从不同的网络测试
   - 使用在线端口检查工具

**解决方案**:
1. **路由器配置**:
   ```
   端口转发规则:
   TCP: 27015 (游戏端口)
   TCP: 27020 (RCON 端口)
   UDP: 7777-7778 (查询端口)
   ```

2. **防火墙规则**:
   ```powershell
   # Windows
   New-NetFirewallRule -DisplayName "ARK Server" -Direction Inbound -Protocol TCP -LocalPort 27015 -Action Allow
   New-NetFirewallRule -DisplayName "ARK Query" -Direction Inbound -Protocol UDP -LocalPort 7777-7778 -Action Allow
   ```

3. **Steam 可见性**:
   - 在设置中启用 Steam 服务器列表
   - 等待 5-10 分钟以供 Steam 发现

## 网络与连接

### Web 界面无法访问

**症状**: 无法在 localhost:3000 访问 Web 界面

**解决方案**:
1. **检查 Web 服务器状态**:
   - 在应用程序日志中验证 Web 服务器是否正在运行
   - 检查端口绑定错误

2. **端口冲突**:
   ```powershell
   # 检查端口 3000 是否被占用
   netstat -an | findstr "3000"
   ```
   - 在设置中更改 Web 界面端口

3. **浏览器问题**:
   - 尝试使用不同的浏览器
   - 清除浏览器缓存和 cookie
   - 禁用浏览器扩展

4. **防火墙阻止**:
   ```powershell
   # 允许 Web 界面端口
   New-NetFirewallRule -DisplayName "Cerious Web" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
   ```

### RCON 连接失败

**症状**: 无法连接到服务器控制台 (RCON)

**解决方案**:
1. **验证 RCON 设置**:
   - 检查服务器配置中的 RCON 端口
   - 确保已设置 RCON 密码

2. **网络配置**:
   - 允许 RCON 端口通过防火墙
   - 检查是否有其他服务使用了 RCON 端口

3. **服务器状态**:
   - RCON 仅在服务器运行时工作
   - 如果 RCON 停止响应，请重启服务器

## 性能问题

### CPU 使用率过高

**症状**: 应用程序或服务器消耗过多 CPU

**解决方案**:
1. **减少服务器负载**:
   - 降低最大玩家数
   - 减少 NPC/恐龙生成率
   - 禁用占用大量资源的模组

2. **系统优化**:
   - 关闭不必要的后台应用程序
   - 将服务器进程优先级设置为“高”
   - 确保散热良好

3. **配置调优**:
   ```
   减少 CPU 负载的服务器设置:
   - 降低视野距离
   - 减少建筑限制
   - 禁用某些视觉效果
   ```

### 内存泄漏

**症状**: 内存使用量随时间不断增加

**解决方案**:
1. **定期重启**:
   - 安排每日服务器重启
   - 每周重启一次应用程序

2. **配置调整**:
   - 减少占用大量内存的设置
   - 降低玩家和建筑限制

3. **监控使用情况**:
   - 使用任务管理器 (Windows) 或 htop (Linux)
   - 跟踪内存使用模式

### 文件操作缓慢

**症状**: 备份/恢复操作耗时极长

**解决方案**:
1. **存储优化**:
   - 使用 SSD 代替 HDD
   - 对硬盘进行碎片整理（仅限 HDD）
   - 确保有足够的可用空间

2. **压缩设置**:
   - 降低备份压缩级别
   - 使用更快的压缩算法

3. **防病毒软件排除项**:
   - 将安装目录排除在实时扫描之外
   - 将备份目录排除在扫描之外

## 备份与恢复问题

### 创建备份失败

**症状**: 备份过程已开始但无法完成

**解决方案**:
1. **磁盘空间**:
   - 确保备份目录中有足够的空间
   - 自动清理旧备份

2. **文件权限**:
   ```powershell
   # Windows - 获取服务器文件的所有权
   takeown /f "C:\ARK-Servers" /r /d y
   icacls "C:\ARK-Servers" /grant Users:F /t
   ```

3. **活动文件锁定**:
   - 在创建备份之前停止服务器
   - 关闭服务器目录中的任何文件浏览器

### 恢复操作失败

**症状**: 备份恢复已开始但未完成

**解决方案**:
1. **备份完整性**:
   - 验证备份文件未损坏
   - 尝试从其他备份中恢复

2. **服务器状态**:
   - 确保目标服务器已完全停止
   - 等待所有进程关闭

3. **文件冲突**:
   - 在恢复之前清理目标目录
   - 检查是否有只读文件

### 导入/导出问题

**症状**: 服务器导入失败或产生错误

**解决方案**:
1. **版本兼容性**:
   - 确保备份是使用兼容版本创建的
   - 检查方舟服务器版本兼容性

2. **配置验证**:
   - 验证备份中的服务器配置
   - 更新新安装的路径

## 错误代码

### 常见应用程序错误

**错误代码: STEAM_001**
- **含义**: SteamCMD 初始化失败
- **解决方案**: 重新安装 SteamCMD，检查网络连接

**错误代码: SERVER_002**
- **含义**: 服务器启动超时
- **解决方案**: 增加启动超时时间，检查服务器文件

**错误代码: BACKUP_003**
- **含义**: 备份操作权限被拒绝
- **解决方案**: 以管理员身份运行，检查文件权限

**错误代码: NETWORK_004**
- **含义**: 端口绑定失败
- **解决方案**: 检查端口冲突，更改端口配置

**错误代码: FILE_005**
- **含义**: 文件系统错误
- **解决方案**: 检查磁盘空间，验证文件权限

### 方舟服务器错误

**"Failed to bind to port" (绑定端口失败)**
- 端口已被其他应用程序占用
- 更改服务器端口或停止冲突的应用程序

**"Memory allocation failed" (内存分配失败)**
- 系统内存不足
- 减少最大玩家数或增加系统内存

**"Map not found" (找不到地图)**
- 缺少或损坏的地图文件
- 验证服务器文件或重新安装

## 日志分析

### 应用程序日志
位置: `%APPDATA%/cerious-aasm/logs/` (Windows) 或 `~/.config/cerious-aasm/logs/` (Linux)

**重要日志文件**:
- `main.log`: 一般应用程序事件
- `server-{id}.log`: 单个服务器日志
- `backup.log`: 备份/恢复操作
- `error.log`: 应用程序错误和异常

### 读取日志模式

**正常启动**:
```
[INFO] Application started successfully (应用程序成功启动)
[INFO] SteamCMD initialized (SteamCMD 初始化完成)
[INFO] Web server listening on port 3000 (Web 服务器监听端口 3000)
```

**服务器问题**:
```
[ERROR] Server failed to start: Port 27015 in use (服务器启动失败：端口 27015 被占用)
[WARNING] High memory usage detected: 85% (检测到内存使用率高：85%)
[ERROR] Backup failed: Insufficient disk space (备份失败：磁盘空间不足)
```

### 日志级别
- **DEBUG**: 详细的技术信息
- **INFO**: 一般操作消息
- **WARNING**: 可能的问题，但不会停止操作
- **ERROR**: 阻碍正常操作的问题
- **CRITICAL**: 可能导致应用程序崩溃的严重错误

## 高级故障排除

### 进程监控

**Windows**:
```powershell
# 监控方舟服务器进程
Get-Process | Where-Object {$_.ProcessName -like "*ARK*"}

# 检查端口使用情况
netstat -ano | findstr "27015"
```

**Linux**:
```bash
# 监控进程
ps aux | grep -i ark

# 检查端口使用情况
ss -tuln | grep 27015

# 监控系统资源
htop
```

### 数据库问题

**症状**: 配置未保存，应用程序在启动时崩溃

**解决方案**:
1. **重置配置**:
   ```powershell
   # Windows
   Remove-Item "$env:APPDATA\cerious-aasm\config.db" -Force
   
   # Linux
   rm ~/.config/cerious-aasm/config.db
   ```

2. **备份配置**:
   - 在进行重大更改之前导出设置
   - 保留工作配置的备份

### 网络诊断

**测试服务器连接**:
```powershell
# 测试游戏端口
Test-NetConnection -ComputerName "your-server-ip" -Port 27015

# 测试 Web 界面
Test-NetConnection -ComputerName "localhost" -Port 3000
```

**追踪网络问题**:
```bash
# Linux 网络调试
traceroute your-server-ip
tcpdump -i any port 27015
```

## 获取支持

### 在请求帮助之前

1. **收集信息**:
   - 操作系统及版本
   - Cerious AASM 版本
   - 具体的错误消息
   - 重现问题的步骤

2. **收集日志文件**:
   - 应用程序日志（过去 24 小时）
   - 服务器日志（如果与服务器相关）
   - 系统事件日志（针对崩溃）

3. **尝试基本解决方案**:
   - 重启应用程序
   - 重启服务器
   - 检查系统资源
   - 回顾最近的更改

### 支持渠道

1. **GitHub Issues**:
   - 错误报告：提供详细的重现步骤
   - 功能请求：解释用例和好处
   - 问题：首先检查现有的 issue

2. **文档**:
   - 查阅用户手册以获取功能说明
   - 检查安装指南以解决设置问题

3. **社区论坛**:
   - 用户间支持
   - 分享配置和技巧
   - 社区故障排除

### 创建有效的错误报告

**模板**:
```
**环境**:
- 操作系统: Windows 10 Pro 64-bit
- 版本: Cerious AASM v1.0.0
- 内存: 16GB
- 存储: SSD

**问题描述**:
对问题的清晰描述

**重现步骤**:
1. 第一步
2. 第二步
3. 问题发生

**预期行为**:
应该发生什么

**实际行为**:
实际发生了什么

**日志文件**:
[附加相关日志文件]

**截图**:
[如果适用]
```

### 紧急程序

**完整系统恢复**:
1. 停止所有服务器
2. 备份当前配置
3. 卸载应用程序
4. 清理安装目录
5. 重新安装应用程序
6. 从备份中恢复服务器数据

**数据恢复**:
- 服务器存档文件: `ARK-Servers/{server-name}/ShooterGame/Saved/`
- 配置: `%APPDATA%/cerious-aasm/`
- 备份: 默认备份目录或自定义位置
