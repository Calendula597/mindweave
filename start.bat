@echo off
echo Starting MindWeave Backend Server...
cd /d "%~dp0backend"
start /b python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
echo Backend server started on http://localhost:8000
timeout /t 3 /nobreak > nul
echo Starting MindWeave Frontend Server...
cd /d "%~dp0frontend"
start /b npm start
echo Frontend server starting on http://localhost:3000
echo.
echo Press any key to exit this window (servers will continue running)
pause > nul