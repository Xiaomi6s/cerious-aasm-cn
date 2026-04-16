@echo off
title Cerious AASM - Web 管理界面
echo ================================================
echo   Cerious AASM Web 管理界面
echo ================================================
echo.
echo 正在启动，请稍候...
echo 启动后请用浏览器访问: http://localhost:3000
echo.
echo 关闭此窗口将停止 Web 服务。
echo ================================================
echo.

"D:\ASA\Cerious AASM\Cerious AASM.exe" --headless --port=3000

pause
