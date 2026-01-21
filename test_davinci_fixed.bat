@echo off
echo ============================================================
echo DaVinci Resolve Connection Test (With Proper Env Setup)
echo ============================================================
echo.
echo BEFORE RUNNING:
echo   1. Start DaVinci Resolve Studio
echo   2. Enable: Settings -^> System -^> General -^> External scripting -^> Local
echo.
pause
echo.

REM Set DaVinci environment variables BEFORE running Python
set RESOLVE_SCRIPT_API=%PROGRAMDATA%\Blackmagic Design\DaVinci Resolve\Support\Developer\Scripting
set RESOLVE_SCRIPT_LIB=C:\Program Files\Blackmagic Design\DaVinci Resolve\fusionscript.dll
set PYTHONPATH=%PYTHONPATH%;%RESOLVE_SCRIPT_API%\Modules\

REM Add DLL directory to PATH
set PATH=C:\Program Files\Blackmagic Design\DaVinci Resolve;%PATH%

echo Environment variables set:
echo   RESOLVE_SCRIPT_API=%RESOLVE_SCRIPT_API%
echo   RESOLVE_SCRIPT_LIB=%RESOLVE_SCRIPT_LIB%
echo.
echo Running Python script...
echo.

C:\Python311\python.exe "%~dp0test_davinci_fixed.py"

echo.
echo ============================================================
pause
































