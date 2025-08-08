@echo off
echo 🔍 Checking Docker status...

docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not running
    echo.
    echo Please start Docker Desktop:
    echo 1. Press Windows + R
    echo 2. Type: "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    echo 3. Press Enter and wait for Docker to start
    echo 4. Run this script again
    pause
    exit /b 1
) else (
    echo ✅ Docker is running!
)

echo.
echo 🚀 Starting ICEPACA development environment...
docker-compose -f docker-compose.dev.yml up -d

echo.
echo ⏳ Waiting for services to start (this may take a few minutes)...
timeout /t 30 /nobreak >nul

echo.
echo 🌐 Your ICEPACA site should now be available at:
echo    Frontend: http://localhost:3000
echo    Backend:  http://localhost:5000
echo.
echo 📊 Development tools:
echo    Database Admin: http://localhost:8080
echo    Email Preview:  http://localhost:8025
echo    Monitoring:     http://localhost:9090
echo.
pause