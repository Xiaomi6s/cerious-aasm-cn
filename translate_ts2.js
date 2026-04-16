const fs = require('fs');
const path = require('path');

const tsTranslations = {
  "'Server Installation'": "'服务器安装'",
  "'Update Available'": "'有可用更新'",
  "'A new ARK server update is available!'": "'有新的 ARK 服务器更新可用！'",
  "'Password Required'": "'需要密码'",
  "'Please enter your sudo password'": "'请输入您的 sudo 密码'",
  "'Install Warning'": "'安装警告'",
  "'Installation Failed'": "'安装失败'",
  "'Installation Complete'": "'安装完成'",
  "'Please enter username and password below to complete authentication setup'": "'请在下方输入用户名和密码以完成身份验证设置'",
  "'Username is required for authentication'": "'身份验证需要用户名'",
  "'Password is required for authentication'": "'身份验证需要密码'",
  "'Select Server Data Directory'": "'选择服务器数据目录'",
  "'Directory Selection Failed'": "'目录选择失败'",
  "'Configuration Warnings'": "'配置警告'",
  "'Mod is already in the list'": "'模组已在列表中'",
  "'Preparing to start'": "'准备启动'",
  "'Already Running'": "'已在运行'",
  "'Instance Folder Missing'": "'实例文件夹丢失'",
  "'Failed to save backup settings'": "'保存备份设置失败'",
  "'Settings Error'": "'设置错误'",
  "'Failed to restore backup'": "'恢复备份失败'",
  "'Backup file location opened'": "'已打开备份文件位置'",
  "'Unknown location'": "'未知位置'",
  "'Large File Warning'": "'大文件警告'",
  "'No backup file selected'": "'未选择备份文件'",
  "'Server imported successfully'": "'服务器导入成功'",
  "'Most Downloaded'": "'下载最多'",
  "'Recently Updated'": "'最近更新'",
  "'Mod Browser'": "'模组浏览器'",
  "'Game Settings'": "'游戏设置'",
  "'Stat Multipliers'": "'属性倍率'",
  "'Server Configuration'": "'服务器配置'",
  "'Custom INI'": "'自定义 INI'",
  "'Failed to load INI file.'": "'加载 INI 文件失败。'",
  "'Expert Mode'": "'专家模式'",
  "'Save failed.'": "'保存失败。'",
  "'Failed to save INI file.'": "'保存 INI 文件失败。'",
  "'Configuration exported as ZIP successfully'": "'配置已成功导出为 ZIP'",
  "'Failed to export configuration'": "'导出配置失败'",
  "'Failed to import configuration'": "'导入配置失败'",
  "'Failed to read file'": "'读取文件失败'",
  "'Every Hour'": "'每小时'",
  "'No Restart'": "'不重启'",
  "'App Launch'": "'应用启动'",
  "'System Boot'": "'系统引导'",
  "'No days selected'": "'未选择任何天数'",
  "'No cluster directory configured'": "'未配置集群目录'",
  "'Cluster directory is accessible'": "'集群目录可访问'",
  "'Cluster directory not accessible'": "'集群目录不可访问'",
  "'Unable to access the specified directory'": "'无法访问指定目录'",
  "'Connection test failed'": "'连接测试失败'",
  "'Unknown Map'": "'未知地图'",
  "'No Categories Selected'": "'未选择任何类别'",
  "'Please select at least one category to copy.'": "'请至少选择一个类别进行复制。'",
  "'Config Copied'": "'配置已复制'",
  "'New Announcement'": "'新公告'",
  "'Custom Path'": "'自定义路径'",
  "'Player is already in the whitelist'": "'玩家已在白名单中'",
  "'Player removed from whitelist'": "'已将玩家从白名单移除'",
  "'Whitelist cleared successfully'": "'已成功清空白名单'",
  "'No valid player IDs found'": "'未找到有效的玩家 ID'"
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
