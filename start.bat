@echo off
echo.
echo ==========================================
echo   DEADSAT RESURRECTION - FULL STACK
echo   FAR AWAY 2026
echo ==========================================
echo.

REM Kill anything on our ports first
echo [0/3] Clearing ports...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":8000 "') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":5173 "') do (
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 2 /nobreak >nul

REM Step 1: Start Backend
echo [1/3] Starting Backend (FastAPI :8000)...
cd /d "%~dp0backend"
start "DeadSat Backend :8000" cmd /k "python main.py"
echo       Waiting for backend to boot...
timeout /t 6 /nobreak >nul

REM Step 2: Start Frontend
echo [2/3] Starting Frontend (React :5173)...
cd /d "%~dp0remix_-orbital-recovery-unit"
start "DeadSat Frontend :5173" cmd /k "npm run dev"
echo       Waiting for frontend to build...
timeout /t 8 /nobreak >nul

REM Step 3: Open browser
echo [3/3] Opening dashboard...
start http://localhost:5173

echo.
echo ==========================================
echo   ALL SERVICES RUNNING
echo.
echo   Dashboard:   http://localhost:5173
echo   Backend API: http://localhost:8000
echo   API Docs:    http://localhost:8000/docs
echo   Crypto:      Built into backend on :8000
echo   CY-1 Pi:     http://10.36.220.90:8001
echo.
echo   Close the 2 terminal windows to stop.
echo ==========================================
pause