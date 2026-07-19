@echo off
echo Starting MindWeave Backend Server...
cd /d "%~dp0backend"

if not exist .venv (
    echo Virtual environment not found!
    echo Please run setup.bat first.
    pause
    exit /b 1
)

call .venv\Scripts\activate.bat
python run.py
pause