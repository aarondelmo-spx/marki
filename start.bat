@echo off
cd /d "%~dp0"
echo Starting Marki dev server...
echo (First attempt may fail - that is normal for ngrok)
echo.
npx expo start --tunnel
if errorlevel 1 (
  echo.
  echo Retrying...
  npx expo start --tunnel
)
pause
