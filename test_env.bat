@echo off
echo ============================================================
echo DaVinci Connection Test (With Paths Set in Python)
echo ============================================================
echo.
echo BEFORE RUNNING:
echo   1. Start DaVinci Resolve Studio
echo   2. Enable external scripting (Settings -^> System -^> General -^> Local)
echo.
pause
echo.

C:\Python311\python.exe "%~dp0test_with_env.py"

echo.
pause
































