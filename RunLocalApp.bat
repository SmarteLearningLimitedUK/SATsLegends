@echo off
setlocal EnableExtensions EnableDelayedExpansion

cd /d "%~dp0"

set "PROD_PORT=4173"
set "DEV_PORT=3000"
set "HOST=0.0.0.0"
set "PLAYTEST_DIR=%CD%\playtest"
set "SERVER_OUT=%PLAYTEST_DIR%\manual-local-server.out.log"
set "SERVER_ERR=%PLAYTEST_DIR%\manual-local-server.err.log"
set "PID_FILE=%PLAYTEST_DIR%\manual-local-server.pid"
set "NETWORK_IP="

if /I "%~1"=="--help" goto help
if /I "%~1"=="/?" goto help
if /I "%~1"=="help" goto help

if not exist "%PLAYTEST_DIR%" mkdir "%PLAYTEST_DIR%"

echo.
echo [SATs Legends] Local manual test runner
echo Repo: %CD%
echo.

if not exist "package.json" (
  echo ERROR: package.json was not found. Run this batch file from the SATs Legends repo root.
  exit /b 1
)

for /f "usebackq delims=" %%I in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' -and $_.InterfaceAlias -match 'Wi-?Fi|Wireless' } | Select-Object -First 1 -ExpandProperty IPAddress"`) do set "NETWORK_IP=%%I"
if not defined NETWORK_IP (
  for /f "usebackq delims=" %%I in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' -and $_.InterfaceAlias -match 'Ethernet' } | Select-Object -First 1 -ExpandProperty IPAddress"`) do set "NETWORK_IP=%%I"
)

echo Choose local app mode:
echo   1. Production preview - build first, closest to deployed app
echo   2. Dev server - hot reload while editing
echo.
set /p "MODE_CHOICE=Enter 1 or 2, then press Enter: "

if "%MODE_CHOICE%"=="2" (
  set "APP_MODE=dev"
  set "APP_PORT=%DEV_PORT%"
) else (
  set "APP_MODE=preview"
  set "APP_PORT=%PROD_PORT%"
)

echo.
echo Choose forced test environment:
echo   1. Smartphone - iPhone sized mobile viewport
echo   2. iPad - tablet viewport
echo   3. Desktop - wide desktop viewport
echo.
set /p "DEVICE_CHOICE=Enter 1, 2, or 3, then press Enter: "

if "%DEVICE_CHOICE%"=="2" (
  set "DEVICE_MODE=ipad"
) else if "%DEVICE_CHOICE%"=="3" (
  set "DEVICE_MODE=desktop"
) else (
  set "DEVICE_MODE=smartphone"
)

set "LOCAL_APP_URL=http://127.0.0.1:%APP_PORT%/"
if defined NETWORK_IP (
  set "PHONE_APP_URL=http://%NETWORK_IP%:%APP_PORT%/"
) else (
  set "PHONE_APP_URL=Unable to detect Wi-Fi/Ethernet IP"
)

echo.
echo Selected:
echo   App mode:     %APP_MODE%
echo   Device mode:  %DEVICE_MODE%
echo   Local URL:    %LOCAL_APP_URL%
echo   Phone URL:    %PHONE_APP_URL%
echo.
echo For real phone testing, connect your phone to the same Wi-Fi and open the Phone URL above.
echo If it does not load, allow Node.js through Windows Firewall when prompted.
echo.
pause

if not exist "node_modules" (
  echo.
  echo [1/4] Installing npm dependencies...
  call npm.cmd install
  if errorlevel 1 goto fail
) else (
  echo.
  echo [1/4] npm dependencies already present.
)

if "%APP_MODE%"=="dev" goto start_dev

:start_preview
echo [2/4] Building production bundle...
echo       Using absolute asset paths so nested game routes work in local preview.
set "VERCEL=1"
call npm.cmd run build
if errorlevel 1 goto fail

echo [3/4] Starting production preview on port %APP_PORT%...
call :start_server preview %APP_PORT%
if errorlevel 1 goto fail
goto open_browser

:start_dev
echo [2/4] Skipping production build for dev mode.
echo [3/4] Starting Vite dev server on port %APP_PORT%...
call :start_server dev %APP_PORT%
if errorlevel 1 goto fail
goto open_browser

