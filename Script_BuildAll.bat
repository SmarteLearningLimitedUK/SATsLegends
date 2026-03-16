@echo off
setlocal EnableExtensions

set "SCRIPT_DIR=%~dp0"
set "CONFIG_FILE=%SCRIPT_DIR%deploy.config.bat"
set "UPLOAD_SCRIPT=%SCRIPT_DIR%scripts\upload-ftps.ps1"

if not exist "%SCRIPT_DIR%package.json" (
  echo [ERROR] package.json was not found next to this script.
  exit /b 1
)

if not exist "%UPLOAD_SCRIPT%" (
  echo [ERROR] FTPS upload script is missing: "%UPLOAD_SCRIPT%"
  exit /b 1
)

pushd "%SCRIPT_DIR%" >nul

echo [1/3] Installing dependencies if needed...
call npm install
if errorlevel 1 (
  echo [ERROR] npm install failed.
  popd >nul
  exit /b 1
)

echo [2/3] Building app...
call npm run build
if errorlevel 1 (
  echo [ERROR] Build failed.
  popd >nul
  exit /b 1
)

if not exist "%CONFIG_FILE%" (
  echo.
  echo [INFO] Build finished. Upload was skipped because deploy.config.bat is missing.
  echo [INFO] Copy deploy.config.example.bat to deploy.config.bat and set FTP values.
  popd >nul
  exit /b 0
)

call "%CONFIG_FILE%"

if "%FTP_HOST%"=="" (
  echo [ERROR] FTP_HOST is empty in deploy.config.bat.
  popd >nul
  exit /b 1
)
if "%FTP_USERNAME%"=="" (
  echo [ERROR] FTP_USERNAME is empty in deploy.config.bat.
  popd >nul
  exit /b 1
)
if "%FTP_PASSWORD%"=="" (
  echo [ERROR] FTP_PASSWORD is empty in deploy.config.bat.
  popd >nul
  exit /b 1
)
if "%FTP_PORT%"=="" set "FTP_PORT=21"
if "%FTP_REMOTE_DIR%"=="" set "FTP_REMOTE_DIR=sats"

echo [3/3] Uploading dist\ to FTPS %FTP_HOST%:%FTP_PORT%/%FTP_REMOTE_DIR% ...
powershell -NoProfile -ExecutionPolicy Bypass -File "%UPLOAD_SCRIPT%" -LocalRoot "%SCRIPT_DIR%dist" -Host "%FTP_HOST%" -Port "%FTP_PORT%" -Username "%FTP_USERNAME%" -Password "%FTP_PASSWORD%" -RemoteBaseDir "%FTP_REMOTE_DIR%"
if errorlevel 1 (
  echo [ERROR] FTPS upload failed.
  popd >nul
  exit /b 1
)

echo.
echo [SUCCESS] Build + FTPS upload completed.
popd >nul
exit /b 0
