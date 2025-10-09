# Plumino Project Setup

## Quick Installation

This repository contains scripts to automatically install all project dependencies for different operating systems.

### Windows Users

#### Option 1: PowerShell Script (Recommended)
```powershell
.\install-dependencies.ps1
```

#### Option 2: Batch Script
```cmd
install-dependencies.bat
```

### Mac/Linux Users

#### Shell Script
```bash
chmod +x install-dependencies.sh
./install-dependencies.sh
```

## What These Scripts Do

1. **System Check**: Verify Node.js and npm are installed
2. **Global Tools**: Install Angular CLI globally if not present
3. **Backend Dependencies**: Navigate to `backend/` and run `npm install`
4. **Frontend Dependencies**: Navigate to `frontend/` and run `npm install`
5. **Success Summary**: Display next steps and installed packages

## Prerequisites for Mac Users

### Install Node.js via Homebrew (Recommended)
```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js and npm
brew install node
```

### Alternative: Download Node.js
Download from [https://nodejs.org/](https://nodejs.org/)

## Manual Installation (if scripts don't work)

### Prerequisites

#### Windows
```bash
# Install Node.js from https://nodejs.org/
# Install Angular CLI globally
npm install -g @angular/cli
```

#### Mac/Linux
```bash
# Install Node.js via Homebrew (Mac)
brew install node

# Or install via package manager (Linux)
sudo apt update && sudo apt install nodejs npm  # Ubuntu/Debian
sudo yum install nodejs npm                     # CentOS/RHEL

# Install Angular CLI globally
npm install -g @angular/cli
```

### Backend Setup
```bash
cd backend
npm install
```

### Frontend Setup
```bash
cd frontend  
npm install
```

## Next Steps After Installation

1. **Database Setup**: Configure MongoDB connection in `backend/.env`
2. **Start Backend**: `cd backend && npm start`
3. **Start Frontend**: `cd frontend && ng serve`

## Troubleshooting

### Windows
If the PowerShell script fails to run due to execution policy:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then run the script again:
```powershell
.\install-dependencies.ps1
```

### Mac/Linux
If the shell script fails to run due to permissions:
```bash
chmod +x install-dependencies.sh
./install-dependencies.sh
```

If you get permission errors for global npm packages:
```bash
# Fix npm permissions (recommended approach)
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.profile
source ~/.profile

# Then install Angular CLI
npm install -g @angular/cli
```