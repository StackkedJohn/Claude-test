import Docker from 'dockerode';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const execAsync = promisify(exec);

interface StagingConfig {
  environment: {
    name: string;
    domain: string;
    port: number;
    ssl: boolean;
  };
  database: {
    name: string;
    seedData: boolean;
    anonymizeData: boolean;
  };
  features: {
    debugMode: boolean;
    mockPayments: boolean;
    testAccounts: boolean;
    analyticsDisabled: boolean;
  };
  resources: {
    cpu: string;
    memory: string;
    storage: string;
  };
  deployment: {
    autoUpdate: boolean;
    rollbackOnFailure: boolean;
    healthCheckTimeout: number;
  };
}

interface DeploymentStatus {
  id: string;
  environment: string;
  status: 'deploying' | 'running' | 'failed' | 'stopped';
  version: string;
  branch: string;
  commit: string;
  deployedAt: Date;
  healthStatus: 'healthy' | 'unhealthy' | 'checking';
  url: string;
  logs: string[];
  resources: {
    cpu: number;
    memory: number;
    disk: number;
  };
}

class StagingEnvironmentManager {
  private docker: Docker;
  private stagingConfig: StagingConfig;
  private deployments: Map<string, DeploymentStatus> = new Map();

  constructor() {
    this.docker = new Docker({ socketPath: '/var/run/docker.sock' });
    this.stagingConfig = this.loadStagingConfig();
    
    this.initializeEnvironment();
  }

  private loadStagingConfig(): StagingConfig {
    return {
      environment: {
        name: process.env.STAGING_ENV_NAME || 'icepaca-staging',
        domain: process.env.STAGING_DOMAIN || 'staging.icepaca.local',
        port: parseInt(process.env.STAGING_PORT || '3001'),
        ssl: process.env.STAGING_SSL === 'true'
      },
      database: {
        name: process.env.STAGING_DB_NAME || 'icepaca-staging',
        seedData: process.env.STAGING_SEED_DATA !== 'false',
        anonymizeData: process.env.STAGING_ANONYMIZE_DATA !== 'false'
      },
      features: {
        debugMode: process.env.STAGING_DEBUG_MODE !== 'false',
        mockPayments: process.env.STAGING_MOCK_PAYMENTS !== 'false',
        testAccounts: process.env.STAGING_TEST_ACCOUNTS !== 'false',
        analyticsDisabled: process.env.STAGING_DISABLE_ANALYTICS !== 'false'
      },
      resources: {
        cpu: process.env.STAGING_CPU_LIMIT || '1',
        memory: process.env.STAGING_MEMORY_LIMIT || '1g',
        storage: process.env.STAGING_STORAGE_LIMIT || '10g'
      },
      deployment: {
        autoUpdate: process.env.STAGING_AUTO_UPDATE !== 'false',
        rollbackOnFailure: process.env.STAGING_ROLLBACK_ON_FAILURE !== 'false',
        healthCheckTimeout: parseInt(process.env.STAGING_HEALTH_TIMEOUT || '300')
      }
    };
  }

  private async initializeEnvironment(): Promise<void> {
    console.log('🚀 Initializing staging environment...');
    
    try {
      // Create Docker network for staging
      await this.createStagingNetwork();
      
      // Setup staging database
      await this.setupStagingDatabase();
      
      // Generate SSL certificates if needed
      if (this.stagingConfig.environment.ssl) {
        await this.generateSSLCertificates();
      }
      
      // Setup reverse proxy configuration
      await this.setupReverseProxy();
      
      console.log('✅ Staging environment initialized');
    } catch (error) {
      console.error('❌ Failed to initialize staging environment:', error);
      throw error;
    }
  }

  private async createStagingNetwork(): Promise<void> {
    try {
      const networkName = `${this.stagingConfig.environment.name}-network`;
      
      // Check if network exists
      const networks = await this.docker.listNetworks();
      const existingNetwork = networks.find(n => n.Name === networkName);
      
      if (!existingNetwork) {
        await this.docker.createNetwork({
          Name: networkName,
          Driver: 'bridge',
          Labels: {
            'icepaca.environment': 'staging',
            'icepaca.managed': 'true'
          }
        });
        
        console.log(`🌐 Created staging network: ${networkName}`);
      } else {
        console.log(`🌐 Using existing staging network: ${networkName}`);
      }
    } catch (error) {
      console.error('❌ Failed to create staging network:', error);
      throw error;
    }
  }

