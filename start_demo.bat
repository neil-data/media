@echo off
echo.
echo ==========================================
echo   DEADSAT - DEMO MODE
echo   Judge presentation
echo ==========================================
echo.

REM Kill existing processes
echo Clearing ports...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":8000 "') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":5173 "') do taskkill /F /PID %%a >nul 2>&1
timeout /t 2 /nobreak >nul

REM Start Backend
echo [1/3] Starting Backend...
cd /d "%~dp0backend"
start "Backend :8000" cmd /k "python main.py"
timeout /t 6 /nobreak >nul

REM Start Frontend
echo [2/3] Starting Frontend...
cd /d "%~dp0remix_-orbital-recovery-unit"
start "Frontend :5173" cmd /k "npm run dev"
timeout /t 8 /nobreak >nul

REM Lock demo mode
echo [3/3] Locking demo mode...
curl -s -X POST http://localhost:8000/demo/start >nul 2>&1

REM Open dashboard
start http://localhost:5173

echo.
echo ==========================================
echo   DEMO READY - 90 SECOND FLOW
echo.
echo   Step 1: Dashboard loads green
echo   Step 2: POST /fault/inject (SEU)
echo   Step 3: ADCS spikes on charts
echo   Step 4: POST /recovery/trigger
echo   Step 5: 9 LangGraph nodes in terminal
echo   Step 6: Dashboard green - DONE
echo.
echo   Dashboard:  http://localhost:5173
echo   API Docs:   http://localhost:8000/docs
echo   CY-1 Pi:    http://10.36.220.90:8001
echo ==========================================
pause