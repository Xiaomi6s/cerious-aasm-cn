const fs = require('fs');
const path = require('path');

function fixFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;
    
    // Replace incorrectly translated variables
    content = content.replace(/max备份sToKeep/g, 'maxBackupsToKeep');
    content = content.replace(/isCreating备份/g, 'isCreatingBackup');
    content = content.replace(/showDelete备份Modal/g, 'showDeleteBackupModal');
    content = content.replace(/onDelete备份Cancel/g, 'onDeleteBackupCancel');
    content = content.replace(/onDelete备份Confirm/g, 'onDeleteBackupConfirm');
    content = content.replace(/max备份DownloadSizeMB/g, 'maxBackupDownloadSizeMB');
    content = content.replace(/onMax备份DownloadSizeChange/g, 'onMaxBackupDownloadSizeChange');
    content = content.replace(/on备份NameCancel/g, 'onBackupNameCancel');
    content = content.replace(/on备份NameConfirm/g, 'onBackupNameConfirm');
    content = content.replace(/show备份NameModal/g, 'showBackupNameModal');
    content = content.replace(/on备份ScheduleToggle/g, 'onBackupScheduleToggle');
    content = content.replace(/on备份FrequencyChange/g, 'onBackupFrequencyChange');
    content = content.replace(/on备份TimeChange/g, 'onBackupTimeChange');
    content = content.replace(/on备份DayOfWeekChange/g, 'onBackupDayOfWeekChange');
    content = content.replace(/onMax备份sToKeepChange/g, 'onMaxBackupsToKeepChange');
    content = content.replace(/restore备份/g, 'restoreBackup');
    content = content.replace(/download备份/g, 'downloadBackup');
    content = content.replace(/delete备份/g, 'deleteBackup');
    content = content.replace(/createManual备份/g, 'createManualBackup');
    content = content.replace(/selected备份FilePath/g, 'selectedBackupFilePath');
    content = content.replace(/select备份File/g, 'selectBackupFile');
    content = content.replace(/on备份FileSelect/g, 'onBackupFileSelect');
    content = content.replace(/is备份Locked/g, 'isBackupLocked');
    content = content.replace(/backupScheduleEnabled/g, 'backupScheduleEnabled'); // already english
    content = content.replace(/backupFrequencyDropdownOpen/g, 'backupFrequencyDropdownOpen');
    content = content.replace(/onToggle备份FrequencyDropdown/g, 'onToggleBackupFrequencyDropdown');
    content = content.replace(/get备份FrequencyDisplayName/g, 'getBackupFrequencyDisplayName');
    content = content.replace(/get备份FrequencyOptions/g, 'getBackupFrequencyOptions');
    content = content.replace(/on备份FrequencySelect/g, 'onBackupFrequencySelect');
    content = content.replace(/backupDayDropdownOpen/g, 'backupDayDropdownOpen');
    content = content.replace(/onToggle备份DayDropdown/g, 'onToggleBackupDayDropdown');
    content = content.replace(/get备份DayDisplayName/g, 'getBackupDayDisplayName');
    content = content.replace(/get备份DayOptions/g, 'getBackupDayOptions');
    content = content.replace(/on备份DaySelect/g, 'onBackupDaySelect');
    content = content.replace(/trackBy备份Id/g, 'trackByBackupId');
    content = content.replace(/onRestore备份/g, 'onRestoreBackup');
    content = content.replace(/onDownload备份/g, 'onDownloadBackup');
    content = content.replace(/onDelete备份/g, 'onDeleteBackup');
    content = content.replace(/onCreateManual备份/g, 'onCreateManualBackup');
    content = content.replace(/on备份TabClick/g, 'onBackupTabClick');
    content = content.replace(/toggle备份FrequencyDropdown/g, 'toggleBackupFrequencyDropdown');
    content = content.replace(/toggle备份DayDropdown/g, 'toggleBackupDayDropdown');
    content = content.replace(/Import from 备份/g, 'Import from Backup');
    
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
