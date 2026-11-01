@echo off
cd /d "%~dp0"
echo Iniciando Tomato Mobile Web (sem login Tomato)...
node .
if errorlevel 1 pause
