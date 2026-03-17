@echo off
REM Copy this file to deploy.config.bat and update values.
set "FTP_HOST=ftp.smart-el.co.uk"
set "FTP_PORT=21"
set "FTP_USERNAME=bzftp@smart-el.co.uk"
set "FTP_PASSWORD=REPLACE_WITH_PASSWORD"
set "FTP_REMOTE_DIR=sats"

set "FTP_USE_SSL=false"

set "FTP_ALLOW_INSECURE_CERT=true"

set "FTP_USE_PASSIVE=true"

set "FTP_ALLOW_PASSIVE_TOGGLE_FALLBACK=false"

set "FTP_MAX_PARALLEL=5"
