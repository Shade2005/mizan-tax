@echo off
setlocal
cd /d "%~dp0mobile"
node scripts/build-apk.js %*
