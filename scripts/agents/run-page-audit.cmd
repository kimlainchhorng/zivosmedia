@echo off
REM ZIVO Page-Audit Watchdog - Scheduled Task wrapper (one cycle, then exit).
REM Register it with the PowerShell snippet in docs/page-audit/README.md.
REM Logs append to docs\page-audit\cron.log.
chcp 65001 >nul
setlocal
set "REPO=%~dp0..\.."
cd /d "%REPO%"

if not exist "docs\page-audit" mkdir "docs\page-audit"

echo.>> "docs\page-audit\cron.log"
echo ===== %DATE% %TIME% =====>> "docs\page-audit\cron.log"
call npm run audit:watch >> "docs\page-audit\cron.log" 2>&1

endlocal
