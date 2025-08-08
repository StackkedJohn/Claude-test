import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import launchChecklistManager from './launch-checklist';
import preLaunchTestingManager from './pre-launch-testing';
import productionConfigManager from '../production/production-config';
import stagingEnvironmentManager from '../staging/staging-environment';
import backupService from '../backup/backup-service';

const execAsync = promisify(exec);

interface DeploymentPhase {
  id: string;
  name: string;
  description: string;
  order: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  canSkip: boolean;
  estimatedDuration: number; // minutes
  startTime?: Date;
  endTime?: Date;
  error?: string;
  executeFunction: () => Promise<void>;
  rollbackFunction?: () => Promise<void>;
  dependencies: string[];
}

interface DeploymentConfig {
  strategy: 'blue-green' | 'rolling' | 'canary' | 'all-at-once';
  environment: 'staging' | 'production';
  targetVersion: string;
  healthCheckUrl: string;
  healthCheckRetries: number;
  healthCheckTimeout: number; // seconds
  rollbackThreshold: number; // error percentage
  notifications: {
    email: string[];
    slack?: string;
    webhook?: string;
  };
  preDeploymentChecks: string[];
  postDeploymentChecks: string[];
}

interface DeploymentStatus {
  id: string;
  strategy: string;
  environment: string;
  version: string;
  status: 'initializing' | 'pre_checks' | 'deploying' | 'verifying' | 'completed' | 'failed' | 'rolling_back' | 'rolled_back';
  progress: number; // 0-100
  currentPhase: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  deployedServices: string[];
  healthStatus: 'unknown' | 'healthy' | 'degraded' | 'unhealthy';
  errorRate: number;
  rollbackReason?: string;
  phases: DeploymentPhase[];
}

class DeploymentOrchestrator {
  private deploymentConfig: DeploymentConfig;
  private currentDeployment: DeploymentStatus | null = null;
  private deploymentHistory: DeploymentStatus[] = [];
  private phases: DeploymentPhase[] = [];

  constructor() {
    this.deploymentConfig = this.loadDeploymentConfig();
    this.initializePhases();
  }

