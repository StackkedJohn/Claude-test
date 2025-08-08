@echo off
setlocal

REM ICEPACA Local Development Setup Script for Windows

echo 🚀 Setting up ICEPACA Local Development Environment...
echo.

REM Check if Docker and Docker Compose are installed
echo [INFO] Checking dependencies...
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not installed. Please install Docker Desktop first.
    echo Visit: https://docs.docker.com/desktop/windows/
    pause
    exit /b 1
)

docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker Compose is not installed. Please install Docker Compose first.
    echo Visit: https://docs.docker.com/compose/install/
    pause
    exit /b 1
)

echo [SUCCESS] Docker and Docker Compose are installed
echo.

REM Create necessary directories
echo [INFO] Creating necessary directories...
if not exist "nginx\ssl" mkdir nginx\ssl
if not exist "monitoring\grafana\dashboards" mkdir monitoring\grafana\dashboards
if not exist "uploads" mkdir uploads
if not exist "logs" mkdir logs
if not exist "data\mongodb" mkdir data\mongodb
if not exist "data\redis" mkdir data\redis
if not exist "data\blockchain" mkdir data\blockchain

echo [SUCCESS] Directories created
echo.

REM Setup environment files
echo [INFO] Setting up environment files...
if not exist ".env" (
    copy .env.dev .env >nul
    echo [SUCCESS] Environment file created from .env.dev
) else (
    echo [WARNING] .env file already exists, skipping
)
echo.

REM Build and start services
echo [INFO] Building and starting development services...
echo [WARNING] This may take several minutes on first run...
echo.

REM Pull latest images
docker-compose -f docker-compose.dev.yml pull

REM Build custom images
docker-compose -f docker-compose.dev.yml build --no-cache

REM Start services
docker-compose -f docker-compose.dev.yml up -d

echo [SUCCESS] Development services started
echo.

REM Wait for services to be ready
echo [INFO] Waiting for services to be ready...
echo [INFO] Waiting for MongoDB...

:wait_mongo
timeout /t 2 /nobreak >nul
docker-compose -f docker-compose.dev.yml exec -T mongodb mongosh --eval "db.runCommand('ping')" >nul 2>&1
if errorlevel 1 goto wait_mongo

echo [SUCCESS] MongoDB is ready

echo [INFO] Waiting for Redis...
:wait_redis
timeout /t 2 /nobreak >nul
docker-compose -f docker-compose.dev.yml exec -T redis redis-cli ping >nul 2>&1
if errorlevel 1 goto wait_redis

echo [SUCCESS] Redis is ready

echo [INFO] Waiting for Backend API...
:wait_backend
timeout /t 3 /nobreak >nul
curl -f http://localhost:5000/health >nul 2>&1
if errorlevel 1 goto wait_backend

echo [SUCCESS] Backend API is ready

echo [INFO] Waiting for Frontend...
:wait_frontend
timeout /t 3 /nobreak >nul
curl -f http://localhost:3000 >nul 2>&1
if errorlevel 1 goto wait_frontend

echo [SUCCESS] Frontend is ready
echo.

REM Display service information
echo [SUCCESS] 🎉 ICEPACA Development Environment is ready!
echo.
echo 📱 Frontend Application:     http://localhost:3000
echo 🔧 Backend API:              http://localhost:5000
echo 🔗 Blockchain Service:       http://localhost:3002
echo 🌐 Nginx Reverse Proxy:     http://localhost:80
echo.
echo 🛠️  Development Tools:
echo 📊 Adminer (DB Admin):      http://localhost:8080
echo 🔴 Redis Commander:         http://localhost:8081
echo 📧 MailHog (Email):         http://localhost:8025
echo 📈 Prometheus:              http://localhost:9090
echo 📊 Grafana:                 http://localhost:3001
echo    └── Username: admin, Password: admin
echo.
echo 🔍 Health Check Endpoints:
echo    Backend:    http://localhost:5000/health
echo    Blockchain: http://localhost:3002/health
echo.
echo 📂 Useful Commands:
echo    View logs:           docker-compose -f docker-compose.dev.yml logs -f
echo    Stop services:       docker-compose -f docker-compose.dev.yml down
echo    Restart services:    docker-compose -f docker-compose.dev.yml restart
echo    Rebuild services:    docker-compose -f docker-compose.dev.yml up --build
echo.
echo [WARNING] Note: First-time setup may take a few extra minutes to initialize the database
echo.
echo [SUCCESS] Setup completed successfully! 🎉
echo Your ICEPACA development environment is now running.
echo.
pause