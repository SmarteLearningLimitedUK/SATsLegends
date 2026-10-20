@echo off
setlocal
pushd "%~dp0"
call npm.cmd run publish:site
set "SATS_PUBLISH_RESULT=%ERRORLEVEL%"
popd
echo.
pause
exit /b %SATS_PUBLISH_RESULT%
