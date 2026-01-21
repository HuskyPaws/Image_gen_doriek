@echo off
echo ============================================================
echo Installing PyDavinci for Python 3.13
echo ============================================================
echo.
echo NOTE: Testing with Python 3.13 - PyDavinci might work even
echo though the raw DaVinci API doesn't support 3.13.
echo.

C:\Python313\python.exe -m pip install --user git+https://github.com/pedrolabonia/pydavinci

echo.
echo ============================================================
echo Installation complete!
echo ============================================================
echo.
pause
