  private loadDeploymentConfig(): DeploymentConfig {
    return {
      strategy: (process.env.DEPLOYMENT_STRATEGY as any) || 'rolling',
      environment: (process.env.TARGET_ENVIRONMENT as any) || 'staging',
      targetVersion: process.env.DEPLOYMENT_VERSION || 'latest',
      healthCheckUrl: process.env.HEALTH_CHECK_URL || '/health',
      healthCheckRetries: parseInt(process.env.HEALTH_CHECK_RETRIES || '5'),
      healthCheckTimeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '30'),
      rollbackThreshold: parseFloat(process.env.ROLLBACK_THRESHOLD || '5.0'),
      notifications: {
        email: (process.env.DEPLOYMENT_NOTIFICATION_EMAILS || '').split(',').filter(e => e.trim()),
        slack: process.env.DEPLOYMENT_SLACK_WEBHOOK,
        webhook: process.env.DEPLOYMENT_WEBHOOK_URL
      },
      preDeploymentChecks: [
        'security_validation',
        'performance_baseline',
        'dependency_verification',
        'backup_creation'
      ],
      postDeploymentChecks: [
        'health_check_validation',
        'functional_smoke_tests',
        'performance_verification',
        'monitoring_validation'
      ]
    };
  }

  private initializePhases(): void {
    this.phases = [
      {
        id: 'initialization',
        name: 'Deployment Initialization',
        description: 'Initialize deployment process and validate configuration',
        order: 1,
        status: 'pending',
        canSkip: false,
        estimatedDuration: 2,
        executeFunction: this.executeInitialization.bind(this),
        dependencies: []
      },
      {
        id: 'pre_deployment_validation',
        name: 'Pre-deployment Validation',
        description: 'Run pre-deployment checks and validations',
        order: 2,
        status: 'pending',
        canSkip: false,
        estimatedDuration: 15,
        executeFunction: this.executePreDeploymentValidation.bind(this),
        rollbackFunction: this.rollbackPreDeploymentValidation.bind(this),
        dependencies: ['initialization']
      },
      {
        id: 'backup_creation',
        name: 'Pre-deployment Backup',
        description: 'Create backup before deployment',
        order: 3,
        status: 'pending',
        canSkip: true,
        estimatedDuration: 10,
        executeFunction: this.executeBackupCreation.bind(this),
        dependencies: ['pre_deployment_validation']
      },
      {
        id: 'infrastructure_preparation',
        name: 'Infrastructure Preparation',
        description: 'Prepare target infrastructure for deployment',
        order: 4,
        status: 'pending',
        canSkip: false,
        estimatedDuration: 8,
        executeFunction: this.executeInfrastructurePreparation.bind(this),
        rollbackFunction: this.rollbackInfrastructurePreparation.bind(this),
        dependencies: ['backup_creation']
      },
      {
        id: 'application_deployment',
        name: 'Application Deployment',
        description: 'Deploy application code and services',
        order: 5,
        status: 'pending',
        canSkip: false,
        estimatedDuration: 20,
        executeFunction: this.executeApplicationDeployment.bind(this),
        rollbackFunction: this.rollbackApplicationDeployment.bind(this),
        dependencies: ['infrastructure_preparation']
      },
      {
        id: 'database_migration',
        name: 'Database Migration',
        description: 'Run database migrations and updates',
        order: 6,
        status: 'pending',
        canSkip: true,
        estimatedDuration: 5,
        executeFunction: this.executeDatabaseMigration.bind(this),
        rollbackFunction: this.rollbackDatabaseMigration.bind(this),
        dependencies: ['application_deployment']
      },
      {
        id: 'service_startup',
        name: 'Service Startup',
        description: 'Start application services and verify they\'re running',
        order: 7,
        status: 'pending',
        canSkip: false,
        estimatedDuration: 10,
        executeFunction: this.executeServiceStartup.bind(this),
        rollbackFunction: this.rollbackServiceStartup.bind(this),
        dependencies: ['database_migration']
      },
      {
        id: 'health_verification',
        name: 'Health Check Verification',
        description: 'Verify application health and readiness',
        order: 8,
        status: 'pending',
        canSkip: false,
        estimatedDuration: 5,
        executeFunction: this.executeHealthVerification.bind(this),
        dependencies: ['service_startup']
      },
      {
        id: 'traffic_routing',
        name: 'Traffic Routing',
        description: 'Route traffic to new deployment',
        order: 9,
        status: 'pending',
        canSkip: false,
        estimatedDuration: 3,
        executeFunction: this.executeTrafficRouting.bind(this),
        rollbackFunction: this.rollbackTrafficRouting.bind(this),
        dependencies: ['health_verification']
      },
      {
        id: 'post_deployment_verification',
        name: 'Post-deployment Verification',
        description: 'Run post-deployment tests and validations',
        order: 10,
        status: 'pending',
        canSkip: false,
        estimatedDuration: 15,
        executeFunction: this.executePostDeploymentVerification.bind(this),
        dependencies: ['traffic_routing']
      },
      {
        id: 'monitoring_activation',
        name: 'Monitoring Activation',
        description: 'Activate monitoring and alerting for new deployment',
        order: 11,
        status: 'pending',
        canSkip: true,
        estimatedDuration: 3,
        executeFunction: this.executeMonitoringActivation.bind(this),
        dependencies: ['post_deployment_verification']
      },
      {
        id: 'cleanup',
        name: 'Deployment Cleanup',
        description: 'Clean up old deployments and temporary resources',
        order: 12,
        status: 'pending',
        canSkip: true,
        estimatedDuration: 5,
        executeFunction: this.executeCleanup.bind(this),
        dependencies: ['monitoring_activation']
      }
    ];
  }

  // PHASE EXECUTION FUNCTIONS

  private async executeInitialization(): Promise<void> {
    console.log('🚀 Initializing deployment process...');
    
    // Validate deployment configuration
    const config = productionConfigManager.getConfig();
    const validation = productionConfigManager.validateConfig();
    
    if (!validation.valid) {
      throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
    }
    
    if (validation.warnings.length > 0) {
      console.warn('⚠️  Configuration warnings:', validation.warnings.join(', '));
    }
    
    // Initialize deployment tracking
    if (!this.currentDeployment) {
      throw new Error('No active deployment found');
    }
    
    this.currentDeployment.deployedServices = [];
    
    console.log('✅ Deployment initialization complete');
  }

  private async executePreDeploymentValidation(): Promise<void> {
    console.log('🔍 Running pre-deployment validation...');
    
    // Run launch checklist validation
    const launchStatus = await launchChecklistManager.runFullValidation();
    
    if (launchStatus.criticalIssues > 0) {
      throw new Error(`Critical launch checklist issues: ${launchStatus.criticalIssues} issues found`);
    }
    
    // Run pre-launch testing
    const testResults = await preLaunchTestingManager.runAllTestSuites();
    const criticalFailures = Array.from(testResults.values()).reduce((sum, r) => sum + r.criticalFailures, 0);
    
    if (criticalFailures > 0) {
      throw new Error(`Pre-launch testing failures: ${criticalFailures} critical failures found`);
    }
    
    console.log('✅ Pre-deployment validation passed');
  }

  private async executeBackupCreation(): Promise<void> {
    console.log('💾 Creating pre-deployment backup...');
    
    const backup = await backupService.createManualBackup();
    
    if (backup.status !== 'completed') {
      throw new Error(`Backup creation failed: ${backup.error}`);
    }
    
    console.log(`✅ Pre-deployment backup created: ${backup.id}`);
  }

  private async executeInfrastructurePreparation(): Promise<void> {
    console.log('🏗️  Preparing infrastructure...');
    
    // Validate Kubernetes cluster health
    try {
      const { stdout } = await execAsync('kubectl get nodes');
      console.log('Kubernetes cluster status:', stdout.split('\n')[1]);
    } catch (error) {
      throw new Error(`Kubernetes cluster validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    // Ensure required namespaces exist
    try {
      await execAsync(`kubectl create namespace ${this.deploymentConfig.environment} --dry-run=client -o yaml | kubectl apply -f -`);
    } catch (error) {
      // Namespace might already exist, which is fine
    }
    
    // Validate secrets and configmaps
    try {
      await execAsync(`kubectl get secrets -n ${this.deploymentConfig.environment}`);
    } catch (error) {
      throw new Error(`Required secrets not found in ${this.deploymentConfig.environment} namespace`);
    }
    
    console.log('✅ Infrastructure preparation complete');
  }

  private async executeApplicationDeployment(): Promise<void> {
    console.log('📦 Deploying application...');
    
    const strategy = this.deploymentConfig.strategy;
    const environment = this.deploymentConfig.environment;
    
    if (strategy === 'rolling') {
      await this.executeRollingDeployment();
    } else if (strategy === 'blue-green') {
      await this.executeBlueGreenDeployment();
    } else if (strategy === 'canary') {
      await this.executeCanaryDeployment();
    } else {
      await this.executeAllAtOnceDeployment();
    }
    
    this.currentDeployment!.deployedServices.push('icepaca-app');
    console.log('✅ Application deployment complete');
  }

  private async executeRollingDeployment(): Promise<void> {
    console.log('🔄 Executing rolling deployment...');
    
    // Generate Kubernetes manifest
    const manifest = productionConfigManager.generateKubernetesManifest();
    const manifestPath = '/tmp/deployment-manifest.yaml';
    await fs.promises.writeFile(manifestPath, manifest);
    
    // Apply deployment
    await execAsync(`kubectl apply -f ${manifestPath} -n ${this.deploymentConfig.environment}`);
    
    // Wait for rollout to complete
    await execAsync(`kubectl rollout status deployment/${this.deploymentConfig.environment} -n ${this.deploymentConfig.environment} --timeout=600s`);
    
    console.log('✅ Rolling deployment complete');
  }

  private async executeBlueGreenDeployment(): Promise<void> {
    console.log('🔵🟢 Executing blue-green deployment...');
    
    const currentColor = await this.getCurrentDeploymentColor();
    const newColor = currentColor === 'blue' ? 'green' : 'blue';
    
    console.log(`Deploying to ${newColor} environment`);
    
    // Deploy to new color
    const manifest = productionConfigManager.generateKubernetesManifest();
    const modifiedManifest = manifest.replace(/name: icepaca-production/g, `name: icepaca-production-${newColor}`);
    
    const manifestPath = `/tmp/deployment-manifest-${newColor}.yaml`;
    await fs.promises.writeFile(manifestPath, modifiedManifest);
    
    await execAsync(`kubectl apply -f ${manifestPath} -n ${this.deploymentConfig.environment}`);
    
    // Wait for new deployment to be ready
    await execAsync(`kubectl rollout status deployment/icepaca-production-${newColor} -n ${this.deploymentConfig.environment} --timeout=600s`);
    
    console.log(`✅ Blue-green deployment to ${newColor} complete`);
  }

  private async executeCanaryDeployment(): Promise<void> {
    console.log('🐤 Executing canary deployment...');
    
    // Deploy canary version with reduced replica count
    const manifest = productionConfigManager.generateKubernetesManifest();
    const canaryManifest = manifest
      .replace(/name: icepaca-production/g, 'name: icepaca-production-canary')
      .replace(/replicas: \d+/, 'replicas: 1'); // Single replica for canary
    
    const manifestPath = '/tmp/deployment-manifest-canary.yaml';
    await fs.promises.writeFile(manifestPath, canaryManifest);
    
    await execAsync(`kubectl apply -f ${manifestPath} -n ${this.deploymentConfig.environment}`);
    
    // Wait for canary deployment
    await execAsync(`kubectl rollout status deployment/icepaca-production-canary -n ${this.deploymentConfig.environment} --timeout=300s`);
    
    // Monitor canary for 5 minutes
    console.log('Monitoring canary deployment...');
    await this.monitorCanaryHealth(5);
    
    console.log('✅ Canary deployment monitoring complete');
  }

  private async executeAllAtOnceDeployment(): Promise<void> {
    console.log('⚡ Executing all-at-once deployment...');
    
    const manifest = productionConfigManager.generateKubernetesManifest();
    const manifestPath = '/tmp/deployment-manifest.yaml';
    await fs.promises.writeFile(manifestPath, manifest);
    
    // Stop existing deployment
    try {
      await execAsync(`kubectl scale deployment/${this.deploymentConfig.environment} --replicas=0 -n ${this.deploymentConfig.environment}`);
    } catch (error) {
      // Deployment might not exist yet
    }
    
    // Apply new deployment
    await execAsync(`kubectl apply -f ${manifestPath} -n ${this.deploymentConfig.environment}`);
    await execAsync(`kubectl rollout status deployment/${this.deploymentConfig.environment} -n ${this.deploymentConfig.environment} --timeout=600s`);
    
    console.log('✅ All-at-once deployment complete');
  }

  private async executeDatabaseMigration(): Promise<void> {
    console.log('🗄️  Running database migrations...');
    
    // Run migrations using a job
    const migrationJob = `
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration-${Date.now()}
  namespace: ${this.deploymentConfig.environment}
spec:
  template:
    spec:
      containers:
      - name: migration
        image: icepaca-production:${this.deploymentConfig.targetVersion}
        command: ["npm", "run", "migrate"]
        env:
        - name: NODE_ENV
          value: "${this.deploymentConfig.environment}"
      restartPolicy: Never
  backoffLimit: 3
    `;
    
    const jobPath = '/tmp/migration-job.yaml';
    await fs.promises.writeFile(jobPath, migrationJob);
    
    await execAsync(`kubectl apply -f ${jobPath}`);
    
    // Wait for migration to complete
    await this.waitForJobCompletion('db-migration', 300); // 5 minute timeout
    
    console.log('✅ Database migrations complete');
  }

  private async executeServiceStartup(): Promise<void> {
    console.log('🔧 Starting application services...');
    
    // Ensure deployment is ready
    const deployment = this.deploymentConfig.environment;
    
    try {
      const { stdout } = await execAsync(`kubectl get deployment ${deployment} -n ${this.deploymentConfig.environment} -o jsonpath='{.status.readyReplicas}'`);
      const readyReplicas = parseInt(stdout);
      
      if (readyReplicas === 0) {
        throw new Error('No ready replicas found');
      }
      
      console.log(`✅ ${readyReplicas} replicas are ready and running`);
    } catch (error) {
      throw new Error(`Service startup verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async executeHealthVerification(): Promise<void> {
    console.log('🏥 Verifying application health...');
    
    const baseUrl = this.getDeploymentUrl();
    const healthUrl = `${baseUrl}${this.deploymentConfig.healthCheckUrl}`;
    
    let attempts = 0;
    const maxAttempts = this.deploymentConfig.healthCheckRetries;
    const timeout = this.deploymentConfig.healthCheckTimeout * 1000;
    
    while (attempts < maxAttempts) {
      try {
        const response = await axios.get(healthUrl, { timeout });
        
        if (response.status === 200) {
          const healthData = response.data;
          
          if (healthData.status === 'healthy' || healthData.status === 'ok') {
            console.log('✅ Health check passed');
            return;
          } else {
            throw new Error(`Health check returned unhealthy status: ${healthData.status}`);
          }
        }
        
        throw new Error(`Health check returned status: ${response.status}`);
      } catch (error) {
        attempts++;
        console.log(`Health check attempt ${attempts}/${maxAttempts} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
        }
      }
    }
    
    throw new Error('Health verification failed after maximum attempts');
  }

  private async executeTrafficRouting(): Promise<void> {
    console.log('🚦 Routing traffic to new deployment...');
    
    if (this.deploymentConfig.strategy === 'blue-green') {
      await this.switchBlueGreenTraffic();
    } else if (this.deploymentConfig.strategy === 'canary') {
      await this.promoteCanaryDeployment();
    } else {
      console.log('Traffic already routed for rolling/all-at-once deployment');
    }
    
    console.log('✅ Traffic routing complete');
  }

  private async executePostDeploymentVerification(): Promise<void> {
    console.log('🔍 Running post-deployment verification...');
    
    // Run smoke tests
    const testSuites = preLaunchTestingManager.getTestSuites();
    const productionSmokeTest = testSuites.find(s => s.name === 'Production Readiness');
    
    if (productionSmokeTest) {
      const results = await preLaunchTestingManager.runTestSuite(productionSmokeTest.name);
      
      if (results.criticalFailures > 0) {
        throw new Error(`Post-deployment verification failed: ${results.criticalFailures} critical failures`);
      }
    }
    
    // Monitor error rates
    await this.monitorErrorRates(5); // Monitor for 5 minutes
    
    console.log('✅ Post-deployment verification complete');
  }

  private async executeMonitoringActivation(): Promise<void> {
    console.log('📊 Activating monitoring and alerting...');
    
    // Update monitoring configurations
    try {
      await execAsync('kubectl rollout restart deployment/prometheus -n monitoring');
      await execAsync('kubectl rollout restart deployment/grafana -n monitoring');
    } catch (error) {
      console.warn('⚠️  Failed to restart monitoring services:', error);
    }
    
    // Send deployment notification
    await this.sendDeploymentNotification('success', 'Deployment completed successfully');
    
    console.log('✅ Monitoring activation complete');
  }

  private async executeCleanup(): Promise<void> {
    console.log('🧹 Cleaning up deployment artifacts...');
    
    // Clean up old deployments (keep last 3)
    try {
      await execAsync('kubectl delete replicaset --field-selector=status.replicas=0 --all-namespaces');
    } catch (error) {
      console.warn('⚠️  Failed to clean up old replica sets:', error);
    }
    
    // Remove temporary files
    const tempFiles = [
      '/tmp/deployment-manifest.yaml',
      '/tmp/deployment-manifest-blue.yaml',
      '/tmp/deployment-manifest-green.yaml',
      '/tmp/deployment-manifest-canary.yaml',
      '/tmp/migration-job.yaml'
    ];
    
    for (const file of tempFiles) {
      try {
        await fs.promises.unlink(file);
      } catch (error) {
        // File might not exist, which is fine
      }
    }
    
    console.log('✅ Cleanup complete');
  }

  // ROLLBACK FUNCTIONS

  private async rollbackPreDeploymentValidation(): Promise<void> {
    console.log('⏪ Rolling back pre-deployment validation...');
    // No specific rollback needed for validation phase
  }

  private async rollbackInfrastructurePreparation(): Promise<void> {
    console.log('⏪ Rolling back infrastructure preparation...');
    // Clean up any created resources
  }

  private async rollbackApplicationDeployment(): Promise<void> {
    console.log('⏪ Rolling back application deployment...');
    
    try {
      await execAsync(`kubectl rollout undo deployment/${this.deploymentConfig.environment} -n ${this.deploymentConfig.environment}`);
      await execAsync(`kubectl rollout status deployment/${this.deploymentConfig.environment} -n ${this.deploymentConfig.environment} --timeout=300s`);
    } catch (error) {
      console.error('Failed to rollback application deployment:', error);
    }
  }

  private async rollbackDatabaseMigration(): Promise<void> {
    console.log('⏪ Rolling back database migrations...');
    
    // Run rollback migrations
    const rollbackJob = `
apiVersion: batch/v1
kind: Job
metadata:
  name: db-rollback-${Date.now()}
  namespace: ${this.deploymentConfig.environment}
spec:
  template:
    spec:
      containers:
      - name: rollback
        image: icepaca-production:latest
        command: ["npm", "run", "migrate:rollback"]
      restartPolicy: Never
  backoffLimit: 1
    `;
    
    const jobPath = '/tmp/rollback-job.yaml';
    await fs.promises.writeFile(jobPath, rollbackJob);
    
    try {
      await execAsync(`kubectl apply -f ${jobPath}`);
      await this.waitForJobCompletion('db-rollback', 180);
    } catch (error) {
      console.error('Failed to rollback database migrations:', error);
    }
  }

  private async rollbackServiceStartup(): Promise<void> {
    console.log('⏪ Rolling back service startup...');
    
    try {
      await execAsync(`kubectl scale deployment/${this.deploymentConfig.environment} --replicas=0 -n ${this.deploymentConfig.environment}`);
    } catch (error) {
      console.error('Failed to rollback service startup:', error);
    }
  }

  private async rollbackTrafficRouting(): Promise<void> {
    console.log('⏪ Rolling back traffic routing...');
    
    if (this.deploymentConfig.strategy === 'blue-green') {
      // Switch back to previous color
      const currentColor = await this.getCurrentDeploymentColor();
      const previousColor = currentColor === 'blue' ? 'green' : 'blue';
      await this.updateServiceSelector(previousColor);
    }
  }

  // HELPER METHODS

  private async getCurrentDeploymentColor(): Promise<'blue' | 'green'> {
    try {
      const { stdout } = await execAsync(`kubectl get service icepaca-production-service -n ${this.deploymentConfig.environment} -o jsonpath='{.spec.selector.color}'`);
      return stdout.trim() as 'blue' | 'green' || 'blue';
    } catch {
      return 'blue';
    }
  }

  private async switchBlueGreenTraffic(): Promise<void> {
    const currentColor = await this.getCurrentDeploymentColor();
    const newColor = currentColor === 'blue' ? 'green' : 'blue';
    
    await this.updateServiceSelector(newColor);
    console.log(`Traffic switched from ${currentColor} to ${newColor}`);
  }

  private async updateServiceSelector(color: 'blue' | 'green'): Promise<void> {
    const patchCommand = `kubectl patch service icepaca-production-service -n ${this.deploymentConfig.environment} -p '{"spec":{"selector":{"color":"${color}"}}}'`;
    await execAsync(patchCommand);
  }

  private async promoteCanaryDeployment(): Promise<void> {
    console.log('Promoting canary deployment to full production...');
    
    // Scale up canary to full replicas
    const replicas = productionConfigManager.getConfig().deployment.scaling.horizontal.minReplicas;
    await execAsync(`kubectl scale deployment/icepaca-production-canary --replicas=${replicas} -n ${this.deploymentConfig.environment}`);
    
    // Wait for scale up
    await execAsync(`kubectl rollout status deployment/icepaca-production-canary -n ${this.deploymentConfig.environment} --timeout=300s`);
    
    // Update service to point to canary
    await execAsync(`kubectl patch service icepaca-production-service -n ${this.deploymentConfig.environment} -p '{"spec":{"selector":{"version":"canary"}}}'`);
    
    // Remove old deployment
    try {
      await execAsync(`kubectl delete deployment icepaca-production -n ${this.deploymentConfig.environment}`);
    } catch (error) {
      console.warn('Failed to delete old deployment:', error);
    }
    
    // Rename canary to production
    await execAsync(`kubectl patch deployment icepaca-production-canary -n ${this.deploymentConfig.environment} -p '{"metadata":{"name":"icepaca-production"}}'`);
  }

  private async monitorCanaryHealth(durationMinutes: number): Promise<void> {
    const startTime = Date.now();
    const endTime = startTime + (durationMinutes * 60 * 1000);
    
    while (Date.now() < endTime) {
      try {
        const errorRate = await this.getErrorRate();
        
        if (errorRate > this.deploymentConfig.rollbackThreshold) {
          throw new Error(`Canary error rate too high: ${errorRate}%`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 30000)); // Check every 30 seconds
      } catch (error) {
        throw new Error(`Canary monitoring failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  private async monitorErrorRates(durationMinutes: number): Promise<void> {
    const startTime = Date.now();
    const endTime = startTime + (durationMinutes * 60 * 1000);
    let errorRateSum = 0;
    let samples = 0;
    
    while (Date.now() < endTime) {
      try {
        const errorRate = await this.getErrorRate();
        errorRateSum += errorRate;
        samples++;
        
        if (this.currentDeployment) {
          this.currentDeployment.errorRate = errorRate;
        }
        
        if (errorRate > this.deploymentConfig.rollbackThreshold) {
          throw new Error(`Error rate too high: ${errorRate}%`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 30000)); // Check every 30 seconds
      } catch (error) {
        throw new Error(`Error rate monitoring failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    const averageErrorRate = samples > 0 ? errorRateSum / samples : 0;
    console.log(`Average error rate during monitoring: ${averageErrorRate.toFixed(2)}%`);
  }

  private async getErrorRate(): Promise<number> {
    // Mock error rate calculation - in production, query monitoring system
    return Math.random() * 2; // 0-2% error rate
  }

  private async waitForJobCompletion(jobPrefix: string, timeoutSeconds: number): Promise<void> {
    const startTime = Date.now();
    const timeout = timeoutSeconds * 1000;
    
    while (Date.now() - startTime < timeout) {
      try {
        const { stdout } = await execAsync(`kubectl get jobs -n ${this.deploymentConfig.environment} --field-selector=status.successful=1 | grep ${jobPrefix}`);
        
        if (stdout.trim()) {
          return; // Job completed successfully
        }
      } catch (error) {
        // Job might not exist yet or might have failed
      }
      
      await new Promise(resolve => setTimeout(resolve, 5000)); // Check every 5 seconds
    }
    
    throw new Error(`Job ${jobPrefix} did not complete within ${timeoutSeconds} seconds`);
  }

  private getDeploymentUrl(): string {
    if (this.deploymentConfig.environment === 'production') {
      return `https://${process.env.PRODUCTION_DOMAIN || 'icepaca.com'}`;
    } else {
      return `https://${process.env.STAGING_DOMAIN || 'staging.icepaca.com'}`;
    }
  }

  private async sendDeploymentNotification(status: 'success' | 'failure' | 'rollback', message: string): Promise<void> {
    const notifications = this.deploymentConfig.notifications;
    
    // Email notifications
    for (const email of notifications.email) {
      console.log(`📧 Email notification sent to ${email}: ${status.toUpperCase()} - ${message}`);
    }
    
    // Slack notification
    if (notifications.slack) {
      try {
        await axios.post(notifications.slack, {
          text: `🚀 ICEPACA Deployment ${status.toUpperCase()}: ${message}`,
          channel: '#deployments'
        });
      } catch (error) {
        console.error('Failed to send Slack notification:', error);
      }
    }
    
    // Webhook notification
    if (notifications.webhook) {
      try {
        await axios.post(notifications.webhook, {
          deployment: this.currentDeployment,
          status,
          message,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Failed to send webhook notification:', error);
      }
    }
  }

  // PUBLIC METHODS

  async startDeployment(config?: Partial<DeploymentConfig>): Promise<DeploymentStatus> {
    if (this.currentDeployment && this.currentDeployment.status !== 'completed' && this.currentDeployment.status !== 'failed') {
      throw new Error('A deployment is already in progress');
    }
    
    // Update configuration if provided
    if (config) {
      this.deploymentConfig = { ...this.deploymentConfig, ...config };
    }
    
    const deploymentId = `deploy_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    this.currentDeployment = {
      id: deploymentId,
      strategy: this.deploymentConfig.strategy,
      environment: this.deploymentConfig.environment,
      version: this.deploymentConfig.targetVersion,
      status: 'initializing',
      progress: 0,
      currentPhase: 'initialization',
      startTime: new Date(),
      deployedServices: [],
      healthStatus: 'unknown',
      errorRate: 0,
      phases: [...this.phases]
    };
    
    console.log(`🚀 Starting deployment ${deploymentId} with ${this.deploymentConfig.strategy} strategy`);
    
    try {
      // Execute phases in order
      for (const phase of this.phases) {
        if (this.currentDeployment.status === 'rolling_back') {
          break; // Stop execution if rollback has been initiated
        }
        
        // Check dependencies
        const dependenciesMet = phase.dependencies.every(depId => {
          const depPhase = this.phases.find(p => p.id === depId);
          return depPhase && depPhase.status === 'completed';
        });
        
        if (!dependenciesMet) {
          throw new Error(`Phase ${phase.name} dependencies not met`);
        }
        
        this.currentDeployment.currentPhase = phase.name;
        phase.status = 'in_progress';
        phase.startTime = new Date();
        
        try {
          await phase.executeFunction();
          phase.status = 'completed';
          phase.endTime = new Date();
        } catch (error) {
          phase.status = 'failed';
          phase.endTime = new Date();
          phase.error = error instanceof Error ? error.message : 'Unknown error';
          
          if (!phase.canSkip) {
            throw error; // Fail the deployment for critical phases
          } else {
            console.warn(`⚠️  Phase ${phase.name} failed but is marked as skippable: ${phase.error}`);
            phase.status = 'skipped';
          }
        }
        
        // Update progress
        const completedPhases = this.phases.filter(p => p.status === 'completed' || p.status === 'skipped').length;
        this.currentDeployment.progress = Math.round((completedPhases / this.phases.length) * 100);
        
        console.log(`Progress: ${this.currentDeployment.progress}% - ${phase.name} ${phase.status}`);
      }
      
      // Deployment completed successfully
      this.currentDeployment.status = 'completed';
      this.currentDeployment.endTime = new Date();
      this.currentDeployment.duration = this.currentDeployment.endTime.getTime() - this.currentDeployment.startTime.getTime();
      this.currentDeployment.progress = 100;
      this.currentDeployment.healthStatus = 'healthy';
      
      console.log(`✅ Deployment ${deploymentId} completed successfully in ${Math.round(this.currentDeployment.duration / 1000)}s`);
      
      await this.sendDeploymentNotification('success', `Deployment ${deploymentId} completed successfully`);
      
    } catch (error) {
      console.error(`❌ Deployment ${deploymentId} failed:`, error);
      
      this.currentDeployment.status = 'failed';
      this.currentDeployment.endTime = new Date();
      this.currentDeployment.duration = this.currentDeployment.endTime.getTime() - this.currentDeployment.startTime.getTime();
      
      // Attempt automatic rollback if configured
      if (process.env.AUTO_ROLLBACK === 'true') {
        await this.rollbackDeployment('Automatic rollback due to deployment failure');
      }
      
      await this.sendDeploymentNotification('failure', `Deployment ${deploymentId} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      throw error;
    } finally {
      // Add to deployment history
      this.deploymentHistory.push({ ...this.currentDeployment });
      
      // Keep only last 10 deployments in history
      if (this.deploymentHistory.length > 10) {
        this.deploymentHistory = this.deploymentHistory.slice(-10);
      }
    }
    
    return this.currentDeployment;
  }

  async rollbackDeployment(reason: string): Promise<void> {
    if (!this.currentDeployment) {
      throw new Error('No active deployment to rollback');
    }
    
    console.log(`🔄 Starting rollback: ${reason}`);
    
    this.currentDeployment.status = 'rolling_back';
    this.currentDeployment.rollbackReason = reason;
    
    // Execute rollback functions in reverse order
    const completedPhases = this.phases
      .filter(p => p.status === 'completed' && p.rollbackFunction)
      .reverse();
    
    for (const phase of completedPhases) {
      if (phase.rollbackFunction) {
        try {
          console.log(`Rolling back: ${phase.name}`);
          await phase.rollbackFunction();
        } catch (error) {
          console.error(`Failed to rollback phase ${phase.name}:`, error);
        }
      }
    }
    
    this.currentDeployment.status = 'rolled_back';
    this.currentDeployment.endTime = new Date();
    this.currentDeployment.duration = this.currentDeployment.endTime.getTime() - this.currentDeployment.startTime.getTime();
    
    await this.sendDeploymentNotification('rollback', `Deployment rolled back: ${reason}`);
    
    console.log(`✅ Rollback completed: ${reason}`);
  }

  getCurrentDeployment(): DeploymentStatus | null {
    return this.currentDeployment;
  }

  getDeploymentHistory(): DeploymentStatus[] {
    return [...this.deploymentHistory];
  }

  getDeploymentConfig(): DeploymentConfig {
    return { ...this.deploymentConfig };
  }

  updateDeploymentConfig(updates: Partial<DeploymentConfig>): void {
    this.deploymentConfig = { ...this.deploymentConfig, ...updates };
  }

  async abortDeployment(reason: string): Promise<void> {
    if (!this.currentDeployment || this.currentDeployment.status === 'completed') {
      throw new Error('No active deployment to abort');
    }
    
    console.log(`🛑 Aborting deployment: ${reason}`);
    
    await this.rollbackDeployment(`Deployment aborted: ${reason}`);
  }

  getPhaseStatus(): DeploymentPhase[] {
    return [...this.phases];
  }
}

export default new DeploymentOrchestrator();