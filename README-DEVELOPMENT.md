# ICEPACA E-commerce - Local Development Environment

Welcome to the ICEPACA E-commerce local development environment! This guide will help you get the complete application running locally with all features enabled.

## 🚀 Quick Start

### Prerequisites

Before you begin, ensure you have the following installed:

- **Docker Desktop** (Windows/Mac) or Docker Engine (Linux)
  - Download: https://docs.docker.com/get-docker/
  - Minimum version: Docker 20.0+, Docker Compose 2.0+
- **Git** for version control
- **Node.js** (optional, for local development outside Docker)

### Automated Setup

We provide automated setup scripts for quick deployment:

#### Windows Users:
```batch
.\dev-setup.bat
```

#### macOS/Linux Users:
```bash
chmod +x dev-setup.sh
./dev-setup.sh
```

### Manual Setup

If you prefer manual setup or the automated script fails:

1. **Clone the repository** (if not already done):
   ```bash
   git clone <repository-url>
   cd icepaca-ecommerce
   ```

2. **Create environment file**:
   ```bash
   cp .env.dev .env
   ```

3. **Create required directories**:
   ```bash
   mkdir -p nginx/ssl monitoring/grafana/dashboards uploads logs data/{mongodb,redis,blockchain}
   ```

4. **Start the development environment**:
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

5. **Wait for services to initialize** (approximately 2-3 minutes for first run)

## 🌐 Accessing the Application

Once the setup is complete, you can access:

### Main Application
- **Frontend (React)**: http://localhost:3000
  - Main e-commerce interface
  - Shopping cart and checkout
  - User authentication and profiles
  - Blog and content management

- **Backend API**: http://localhost:5000
  - REST API endpoints
  - Health check: http://localhost:5000/health
  - API documentation: http://localhost:5000/api-docs

- **Blockchain Service**: http://localhost:3002
  - Supply chain transparency
  - Product verification
  - Sustainability tracking

### Development Tools

- **Database Admin (Adminer)**: http://localhost:8080
  - Server: `mongodb`
  - Username: `admin`
  - Password: `dev-password`
  - Database: `icepaca-dev`

- **Redis Commander**: http://localhost:8081
  - Redis database management
  - Cache monitoring

- **Email Testing (MailHog)**: http://localhost:8025
  - Catches all outgoing emails
  - Email preview and testing

- **Monitoring (Prometheus)**: http://localhost:9090
  - Application metrics
  - Performance monitoring

- **Analytics Dashboard (Grafana)**: http://localhost:3001
  - Username: `admin`
  - Password: `admin`
  - Pre-configured dashboards

## 🛠️ Development Workflow

### Making Changes

The development environment supports hot reloading:

- **Frontend changes**: Automatically reload in browser
- **Backend changes**: Auto-restart with nodemon
- **Configuration changes**: May require container restart

### Database Management

The development database comes pre-populated with sample data:

- **Sample products**: 4 ice pack variants
- **Test users**: Admin and customer accounts
- **Sample orders**: Order history examples
- **Blog posts**: Content management examples

### Admin Access

Default admin credentials:
- **Email**: `admin@icepaca.com`
- **Password**: `admin123`

Access the admin dashboard at: http://localhost:3000/admin

### API Testing

Test API endpoints using:
- **Health check**: `GET http://localhost:5000/health`
- **Products**: `GET http://localhost:5000/api/products`
- **Authentication**: `POST http://localhost:5000/api/auth/login`

### Environment Variables

Key development environment variables in `.env`:

```env
NODE_ENV=development
DATABASE_URL=mongodb://admin:dev-password@mongodb:27017/icepaca-dev
REDIS_URL=redis://redis:6379
STRIPE_PUBLISHABLE_KEY=pk_test_... (test key)
ANALYTICS_ENABLED=false
DEBUG=icepaca:*
```

## 🧪 Testing

Run the test suite:

```bash
# Backend tests
docker-compose -f docker-compose.dev.yml exec backend npm test

# Frontend tests
docker-compose -f docker-compose.dev.yml exec frontend npm test

# End-to-end tests
docker-compose -f docker-compose.dev.yml exec frontend npm run test:e2e
```

## 🔧 Common Commands

