@echo off
title TAX PORTAL Server (0.0.0.0:8080 - All Devices Supported)
cd /d "%~dp0"

echo ================================================================================
echo    TAX PORTAL - Thai Personal Income Tax System (Multi-Device Ready)
echo ================================================================================
echo.
echo    [1] Local Computer (เครื่องนี้):
echo        http://localhost:8080
echo.

rem Auto-detect Local IP Address for mobile / tablet / other devices
for /f "tokens=4" %%a in ('route print ^| findstr 0.0.0.0 ^| findstr /v "0.0.0.0.*0.0.0.0"') do (
    set LOCAL_IP=%%a
    goto :found_ip
)
:found_ip

if defined LOCAL_IP (
    echo    [2] Mobile / Tablet / Other Devices (มือถือและอุปกรณ์อื่นในวง Wi-Fi):
    echo        http://%LOCAL_IP%:8080
) else (
    echo    [2] Mobile / Tablet: ใช้ IP ของคอมพิวเตอร์นี้ในวง Wi-Fi เช่น http://192.168.1.xxx:8080
)
echo.
echo    * กรุณาเปิดหน้าต่างนี้ทิ้งไว้ระหว่างใช้งานระบบ
echo ================================================================================
echo.

"D:\AppServ\php7\php.exe" -S 0.0.0.0:8080 -t "%~dp0"
pause
