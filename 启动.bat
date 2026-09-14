@echo off
title 第四面墙
cd /d "%~dp0"

echo ========================================
echo  第四面墙
echo ========================================
echo.

rem ---- 1. 检查 Python ----
where python >nul 2>nul
if errorlevel 1 (
    echo [错误] 没有检测到 Python。
    echo.
    echo 请先安装 Python 3.10 或以上版本：
    echo   https://www.python.org/downloads/
    echo 安装时务必勾选 "Add Python to PATH"，装完重新双击本文件。
    echo.
    pause
    exit /b 1
)

rem ---- 2. 第一次运行：自动创建虚拟环境并安装依赖 ----
if not exist "venv\Scripts\python.exe" (
    echo [1/3] 第一次运行，正在创建虚拟环境……
    python -m venv venv
    if errorlevel 1 (
        echo.
        echo [错误] 创建虚拟环境失败，请检查 Python 安装是否正常。
        pause
        exit /b 1
    )
    call "venv\Scripts\activate.bat"
    echo [2/3] 正在安装依赖，第一次可能要几分钟，请耐心等待……
    python -m pip install --upgrade pip
    python -m pip install -r requirements.txt
    if errorlevel 1 (
        echo.
        echo [错误] 依赖安装失败，请检查网络后重新双击本文件。
        pause
        exit /b 1
    )
) else (
    call "venv\Scripts\activate.bat"
)

echo.
echo [3/3] 正在启动服务，几秒后会自动打开浏览器……
echo 提示：关闭这个窗口就等于停止服务。
echo.

start "" powershell -WindowStyle Hidden -Command "$deadline=(Get-Date).AddSeconds(120); while((Get-Date) -lt $deadline){ try { $r=Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:5000/' -TimeoutSec 2; if($r){ Start-Process 'http://127.0.0.1:5000/'; break } } catch { Start-Sleep -Seconds 1 } }"

python app.py

pause
