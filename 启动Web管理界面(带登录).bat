@echo off
title Cerious AASM - Web 管理界面（带登录认证）
echo ================================================
echo   Cerious AASM Web 管理界面（带登录认证）
echo ================================================
echo.
echo 正在启动，请稍候...
echo 启动后请用浏览器访问: http://localhost:3000
echo 用户名: admin
echo 密  码: admin123
echo.
echo 如需修改密码，请用记事本编辑此 bat 文件。
echo 关闭此窗口将停止 Web 服务。
echo ================================================
echo.

"D:\ASA\Cerious AASM\Cerious AASM.exe" --headless --port=3000 --auth-enabled --username=admin --password=admin123

pause
