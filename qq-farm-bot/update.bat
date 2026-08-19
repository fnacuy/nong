@echo off
chcp 65001 >nul
setlocal

cd /d "%~dp0"

echo ==========================================
echo   QQ 农场智能助手 - 一键更新
echo ==========================================
echo.

echo [1/4] 拉取最新代码...
git pull
if errorlevel 1 goto :fail_pull

echo [2/4] 安装依赖...
call pnpm install -r
if errorlevel 1 goto :fail_deps

echo [3/4] 构建前端...
call pnpm build:web
if errorlevel 1 goto :fail_build

echo [4/4] 启动服务...
echo.
echo 提示：若旧服务仍在运行，请先在旧窗口按 Ctrl+C 停止它。
echo 本窗口将保持前台运行，关闭窗口即停止服务。
echo.
call pnpm dev:core

exit /b 0

:fail_pull
echo.
echo [错误] 拉取代码失败。请先提交或还原本地改动后重试。
goto :end

:fail_deps
echo.
echo [错误] 依赖安装失败，请检查网络或 pnpm 配置。
goto :end

:fail_build
echo.
echo [错误] 前端构建失败，请截图报错内容反馈。
goto :end

:end
echo.
pause