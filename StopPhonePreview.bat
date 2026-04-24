@echo off
setlocal EnableExtensions EnableDelayedExpansion

cd /d "%~dp0"

set "PLAYTEST_DIR=%CD%\playtest"

echo.
echo [SATs Legends] Stopping phone preview servers
echo.

for %%F in (
  "phone-preview.pid"
  "phone-preview-live.pid"
  "phone-preview-config.pid"
  "phone-tunnel-preview.pid"
  "phone-tunnel.pid"
  "phone-tunnel-test.pid"
) do (
  if exist "%PLAYTEST_DIR%\%%~F" (
    set /p PID=<"%PLAYTEST_DIR%\%%~F"
    if defined PID (
      taskkill /PID !PID! /T /F >nul 2>nul
      echo Stopped PID !PID! from %%~F
    )
    del "%PLAYTEST_DIR%\%%~F" >nul 2>nul
    set "PID="
  )
)

echo Done.
pause
