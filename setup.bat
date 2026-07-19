@echo off
echo ========================================
echo MindWeave Backend Setup Script
echo ========================================
echo.

cd /d "%~dp0backend"

echo [1/3] Creating virtual environment...
if exist .venv (
    echo Virtual environment already exists.
) else (
    python -m venv .venv
    if errorlevel 1 (
        echo ERROR: Failed to create virtual environment.
        echo Please make sure Python is installed and added to PATH.
        pause
        exit /b 1
    )
    echo Virtual environment created successfully.
)

echo.
echo [2/3] Activating virtual environment...
call .venv\Scripts\activate.bat

echo.
echo [3/3] Installing dependencies...
pip install -r requirements.txt
if errorlevel 1 (
    echo ERROR: Failed to install dependencies.
    pause
    exit /b 1
)

echo.
echo ========================================
echo Setup completed successfully!
echo ========================================
echo.
echo To start the backend server, run:
echo   .venv\Scripts\activate
echo   python run.py
echo.
pause