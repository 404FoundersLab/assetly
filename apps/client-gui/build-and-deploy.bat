@echo off
echo ============================================
echo  AssetManager Security Client - Builder
echo ============================================
echo.

:: Kill any running electron instance first
taskkill /f /im "AssetManager Security Client.exe" 2>nul
taskkill /f /im electron.exe 2>nul
timeout /t 2 /nobreak >nul

:: Build the portable exe
echo [1/3] Building portable Windows exe...
call npm run build
if errorlevel 1 (
    echo.
    echo ERROR: Build failed! Check the output above.
    pause
    exit /b 1
)

:: Copy to web public downloads (root location)
echo.
echo [2/3] Copying to web public downloads...
set OUT=..\web\public\downloads\build-output
set DEST=..\web\public\downloads\EndpointSecurityClient_Prod.exe

if exist "%OUT%\EndpointSecurityClient_Prod.exe" (
    copy /Y "%OUT%\EndpointSecurityClient_Prod.exe" "%DEST%"
    echo SUCCESS: Copied to %DEST%
) else (
    echo WARNING: Build output not found at %OUT%
    echo Looking for alternative output location...
    for /r "%OUT%" %%f in (*.exe) do (
        echo Found: %%f
        copy /Y "%%f" "%DEST%"
    )
)

echo.
echo [3/3] Done!
echo ============================================
echo  The new GUI client is now available for
echo  download from the Endpoint Security page.
echo ============================================
echo.
pause
