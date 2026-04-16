# Cerious-AASM  
**方舟：生存飞升 服务器管理器 (桌面版 + 无头模式)**  

## 概览
Cerious-AASM 是一款用于管理《方舟：生存飞升》专属服务器的桌面应用程序。它提供了一个用户友好的界面，用于在您的机器上安装、配置和控制方舟服务器。该应用程序支持桌面（GUI）和无头（基于 Web）模式。

## 加入 Discord
- Cerious - AASM https://discord.gg/n5SxyDRPAa

## 功能特性
- 使用 SteamCMD 安装和更新方舟服务器
- 管理多个服务器实例
- 实时玩家数量和服务器状态
- RCON 命令支持
- 自动端口检查和通知
- 带有广播的优雅服务器关闭
- **支持可选身份验证的无头模式 Web 界面**
- **用于服务器部署的命令行参数**

## 运行模式

### 桌面模式（默认）
带有完整 GUI 界面的标准 Electron 应用程序。

### 无头模式
在没有 GUI 的情况下运行应用程序，提供基于 Web 的访问。

#### 开发模式（npm 脚本）
```bash
# 无身份验证运行
npm run headless

# 自定义端口运行
npm run headless -- --port=8080

# 使用默认身份验证运行（用户名：admin，密码：admin123）
npm run headless:auth

# 使用自定义凭据运行
npm run headless:auth:custom
```

#### 生产模式（安装包）
在 Linux 上使用已安装的 `.deb`、`.rpm` 或 AppImage 包时：

```bash
# 基础无头模式
cerious-aasm --no-sandbox --headless

# 自定义端口
cerious-aasm --no-sandbox --headless --port=8080

# 启用身份验证（默认用户名：admin）
cerious-aasm --no-sandbox --headless --auth-enabled --password=admin123 --port=3000

# 自定义凭据
cerious-aasm --no-sandbox --headless --auth-enabled --username=myuser --password=mypassword

# 包含所有选项的完整示例
cerious-aasm --no-sandbox --headless --port=5000 --auth-enabled --username=admin --password=secret123
```

**Linux 用户注意事项：** 由于 Chrome 沙盒限制，在 Linux 上以无头模式运行时需要使用 `--no-sandbox` 标志。此标志仅用于无头模式，GUI 版本不需要。

#### 命令行参数
- `--port=<port>` - 设置 Web 服务器端口（默认：3000）
- `--auth-enabled` - 启用 Web 界面身份验证
- `--username=<username>` - 设置身份验证用户名（默认：admin）
- `--password=<password>` - 设置身份验证密码（与 --auth-enabled 一起使用时必填）
- `--help` 或 `-h` - 显示帮助信息

#### 示例
```bash
# 开发环境：在 8080 端口无身份验证的无头模式
npm run headless -- --port=8080

# 生产环境：在默认端口带身份验证的无头模式
cerious-aasm --no-sandbox --headless --auth-enabled --username=admin --password=secret123

# 生产环境：在自定义端口带身份验证的无头模式
cerious-aasm --no-sandbox --headless --port=5000 --auth-enabled --password=mypassword
```

## 安装过程
- **本应用程序不捆绑或分发任何方舟文件。**
- 所有方舟服务器文件均使用 SteamCMD 直接从 Steam 的官方服务器下载。
- 该应用使用公共的 SteamCMD 工具并匿名登录，以获取最新的方舟服务器文件。
- 您必须拥有有效的 Steam 账户并遵守 Studio Wildcard 的服务条款。

## 法律与合规声明
- Cerious-AASM **不** 重新分发、修改或捆绑任何受版权保护的《方舟：生存飞升》文件。
- 所有下载均通过官方 SteamCMD 工具直接从 Steam 服务器进行。
- 用户有责任确保他们有权运行方舟服务器，并遵守所有相关的 EULA 和服务条款。
- 此工具仅用于合法的服务器管理。