:open_browser
echo.
echo Server logs:
echo   %SERVER_OUT%
echo   %SERVER_ERR%
echo.
echo [4/4] Opening forced %DEVICE_MODE% browser for manual testing...
echo.
pause

node ".\scripts\manual-device-browser.mjs" "%DEVICE_MODE%" "%LOCAL_APP_URL%"
set "BROWSER_EXIT=!ERRORLEVEL!"

echo.
echo Stopping local app server...
call :stop_server

echo.
if not "!BROWSER_EXIT!"=="0" (
  echo Manual browser exited with code !BROWSER_EXIT!.
  pause
  exit /b !BROWSER_EXIT!
)

echo Local manual test session finished.
pause
exit /b 0

:start_server
if exist "%PID_FILE%" del "%PID_FILE%" >nul 2>nul
if exist "%SERVER_OUT%" del "%SERVER_OUT%" >nul 2>nul
if exist "%SERVER_ERR%" del "%SERVER_ERR%" >nul 2>nul

set "SERVER_MODE=%~1"
set "SERVER_PORT=%~2"

echo       Opening Windows Firewall for TCP port %SERVER_PORT% if allowed...
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { if (-not (Get-NetFirewallRule -DisplayName 'SATs Legends local app %SERVER_PORT%' -ErrorAction SilentlyContinue)) { New-NetFirewallRule -DisplayName 'SATs Legends local app %SERVER_PORT%' -Direction Inbound -Action Allow -Protocol TCP -LocalPort %SERVER_PORT% -ErrorAction Stop | Out-Null }; exit 0 } catch { Write-Host '       Firewall rule was not added automatically. If your phone cannot load the app, run this batch as Administrator once.'; exit 0 }"

echo       Clearing any stale listener on port %SERVER_PORT%...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='SilentlyContinue'; Get-NetTCPConnection -LocalPort %SERVER_PORT% | Where-Object { $_.State -eq 'Listen' } | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force }"

if "%SERVER_MODE%"=="dev" (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $p = Start-Process -FilePath 'npm.cmd' -ArgumentList @('run','dev','--','--host',$env:HOST,'--port',$env:SERVER_PORT) -WorkingDirectory (Get-Location) -RedirectStandardOutput $env:SERVER_OUT -RedirectStandardError $env:SERVER_ERR -PassThru; Set-Content -LiteralPath $env:PID_FILE -Value $p.Id"
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $p = Start-Process -FilePath 'npm.cmd' -ArgumentList @('run','preview','--','--host',$env:HOST,'--port',$env:SERVER_PORT,'--strictPort') -WorkingDirectory (Get-Location) -RedirectStandardOutput $env:SERVER_OUT -RedirectStandardError $env:SERVER_ERR -PassThru; Set-Content -LiteralPath $env:PID_FILE -Value $p.Id"
)
timeout /t 2 /nobreak >nul
if defined NETWORK_IP (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r = Invoke-WebRequest -Uri ('http://%NETWORK_IP%:%SERVER_PORT%/') -UseBasicParsing -TimeoutSec 5; Write-Host ('       Network check: http://%NETWORK_IP%:%SERVER_PORT%/ returned HTTP ' + $r.StatusCode) } catch { Write-Host ('       Network check failed from this PC: ' + $_.Exception.Message) }"
)
exit /b %ERRORLEVEL%

:stop_server
if exist "%PID_FILE%" (
  set /p SERVER_PID=<"%PID_FILE%"
  if defined SERVER_PID (
    taskkill /PID !SERVER_PID! /T /F >nul 2>nul
  )
  del "%PID_FILE%" >nul 2>nul
)
exit /b 0

:help
echo Usage:
echo   RunLocalApp.bat
echo.
echo The script asks you to choose:
echo   1. Production preview or dev server.
echo   2. Smartphone, iPad, or desktop forced browser mode.
echo.
echo It starts the local app, opens a headed Playwright browser, then pauses so you can test manually.
exit /b 0

:fail
set "FAIL_EXIT=%ERRORLEVEL%"
echo.
echo Local app runner failed with exit code %FAIL_EXIT%.
call :stop_server
pause
exit /b %FAIL_EXIT%
