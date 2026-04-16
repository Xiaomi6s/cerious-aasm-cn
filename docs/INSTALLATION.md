# 安装指南 - Cerious AASM

## 系统要求

### 最低要求
- **操作系统**：Windows 10（64位）或 Linux（Ubuntu 20.04+ / 同等版本）
- **内存**：最低 4GB，推荐 8GB
- **存储**：50GB 可用空间（用于方舟服务器文件）
- **CPU**：双核处理器，2.5GHz 或更高
- **网络**：用于下载的宽带互联网连接
- **显卡**：任何支持硬件加速的显卡

### 推荐要求
- **操作系统**：Windows 11 或 Ubuntu 22.04+ LTS
- **内存**：16GB 或更多
- **存储**：100GB+ SSD 存储
- **CPU**：四核处理器，3.0GHz 或更高
- **网络**：高速宽带（100+ Mbps）

### 附加要求
- **Steam 账户**：下载方舟服务器文件所需
- **防火墙访问权限**：配置服务器端口防火墙规则的能力
- **管理员权限**：安装和服务器管理所需

## Windows 安装

### 方法 1：从发布页面下载（推荐）

1. **下载安装程序**
   - 访问 [最新发布页面](https://github.com/cerious/cerious-aasm/releases/latest)
   - 下载 `Cerious AASM Setup X.X.X.exe`

2. **运行安装程序**
   - 右键单击下载的文件并选择“以管理员身份运行”
   - 按照安装向导进行操作
   - 选择您的安装目录（默认：`C:\Program Files\Cerious AASM`）
   - 安装程序将创建桌面和开始菜单快捷方式

3. **首次启动**
   - 从桌面快捷方式或开始菜单启动 "Cerious AASM"
   - 应用程序将自动执行初始设置
   - 首次运行时将下载并配置 SteamCMD

### 方法 2：从源码编译

1. **先决条件**
   ```bash
   # 从 https://nodejs.org 安装 Node.js 18+
   # 从 https://git-scm.com 安装 Git
   ```

2. **克隆并编译**
   ```bash
   git clone https://github.com/cerious/cerious-aasm.git
   cd cerious-aasm
   npm install
   npm run electron:package:windows
   ```

3. **安装编译后的包**
   - 导航到 `dist-electron/`
   - 运行生成的安装文件

## Linux 安装

### 方法 1：AppImage（通用）

1. **下载 AppImage**
   - 访问 [最新发布页面](https://github.com/cerious/cerious-aasm/releases/latest)
   - 下载 `Cerious-AASM-X.X.X.AppImage`

2. **赋予可执行权限并运行**
   ```bash
   chmod +x Cerious-AASM-*.AppImage
   ./Cerious-AASM-*.AppImage
   ```

3. **可选：桌面集成**
   ```bash
   # 移动到应用程序目录
   sudo mv Cerious-AASM-*.AppImage /opt/cerious-aasm.AppImage
   
   # 创建桌面快捷方式
   cat > ~/.local/share/applications/cerious-aasm.desktop << EOF
   [Desktop Entry]
   Name=Cerious AASM
   Exec=/opt/cerious-aasm.AppImage
   Icon=cerious-aasm
   Type=Application
   Categories=Game;
   EOF
   ```

### 方法 2：DEB 包（Debian/Ubuntu）

1. **下载并安装**
   ```bash
   # 从发布页面下载 .deb 文件
   wget https://github.com/cerious/cerious-aasm/releases/latest/download/cerious-aasm_X.X.X_amd64.deb
   
   # 安装
   sudo dpkg -i cerious-aasm_*.deb
   sudo apt-get install -f  # 修复任何依赖问题
   ```

2. **启动**
   ```bash
   cerious-aasm
   # 或者在您的应用程序菜单中找到它
   ```

### 方法 3：RPM 包（Red Hat/Fedora/SUSE）

1. **下载并安装**
   ```bash
   # 从发布页面下载 .rpm 文件
   wget https://github.com/cerious/cerious-aasm/releases/latest/download/cerious-aasm-X.X.X.x86_64.rpm
   
   # 安装 (Fedora/RHEL)
   sudo dnf install cerious-aasm-*.rpm
   
   # 或在旧系统上
   sudo rpm -i cerious-aasm-*.rpm
   ```

### 方法 4：从源码编译

1. **安装依赖**
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install nodejs npm git build-essential

   # Fedora
   sudo dnf install nodejs npm git gcc-c++ make

   # Arch Linux
   sudo pacman -S nodejs npm git base-devel
   ```

2. **克隆并编译**
   ```bash
   git clone https://github.com/cerious/cerious-aasm.git
   cd cerious-aasm
   npm install
   npm run electron:package:linux
   ```

## 安装后设置

### 初始配置

1. **启动应用程序**

2. **配置防火墙**
   - 应用程序将引导您完成防火墙配置
   - 默认方舟服务器端口：7777、7778、27015
   - Web 界面端口：3000（可配置）

3. **创建您的第一个服务器**
   - 点击“创建新服务器实例”
   - 选择您的服务器名称和基本设置

### 命令行使用（无头模式）

Cerious AASM 可以作为无头后台服务运行，暴露 Web REST API，而不是启动 GUI 窗口。**在 Linux 上，即使在无头模式下运行，Electron 也需要在原生级别连接显示器（X11 或 Wayland）。**
在没有物理显示器的服务器上使用 `xvfb-run` 提供虚拟帧缓冲。

#### 1. 安装 xvfb（仅限首次）

```bash
# Debian / Ubuntu
sudo apt install xvfb

# Fedora / RHEL / Rocky
sudo dnf install xorg-x11-server-Xvfb
```

#### 2. 无头运行

```bash
# 基础无头模式（虚拟帧缓冲）
xvfb-run -a cerious-aasm --no-sandbox --headless

# 使用自定义端口
xvfb-run -a cerious-aasm --no-sandbox --headless --port=8080

# 启用身份验证
xvfb-run -a cerious-aasm --no-sandbox --headless --auth-enabled --username=admin --password=yourpassword

# 完整示例
xvfb-run -a cerious-aasm --no-sandbox --headless --port=5000 --auth-enabled --username=admin --password=secret123
```

或者，使用捆绑的 [cerious-aasm-headless-appimage.sh](../scripts/cerious-aasm-headless-appimage.sh)
辅助脚本，它会检测是否已经存在显示器，并自动应用
`xvfb-run -a`。

```bash
# 将脚本放入您的 PATH 中，然后运行：
cerious-aasm-headless-appimage.sh --auth-enabled --password=yourpassword --port=3000
```

#### 3. 作为 systemd 服务运行

```ini
[Unit]
Description=Cerious AASM headless service
After=network.target

[Service]
ExecStart=/usr/bin/xvfb-run -a /usr/bin/cerious-aasm --no-sandbox --headless --auth-enabled --password=yourpassword --port=3000
Restart=on-failure
Environment=ELECTRON_DISABLE_SANDBOX=1

[Install]
WantedBy=multi-user.target
```

**注意：** 由于 Chrome 沙盒限制，在 Linux 上的无头模式需要 `--no-sandbox` 标志。这是无头操作所必需的安全权衡。对于 GUI 模式，只需运行 `cerious-aasm` 而不带任何标志（如果有桌面会话，则不需要 `xvfb-run`）。


## 卸载

### Windows
1. 使用 Windows 设置中的“添加或删除程序”
2. 或运行安装目录中的卸载程序

### Linux
```bash
# DEB 包
sudo apt remove cerious-aasm

# RPM 包
sudo dnf remove cerious-aasm

# AppImage
rm /opt/cerious-aasm.AppImage
rm ~/.local/share/applications/cerious-aasm.desktop
```

## 下一步

安装后，有关详细的使用说明请参阅 [用户手册](USER_MANUAL.md)，如果遇到任何问题，请参阅 [故障排除指南](TROUBLESHOOTING.md)。