### Container Management
```bash
# View all service logs
docker-compose -f docker-compose.dev.yml logs -f

# View specific service logs
docker-compose -f docker-compose.dev.yml logs -f backend

# Restart all services
docker-compose -f docker-compose.dev.yml restart

# Restart specific service
docker-compose -f docker-compose.dev.yml restart backend

# Stop all services
docker-compose -f docker-compose.dev.yml down

# Rebuild and restart
docker-compose -f docker-compose.dev.yml up --build -d
```

### Database Operations
```bash
# Access MongoDB shell
docker-compose -f docker-compose.dev.yml exec mongodb mongosh icepaca-dev

# Reset database with sample data
docker-compose -f docker-compose.dev.yml exec mongodb mongosh icepaca-dev /docker-entrypoint-initdb.d/init-mongo.js

# Access Redis CLI
docker-compose -f docker-compose.dev.yml exec redis redis-cli
```

### Development Debugging
```bash
# Access backend container
docker-compose -f docker-compose.dev.yml exec backend bash

# Access frontend container
docker-compose -f docker-compose.dev.yml exec frontend sh

# View container resource usage
docker-compose -f docker-compose.dev.yml top
```

## 🎯 Features Available in Development

### ✅ Fully Functional Features

- **E-commerce Core**: Product catalog, shopping cart, checkout
- **User Authentication**: Registration, login, profile management
- **Admin Dashboard**: Product management, order management, analytics
- **Blog System**: Content creation, SEO optimization, publishing
- **Payment Processing**: Stripe integration (test mode)
- **Supply Chain**: Blockchain transparency tracking
- **Privacy Compliance**: GDPR/CCPA cookie consent
- **Email System**: Order confirmations, newsletters (via MailHog)
- **Security**: OWASP protections, rate limiting, input validation
- **Monitoring**: Prometheus metrics, Grafana dashboards

### ⚠️ Development Mode Limitations

- **SSL**: Self-signed certificates (browser warnings expected)
- **External APIs**: Mock responses for some third-party services
- **Email**: Captured by MailHog instead of actual delivery
- **Payments**: Test mode only (use Stripe test cards)
- **Analytics**: Disabled by default (can be enabled)

## 📊 Sample Data

The development environment includes:

### Products
- Small Ice Pack ($19.99)
- Medium Ice Pack ($29.99)
- Large Ice Pack ($39.99)
- Family Pack Bundle ($79.99)

### Test Cards (Stripe)
- **Success**: 4242 4242 4242 4242
- **Decline**: 4000 0000 0000 0002
- **3D Secure**: 4000 0027 6000 3184

### Users
- **Admin**: admin@icepaca.com / admin123
- **Customer**: customer@example.com / customer123

## 🚨 Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 3000, 5000, 3002, 80, 8080, 8081, 8025, 9090, 3001 are available

2. **Database connection failed**:
   ```bash
   docker-compose -f docker-compose.dev.yml restart mongodb
   ```

3. **Frontend not loading**:
   ```bash
   docker-compose -f docker-compose.dev.yml logs frontend
   docker-compose -f docker-compose.dev.yml restart frontend
   ```

4. **API errors**:
   ```bash
   docker-compose -f docker-compose.dev.yml logs backend
   ```

5. **Out of memory**:
   ```bash
   docker system prune
   docker-compose -f docker-compose.dev.yml down
   docker-compose -f docker-compose.dev.yml up -d
   ```

### Reset Everything
```bash
# Complete reset (removes all data)
docker-compose -f docker-compose.dev.yml down -v
docker system prune -f
docker-compose -f docker-compose.dev.yml up --build -d
```

## 🔗 Useful Resources

- **Frontend Tech Stack**: React 18, TypeScript, Material-UI, Styled Components
- **Backend Tech Stack**: Node.js, Express, TypeScript, MongoDB, Redis
- **Blockchain**: Simple JavaScript blockchain for supply chain
- **Testing**: Jest, Playwright, React Testing Library
- **Monitoring**: Prometheus, Grafana
- **Documentation**: API docs available at `/api-docs`

## 📞 Support

If you encounter issues:

1. Check the logs: `docker-compose -f docker-compose.dev.yml logs -f`
2. Verify all containers are running: `docker-compose -f docker-compose.dev.yml ps`
3. Try restarting services: `docker-compose -f docker-compose.dev.yml restart`
4. Reset environment if needed (see troubleshooting section)

---

**Happy developing!** 🚀

The ICEPACA team has created this comprehensive development environment to help you build, test, and iterate on the e-commerce platform efficiently. All enterprise features are available for testing and development.