## 支持与文档
- 如需帮助、错误报告或功能请求，请访问项目仓库或联系开发者。
- 有关方舟服务器文档，请参阅[官方方舟维基](https://ark.wiki.gg/)。

## 鸣谢
- 《方舟：生存飞升》版权归 Studio Wildcard 所有。
- SteamCMD 版权归 Valve Corporation 所有。
- 本项目不隶属于 Studio Wildcard 或 Valve，也未获得其认可。
[![GitHub stars](https://img.shields.io/github/stars/ryoucerious/cerious-aasm?style=flat-square)](https://github.com/ryoucerious/cerious-aasm/stargazers)  
[![GitHub release](https://img.shields.io/github/v/release/ryoucerious/cerious-aasm?style=flat-square)](https://github.com/ryoucerious/cerious-aasm/releases)  
[![License](https://img.shields.io/github/license/ryoucerious/cerious-aasm?style=flat-square)](LICENSE)  
[![Platforms](https://img.shields.io/badge/platform-Windows%20%7C%20Linux-blue?style=flat-square)](#-linux-support)  

---

## 🚀 概览  
**Cerious-AASM** 是一款用于托管和管理**《方舟：生存飞升》**专属服务器的跨平台工具。  

它**免费**、**开源**，并提供**一流的 Linux 支持**。无论您是在家中运行桌面服务器，还是在 Linux 主机上进行无头部署，Cerious-AASM 都能让服务器管理变得简单、可靠且自动化。  

---

## 🧰 核心功能  

- 🖥️ **跨平台** – 在 **Windows** 和 **Linux** 上无缝运行  
- ⚙️ **服务器自动化**  
  - 🔄 **自动启动** – 服务器随 Cerious-AASM 自动启动  
  - 💥 **崩溃恢复** – 检测崩溃并自动重启服务器  
  - ⏰ **计划重启** – 通过自动重启计划保持服务器处于最佳状态  
- 📦 **模组支持** – 轻松安装和更新，支持 `-automanagemods`  
- 🗄️ **备份与恢复** – 计划备份和按需备份存档、配置和集群  
- 🔗 **集群管理** – 从一个管理器运行和同步多个服务器  
- 📡 **RCON 集成** – 发送管理命令并远程监控服务器  
- 🛡️ **无头模式** – 带有可选身份验证的基于 Web 的控制面板  
- 📝 **优雅关闭** – 在重启或关闭前警告玩家  
- 📊 **服务器监控** – 实时状态、玩家数量和端口检查  

---

## 🎯 使用场景  

### 桌面模式  
运行带有完整 GUI 的 Cerious-AASM — 非常适合个人或局域网服务器。  

### 无头模式（远程 / 服务器）  
在 **Web 模式**下运行，以便在 VPS 或专用服务器上进行基于浏览器的管理：  

```bash
npm run headless -- --port=8080
```

启用身份验证：  

```bash
npm run headless -- --auth-enabled --username=admin --password=secret
```

---

## ✅ Linux 支持  
- 在 **Ubuntu、Debian、Fedora 和 CentOS** 上经过全面测试  
- Linux 和 Windows 上的功能完全一致 — 没有任何妥协  
- 非常适合独立服务器或云实例  

---

## 📦 安装  

1. 下载最新的[发布版本](https://github.com/ryoucerious/cerious-aasm/releases)  
2. 为您的操作系统安装 / 解压  
3. 通过 UI 或配置文件配置您的服务器  
4. 在桌面或无头模式下启动  

---

## 📚 文档  

- 使用 [GitHub Issues](https://github.com/ryoucerious/cerious-aasm/issues) 提交错误和功能请求  
- 模组、备份和自动化指南（即将在 Wiki 中提供）  
- 通过方舟论坛和 Reddit 获取社区支持  

---

## ⚖️ 法律与合规  

- Cerious-AASM 使用 **SteamCMD** 下载《方舟：生存飞升》服务器  
- 不捆绑或重新分发任何方舟游戏文件  
- 不隶属于 Studio Wildcard 或 Valve  

---

## 💡 为什么选择 Cerious-AASM？  

- ✅ **免费开源** — MIT 许可，社区驱动  
- ✅ **跨平台** — 全面支持 Linux 和 Windows  
- ✅ **内置自动化** — 自动启动、崩溃恢复、计划重启  
- ✅ **安全可靠** — 备份、优雅关闭、集群管理  
- ✅ **模组友好** — 轻松安装和自动管理模组  

---

## 🧷 鸣谢  

- 《方舟：生存飞升》 – Studio Wildcard  
- SteamCMD – Valve Corporation  
- 由 r YOU cerious 维护和开发  