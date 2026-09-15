@echo off
title TAX PORTAL Server (localhost:8080)
echo ================================================================================
echo    Starting TAX PORTAL - Thai Personal Income Tax System
echo    URL: http://localhost:8080
echo ================================================================================
cd /d "%~dp0"
"D:\AppServ\php7\php.exe" -S localhost:8080 -t "%~dp0"
pause
