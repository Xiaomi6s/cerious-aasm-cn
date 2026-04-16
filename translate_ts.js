const fs = require('fs');
const path = require('path');

const tsTranslations = {
  // player-list.component.ts
  "'SteamID copied to clipboard'": "'SteamID 已复制到剪贴板'",
  
  // server-settings.component.ts
  "'Configuration exported as ZIP successfully'": "'配置已成功导出为 ZIP'",
  "'Cluster directory is accessible'": "'集群目录可访问'",
  "'Failed to load INI file.'": "'加载 INI 文件失败。'",
  "'Expert Mode'": "'专家模式'",
  "'Failed to save INI file.'": "'保存 INI 文件失败。'",
  "'Failed to export configuration: '": "'导出配置失败：'",
  "'Failed to import configuration: '": "'导入配置失败：'",
  "'Failed to read file'": "'读取文件失败'",
  "'No cluster directory configured'": "'未配置集群目录'",
  "'Cluster directory not accessible'": "'集群目录不可访问'",
  "'Connection test failed'": "'连接测试失败'",

  // ark-api-tab.component.ts
  "'AsaApi installed successfully.'": "'AsaApi 安装成功。'",
  "'AsaApi'": "'AsaApi'",
  "'Plugin installed from URL.'": "'从 URL 安装了插件。'",
  "'ArkApi'": "'ArkApi'",
  "'Plugin installed from ZIP.'": "'从 ZIP 安装了插件。'",
  "'Failed to load plugins.'": "'加载插件失败。'",
  "'Failed to reach GitHub.'": "'无法连接到 GitHub。'",
  "'Installation failed.'": "'安装失败。'",
  "'Failed to install plugin from URL.'": "'从 URL 安装插件失败。'",
  "'Could not read file path. Are you running in Electron?'": "'无法读取文件路径。您是在 Electron 中运行吗？'",
  "'Failed to install plugin from ZIP.'": "'从 ZIP 安装插件失败。'",
  "'Failed to remove plugin.'": "'移除插件失败。'",

  // mods-tab.component.ts
  "'Mod ID must be a numeric CurseForge ID (e.g. 731604991). Copy it from the CurseForge website.'": "'模组 ID 必须是数字 CurseForge ID（例如 731604991）。请从 CurseForge 网站复制。'",

  // sidebar.component.ts
  "'All servers are starting.'": "'所有服务器正在启动。'",
  "'Server Control'": "'服务器控制'",
  "'All servers are stopping.'": "'所有服务器正在停止。'",
  "'Failed to import server from backup'": "'从备份导入服务器失败'",
  "'Cannot Delete Server'": "'无法删除服务器'",
  "'Server must be stopped before it can be deleted.'": "'必须在停止服务器后才能删除。'",
  "'Failed to logout'": "'登出失败'",
  "'Authentication'": "'身份验证'",
  "'Failed to start all servers.'": "'启动所有服务器失败。'",
  "'Failed to stop all servers.'": "'停止所有服务器失败。'",

  // backup-ui.service.ts
  "'Backup created successfully'": "'备份创建成功'",
  "'Backup'": "'备份'",
  "'Backup settings saved successfully'": "'备份设置保存成功'",
  "'Settings'": "'设置'",
  "'Backup restored successfully'": "'备份恢复成功'",
  "'Backup deleted successfully'": "'备份删除成功'",
  "'Failed to create backup'": "'创建备份失败'",
  "'Backup Error'": "'备份错误'",
  "'Failed to download backup'": "'下载备份失败'",
  "'Download Error'": "'下载错误'",
  "'Failed to delete backup'": "'删除备份失败'",
  "'Failed to download file'": "'下载文件失败'",

  // server.component.ts
  "'Mod added successfully'": "'模组添加成功'",
  "'Mod removed successfully'": "'模组移除成功'",
  "'Mod settings updated successfully'": "'模组设置更新成功'",
  "'Auto-start settings saved'": "'自动启动设置已保存'",
  "'Automation'": "'自动化'",
  "'Crash detection settings saved'": "'崩溃检测设置已保存'",
  "'Scheduled restart settings saved'": "'计划重启设置已保存'",
  "'Configuration Validation Failed'": "'配置验证失败'",
  "'Save Failed'": "'保存失败'",
  "'Failed to save server configuration.'": "'保存服务器配置失败。'",
  "'Please enter a valid mod ID and name'": "'请输入有效的模组 ID 和名称'",
  "'Failed to save auto-start settings: '": "'保存自动启动设置失败：'",
  "'Failed to configure auto-start'": "'配置自动启动失败'",
  "'Failed to save crash detection settings: '": "'保存崩溃检测设置失败：'",
  "'Failed to configure crash detection'": "'配置崩溃检测失败'",
  "'Failed to save scheduled restart settings: '": "'保存计划重启设置失败：'",
  "'Failed to configure scheduled restart'": "'配置计划重启失败'",

  // settings.component.ts
  "'Authentication enabled. Restart the web server for changes to take effect.'": "'身份验证已启用。重启 Web 服务器以使更改生效。'",
  "'Authentication is now configured. Restart the web server for changes to take effect.'": "'身份验证现已配置。重启 Web 服务器以使更改生效。'",
  "'Server Data Directory Updated'": "'服务器数据目录已更新'",
  "'Failed to check installation requirements: '": "'检查安装要求失败：'",
  "'Installation Error'": "'安装错误'",
  "'Failed to check for ARK server updates.'": "'检查 ARK 服务器更新失败。'",
  "'Check for Updates'": "'检查更新'",
  "'Failed to start web server.'": "'启动 Web 服务器失败。'",
  "'Web Server'": "'Web 服务器'",
  "'Failed to stop web server.'": "'停止 Web 服务器失败。'",
  "'Failed to select directory'": "'选择目录失败'",
  "'Error'": "'错误'",
  
  // validation / general logic strings
  "'Required field'": "'必填字段'",
  "'Invalid format'": "'格式无效'",
  "'Must be a number'": "'必须是数字'"
};

function translateFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    
    for (const [key, value] of Object.entries(tsTranslations)) {
        content = content.split(key).join(value);
    }
    
    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Translated: ' + filePath);
    }
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath);
        } else if (fullPath.endsWith('.ts')) {
            translateFile(fullPath);
        }
    }
}

walkDir('src/app');