  private async setupStagingDatabase(): Promise<void> {
    try {
      const dbContainerName = `${this.stagingConfig.environment.name}-db`;
      
      // Check if database container exists
      const containers = await this.docker.listContainers({ all: true });
      const existingDb = containers.find(c => c.Names.includes(`/${dbContainerName}`));
      
      if (!existingDb) {
        // Create MongoDB container for staging
        const container = await this.docker.createContainer({
          Image: 'mongo:7',
          name: dbContainerName,
          Env: [
            `MONGO_INITDB_DATABASE=${this.stagingConfig.database.name}`,
            'MONGO_INITDB_ROOT_USERNAME=icepaca-staging',
            'MONGO_INITDB_ROOT_PASSWORD=staging-password-123'
          ],
          HostConfig: {
            NetworkMode: `${this.stagingConfig.environment.name}-network`,
            Memory: 512 * 1024 * 1024, // 512MB
            CpuQuota: 50000, // 50% CPU
            RestartPolicy: {
              Name: 'unless-stopped'
            }
          },
          Labels: {
            'icepaca.environment': 'staging',
            'icepaca.service': 'database',
            'icepaca.managed': 'true'
          }
        });
        
        await container.start();
        console.log(`🗄️  Created staging database: ${dbContainerName}`);
        
        // Wait for database to be ready
        await this.waitForDatabaseReady(dbContainerName);
        
        // Seed data if configured
        if (this.stagingConfig.database.seedData) {
          await this.seedStagingData();
        }
      } else {
        console.log(`🗄️  Using existing staging database: ${dbContainerName}`);
      }
    } catch (error) {
      console.error('❌ Failed to setup staging database:', error);
      throw error;
    }
  }

  private async waitForDatabaseReady(containerName: string, timeout: number = 60000): Promise<void> {
    const container = this.docker.getContainer(containerName);
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const exec = await container.exec({
          Cmd: ['mongo', '--eval', 'db.runCommand("ping")'],
          AttachStdout: true,
          AttachStderr: true
        });
        
        const stream = await exec.start({});
        const output = await this.streamToString(stream);
        
        if (output.includes('"ok" : 1')) {
          console.log('✅ Database is ready');
          return;
        }
      } catch (error) {
        // Database not ready yet, continue waiting
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    throw new Error('Database readiness check timed out');
  }

  private async seedStagingData(): Promise<void> {
    try {
      console.log('🌱 Seeding staging database...');
      
      // Create seed data script
      const seedScript = `
        db = db.getSiblingDB('${this.stagingConfig.database.name}');
        
        // Create test products
        db.products.insertMany([
          {
            _id: ObjectId(),
            name: 'Test Small Ice Pack',
            description: 'Perfect for lunch boxes and small coolers',
            price: 19.99,
            category: 'small',
            stock: 100,
            isActive: true,
            createdAt: new Date()
          },
          {
            _id: ObjectId(),
            name: 'Test Medium Ice Pack',
            description: 'Ideal for day trips and medium coolers',
            price: 29.99,
            category: 'medium',
            stock: 75,
            isActive: true,
            createdAt: new Date()
          },
          {
            _id: ObjectId(),
            name: 'Test Large Ice Pack',
            description: 'Great for extended trips and large coolers',
            price: 39.99,
            category: 'large',
            stock: 50,
            isActive: true,
            createdAt: new Date()
          }
        ]);
        
        // Create test users
        db.users.insertMany([
          {
            _id: ObjectId(),
            email: 'test@staging.com',
            name: 'Test User',
            hashedPassword: '$2b$10$staging.test.password.hash',
            role: 'customer',
            isActive: true,
            createdAt: new Date()
          },
          {
            _id: ObjectId(),
            email: 'admin@staging.com',
            name: 'Staging Admin',
            hashedPassword: '$2b$10$staging.admin.password.hash',
            role: 'admin',
            isActive: true,
            createdAt: new Date()
          }
        ]);
        
        // Create test orders
        db.orders.insertMany([
          {
            _id: ObjectId(),
            orderNumber: 'STAGING-001',
            customerId: db.users.findOne({email: 'test@staging.com'})._id,
            items: [
              {
                productId: db.products.findOne({name: 'Test Medium Ice Pack'})._id,
                quantity: 2,
                price: 29.99
              }
            ],
            total: 59.98,
            status: 'completed',
            createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        ]);
        
        print('Staging data seeded successfully');
      `;
      
      // Write seed script to temporary file
      const tempScriptPath = '/tmp/seed-staging.js';
      await fs.promises.writeFile(tempScriptPath, seedScript);
      
      // Execute seed script
      const container = this.docker.getContainer(`${this.stagingConfig.environment.name}-db`);
      const exec = await container.exec({
        Cmd: ['mongo', '--file', '/tmp/seed-staging.js'],
        AttachStdout: true,
        AttachStderr: true
      });
      
      const stream = await exec.start({});
      const output = await this.streamToString(stream);
      
      if (output.includes('successfully')) {
        console.log('✅ Staging data seeded successfully');
      } else {
        console.warn('⚠️  Staging data seeding may have failed:', output);
      }
      
      // Cleanup
      await fs.promises.unlink(tempScriptPath);
    } catch (error) {
      console.error('❌ Failed to seed staging data:', error);
    }
  }

