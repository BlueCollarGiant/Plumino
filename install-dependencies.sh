#!/bin/bash

# Plumino Project Dependencies Installation Script
# Shell script for macOS/Linux to install all project dependencies

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting Plumino Project Dependencies Installation...${NC}"
echo -e "${CYAN}=================================================${NC}"

# Check if Node.js is installed
echo -e "${YELLOW}🔍 Checking Node.js installation...${NC}"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✅ Node.js found: ${NODE_VERSION}${NC}"
else
    echo -e "${RED}❌ Node.js not found! Please install Node.js first.${NC}"
    echo -e "${YELLOW}Install via Homebrew: brew install node${NC}"
    echo -e "${YELLOW}Or download from: https://nodejs.org/${NC}"
    exit 1
fi

# Check if npm is available
echo -e "${YELLOW}🔍 Checking npm installation...${NC}"
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✅ npm found: v${NPM_VERSION}${NC}"
else
    echo -e "${RED}❌ npm not found! Please install npm.${NC}"
    exit 1
fi

# Install global Angular CLI if not present
echo -e "\n${YELLOW}🌐 Checking Angular CLI installation...${NC}"
if command -v ng &> /dev/null; then
    echo -e "${GREEN}✅ Angular CLI already installed${NC}"
else
    echo -e "${BLUE}📦 Installing Angular CLI globally...${NC}"
    npm install -g @angular/cli
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Angular CLI installed successfully${NC}"
    else
        echo -e "${RED}❌ Failed to install Angular CLI${NC}"
        exit 1
    fi
fi

# Install Backend Dependencies
echo -e "\n${YELLOW}🔧 Installing Backend Dependencies...${NC}"
echo -e "${BLUE}📂 Navigating to backend directory...${NC}"

if [ -d "backend" ]; then
    cd backend
    echo -e "${WHITE}📍 Current directory: $(pwd)${NC}"
    
    echo -e "${BLUE}📦 Running npm install in backend...${NC}"
    npm install
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Backend dependencies installed successfully!${NC}"
    else
        echo -e "${RED}❌ Failed to install backend dependencies${NC}"
        cd ..
        exit 1
    fi
    
    cd ..
else
    echo -e "${RED}❌ Backend directory not found!${NC}"
    exit 1
fi

# Install Frontend Dependencies
echo -e "\n${YELLOW}🎨 Installing Frontend Dependencies...${NC}"
echo -e "${BLUE}📂 Navigating to frontend directory...${NC}"

if [ -d "frontend" ]; then
    cd frontend
    echo -e "${WHITE}📍 Current directory: $(pwd)${NC}"
    
    echo -e "${BLUE}📦 Running npm install in frontend...${NC}"
    npm install
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Frontend dependencies installed successfully!${NC}"
    else
        echo -e "${RED}❌ Failed to install frontend dependencies${NC}"
        cd ..
        exit 1
    fi
    
    cd ..
else
    echo -e "${RED}❌ Frontend directory not found!${NC}"
    exit 1
fi

# Installation Complete
echo -e "\n${GREEN}🎉 Installation Complete!${NC}"
echo -e "${CYAN}=================================================${NC}"
echo -e "${GREEN}✅ All dependencies have been installed successfully!${NC}"
echo ""
echo -e "${YELLOW}🚀 Next Steps:${NC}"
echo -e "${WHITE}  1. Set up your MongoDB connection string in backend/.env${NC}"
echo -e "${WHITE}  2. To start the backend: cd backend && npm start${NC}"
echo -e "${WHITE}  3. To start the frontend: cd frontend && ng serve${NC}"
echo ""
echo -e "${CYAN}📚 Installed Dependencies Summary:${NC}"
echo -e "${WHITE}  Backend: Express, MongoDB, JWT, bcrypt, and more${NC}"
echo -e "${WHITE}  Frontend: Angular 20, Chart.js, RxJS, and more${NC}"
echo -e "${WHITE}  Global: Angular CLI${NC}"
echo ""
echo -e "${PURPLE}Happy coding! 🎯${NC}"