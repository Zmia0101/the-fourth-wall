@echo off
title The Fourth Wall - Update
cd /d "%~dp0"

for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set STAMP=%%i

echo ========================================
echo  The Fourth Wall - Update
echo ========================================
echo.
echo Note: if the server is running, close that window first.
echo.

rem ---- Check Git ----
where git >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Git not found.
    echo.
    echo Updating requires Git. Please install it first: https://git-scm.com/downloads
    echo Then run this file again.
    pause
    exit /b 1
)

if not exist ".git" (
    echo [ERROR] This folder is not a Git repository, so it cannot update automatically.
    echo.
    echo You probably downloaded it as a ZIP from GitHub.
    echo Fix: clone the project with git clone instead; or download the latest version
    echo and copy these folders from the old version to the new one:
    echo   data\       accounts and API keys
    echo   userbooks\  your own books
    echo   backups\    automatic backups
    pause
    exit /b 1
)

echo [1/3] Backing up your data (data, userbooks, backups)...
if not exist "_update_backup" mkdir "_update_backup"
if exist "data"      xcopy "data"      "_update_backup\%STAMP%\data\"      /E /I /Y >nul
if exist "userbooks" xcopy "userbooks" "_update_backup\%STAMP%\userbooks\" /E /I /Y >nul
if exist "backups"   xcopy "backups"   "_update_backup\%STAMP%\backups\"   /E /I /Y >nul
echo       Backed up to _update_backup\%STAMP%\
echo.
echo [2/3] Pulling the latest code (your data is not touched)
git pull
if errorlevel 1 (
    echo.
    echo       Update failed. Common causes: local code changes, or no network.
    echo       Your data is backed up in _update_backup\%STAMP%\, nothing is lost.
    pause
    exit /b 1
)
echo.
echo [3/3] Checking dependencies
if exist "venv\Scripts\activate.bat" (
    call "venv\Scripts\activate.bat"
    python -m pip install -r requirements.txt
) else (
    echo       venv not found, skipping dependency install.
)
echo.
echo Done! Close the old server window and run start.bat again.
pause