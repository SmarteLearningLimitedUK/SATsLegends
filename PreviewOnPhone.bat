@echo off
setlocal EnableExtensions EnableDelayedExpansion

cd /d "%~dp0"

set "PHONE_PORT=4173"
set "HOST=%NETWORK_IP%"
set "PLAYTEST_DIR=%CD%\playtest"
set "SERVER_OUT=%PLAYTEST_DIR%\phone-preview.out.log"
set "SERVER_ERR=%PLAYTEST_DIR%\phone-preview.err.log"
set "PID_FILE=%PLAYTEST_DIR%\phone-preview.pid"
set "NETWORK_IP="

if not exist "%PLAYTEST_DIR%" mkdir "%PLAYTEST_DIR%"

echo.
echo [SATs Legends] Physical phone preview
echo Repo: %CD%
echo.

if not exist "package.json" (
  echo ERROR: package.json was not found. Run this batch file from the SATs Legends repo root.
  pause
  exit /b 1
)

for /f "usebackq delims=" %%I in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' -and $_.InterfaceAlias -match 'Wi-?Fi|Wireless' } | Select-Object -First 1 -ExpandProperty IPAddress"`) do set "NETWORK_IP=%%I"
if not defined NETWORK_IP (
  for /f "usebackq delims=" %%I in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' -and $_.InterfaceAlias -match 'Ethernet' } | Select-Object -First 1 -ExpandProperty IPAddress"`) do set "NETWORK_IP=%%I"
)

if not defined NETWORK_IP (
  echo ERROR: Could not detect a Wi-Fi or Ethernet IPv4 address.
  echo Make sure this PC is connected to the same network as your phone.
  pause
  exit /b 1
)

echo Phone URL will be:
echo   http://%NETWORK_IP%:%PHONE_PORT%/
echo.
echo Your phone must be on the same Wi-Fi/network as this PC.
echo If your Wi-Fi has device isolation enabled, use the tunnel option below.
echo.
pause

if not exist "node_modules" (
  echo.
  echo [1/5] Installing npm dependencies...
  call npm.cmd install
  if errorlevel 1 goto fail
) else (
  echo.
  echo [1/5] npm dependencies already present.
)

echo [2/5] Building production bundle...
set "VERCEL=1"
call npm.cmd run build
if errorlevel 1 goto fail

echo [3/5] Allowing TCP port %PHONE_PORT% through Windows Firewall if possible...
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { if (-not (Get-NetFirewallRule -DisplayName 'SATs Legends phone preview %PHONE_PORT%' -ErrorAction SilentlyContinue)) { New-NetFirewallRule -DisplayName 'SATs Legends phone preview %PHONE_PORT%' -Direction Inbound -Action Allow -Protocol TCP -LocalPort %PHONE_PORT% -ErrorAction Stop | Out-Null }; exit 0 } catch { Write-Host 'Firewall rule was not added automatically. If your phone cannot load the app, run this batch as Administrator once.'; exit 0 }"

echo       Setting this Wi-Fi/Ethernet network to Private if allowed...
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { Get-NetConnectionProfile | Where-Object { $_.IPv4Connectivity -ne 'Disconnected' } | Set-NetConnectionProfile -NetworkCategory Private -ErrorAction Stop; Write-Host 'Network profile is Private.' } catch { Write-Host 'Network profile was not changed automatically. Run this batch as Administrator once if LAN loading still fails.' }"

echo [4/5] Clearing any stale listener on port %PHONE_PORT%...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='SilentlyContinue'; Get-NetTCPConnection -LocalPort %PHONE_PORT% | Where-Object { $_.State -eq 'Listen' } | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force }"

if exist "%PID_FILE%" del "%PID_FILE%" >nul 2>nul
if exist "%SERVER_OUT%" del "%SERVER_OUT%" >nul 2>nul
if exist "%SERVER_ERR%" del "%SERVER_ERR%" >nul 2>nul

echo [5/5] Starting preview server on this network interface...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $p = Start-Process -FilePath 'npm.cmd' -ArgumentList @('run','preview','--','--host',$env:NETWORK_IP,'--port',$env:PHONE_PORT,'--strictPort') -WorkingDirectory (Get-Location) -RedirectStandardOutput $env:SERVER_OUT -RedirectStandardError $env:SERVER_ERR -PassThru; Set-Content -LiteralPath $env:PID_FILE -Value $p.Id"
if errorlevel 1 goto fail

timeout /t 3 /nobreak >nul

echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r = Invoke-WebRequest -Uri 'http://%NETWORK_IP%:%PHONE_PORT%/' -UseBasicParsing -TimeoutSec 5; Write-Host 'Network check from this PC: OK, HTTP' $r.StatusCode } catch { Write-Host 'Network check from this PC failed:' $_.Exception.Message }"

echo.
echo Open this on your phone:
echo   http://%NETWORK_IP%:%PHONE_PORT%/
echo.
echo If that still will not load, keep this window open and run PreviewOnPhoneTunnel.bat.
echo The tunnel version gives you a temporary HTTPS URL that works even when Wi-Fi blocks local devices.
echo.
echo Keep this window open while testing.
echo Press any key here when you want to stop the preview server.
pause >nul

call :stop_server
echo Preview server stopped.
pause
exit /b 0

:stop_server
if exist "%PID_FILE%" (
  set /p SERVER_PID=<"%PID_FILE%"
  if defined SERVER_PID (
    taskkill /PID !SERVER_PID! /T /F >nul 2>nul
  )
  del "%PID_FILE%" >nul 2>nul
)
exit /b 0

:fail
set "FAIL_EXIT=%ERRORLEVEL%"
echo.
echo Phone preview failed with exit code %FAIL_EXIT%.
echo Server logs:
if exist "%SERVER_OUT%" type "%SERVER_OUT%"
if exist "%SERVER_ERR%" type "%SERVER_ERR%"
call :stop_server
pause
exit /b %FAIL_EXIT%
