@echo off
REM ZIVO Security Watchdog - Scheduled Task wrapper (one cycle, then exit).
REM Register it with the PowerShell snippet in docs/security-watch/README.md.
REM Logs append to docs\security-watch\cron.log.
chcp 65001 >nul
setlocal
set "REPO=%~dp0..\.."
cd /d "%REPO%"

if not exist "docs\security-watch" mkdir "docs\security-watch"

echo.>> "docs\security-watch\cron.log"
echo ===== %DATE% %TIME% =====>> "docs\security-watch\cron.log"
call npm run security:watch >> "docs\security-watch\cron.log" 2>&1

endlocal
