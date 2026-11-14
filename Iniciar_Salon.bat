@echo off
title Salon Lizzy y Sandra - Servidor Local
cd /d "%~dp0"

echo ==================================================
echo   Iniciando Sistema - Salon Lizzy ^& Sandra
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

node server/index.js
pause

