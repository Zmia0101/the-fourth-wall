@echo off
title The Fourth Wall
cd /d "%~dp0"

echo ========================================
echo  The Fourth Wall
echo ========================================
echo.

rem ---- 1. Check Python ----
where python >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Python not found.
    echo.
    echo Please install Python 3.10 or later:
    echo   https://www.python.org/downloads/
    echo Remember to tick "Add Python to PATH", then run this file again.
    echo.
    pause
    exit /b 1
)

rem ---- 2. First run: create venv and install dependencies ----
if not exist "venv\Scripts\python.exe" (
    echo [1/3] First run: creating virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo.
        echo [ERROR] Failed to create the virtual environment. Check your Python installation.
        pause
        exit /b 1
    )
    call "venv\Scripts\activate.bat"
    echo [2/3] Installing dependencies. This may take a few minutes on the first run...
    python -m pip install --upgrade pip
    python -m pip install -r requirements.txt
    if errorlevel 1 (
        echo.
        echo [ERROR] Failed to install dependencies. Check your network and run this file again.
        pause
        exit /b 1
    )
) else (
    call "venv\Scripts\activate.bat"
)

echo.
echo [3/3] Starting the server. The browser will open when it is ready...
echo Tip: closing this window stops the server.
echo.

start "" powershell -WindowStyle Hidden -Command "$deadline=(Get-Date).AddSeconds(120); while((Get-Date) -lt $deadline){ try { $r=Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:5000/' -TimeoutSec 2; if($r){ Start-Process 'http://127.0.0.1:5000/'; break } } catch { Start-Sleep -Seconds 1 } }"

python app.py

pause