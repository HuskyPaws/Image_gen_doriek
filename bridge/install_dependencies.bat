@echo off
echo ========================================
echo DaVinci Bridge - Installing Dependencies
echo ========================================
echo.

python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.7+ from https://www.python.org/
    pause
    exit /b 1
)

echo Python found!
echo Installing Flask and Flask-CORS...
echo.

pip install -r requirements.txt

if errorlevel 1 (
    echo.
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo ========================================
echo SUCCESS! Dependencies installed
echo ========================================
echo.
echo You can now use the DaVinci Export feature!
echo The bridge will auto-start when you visit the page.
echo.
pause
































