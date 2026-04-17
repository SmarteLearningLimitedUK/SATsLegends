@echo off
setlocal
cd /d "%~dp0.."
npm.cmd run dev > devserver3000.dev.out.log 2>&1
