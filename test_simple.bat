@echo off
echo ============================================================
echo DaVinci Resolve Simple Connection Test (Python 3.11)
echo ============================================================
echo.
echo BEFORE RUNNING:
echo   1. Start DaVinci Resolve Studio
echo   2. Enable: Settings → System → General → External scripting → Local
echo.
pause
echo.

C:\Python311\python.exe "%~dp0test_davinci_simple.py"

echo.
echo ============================================================
pause

