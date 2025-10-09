# Plumino Project Dependencies Installation Script
# PowerShell script to install all project dependencies

Write-Host "🚀 Starting Plumino Project Dependencies Installation..." -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Cyan

# Check if Node.js is installed
Write-Host "🔍 Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found! Please install Node.js first." -ForegroundColor Red
    Write-Host "Download from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check if npm is available
Write-Host "🔍 Checking npm installation..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "✅ npm found: v$npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm not found! Please install npm." -ForegroundColor Red
    exit 1
}

# Install global Angular CLI if not present
Write-Host "`n🌐 Checking Angular CLI installation..." -ForegroundColor Yellow
try {
    $ngVersion = ng version --help 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Angular CLI already installed" -ForegroundColor Green
    } else {
        throw "Not found"
    }
} catch {
    Write-Host "📦 Installing Angular CLI globally..." -ForegroundColor Blue
    npm install -g @angular/cli
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Angular CLI installed successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to install Angular CLI" -ForegroundColor Red
        exit 1
    }
}

# Install Backend Dependencies
Write-Host "`n🔧 Installing Backend Dependencies..." -ForegroundColor Yellow
Write-Host "📂 Navigating to backend directory..." -ForegroundColor Blue

if (Test-Path "backend") {
    Set-Location "backend"
    Write-Host "📍 Current directory: $(Get-Location)" -ForegroundColor Gray
    
    Write-Host "📦 Running npm install in backend..." -ForegroundColor Blue
    npm install
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Backend dependencies installed successfully!" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to install backend dependencies" -ForegroundColor Red
        Set-Location ".."
        exit 1
    }
    
    Set-Location ".."
} else {
    Write-Host "❌ Backend directory not found!" -ForegroundColor Red
    exit 1
}

# Install Frontend Dependencies
Write-Host "`n🎨 Installing Frontend Dependencies..." -ForegroundColor Yellow
Write-Host "📂 Navigating to frontend directory..." -ForegroundColor Blue

if (Test-Path "frontend") {
    Set-Location "frontend"
    Write-Host "📍 Current directory: $(Get-Location)" -ForegroundColor Gray
    
    Write-Host "📦 Running npm install in frontend..." -ForegroundColor Blue
    npm install
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Frontend dependencies installed successfully!" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to install frontend dependencies" -ForegroundColor Red
        Set-Location ".."
        exit 1
    }
    
    Set-Location ".."
} else {
    Write-Host "❌ Frontend directory not found!" -ForegroundColor Red
    exit 1
}

# Installation Complete
Write-Host "`n🎉 Installation Complete!" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "✅ All dependencies have been installed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Set up your MongoDB connection string in backend/.env" -ForegroundColor White
Write-Host "  2. To start the backend: cd backend && npm start" -ForegroundColor White
Write-Host "  3. To start the frontend: cd frontend && ng serve" -ForegroundColor White
Write-Host ""
Write-Host "📚 Installed Dependencies Summary:" -ForegroundColor Cyan
Write-Host "  Backend: Express, MongoDB, JWT, bcrypt, and more" -ForegroundColor White
Write-Host "  Frontend: Angular 20, Chart.js, RxJS, and more" -ForegroundColor White
Write-Host "  Global: Angular CLI" -ForegroundColor White
Write-Host ""
Write-Host "Happy coding! 🎯" -ForegroundColor Magenta