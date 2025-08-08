import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';

interface ProductionConfig {
  environment: {
    name: string;
    domain: string;
    cdnUrl: string;
    apiUrl: string;
  };
  security: {
    ssl: {
      enabled: boolean;
      certificatePath: string;
      keyPath: string;
      hsts: boolean;
      hstsMaxAge: number;
    };
    firewall: {
      enabled: boolean;
      allowedIPs: string[];
      rateLimiting: {
        windowMs: number;
        maxRequests: number;
      };
    };
    encryption: {
      algorithm: string;
      keyRotationDays: number;
    };
  };
  performance: {
    caching: {
      redis: {
        enabled: boolean;
        cluster: boolean;
        ttl: number;
      };
      cdn: {
        enabled: boolean;
        provider: 'cloudflare' | 'aws-cloudfront' | 'fastly';
        cacheTtl: number;
      };
    };
    compression: {
      gzip: boolean;
      brotli: boolean;
      level: number;
    };
    clustering: {
      enabled: boolean;
      workers: number | 'auto';
    };
  };
  monitoring: {
    healthChecks: {
      enabled: boolean;
      interval: number;
      timeout: number;
      endpoints: string[];
    };
    logging: {
      level: 'error' | 'warn' | 'info' | 'debug';
      structured: boolean;
      retention: number;
    };
    metrics: {
      enabled: boolean;
      exporters: string[];
      scrapeInterval: number;
    };
  };
  deployment: {
    strategy: 'blue-green' | 'rolling' | 'canary';
    rollback: {
      enabled: boolean;
      automatic: boolean;
      threshold: number;
    };
    scaling: {
      horizontal: {
        enabled: boolean;
        minReplicas: number;
        maxReplicas: number;
        targetCpuUtilization: number;
      };
      vertical: {
        enabled: boolean;
        resources: {
          requests: {
            cpu: string;
            memory: string;
          };
          limits: {
            cpu: string;
            memory: string;
          };
        };
      };
    };
  };
  database: {
    connection: {
      poolSize: number;
      maxRetries: number;
      retryDelay: number;
    };
    optimization: {
      indexing: boolean;
      queryOptimization: boolean;
      connectionPooling: boolean;
    };
    backup: {
      enabled: boolean;
      schedule: string;
      retention: number;
    };
  };
}

class ProductionConfigManager {
  private config: ProductionConfig;
  private configPath: string;
  private checksumPath: string;

  constructor() {
    this.configPath = process.env.PRODUCTION_CONFIG_PATH || '/etc/icepaca/production.json';
    this.checksumPath = `${this.configPath}.checksum`;
    this.config = this.loadProductionConfig();
  }

