@echo off
chcp 65001 >nul
title 更新「第四面墙」
cd /d "%~dp0"

for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd-HHmmss"') do set STAMP=%%i

echo ========================================
echo  更新「第四面墙」
echo ========================================
echo.
echo 提醒：如果「第四面墙」正在运行，请先关掉那个运行窗口再继续。
echo.

rem ---- 检查 Git ----
where git >nul 2>nul
if errorlevel 1 (
    echo [错误] 没有检测到 Git。
    echo.
    echo 自动更新需要用 Git，请先安装：https://git-scm.com/downloads
    echo 装完重新双击本文件即可。
    pause
    exit /b 1
)

if not exist ".git" (
    echo [错误] 这个文件夹不是 Git 仓库，没法自动更新。
    echo.
    echo 你可能是在 GitHub 上点 "Download ZIP" 下载的。
    echo 解决办法：改用 git clone 获取项目；如果不想重装，
    echo 就重新下载最新版，然后只把下列文件夹从旧版拷到新版：
    echo   data\       账号与 API Key
    echo   userbooks\  你创作的书
    echo   backups\    自动备份
    pause
    exit /b 1
)

echo [1/3] 先备份你的数据（账号、你的书、备份目录）
if not exist "_update_backup" mkdir "_update_backup"
if exist "data"      xcopy "data"      "_update_backup\%STAMP%\data\"      /E /I /Y >nul
if exist "userbooks" xcopy "userbooks" "_update_backup\%STAMP%\userbooks\" /E /I /Y >nul
if exist "backups"   xcopy "backups"   "_update_backup\%STAMP%\backups\"   /E /I /Y >nul
echo       已备份到 _update_backup\%STAMP%\
echo.
echo [2/3] 拉取最新代码（只会更新代码，不会动你的数据）
git pull
if errorlevel 1 (
    echo.
    echo       更新失败。常见原因：本地改过代码，或者网络不通。
    echo       你的数据已经备份在 _update_backup\%STAMP%\ 里，没有丢失。
    pause
    exit /b 1
)
echo.
echo [3/3] 检查依赖
if exist "venv\Scripts\activate.bat" (
    call "venv\Scripts\activate.bat"
    python -m pip install -r requirements.txt
) else (
    echo       没找到 venv，跳过依赖安装。
)
echo.
echo 更新完成！关掉旧的运行窗口，重新双击「启动.bat」即可。
pause
