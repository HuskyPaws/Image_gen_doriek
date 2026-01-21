@echo off
echo ============================================================
echo Checking Visual C++ Redistributables
echo ============================================================
echo.
echo Looking for installed Visual C++ Redistributables...
echo.

reg query "HKLM\SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64" 2>nul
if %errorlevel% equ 0 (
    echo [FOUND] Visual C++ 2015-2022 Redistributable x64
) else (
    echo [MISSING] Visual C++ 2015-2022 Redistributable x64
)

echo.
reg query "HKLM\SOFTWARE\Classes\Installer\Dependencies\VC,redist.x64,amd64,14" 2>nul
if %errorlevel% equ 0 (
    echo [FOUND] VC++ 2015-2022 x64 Installation
) else (
    echo [MISSING] VC++ 2015-2022 x64 Installation
)

echo.
echo ============================================================
echo.
echo If any are MISSING, download and install from:
echo https://aka.ms/vs/17/release/vc_redist.x64.exe
echo.
pause
































