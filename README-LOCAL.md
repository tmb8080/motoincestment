# Moto Investment - Local Development Setup

This guide will help you set up the Moto Investment application for local development.

## Prerequisites

Before you begin, make sure you have the following installed:

- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **PostgreSQL** (v12 or higher) - [Download here](https://www.postgresql.org/download/)
- **Git** - [Download here](https://git-scm.com/)

## Quick Start

### Option 1: Automated Setup (Recommended)

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone <repository-url>
   cd moto-investment
   ```

2. **Run the local development script**:
   ```bash
   ./start-local.sh
   ```

   This script will:
   - Check prerequisites
   - Install dependencies
   - Set up environment files
   - Start both backend and frontend servers

### Option 2: Manual Setup

1. **Set up the database**:
   ```bash
   # Create PostgreSQL database
   createdb moto_investment_local
   ```

2. **Configure backend**:
   ```bash
   cd backend
   
   # Install dependencies
   npm install
   
   # Copy environment file
   cp env.local.example .env
   
   # Edit .env file with your database credentials
   # Update DATABASE_URL with your PostgreSQL connection string
   ```

3. **Set up database schema**:
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Push database schema
   npm run db:push
   
   # Seed VIP levels
   npm run db:seed-vip
   ```

4. **Start backend server**:
   ```bash
   npm run dev
   ```

5. **Configure frontend** (in a new terminal):
   ```bash
   cd frontend
   
   # Install dependencies
   npm install
   
   # Start frontend server
   npm start
   ```

## Environment Configuration

### Backend Environment (.env)

The backend uses the following key environment variables:

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/moto_investment_local"

# Server
PORT=5000
NODE_ENV="development"
FRONTEND_URL="http://localhost:3000"

# JWT
JWT_SECRET="local-development-jwt-secret-key-change-in-production"
JWT_EXPIRES_IN="7d"

# Admin
ADMIN_EMAIL="admin@localhost.com"
ADMIN_PASSWORD="admin123"
```

### Frontend Environment

The frontend automatically detects the environment and uses:
- **Development**: `http://localhost:5000/api`
- **Production**: `https://umuhuza.store/api`

## Database Setup

### PostgreSQL Installation

**macOS (using Homebrew)**:
```bash
brew install postgresql
brew services start postgresql
```

**Ubuntu/Debian**:
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**Windows**:
Download and install from [postgresql.org](https://www.postgresql.org/download/windows/)

### Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE moto_investment_local;

# Create user (optional)
CREATE USER moto_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE moto_investment_local TO moto_user;

# Exit
\q
```

## Development URLs

Once everything is running, you can access:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api
- **Health Check**: http://localhost:5000/health
- **Admin Panel**: http://localhost:3000/admin (after login)

## Default Admin Account

For local development, you can use:
- **Email**: admin@localhost.com
- **Password**: admin123

## API Endpoints

### Public Endpoints (No Authentication)
- `GET /api/vip/public/levels` - Get VIP levels
- `GET /api/vip/public/referral-rates` - Get referral rates
- `GET /api/vip/public/tokenomics` - Get tokenomics data

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/verify-email` - Email verification

### Protected Endpoints (Require Authentication)
- `GET /api/wallet/stats` - Get wallet statistics
- `GET /api/referral/stats` - Get referral statistics
- `POST /api/deposit/create` - Create deposit
- `POST /api/withdrawal/create` - Create withdrawal

## Troubleshooting

### Common Issues

1. **Database Connection Error**:
   - Ensure PostgreSQL is running
   - Check DATABASE_URL in .env file
   - Verify database exists

2. **CORS Errors**:
   - Backend is configured to allow localhost:3000
   - Check if frontend is running on port 3000

3. **Port Already in Use**:
   - Backend: Change PORT in .env file
   - Frontend: React will prompt to use different port

4. **Dependencies Installation Failed**:
   - Clear npm cache: `npm cache clean --force`
   - Delete node_modules and package-lock.json, then reinstall

### Database Issues

```bash
# Reset database (WARNING: This will delete all data)
cd backend
npm run db:reset

# Check database status
npm run db:status

# Open Prisma Studio (database GUI)
npm run db:studio
```

### Logs and Debugging

- **Backend logs**: Check terminal where `npm run dev` is running
- **Frontend logs**: Check browser console and terminal
- **Database logs**: Check PostgreSQL logs

## Development Scripts

### Backend Scripts
```bash
npm run dev          # Start development server
npm run start        # Start production server
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:migrate   # Run migrations
npm run db:reset     # Reset database
npm run db:studio    # Open Prisma Studio
npm run db:seed-vip  # Seed VIP levels
```

### Frontend Scripts
```bash
npm start            # Start development server
npm run build        # Build for production
npm run test         # Run tests
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
```

## Project Structure

```
moto-investment/
├── backend/
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── prisma/          # Database schema
│   ├── scripts/         # Utility scripts
│   └── server.js        # Main server file
├── frontend/
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── services/    # API services
│   │   └── contexts/    # React contexts
│   └── public/          # Static files
├── start-local.sh       # Local development script
└── README.md           # This file
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Test locally
4. Submit a pull request

## Support

If you encounter any issues:
1. Check this README
2. Check the troubleshooting section
3. Check GitHub issues
4. Create a new issue with detailed information

---

Happy coding! 🚀
