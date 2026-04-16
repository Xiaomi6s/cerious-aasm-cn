const fs = require('fs');
const path = require('path');

function fixFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    
    // Replace incorrectly translated variables
    content = content.replace(/on保存Settings/g, 'onSaveSettings');
    content = content.replace(/clear白名单/g, 'clearWhitelist');
    content = content.replace(/on模组InputChange/g, 'onModsInputChange');
    content = content.replace(/save自动化Settings/g, 'saveAutomationSettings');
    
    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Fixed: ' + filePath);
    }
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath);
        } else if (fullPath.endsWith('.html') || fullPath.endsWith('.ts')) {
            fixFile(fullPath);
        }
    }
}

walkDir('src/app');
