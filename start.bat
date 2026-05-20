@echo off
cd /d "%~dp0"
echo Starting Marki dev server (clearing cache)...
echo (First attempt may fail - that is normal for ngrok, it retries automatically)
echo.
npx expo start --tunnel --clear
if errorlevel 1 (
  echo.
  echo Retrying...
  npx expo start --tunnel
)
pause