  private async generateSSLCertificates(): Promise<void> {
    try {
      const certDir = '/etc/ssl/staging';
      await fs.promises.mkdir(certDir, { recursive: true });
      
      const domain = this.stagingConfig.environment.domain;
      const keyPath = path.join(certDir, `${domain}.key`);
      const certPath = path.join(certDir, `${domain}.crt`);
      
      // Generate self-signed certificate for staging
      const opensslCmd = `
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \\
        -keyout ${keyPath} \\
        -out ${certPath} \\
        -subj "/C=US/ST=State/L=City/O=ICEPACA/OU=Staging/CN=${domain}"
      `;
      
      await execAsync(opensslCmd);
      
      console.log(`🔒 Generated SSL certificates for ${domain}`);
    } catch (error) {
      console.error('❌ Failed to generate SSL certificates:', error);
      throw error;
    }
  }

  private async setupReverseProxy(): Promise<void> {
    try {
      // Create Nginx configuration for staging
      const nginxConfig = `
        upstream staging-backend {
            server ${this.stagingConfig.environment.name}:${this.stagingConfig.environment.port};
        }
        
        server {
            listen 80;
            server_name ${this.stagingConfig.environment.domain};
            
            ${this.stagingConfig.environment.ssl ? `
            return 301 https://$server_name$request_uri;
        }
        
        server {
            listen 443 ssl http2;
            server_name ${this.stagingConfig.environment.domain};
            
            ssl_certificate /etc/ssl/staging/${this.stagingConfig.environment.domain}.crt;
            ssl_certificate_key /etc/ssl/staging/${this.stagingConfig.environment.domain}.key;
            ` : ''}
            
            location / {
                proxy_pass http://staging-backend;
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_set_header X-Forwarded-Proto $scheme;
                
                # WebSocket support
                proxy_http_version 1.1;
                proxy_set_header Upgrade $http_upgrade;
                proxy_set_header Connection "upgrade";
                
                # Staging-specific headers
                proxy_set_header X-Environment "staging";
                proxy_set_header X-Debug-Mode "${this.stagingConfig.features.debugMode ? 'true' : 'false'}";
            }
            
            # Health check endpoint
            location /health {
                proxy_pass http://staging-backend/health;
                access_log off;
            }
        }
      `;
      
      const configPath = `/etc/nginx/sites-available/${this.stagingConfig.environment.name}`;
      await fs.promises.writeFile(configPath, nginxConfig);
      
      // Enable site
      const enabledPath = `/etc/nginx/sites-enabled/${this.stagingConfig.environment.name}`;
      if (!fs.existsSync(enabledPath)) {
        await fs.promises.symlink(configPath, enabledPath);
      }
      
      // Reload Nginx
      await execAsync('nginx -t && systemctl reload nginx');
      
      console.log(`🌐 Configured reverse proxy for ${this.stagingConfig.environment.domain}`);
    } catch (error) {
      console.error('❌ Failed to setup reverse proxy:', error);
    }
  }

  async deployToStaging(options: {
    branch: string;
    commit?: string;
    force?: boolean;
  }): Promise<DeploymentStatus> {
    const deploymentId = `deploy_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    console.log(`🚀 Starting staging deployment: ${deploymentId}`);
    
    const deployment: DeploymentStatus = {
      id: deploymentId,
      environment: 'staging',
      status: 'deploying',
      version: options.commit || 'latest',
      branch: options.branch,
      commit: options.commit || 'unknown',
      deployedAt: new Date(),
      healthStatus: 'checking',
      url: `${this.stagingConfig.environment.ssl ? 'https' : 'http'}://${this.stagingConfig.environment.domain}`,
      logs: [],
      resources: { cpu: 0, memory: 0, disk: 0 }
    };
    
