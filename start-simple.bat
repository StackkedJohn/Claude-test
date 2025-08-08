@echo off
echo 🚀 Starting ICEPACA E-commerce Development Environment (Windows Compatible)
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js is available
echo.

REM Start MongoDB container only (this usually works on Windows)
echo 📦 Starting MongoDB database...
docker run -d --name icepaca-mongodb -p 27017:27017 -e MONGO_INITDB_ROOT_USERNAME=admin -e MONGO_INITDB_ROOT_PASSWORD=dev-password mongo:latest 2>nul

timeout /t 5 /nobreak >nul

echo 📦 Starting Redis cache...
docker run -d --name icepaca-redis -p 6379:6379 redis:alpine 2>nul

timeout /t 3 /nobreak >nul

REM Install dependencies and start backend
echo 🔧 Setting up backend...
cd backend
if not exist node_modules (
    echo Installing backend dependencies...
    npm install
)

echo 🚀 Starting ICEPACA Backend API...
start "ICEPACA Backend" cmd /k "npm run dev"

timeout /t 3 /nobreak >nul

REM Install dependencies and start frontend
cd ..\frontend
if not exist node_modules (
    echo Installing frontend dependencies...
    npm install
)

echo 🌐 Starting ICEPACA Frontend...
start "ICEPACA Frontend" cmd /k "npm start"

cd ..

echo.
echo ⏳ Services are starting up...
echo This may take 2-3 minutes for first-time setup
echo.
echo 🌐 Once ready, your ICEPACA site will be available at:
echo    Frontend: http://localhost:3000
echo    Backend API: http://localhost:5000
echo    Database: MongoDB on localhost:27017
echo.
echo 📝 Test accounts:
echo    Admin: admin@icepaca.com / admin123
echo    Customer: customer@example.com / customer123
echo.
echo ⚠️  Note: If you see errors, wait a few minutes for services to fully start
echo.
pause