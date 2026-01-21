@echo off
echo ============================================================
echo Installing PyDavinci for Python 3.11
echo ============================================================
echo.

echo Step 1: Ensuring pip is installed...
C:\Python311\python.exe -m ensurepip --default-pip
echo.

echo Step 2: Installing pydavinci...
C:\Python311\python.exe -m pip install --user git+https://github.com/pedrolabonia/pydavinci

echo.
echo ============================================================
echo Installation complete!
echo ============================================================
echo.
pause

