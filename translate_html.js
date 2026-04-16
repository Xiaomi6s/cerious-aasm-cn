const fs = require('fs');
const path = require('path');

const tsTranslations = {
  // HTML Strings
  "Additional flat bonus added per level": "每级附加平值奖励",
  "Bonus based on taming effectiveness": "基于驯服效率的奖励",
  "Torpidity scaling for tamed creatures": "驯服生物的眩晕缩放",
  "Maximum level cap scaling factor": "最大等级上限缩放因子",
  ">Online Player Management<": ">在线玩家管理<",
  ">Player List<": ">玩家列表<",
  "> Refresh 玩家\n": "> 刷新玩家\n",
  ">Player Name<": ">玩家名称<",
  ">Steam ID<": ">Steam ID<",
  "> Loading players...<": "> 正在加载玩家...<",
  ">No players online<": ">没有玩家在线<",
  ">Web Interface Login<": ">Web 界面登录<",
  ">Login<": ">登录<",
  ">Server Control<": ">服务器控制<",
  ">Connection Lost<": ">连接已断开<",
  ">Reload<": ">重新加载<",
  ">Download Update<": ">下载更新<",
  ">Update <strong>v{{ updateStatus?.version }}</strong> downloaded &mdash; ready to install.<": ">更新 <strong>v{{ updateStatus?.version }}</strong> 已下载 &mdash; 准备安装。<",
  ">Restart to Update<": ">重启并更新<",
  ">Retry<": ">重试<",
  ">General<": ">通用<",
  ">Rates<": ">倍率<",
  ">Structures<": ">建筑<",
  ">Miscellaneous<": ">杂项<",
  ">Mods<": ">模组<",
  ">ArkApi<": ">ArkApi<",
  ">Whitelist<": ">白名单<",
  ">Automation<": ">自动化<",
  ">Broadcasts<": ">广播<",
  ">Discord<": ">Discord<",
  ">Firewall<": ">防火墙<",
  ">Backup<": ">备份<",
  "> Reload\n": "> 重新加载\n",
  "> Save\n": "> 保存\n",
  "> Saving...\n": "> 保存中...\n",
  "> Stop\n": "> 停止\n",
  "> Add Message\n": "> 添加消息\n",
  "> Add Mod\n": "> 添加模组\n",
  "> Installed\n": "> 已安装\n",
  "> Add Setting\n": "> 添加设置\n",
  "> Reset to Defaults\n": "> 重置为默认\n",
  "> Remove<": "> 移除<",
  "Refresh 玩家": "刷新玩家"
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
        } else if (fullPath.endsWith('.html') || fullPath.endsWith('.ts')) {
            translateFile(fullPath);
        }
    }
}

walkDir('src/app');
