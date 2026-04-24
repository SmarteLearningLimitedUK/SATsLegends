@echo off
setlocal EnableExtensions EnableDelayedExpansion

cd /d "%~dp0"

set "PHONE_PORT=4173"
set "PLAYTEST_DIR=%CD%\playtest"
set "SERVER_OUT=%PLAYTEST_DIR%\phone-tunnel-preview.out.log"
set "SERVER_ERR=%PLAYTEST_DIR%\phone-tunnel-preview.err.log"
set "TUNNEL_OUT=%PLAYTEST_DIR%\phone-tunnel.out.log"
set "TUNNEL_ERR=%PLAYTEST_DIR%\phone-tunnel.err.log"
set "SERVER_PID_FILE=%PLAYTEST_DIR%\phone-tunnel-preview.pid"
set "TUNNEL_PID_FILE=%PLAYTEST_DIR%\phone-tunnel.pid"
set "TUNNEL_URL="

if not exist "%PLAYTEST_DIR%" mkdir "%PLAYTEST_DIR%"

echo.
echo [SATs Legends] Physical phone preview over temporary tunnel
echo Repo: %CD%
echo.
echo This starts a local preview and exposes it through a temporary HTTPS URL.
echo Use this when the Wi-Fi/router/firewall blocks http://PC-IP:4173.
echo Keep this window open while testing.
echo.
pause

if not exist "package.json" (
  echo ERROR: package.json was not found. Run this batch file from the SATs Legends repo root.
  pause
  exit /b 1
)

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

echo [3/5] Clearing stale listeners...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='SilentlyContinue'; Get-NetTCPConnection -LocalPort %PHONE_PORT% | Where-Object { $_.State -eq 'Listen' } | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force }"
call :stop_tunnel

if exist "%SERVER_OUT%" del "%SERVER_OUT%" >nul 2>nul
if exist "%SERVER_ERR%" del "%SERVER_ERR%" >nul 2>nul
if exist "%TUNNEL_OUT%" del "%TUNNEL_OUT%" >nul 2>nul
if exist "%TUNNEL_ERR%" del "%TUNNEL_ERR%" >nul 2>nul

echo [4/5] Starting local preview on 127.0.0.1:%PHONE_PORT%...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $p = Start-Process -FilePath 'npm.cmd' -ArgumentList @('run','preview','--','--host','127.0.0.1','--port',$env:PHONE_PORT,'--strictPort') -WorkingDirectory (Get-Location) -RedirectStandardOutput $env:SERVER_OUT -RedirectStandardError $env:SERVER_ERR -PassThru; Set-Content -LiteralPath $env:SERVER_PID_FILE -Value $p.Id"
if errorlevel 1 goto fail
timeout /t 3 /nobreak >nul

echo [5/5] Starting temporary tunnel with npx localtunnel...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $p = Start-Process -FilePath 'npx.cmd' -ArgumentList @('--yes','localtunnel','--port',$env:PHONE_PORT,'--local-host','127.0.0.1') -WorkingDirectory (Get-Location) -RedirectStandardOutput $env:TUNNEL_OUT -RedirectStandardError $env:TUNNEL_ERR -PassThru; Set-Content -LiteralPath $env:TUNNEL_PID_FILE -Value $p.Id"
if errorlevel 1 goto fail

echo Waiting for tunnel URL...
for /l %%N in (1,1,20) do (
  timeout /t 1 /nobreak >nul
  for /f "tokens=*" %%U in ('powershell -NoProfile -ExecutionPolicy Bypass -Command "if (Test-Path $env:TUNNEL_OUT) { $text = Get-Content -LiteralPath $env:TUNNEL_OUT -Raw; if ($text -match 'https://[^\s]+') { $Matches[0] } }"') do set "TUNNEL_URL=%%U"
  if defined TUNNEL_URL goto tunnel_ready
)

echo.
echo Tunnel did not print a URL yet. Logs:
if exist "%TUNNEL_OUT%" type "%TUNNEL_OUT%"
if exist "%TUNNEL_ERR%" type "%TUNNEL_ERR%"
goto fail

:tunnel_ready
echo.
echo Open this HTTPS URL on your phone:
echo   %TUNNEL_URL%
echo.
echo If localtunnel asks for a password, it is usually this PC's public IP address.
echo You can find it by opening https://loca.lt/mytunnelpassword on this PC.
echo.
echo Keep this window open while testing.
echo Press any key here when you want to stop the tunnel and preview server.
pause >nul

call :stop_tunnel
call :stop_server
echo Tunnel and preview server stopped.
pause
exit /b 0

:stop_server
if exist "%SERVER_PID_FILE%" (
  set /p SERVER_PID=<"%SERVER_PID_FILE%"
  if defined SERVER_PID taskkill /PID !SERVER_PID! /T /F >nul 2>nul
  del "%SERVER_PID_FILE%" >nul 2>nul
)
exit /b 0

:stop_tunnel
if exist "%TUNNEL_PID_FILE%" (
  set /p TUNNEL_PID=<"%TUNNEL_PID_FILE%"
  if defined TUNNEL_PID taskkill /PID !TUNNEL_PID! /T /F >nul 2>nul
  del "%TUNNEL_PID_FILE%" >nul 2>nul
)
exit /b 0

:fail
set "FAIL_EXIT=%ERRORLEVEL%"
if "%FAIL_EXIT%"=="0" set "FAIL_EXIT=1"
echo.
echo Tunnel preview failed with exit code %FAIL_EXIT%.
echo Server logs:
if exist "%SERVER_OUT%" type "%SERVER_OUT%"
if exist "%SERVER_ERR%" type "%SERVER_ERR%"
echo Tunnel logs:
if exist "%TUNNEL_OUT%" type "%TUNNEL_OUT%"
if exist "%TUNNEL_ERR%" type "%TUNNEL_ERR%"
call :stop_tunnel
call :stop_server
pause
exit /b %FAIL_EXIT%
