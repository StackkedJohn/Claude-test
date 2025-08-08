#!/bin/bash

# ICEPACA Local Development Setup Script

echo "🚀 Setting up ICEPACA Local Development Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker and Docker Compose are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        print_status "Visit: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        print_status "Visit: https://docs.docker.com/compose/install/"
        exit 1
    fi
    
    print_success "Docker and Docker Compose are installed"
}

# Create necessary directories
create_directories() {
    print_status "Creating necessary directories..."
    
    mkdir -p nginx/ssl
    mkdir -p monitoring/grafana/dashboards
    mkdir -p uploads
    mkdir -p logs
    mkdir -p data/mongodb
    mkdir -p data/redis
    mkdir -p data/blockchain
    
    print_success "Directories created"
}

# Generate self-signed SSL certificates for development
generate_ssl_certs() {
    print_status "Generating self-signed SSL certificates for development..."
    
    if [ ! -f "nginx/ssl/dev-cert.pem" ]; then
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout nginx/ssl/dev-key.pem \
            -out nginx/ssl/dev-cert.pem \
            -subj "/C=US/ST=State/L=City/O=ICEPACA/OU=Development/CN=localhost" \
            2>/dev/null || {
                print_warning "OpenSSL not found, SSL certificates not generated"
                print_warning "HTTPS will not be available in development mode"
                return 0
            }
        print_success "SSL certificates generated"
    else
        print_status "SSL certificates already exist"
    fi
}

# Setup environment files
setup_environment() {
    print_status "Setting up environment files..."
    
    # Copy development environment file
    if [ ! -f ".env" ]; then
        cp .env.dev .env
        print_success "Environment file created from .env.dev"
    else
        print_warning ".env file already exists, skipping"
    fi
}

# Build and start services
start_services() {
    print_status "Building and starting development services..."
    print_warning "This may take several minutes on first run..."
    
    # Pull latest images
    docker-compose -f docker-compose.dev.yml pull
    
    # Build custom images
    docker-compose -f docker-compose.dev.yml build --no-cache
    
    # Start services
    docker-compose -f docker-compose.dev.yml up -d
    
    print_success "Development services started"
}

# Wait for services to be ready
wait_for_services() {
    print_status "Waiting for services to be ready..."
    
    # Wait for MongoDB
    print_status "Waiting for MongoDB..."
    until docker-compose -f docker-compose.dev.yml exec -T mongodb mongosh --eval "db.runCommand('ping')" >/dev/null 2>&1; do
        sleep 2
    done
    print_success "MongoDB is ready"
    
    # Wait for Redis
    print_status "Waiting for Redis..."
    until docker-compose -f docker-compose.dev.yml exec -T redis redis-cli ping >/dev/null 2>&1; do
        sleep 2
    done
    print_success "Redis is ready"
    
    # Wait for Backend API
    print_status "Waiting for Backend API..."
    until curl -f http://localhost:5000/health >/dev/null 2>&1; do
        sleep 3
    done
    print_success "Backend API is ready"
    
    # Wait for Frontend
    print_status "Waiting for Frontend..."
    until curl -f http://localhost:3000 >/dev/null 2>&1; do
        sleep 3
    done
    print_success "Frontend is ready"
}

# Display service information
show_services() {
    print_success "🎉 ICEPACA Development Environment is ready!"
    echo ""
    echo "📱 Frontend Application:     http://localhost:3000"
    echo "🔧 Backend API:              http://localhost:5000"
    echo "🔗 Blockchain Service:       http://localhost:3002"
    echo "🌐 Nginx Reverse Proxy:     http://localhost:80"
    echo ""
    echo "🛠️  Development Tools:"
    echo "📊 Adminer (DB Admin):      http://localhost:8080"
    echo "🔴 Redis Commander:         http://localhost:8081"
    echo "📧 MailHog (Email):         http://localhost:8025"
    echo "📈 Prometheus:              http://localhost:9090"
    echo "📊 Grafana:                 http://localhost:3001"
    echo "   └── Username: admin, Password: admin"
    echo ""
    echo "🔍 Health Check Endpoints:"
    echo "   Backend:    http://localhost:5000/health"
    echo "   Blockchain: http://localhost:3002/health"
    echo ""
    echo "📂 Useful Commands:"
    echo "   View logs:           docker-compose -f docker-compose.dev.yml logs -f"
    echo "   Stop services:       docker-compose -f docker-compose.dev.yml down"
    echo "   Restart services:    docker-compose -f docker-compose.dev.yml restart"
    echo "   Rebuild services:    docker-compose -f docker-compose.dev.yml up --build"
    echo ""
    print_warning "Note: First-time setup may take a few extra minutes to initialize the database"
}

# Clean up function
cleanup_on_error() {
    print_error "Setup failed. Cleaning up..."
    docker-compose -f docker-compose.dev.yml down --remove-orphans
    exit 1
}

# Set up error handling
trap cleanup_on_error ERR

# Main setup process
main() {
    echo "🧊 ICEPACA E-commerce Local Development Setup"
    echo "=============================================="
    
    check_dependencies
    create_directories
    generate_ssl_certs
    setup_environment
    start_services
    wait_for_services
    show_services
    
    print_success "Setup completed successfully! 🎉"
    print_status "Your ICEPACA development environment is now running."
    print_status "Press Ctrl+C to stop all services when you're done developing."
}

# Run main function
main "$@"