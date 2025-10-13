#!/bin/bash

# Moto Investment Local Development Startup Script
echo "🚀 Starting Moto Investment Local Development Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check for required tools
echo -e "${BLUE}Checking prerequisites...${NC}"

if ! command_exists node; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js first.${NC}"
    echo -e "${YELLOW}Download from: https://nodejs.org/${NC}"
    exit 1
fi

if ! command_exists npm; then
    echo -e "${RED}❌ npm is not installed. Please install npm first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js and npm are installed${NC}"

# Check for PostgreSQL (optional warning)
if ! command_exists psql; then
    echo -e "${YELLOW}⚠️  PostgreSQL not found. You may need to install PostgreSQL for database functionality.${NC}"
    echo -e "${YELLOW}Download from: https://www.postgresql.org/download/${NC}"
else
    echo -e "${GREEN}✅ PostgreSQL is installed${NC}"
fi

# Install backend dependencies
echo -e "${BLUE}📦 Installing backend dependencies...${NC}"
cd backend
if [ ! -d "node_modules" ]; then
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to install backend dependencies${NC}"
        exit 1
    fi
fi

# Check if .env exists, if not copy from example
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Creating from example...${NC}"
    if [ -f "env.local.example" ]; then
        cp env.local.example .env
        echo -e "${GREEN}✅ Created .env file from env.local.example${NC}"
    elif [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${GREEN}✅ Created .env file from .env.example${NC}"
    else
        echo -e "${RED}❌ No environment example file found${NC}"
        exit 1
    fi
    echo -e "${YELLOW}📝 Please update the .env file with your actual configuration values${NC}"
fi

# Install frontend dependencies
echo -e "${BLUE}📦 Installing frontend dependencies...${NC}"
cd ../frontend
if [ ! -d "node_modules" ]; then
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to install frontend dependencies${NC}"
        exit 1
    fi
fi

# Set environment variables for local development
export NODE_ENV=development

# Start both services
echo -e "${GREEN}🚀 Starting development servers...${NC}"
echo -e "${BLUE}Backend will run on: http://localhost:5000${NC}"
echo -e "${BLUE}Frontend will run on: http://localhost:3000${NC}"
echo -e "${BLUE}API Base URL: http://localhost:5000/api${NC}"

# Start backend in background
cd ../backend
echo -e "${BLUE}Starting backend server...${NC}"
npm run dev &
BACKEND_PID=$!

# Wait a moment for backend to start
echo -e "${BLUE}Waiting for backend to initialize...${NC}"
sleep 5

# Check if backend is running
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${RED}❌ Backend failed to start${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Backend server started successfully${NC}"

# Start frontend
cd ../frontend
echo -e "${BLUE}Starting frontend server...${NC}"
npm start &
FRONTEND_PID=$!

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down development servers...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo -e "${GREEN}✅ Development servers stopped${NC}"
    exit 0
}

# Trap Ctrl+C
trap cleanup INT

echo -e "${GREEN}✅ Development environment started successfully!${NC}"
echo -e "${BLUE}🌐 Frontend: http://localhost:3000${NC}"
echo -e "${BLUE}🔧 Backend API: http://localhost:5000/api${NC}"
echo -e "${BLUE}📊 Health Check: http://localhost:5000/health${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop all servers${NC}"

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
