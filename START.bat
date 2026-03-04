@echo off
title Gas Station
color 0A

echo.
echo  ================================================
echo   GAS STATION NIGERIA - Local Setup
echo  ================================================
echo.

:: Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo  ERROR: Node.js not found.
    echo  Install from: https://nodejs.org  ^(choose LTS^)
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VER=%%i
echo  Node.js %NODE_VER% found
echo.

:: Kill anything running on port 3000
echo  Freeing port 3000...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000 "') do (
    taskkill /PID %%p /F >nul 2>&1
)
echo  Done.
echo.

echo  [1/5] Installing dependencies...
call npm install
if errorlevel 1 ( pause & exit /b 1 )
echo.

echo  [2/5] Setting up database...
call npx prisma generate 2>nul
call npx prisma db push --accept-data-loss
if errorlevel 1 ( pause & exit /b 1 )
echo.

echo  [3/5] Demo data...
set /p SEED="  Load demo data? (Y/N): "
if /i "%SEED%"=="Y" (
    call node prisma/seed.js
    echo  Demo data loaded.
) else (
    echo  Skipped.
)
echo.

echo  [4/5] Syncing env vars to Vercel...
for /f "usebackq tokens=*" %%L in (".env.local") do (
    if not "%%L"=="" (
        echo %%L | findstr /b "#" >nul || (
            echo %%L | findstr "=" >nul && (
                for /f "tokens=1,* delims==" %%K in ("%%L") do (
                    echo   pushing %%K...
                    echo %%M | vercel env add %%K production --force >nul 2>&1
                )
            )
        )
    )
)
echo  Done.
echo.

echo  [5/5] Deploying to Vercel...
start "Vercel Deploy" cmd /k "npx vercel --prod"
echo.

echo  ================================================
echo   Local:   http://localhost:3000
echo   iPhone:  check the Vercel window for https://
echo.
echo   Login credentials:
echo   Admin:    admin@gasstation.ng  /  Admin@2026
echo   Outlet 1: outlet1@gasstation.ng / Outlet1@26
echo   Customer: demo.a@gasstation.ng  /  Demo@001
echo  ================================================
echo.

timeout /t 2 /nobreak >nul
start http://localhost:3000
call npm run dev