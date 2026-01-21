@echo off
echo ========================================
echo DaVinci Bridge Setup Checker
echo ========================================
echo.

python check_setup.py

if errorlevel 1 (
    echo.
    echo Failed to run checker
    pause
    exit /b 1
)
































