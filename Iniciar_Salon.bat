@echo off
title Dinora Beauty Nails - Servidor Local
cd /d "%~dp0"

echo ==================================================
echo   Iniciando Sistema - Dinora Beauty Nails
echo ==================================================
echo.

if not exist "node_modules" (
  echo Instalando dependencias por primera vez...
  call npm install
)

if not exist "dist" (
  echo Compilando aplicacion por primera vez...
  call npm run build
)

start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:3000"

node --watch server/index.js
pause