  private loadProductionConfig(): ProductionConfig {
    const defaultConfig: ProductionConfig = {
      environment: {
        name: 'icepaca-production',
        domain: process.env.PRODUCTION_DOMAIN || 'icepaca.com',
        cdnUrl: process.env.CDN_URL || 'https://cdn.icepaca.com',
        apiUrl: process.env.API_URL || 'https://api.icepaca.com'
      },
      security: {
        ssl: {
          enabled: true,
          certificatePath: process.env.SSL_CERT_PATH || '/etc/ssl/certs/icepaca.com.crt',
          keyPath: process.env.SSL_KEY_PATH || '/etc/ssl/private/icepaca.com.key',
          hsts: true,
          hstsMaxAge: 31536000 // 1 year
        },
        firewall: {
          enabled: true,
          allowedIPs: process.env.ALLOWED_IPS?.split(',') || ['0.0.0.0/0'],
          rateLimiting: {
            windowMs: 15 * 60 * 1000, // 15 minutes
            maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100')
          }
        },
        encryption: {
          algorithm: 'aes-256-gcm',
          keyRotationDays: parseInt(process.env.KEY_ROTATION_DAYS || '90')
        }
      },
      performance: {
        caching: {
          redis: {
            enabled: process.env.REDIS_ENABLED !== 'false',
            cluster: process.env.REDIS_CLUSTER === 'true',
            ttl: parseInt(process.env.CACHE_TTL || '3600') // 1 hour
          },
          cdn: {
            enabled: process.env.CDN_ENABLED !== 'false',
            provider: (process.env.CDN_PROVIDER as any) || 'cloudflare',
            cacheTtl: parseInt(process.env.CDN_CACHE_TTL || '86400') // 24 hours
          }
        },
        compression: {
          gzip: true,
          brotli: true,
          level: parseInt(process.env.COMPRESSION_LEVEL || '6')
        },
        clustering: {
          enabled: process.env.CLUSTERING_ENABLED !== 'false',
          workers: process.env.CLUSTER_WORKERS === 'auto' ? 'auto' : parseInt(process.env.CLUSTER_WORKERS || '0')
        }
      },
      monitoring: {
        healthChecks: {
          enabled: true,
          interval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30'), // 30 seconds
          timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '10'), // 10 seconds
          endpoints: ['/health', '/api/health', '/metrics']
        },
        logging: {
          level: (process.env.LOG_LEVEL as any) || 'info',
          structured: process.env.STRUCTURED_LOGS !== 'false',
          retention: parseInt(process.env.LOG_RETENTION_DAYS || '30')
        },
        metrics: {
          enabled: process.env.METRICS_ENABLED !== 'false',
          exporters: ['prometheus', 'datadog', 'cloudwatch'],
          scrapeInterval: parseInt(process.env.METRICS_SCRAPE_INTERVAL || '15') // 15 seconds
        }
      },
      deployment: {
        strategy: (process.env.DEPLOYMENT_STRATEGY as any) || 'rolling',
        rollback: {
          enabled: true,
          automatic: process.env.AUTO_ROLLBACK === 'true',
          threshold: parseInt(process.env.ROLLBACK_ERROR_THRESHOLD || '5') // 5% error rate
        },
        scaling: {
          horizontal: {
            enabled: process.env.HORIZONTAL_SCALING !== 'false',
            minReplicas: parseInt(process.env.MIN_REPLICAS || '3'),
            maxReplicas: parseInt(process.env.MAX_REPLICAS || '10'),
            targetCpuUtilization: parseInt(process.env.TARGET_CPU_UTILIZATION || '70')
          },
          vertical: {
            enabled: process.env.VERTICAL_SCALING === 'true',
            resources: {
              requests: {
                cpu: process.env.CPU_REQUEST || '500m',
                memory: process.env.MEMORY_REQUEST || '1Gi'
              },
              limits: {
                cpu: process.env.CPU_LIMIT || '2',
                memory: process.env.MEMORY_LIMIT || '4Gi'
              }
            }
          }
        }
      },
      database: {
        connection: {
          poolSize: parseInt(process.env.DB_POOL_SIZE || '20'),
          maxRetries: parseInt(process.env.DB_MAX_RETRIES || '5'),
          retryDelay: parseInt(process.env.DB_RETRY_DELAY || '1000')
        },
        optimization: {
          indexing: true,
          queryOptimization: true,
          connectionPooling: true
        },
        backup: {
          enabled: true,
          schedule: process.env.DB_BACKUP_SCHEDULE || '0 2 * * *', // Daily at 2 AM
          retention: parseInt(process.env.DB_BACKUP_RETENTION || '30')
        }
      }
    };

    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf8');
        const loadedConfig = JSON.parse(configData);
        
