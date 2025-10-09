@echo off
REM Plumino Project Dependencies Installation Script
REM Batch script to install all project dependencies

echo.
echo ======================================================
echo 🚀 Starting Plumino Project Dependencies Installation
echo ======================================================
echo.

REM Check if Node.js is installed
echo 🔍 Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js not found! Please install Node.js first.
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
) else (
    echo ✅ Node.js found
)

REM Check if npm is available
echo 🔍 Checking npm installation...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm not found! Please install npm.
    pause
    exit /b 1
) else (
    echo ✅ npm found
)

REM Install global Angular CLI if not present
echo.
echo 🌐 Checking Angular CLI installation...
ng version --help >nul 2>&1
if %errorlevel% neq 0 (
    echo 📦 Installing Angular CLI globally...
    npm install -g @angular/cli
    if %errorlevel% neq 0 (
        echo ❌ Failed to install Angular CLI
        pause
        exit /b 1
    ) else (
        echo ✅ Angular CLI installed successfully
    )
) else (
    echo ✅ Angular CLI already installed
)

REM Install Backend Dependencies
echo.
echo 🔧 Installing Backend Dependencies...
echo 📂 Navigating to backend directory...

if not exist "backend" (
    echo ❌ Backend directory not found!
    pause
    exit /b 1
)

cd backend
echo 📍 Current directory: %CD%
echo 📦 Running npm install in backend...
npm install

if %errorlevel% neq 0 (
    echo ❌ Failed to install backend dependencies
    cd ..
    pause
    exit /b 1
) else (
    echo ✅ Backend dependencies installed successfully!
)

cd ..

REM Install Frontend Dependencies
echo.
echo 🎨 Installing Frontend Dependencies...
echo 📂 Navigating to frontend directory...

if not exist "frontend" (
    echo ❌ Frontend directory not found!
    pause
    exit /b 1
)

cd frontend
echo 📍 Current directory: %CD%
echo 📦 Running npm install in frontend...
npm install

if %errorlevel% neq 0 (
    echo ❌ Failed to install frontend dependencies
    cd ..
    pause
    exit /b 1
) else (
    echo ✅ Frontend dependencies installed successfully!
)

cd ..

REM Installation Complete
echo.
echo ======================================================
echo 🎉 Installation Complete!
echo ======================================================
echo ✅ All dependencies have been installed successfully!
echo.
echo 🚀 Next Steps:
echo   1. Set up your MongoDB connection string in backend\.env
echo   2. To start the backend: cd backend ^&^& npm start
echo   3. To start the frontend: cd frontend ^&^& ng serve
echo.
echo 📚 Installed Dependencies Summary:
echo   Backend: Express, MongoDB, JWT, bcrypt, and more
echo   Frontend: Angular 20, Chart.js, RxJS, and more
echo   Global: Angular CLI
echo.
echo Happy coding! 🎯
echo.
pause