    this.deployments.set(deploymentId, deployment);
    
    try {
      // Stop existing staging container
      await this.stopStagingContainer();
      
      // Build new container
      await this.buildStagingContainer(options.branch, deployment);
      
      // Start new container
      await this.startStagingContainer(deployment);
      
      // Run health checks
      await this.performHealthChecks(deployment);
      
      // Update deployment status
      deployment.status = 'running';
      deployment.healthStatus = 'healthy';
      
      console.log(`✅ Staging deployment completed: ${deploymentId}`);
      
      return deployment;
    } catch (error) {
      deployment.status = 'failed';
      deployment.logs.push(`Deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      console.error(`❌ Staging deployment failed: ${deploymentId}`, error);
      
      // Rollback if configured
      if (this.stagingConfig.deployment.rollbackOnFailure) {
        await this.rollbackDeployment();
      }
      
      throw error;
    }
  }

  private async stopStagingContainer(): Promise<void> {
    try {
      const containerName = this.stagingConfig.environment.name;
      const containers = await this.docker.listContainers();
      const existingContainer = containers.find(c => c.Names.includes(`/${containerName}`));
      
      if (existingContainer) {
        const container = this.docker.getContainer(existingContainer.Id);
        await container.stop();
        await container.remove();
        
        console.log(`🛑 Stopped existing staging container`);
      }
    } catch (error) {
      console.warn('⚠️  Failed to stop existing container:', error);
    }
  }

  private async buildStagingContainer(branch: string, deployment: DeploymentStatus): Promise<void> {
    try {
      deployment.logs.push('Building container image...');
      
      // Clone repository and checkout branch
      const buildDir = '/tmp/staging-build';
      await fs.promises.rm(buildDir, { recursive: true, force: true });
      await fs.promises.mkdir(buildDir, { recursive: true });
      
      await execAsync(`git clone ${process.env.REPO_URL || '.'} ${buildDir}`);
      await execAsync(`cd ${buildDir} && git checkout ${branch}`);
      
      // Create Dockerfile for staging
      const dockerfile = `
        FROM node:18-alpine
        
        WORKDIR /app
        
        # Copy package files
        COPY package*.json ./
        RUN npm ci --only=production
        
        # Copy application code
        COPY . .
        
        # Build application
        RUN npm run build
        
        # Set staging environment variables
        ENV NODE_ENV=staging
        ENV DEBUG_MODE=${this.stagingConfig.features.debugMode}
        ENV MOCK_PAYMENTS=${this.stagingConfig.features.mockPayments}
        ENV DISABLE_ANALYTICS=${this.stagingConfig.features.analyticsDisabled}
        
        EXPOSE ${this.stagingConfig.environment.port}
        
        USER node
        
        CMD ["npm", "start"]
      `;
      
      await fs.promises.writeFile(path.join(buildDir, 'Dockerfile.staging'), dockerfile);
      
      // Build image
      const imageName = `${this.stagingConfig.environment.name}:${deployment.version}`;
      
      const buildStream = await this.docker.buildImage(
        { context: buildDir, src: ['.'] },
        {
          dockerfile: 'Dockerfile.staging',
          t: imageName,
          labels: {
            'icepaca.environment': 'staging',
            'icepaca.branch': branch,
            'icepaca.commit': deployment.commit,
            'icepaca.built-at': new Date().toISOString()
          }
        }
      );
      
      const buildOutput = await this.streamToString(buildStream);
      deployment.logs.push('Container build completed');
      
      // Cleanup build directory
      await fs.promises.rm(buildDir, { recursive: true, force: true });
      
    } catch (error) {
      deployment.logs.push(`Build failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  private async startStagingContainer(deployment: DeploymentStatus): Promise<void> {
    try {
      deployment.logs.push('Starting container...');
      
      const containerName = this.stagingConfig.environment.name;
      const imageName = `${this.stagingConfig.environment.name}:${deployment.version}`;
      
      const container = await this.docker.createContainer({
        Image: imageName,
        name: containerName,
        Env: [
          `NODE_ENV=staging`,
          `PORT=${this.stagingConfig.environment.port}`,
          `DATABASE_URL=mongodb://icepaca-staging:staging-password-123@${containerName}-db:27017/${this.stagingConfig.database.name}`,
          `FRONTEND_URL=${deployment.url}`,
          `DEBUG=${this.stagingConfig.features.debugMode}`,
          `MOCK_PAYMENTS=${this.stagingConfig.features.mockPayments}`,
          `TEST_ACCOUNTS=${this.stagingConfig.features.testAccounts}`,
          `ANALYTICS_DISABLED=${this.stagingConfig.features.analyticsDisabled}`
        ],
        ExposedPorts: {
          [`${this.stagingConfig.environment.port}/tcp`]: {}
        },
        HostConfig: {
          NetworkMode: `${this.stagingConfig.environment.name}-network`,
          Memory: this.parseMemoryLimit(this.stagingConfig.resources.memory),
          CpuQuota: this.parseCpuLimit(this.stagingConfig.resources.cpu),
          RestartPolicy: {
            Name: 'unless-stopped'
          }
        },
        Labels: {
          'icepaca.environment': 'staging',
          'icepaca.deployment-id': deployment.id,
          'icepaca.branch': deployment.branch,
          'icepaca.commit': deployment.commit,
          'icepaca.managed': 'true'
        }
      });
      
      await container.start();
      
      deployment.logs.push('Container started successfully');
      
      console.log(`🐳 Started staging container: ${containerName}`);
    } catch (error) {
      deployment.logs.push(`Container start failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  private async performHealthChecks(deployment: DeploymentStatus): Promise<void> {
    const healthCheckUrl = `${deployment.url}/health`;
    const timeout = this.stagingConfig.deployment.healthCheckTimeout * 1000;
    const startTime = Date.now();
    
    deployment.logs.push('Performing health checks...');
    
    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch(healthCheckUrl, {
          timeout: 10000,
          headers: {
            'User-Agent': 'ICEPACA-Staging-HealthCheck'
          }
        });
        
        if (response.ok) {
          const healthData = await response.json();
          
          if (healthData.status === 'healthy' || healthData.status === 'ok') {
            deployment.logs.push('Health check passed');
            return;
          }
        }
      } catch (error) {
        // Health check failed, continue trying
      }
      
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    deployment.logs.push('Health check timed out');
    throw new Error('Health check failed - application may not be ready');
  }

  private async rollbackDeployment(): Promise<void> {
    try {
      console.log('🔄 Rolling back staging deployment...');
      
      // Find previous successful deployment
      const deployments = Array.from(this.deployments.values())
        .filter(d => d.status === 'running')
        .sort((a, b) => b.deployedAt.getTime() - a.deployedAt.getTime());
      
      const previousDeployment = deployments[1]; // Second most recent
      
      if (previousDeployment) {
        // Stop current container
        await this.stopStagingContainer();
        
        // Start previous version
        const imageName = `${this.stagingConfig.environment.name}:${previousDeployment.version}`;
        
        // Check if previous image exists
        const images = await this.docker.listImages();
        const imageExists = images.some(img => 
          img.RepoTags && img.RepoTags.includes(imageName)
        );
        
        if (imageExists) {
          await this.startStagingContainer(previousDeployment);
          console.log(`✅ Rolled back to previous version: ${previousDeployment.version}`);
        } else {
          console.error('❌ Previous image not found for rollback');
        }
      } else {
        console.error('❌ No previous successful deployment found for rollback');
      }
    } catch (error) {
      console.error('❌ Rollback failed:', error);
    }
  }

  private async streamToString(stream: NodeJS.ReadableStream): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', chunk => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      stream.on('error', reject);
    });
  }

  private parseMemoryLimit(limit: string): number {
    const match = limit.match(/^(\d+)([kmg]?)$/i);
    if (!match) return 512 * 1024 * 1024; // Default 512MB
    
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    
    switch (unit) {
      case 'g': return value * 1024 * 1024 * 1024;
      case 'm': return value * 1024 * 1024;
      case 'k': return value * 1024;
      default: return value;
    }
  }

  private parseCpuLimit(limit: string): number {
    const cpuPercent = parseFloat(limit);
    return Math.round(cpuPercent * 100000); // Convert to CpuQuota format
  }

  // Public API methods
  async getDeploymentStatus(deploymentId?: string): Promise<DeploymentStatus | DeploymentStatus[]> {
    if (deploymentId) {
      const deployment = this.deployments.get(deploymentId);
      if (!deployment) {
        throw new Error(`Deployment not found: ${deploymentId}`);
      }
      return deployment;
    }
    
    return Array.from(this.deployments.values())
      .sort((a, b) => b.deployedAt.getTime() - a.deployedAt.getTime());
  }

  async getStagingEnvironmentInfo(): Promise<{
    config: StagingConfig;
    status: 'running' | 'stopped' | 'error';
    containers: any[];
    resources: {
      cpu: number;
      memory: number;
      disk: number;
    };
  }> {
    try {
      const containers = await this.docker.listContainers({
        filters: { label: ['icepaca.environment=staging'] }
      });
      
      const status = containers.length > 0 ? 'running' : 'stopped';
      
      // Calculate resource usage
      let totalCpu = 0;
      let totalMemory = 0;
      let totalDisk = 0;
      
      for (const container of containers) {
        try {
          const containerObj = this.docker.getContainer(container.Id);
          const stats = await containerObj.stats({ stream: false });
          
          // Calculate CPU percentage
          const cpuPercent = this.calculateCpuPercent(stats);
          totalCpu += cpuPercent;
          
          // Memory usage
          totalMemory += stats.memory_stats.usage || 0;
        } catch (error) {
          console.warn(`Failed to get stats for container ${container.Id}:`, error);
        }
      }
      
      return {
        config: this.stagingConfig,
        status,
        containers: containers.map(c => ({
          id: c.Id,
          name: c.Names[0],
          image: c.Image,
          status: c.Status,
          created: new Date(c.Created * 1000)
        })),
        resources: {
          cpu: totalCpu,
          memory: totalMemory,
          disk: totalDisk
        }
      };
    } catch (error) {
      console.error('Failed to get staging environment info:', error);
      throw error;
    }
  }

  private calculateCpuPercent(stats: any): number {
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - (stats.precpu_stats.cpu_usage?.total_usage || 0);
    const systemDelta = stats.cpu_stats.system_cpu_usage - (stats.precpu_stats.system_cpu_usage || 0);
    const cpuCount = stats.cpu_stats.cpu_usage.percpu_usage?.length || 1;
    
    if (systemDelta > 0 && cpuDelta > 0) {
      return (cpuDelta / systemDelta) * cpuCount * 100;
    }
    
    return 0;
  }

  async restartStagingEnvironment(): Promise<void> {
    console.log('🔄 Restarting staging environment...');
    
    try {
      const containers = await this.docker.listContainers({
        filters: { label: ['icepaca.environment=staging'] }
      });
      
      for (const containerInfo of containers) {
        const container = this.docker.getContainer(containerInfo.Id);
        await container.restart();
        console.log(`🔄 Restarted container: ${containerInfo.Names[0]}`);
      }
      
      console.log('✅ Staging environment restarted');
    } catch (error) {
      console.error('❌ Failed to restart staging environment:', error);
      throw error;
    }
  }

  async destroyStagingEnvironment(): Promise<void> {
    console.log('🗑️  Destroying staging environment...');
    
    try {
      // Stop and remove containers
      const containers = await this.docker.listContainers({
        all: true,
        filters: { label: ['icepaca.environment=staging'] }
      });
      
      for (const containerInfo of containers) {
        const container = this.docker.getContainer(containerInfo.Id);
        try {
          await container.stop();
          await container.remove();
          console.log(`🗑️  Removed container: ${containerInfo.Names[0]}`);
        } catch (error) {
          console.warn(`Failed to remove container ${containerInfo.Names[0]}:`, error);
        }
      }
      
      // Remove network
      const networks = await this.docker.listNetworks();
      const stagingNetwork = networks.find(n => n.Name === `${this.stagingConfig.environment.name}-network`);
      
      if (stagingNetwork) {
        const network = this.docker.getNetwork(stagingNetwork.Id);
        await network.remove();
        console.log(`🌐 Removed network: ${stagingNetwork.Name}`);
      }
      
      // Remove images
      const images = await this.docker.listImages();
      const stagingImages = images.filter(img => 
        img.RepoTags && img.RepoTags.some(tag => tag.startsWith(this.stagingConfig.environment.name))
      );
      
      for (const imageInfo of stagingImages) {
        try {
          const image = this.docker.getImage(imageInfo.Id);
          await image.remove();
          console.log(`🖼️  Removed image: ${imageInfo.RepoTags?.[0]}`);
        } catch (error) {
          console.warn(`Failed to remove image ${imageInfo.Id}:`, error);
        }
      }
      
      // Clear deployment history
      this.deployments.clear();
      
      console.log('✅ Staging environment destroyed');
    } catch (error) {
      console.error('❌ Failed to destroy staging environment:', error);
      throw error;
    }
  }
}

export default new StagingEnvironmentManager();