        // Verify configuration integrity
        if (this.verifyConfigIntegrity(configData)) {
          return { ...defaultConfig, ...loadedConfig };
        } else {
          console.warn('⚠️  Configuration integrity check failed, using defaults');
        }
      }
    } catch (error) {
      console.error('❌ Failed to load production config:', error);
    }

    return defaultConfig;
  }

  private verifyConfigIntegrity(configData: string): boolean {
    try {
      if (!fs.existsSync(this.checksumPath)) {
        return true; // No checksum file, assume first run
      }

      const expectedChecksum = fs.readFileSync(this.checksumPath, 'utf8').trim();
      const actualChecksum = createHash('sha256').update(configData).digest('hex');

      return expectedChecksum === actualChecksum;
    } catch (error) {
      console.warn('⚠️  Failed to verify config integrity:', error);
      return false;
    }
  }

  private saveConfigChecksum(configData: string): void {
    try {
      const checksum = createHash('sha256').update(configData).digest('hex');
      fs.writeFileSync(this.checksumPath, checksum);
    } catch (error) {
      console.warn('⚠️  Failed to save config checksum:', error);
    }
  }

  getConfig(): ProductionConfig {
    return this.config;
  }

  updateConfig(updates: Partial<ProductionConfig>): void {
    this.config = { ...this.config, ...updates };
    this.saveConfig();
  }

  private saveConfig(): void {
    try {
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      const configData = JSON.stringify(this.config, null, 2);
      fs.writeFileSync(this.configPath, configData);
      this.saveConfigChecksum(configData);
      
      console.log('✅ Production configuration saved');
    } catch (error) {
      console.error('❌ Failed to save production config:', error);
      throw error;
    }
  }

  validateConfig(): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate SSL configuration
    if (this.config.security.ssl.enabled) {
      if (!fs.existsSync(this.config.security.ssl.certificatePath)) {
        errors.push(`SSL certificate not found: ${this.config.security.ssl.certificatePath}`);
      }
      if (!fs.existsSync(this.config.security.ssl.keyPath)) {
        errors.push(`SSL key not found: ${this.config.security.ssl.keyPath}`);
      }
    }

    // Validate domain configuration
    if (!this.config.environment.domain) {
      errors.push('Production domain is required');
    }

    // Validate scaling configuration
    if (this.config.deployment.scaling.horizontal.minReplicas > this.config.deployment.scaling.horizontal.maxReplicas) {
      errors.push('Minimum replicas cannot be greater than maximum replicas');
    }

    // Performance warnings
    if (this.config.performance.clustering.workers === 'auto' && !this.config.monitoring.healthChecks.enabled) {
      warnings.push('Auto-clustering without health checks may cause issues');
    }

    if (this.config.performance.caching.redis.enabled && !process.env.REDIS_URL) {
      warnings.push('Redis caching enabled but REDIS_URL not configured');
    }

    // Security warnings
    if (this.config.security.firewall.allowedIPs.includes('0.0.0.0/0')) {
      warnings.push('Firewall allows all IPs - consider restricting access');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  generateKubernetesManifest(): string {
    const manifest = `
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${this.config.environment.name}
  labels:
    app: ${this.config.environment.name}
    environment: production
spec:
  replicas: ${this.config.deployment.scaling.horizontal.minReplicas}
  strategy:
    type: ${this.config.deployment.strategy === 'rolling' ? 'RollingUpdate' : 'Recreate'}
    ${this.config.deployment.strategy === 'rolling' ? `
    rollingUpdate:
      maxUnavailable: 1
      maxSurge: 1` : ''}
  selector:
    matchLabels:
      app: ${this.config.environment.name}
  template:
    metadata:
      labels:
        app: ${this.config.environment.name}
    spec:
      containers:
      - name: ${this.config.environment.name}
        image: ${this.config.environment.name}:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DOMAIN
          value: "${this.config.environment.domain}"
        - name: CDN_URL
          value: "${this.config.environment.cdnUrl}"
        resources:
          requests:
            cpu: ${this.config.deployment.scaling.vertical.resources.requests.cpu}
            memory: ${this.config.deployment.scaling.vertical.resources.requests.memory}
          limits:
            cpu: ${this.config.deployment.scaling.vertical.resources.limits.cpu}
            memory: ${this.config.deployment.scaling.vertical.resources.limits.memory}
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: ${this.config.monitoring.healthChecks.interval}
          timeoutSeconds: ${this.config.monitoring.healthChecks.timeout}
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 15
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: ${this.config.environment.name}-service
  labels:
    app: ${this.config.environment.name}
spec:
  selector:
    app: ${this.config.environment.name}
  ports:
  - port: 80
    targetPort: 3000
    protocol: TCP
  type: ClusterIP
${this.config.deployment.scaling.horizontal.enabled ? `
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ${this.config.environment.name}-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ${this.config.environment.name}
  minReplicas: ${this.config.deployment.scaling.horizontal.minReplicas}
  maxReplicas: ${this.config.deployment.scaling.horizontal.maxReplicas}
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: ${this.config.deployment.scaling.horizontal.targetCpuUtilization}` : ''}
${this.config.security.ssl.enabled ? `
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ${this.config.environment.name}-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - ${this.config.environment.domain}
    secretName: ${this.config.environment.name}-tls
  rules:
  - host: ${this.config.environment.domain}
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: ${this.config.environment.name}-service
            port:
              number: 80` : ''}
    `.trim();

    return manifest;
  }

  generateDockerCompose(): string {
    const compose = `
version: '3.8'

services:
  app:
    image: \${IMAGE_NAME:-${this.config.environment.name}}:\${IMAGE_TAG:-latest}
    container_name: ${this.config.environment.name}
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - DOMAIN=${this.config.environment.domain}
      - CDN_URL=${this.config.environment.cdnUrl}
      - API_URL=${this.config.environment.apiUrl}
      - REDIS_ENABLED=${this.config.performance.caching.redis.enabled}
      - CLUSTER_ENABLED=${this.config.performance.clustering.enabled}
      - LOG_LEVEL=${this.config.monitoring.logging.level}
    ports:
      - "3000:3000"
    ${this.config.performance.caching.redis.enabled ? `
    depends_on:
      - redis` : ''}
    ${this.config.database.connection ? `
      - mongodb` : ''}
    networks:
      - icepaca-production
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: ${this.config.monitoring.healthChecks.interval}s
      timeout: ${this.config.monitoring.healthChecks.timeout}s
      retries: 3
      start_period: 30s
    deploy:
      replicas: ${this.config.deployment.scaling.horizontal.minReplicas}
      resources:
        limits:
          cpus: '${this.config.deployment.scaling.vertical.resources.limits.cpu}'
          memory: ${this.config.deployment.scaling.vertical.resources.limits.memory}
        reservations:
          cpus: '${this.config.deployment.scaling.vertical.resources.requests.cpu}'
          memory: ${this.config.deployment.scaling.vertical.resources.requests.memory}
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3

${this.config.performance.caching.redis.enabled ? `
  redis:
    image: redis:7-alpine
    container_name: icepaca-redis
    restart: unless-stopped
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    networks:
      - icepaca-production
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3` : ''}

  mongodb:
    image: mongo:7
    container_name: icepaca-mongodb
    restart: unless-stopped
    environment:
      - MONGO_INITDB_ROOT_USERNAME=\${MONGO_ROOT_USER:-admin}
      - MONGO_INITDB_ROOT_PASSWORD=\${MONGO_ROOT_PASSWORD}
      - MONGO_INITDB_DATABASE=icepaca
    volumes:
      - mongodb_data:/data/db
      - ./mongodb-init:/docker-entrypoint-initdb.d
    networks:
      - icepaca-production
    healthcheck:
      test: ["CMD", "mongo", "--eval", "db.runCommand('ping')"]
      interval: 30s
      timeout: 10s
      retries: 3

${this.config.security.ssl.enabled ? `
  nginx:
    image: nginx:alpine
    container_name: icepaca-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/ssl/certs:ro
    depends_on:
      - app
    networks:
      - icepaca-production
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3` : ''}

${this.config.monitoring.metrics.enabled ? `
  prometheus:
    image: prom/prometheus:latest
    container_name: icepaca-prometheus
    restart: unless-stopped
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    networks:
      - icepaca-production
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--storage.tsdb.retention.time=15d'
      - '--web.enable-lifecycle'

  grafana:
    image: grafana/grafana:latest
    container_name: icepaca-grafana
    restart: unless-stopped
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=\${GRAFANA_ADMIN_PASSWORD:-admin}
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning
    networks:
      - icepaca-production
    depends_on:
      - prometheus` : ''}

networks:
  icepaca-production:
    driver: bridge
    labels:
      - "traefik.enable=false"

volumes:
  mongodb_data:
    driver: local
${this.config.performance.caching.redis.enabled ? `
  redis_data:
    driver: local` : ''}
${this.config.monitoring.metrics.enabled ? `
  prometheus_data:
    driver: local
  grafana_data:
    driver: local` : ''}
    `.trim();

    return compose;
  }

  generateNginxConfig(): string {
    const config = `
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;

    # Performance settings
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    # Compression
    ${this.config.performance.compression.gzip ? `
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_comp_level ${this.config.performance.compression.level};
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json
        image/svg+xml;` : ''}

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=${Math.floor(this.config.security.firewall.rateLimiting.maxRequests / (this.config.security.firewall.rateLimiting.windowMs / 60000))}r/m;

    # Security headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    ${this.config.security.ssl.hsts ? `add_header Strict-Transport-Security "max-age=${this.config.security.ssl.hstsMaxAge}; includeSubDomains; preload" always;` : ''}

    upstream app_backend {
        server app:3000 max_fails=3 fail_timeout=30s;
        keepalive 32;
    }

    ${this.config.security.ssl.enabled ? `
    server {
        listen 80;
        server_name ${this.config.environment.domain};
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name ${this.config.environment.domain};

        ssl_certificate ${this.config.security.ssl.certificatePath};
        ssl_certificate_key ${this.config.security.ssl.keyPath};
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;` : `
    server {
        listen 80;
        server_name ${this.config.environment.domain};`}

        # Health check endpoint
        location /health {
            proxy_pass http://app_backend/health;
            access_log off;
        }

        # API routes with rate limiting
        location /api/ {
            limit_req zone=api burst=20 nodelay;
            
            proxy_pass http://app_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            proxy_connect_timeout 5s;
            proxy_send_timeout 10s;
            proxy_read_timeout 30s;
        }

        # Static assets with caching
        location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            proxy_pass http://app_backend;
            proxy_set_header Host $host;
            
            expires 1y;
            add_header Cache-Control "public, immutable";
            access_log off;
        }

        # Main application
        location / {
            proxy_pass http://app_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # WebSocket support
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            
            proxy_connect_timeout 5s;
            proxy_send_timeout 10s;
            proxy_read_timeout 60s;
        }
    }
}
    `.trim();

    return config;
  }

  generatePrometheusConfig(): string {
    const config = `
global:
  scrape_interval: ${this.config.monitoring.metrics.scrapeInterval}s
  evaluation_interval: ${this.config.monitoring.metrics.scrapeInterval}s

rule_files:
  - "/etc/prometheus/rules/*.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'icepaca-app'
    static_configs:
      - targets: ['app:3000']
    metrics_path: '/metrics'
    scrape_interval: ${this.config.monitoring.metrics.scrapeInterval}s

  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx:9113']
    scrape_interval: 30s

  - job_name: 'mongodb'
    static_configs:
      - targets: ['mongodb-exporter:9216']
    scrape_interval: 30s

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
    scrape_interval: 30s

  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']
    scrape_interval: 30s
    `.trim();

    return config;
  }
}

export default new ProductionConfigManager();