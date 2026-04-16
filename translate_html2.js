const fs = require('fs');
const path = require('path');

const htmlTranslations = {
  // HTML Strings
  "> SERVER STATE<": "> 服务器状态<",
  ">SERVER STATE<": ">服务器状态<",
  "> Send\n": "> 发送\n",
  "> Remove<": "> 移除<",
  "> Installed\n": "> 已安装\n",
  "> Add Mod\n": "> 添加模组\n",
  "> Add Message\n": "> 添加消息\n",
  "> Stop\n": "> 停止\n",
  "Reload": "重新加载",
  "Save": "保存",
  "Saving...": "保存中...",
  "General": "通用",
  "Rates": "倍率",
  "Structures": "建筑",
  "Miscellaneous": "杂项",
  "Mods": "模组",
  "ArkApi": "ArkApi",
  "Whitelist": "白名单",
  "Automation": "自动化",
  "Broadcasts": "广播",
  "Discord": "Discord",
  "Firewall": "防火墙",
  "Backup": "备份",
  "Reset to Defaults": "重置为默认",
  "Add Setting": "添加设置",
};

function translateFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    
    for (const [key, value] of Object.entries(htmlTranslations)) {
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
        } else if (fullPath.endsWith('.html')) {
            translateFile(fullPath);
        }
    }
}

walkDir('src/app');
