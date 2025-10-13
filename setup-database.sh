#!/bin/bash

# Database Setup Script for Local Development
echo "🗄️  Setting up Moto Investment Local Database..."

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

# Check for PostgreSQL
if ! command_exists psql; then
    echo -e "${RED}❌ PostgreSQL is not installed. Please install PostgreSQL first.${NC}"
    echo -e "${YELLOW}macOS: brew install postgresql${NC}"
    echo -e "${YELLOW}Ubuntu: sudo apt install postgresql${NC}"
    echo -e "${YELLOW}Windows: Download from https://www.postgresql.org/download/${NC}"
    exit 1
fi

echo -e "${GREEN}✅ PostgreSQL is installed${NC}"

# Database configuration
DB_NAME="moto_investment_local"
DB_USER="postgres"
DB_HOST="localhost"
DB_PORT="5432"

echo -e "${BLUE}Creating database: ${DB_NAME}${NC}"

# Create database
createdb -h $DB_HOST -p $DB_PORT -U $DB_USER $DB_NAME 2>/dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database '${DB_NAME}' created successfully${NC}"
elif [ $? -eq 2 ]; then
    echo -e "${YELLOW}⚠️  Database '${DB_NAME}' already exists${NC}"
else
    echo -e "${RED}❌ Failed to create database${NC}"
    echo -e "${YELLOW}Please check your PostgreSQL connection and try again${NC}"
    exit 1
fi

# Navigate to backend directory
cd backend

# Check if .env exists
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
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}Installing backend dependencies...${NC}"
    npm install
fi

# Generate Prisma client
echo -e "${BLUE}Generating Prisma client...${NC}"
npm run db:generate

# Push database schema
echo -e "${BLUE}Pushing database schema...${NC}"
npm run db:push

# Seed VIP levels
echo -e "${BLUE}Seeding VIP levels...${NC}"
npm run db:seed-vip

echo -e "${GREEN}✅ Database setup completed successfully!${NC}"
echo -e "${BLUE}You can now start the development servers with: ./start-local.sh${NC}"
echo -e "${BLUE}Or manually start backend with: npm run dev${NC}"
