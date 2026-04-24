@echo off
setlocal EnableExtensions EnableDelayedExpansion

cd /d "%~dp0"

set "SMARTPHONE_TEST_PORT=4173"
set "SMARTPHONE_TEST_URL=http://127.0.0.1:%SMARTPHONE_TEST_PORT%"
set "SAT_REPO_ROOT=%CD%"
set "PLAYTEST_DIR=%CD%\playtest"
set "PREVIEW_OUT=%PLAYTEST_DIR%\smartphone-preview.out.log"
set "PREVIEW_ERR=%PLAYTEST_DIR%\smartphone-preview.err.log"
set "PID_FILE=%PLAYTEST_DIR%\smartphone-preview.pid"

if not exist "%PLAYTEST_DIR%" mkdir "%PLAYTEST_DIR%"

echo.
echo [SATs Legends] Build and smartphone smoke test
echo Repo: %SAT_REPO_ROOT%
echo URL:  %SMARTPHONE_TEST_URL%
echo.

if not exist "package.json" (
  echo ERROR: package.json was not found. Run this batch file from the SATs Legends repo root.
  exit /b 1
)

if not exist "node_modules" (
  echo [1/5] Installing npm dependencies...
  call npm.cmd install
  if errorlevel 1 goto fail
) else (
  echo [1/5] npm dependencies already present.
)

echo [2/5] Building production bundle...
echo       Using absolute asset paths so local preview can load nested game routes.
set "VERCEL=1"
call npm.cmd run build
if errorlevel 1 goto fail

echo [3/5] Starting local production preview on port %SMARTPHONE_TEST_PORT%...
if exist "%PID_FILE%" del "%PID_FILE%" >nul 2>nul
if exist "%PREVIEW_OUT%" del "%PREVIEW_OUT%" >nul 2>nul
if exist "%PREVIEW_ERR%" del "%PREVIEW_ERR%" >nul 2>nul

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $p = Start-Process -FilePath 'npm.cmd' -ArgumentList @('run','preview','--','--host','127.0.0.1','--port',$env:SMARTPHONE_TEST_PORT,'--strictPort') -WorkingDirectory $env:SAT_REPO_ROOT -RedirectStandardOutput $env:PREVIEW_OUT -RedirectStandardError $env:PREVIEW_ERR -PassThru; Set-Content -LiteralPath $env:PID_FILE -Value $p.Id"
if errorlevel 1 goto fail

echo [4/5] Running iPhone/smartphone Playwright smoke test...
node ".\scripts\smartphone-smoke-test.mjs" %*
set "TEST_EXIT=!ERRORLEVEL!"

echo [5/5] Stopping local preview...
call :stop_preview

if not "!TEST_EXIT!"=="0" (
  echo.
  echo Smartphone smoke test failed. Preview logs:
  if exist "%PREVIEW_ERR%" type "%PREVIEW_ERR%"
  exit /b !TEST_EXIT!
)

echo.
echo Smartphone build/test completed successfully.
exit /b 0

:fail
set "FAIL_EXIT=%ERRORLEVEL%"
echo.
echo Build/test failed with exit code %FAIL_EXIT%.
call :stop_preview
exit /b %FAIL_EXIT%

:stop_preview
if exist "%PID_FILE%" (
  set /p SERVER_PID=<"%PID_FILE%"
  if defined SERVER_PID (
    taskkill /PID !SERVER_PID! /T /F >nul 2>nul
  )
  del "%PID_FILE%" >nul 2>nul
)
exit /b 0
