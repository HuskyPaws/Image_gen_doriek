@echo off
echo ============================================================
echo DaVinci Resolve Test with Python 3.6
echo ============================================================
echo.
echo BEFORE RUNNING:
echo   1. Install Python 3.6.8 to C:\Python36
echo   2. Start DaVinci Resolve Studio
echo   3. Enable external scripting (Settings -^> System -^> General -^> Local)
echo.
pause
echo.

echo Checking Python 3.6 installation...
C:\Python36\python.exe --version
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Python 3.6 not found at C:\Python36\
    echo Please install Python 3.6.8 from:
    echo https://www.python.org/ftp/python/3.6.8/python-3.6.8-amd64.exe
    echo.
    pause
    exit /b 1
)

echo.
echo Running DaVinci connection test...
echo.

C:\Python36\python.exe "%~dp0test_with_env.py"

echo.
pause
































