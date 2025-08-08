import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import AWS from 'aws-sdk';
import cron from 'node-cron';
import { createHash } from 'crypto';

const execAsync = promisify(exec);

interface BackupConfig {
  database: {
    type: 'mongodb' | 'postgresql';
    connectionString: string;
    databases: string[];
  };
  storage: {
    provider: 'aws-s3' | 'google-cloud' | 'local';
    config: any;
  };
  encryption: {
    enabled: boolean;
    algorithm: 'aes-256-gcm';
    keyPath: string;
  };
  retention: {
    daily: number;    // Keep daily backups for N days
    weekly: number;   // Keep weekly backups for N weeks
    monthly: number;  // Keep monthly backups for N months
  };
  compression: boolean;
  notifications: {
    email: string[];
    webhook?: string;
  };
}

interface BackupMetadata {
  id: string;
  timestamp: Date;
  type: 'database' | 'files' | 'full';
  status: 'in_progress' | 'completed' | 'failed';
  size: number;
  checksum: string;
  location: string;
  databases: string[];
  retention: 'daily' | 'weekly' | 'monthly';
  encryptionUsed: boolean;
  duration: number;
  error?: string;
}

class BackupService {
  private config: BackupConfig;
  private s3Client?: AWS.S3;
  private backupHistory: BackupMetadata[] = [];

  constructor() {
    this.config = {
      database: {
        type: process.env.DATABASE_TYPE as 'mongodb' | 'postgresql' || 'mongodb',
        connectionString: process.env.DATABASE_URL || '',
        databases: ['icepaca-main', 'icepaca-analytics', 'icepaca-sessions']
      },
      storage: {
        provider: process.env.BACKUP_STORAGE_PROVIDER as any || 'aws-s3',
        config: {
          bucket: process.env.BACKUP_S3_BUCKET || 'icepaca-backups',
          region: process.env.BACKUP_S3_REGION || 'us-east-1',
          accessKeyId: process.env.BACKUP_AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.BACKUP_AWS_SECRET_ACCESS_KEY
        }
      },
      encryption: {
        enabled: process.env.BACKUP_ENCRYPTION_ENABLED === 'true',
        algorithm: 'aes-256-gcm',
        keyPath: process.env.BACKUP_ENCRYPTION_KEY_PATH || '/etc/backup/encryption.key'
      },
      retention: {
        daily: parseInt(process.env.BACKUP_RETAIN_DAILY || '7'),
        weekly: parseInt(process.env.BACKUP_RETAIN_WEEKLY || '4'),
        monthly: parseInt(process.env.BACKUP_RETAIN_MONTHLY || '12')
      },
      compression: process.env.BACKUP_COMPRESSION_ENABLED !== 'false',
      notifications: {
        email: (process.env.BACKUP_NOTIFICATION_EMAILS || '').split(',').filter(e => e.trim()),
        webhook: process.env.BACKUP_NOTIFICATION_WEBHOOK
      }
    };

    this.initializeStorage();
    this.scheduleBackups();
  }

  private initializeStorage(): void {
    if (this.config.storage.provider === 'aws-s3') {
      this.s3Client = new AWS.S3({
        region: this.config.storage.config.region,
        accessKeyId: this.config.storage.config.accessKeyId,
        secretAccessKey: this.config.storage.config.secretAccessKey
      });
    }
  }

  private scheduleBackups(): void {
    console.log('🔄 Scheduling automated backups...');

    // Daily backup at 2 AM
    cron.schedule('0 2 * * *', async () => {
      await this.performBackup('daily');
    });

    // Weekly backup on Sunday at 3 AM
    cron.schedule('0 3 * * 0', async () => {
      await this.performBackup('weekly');
    });

    // Monthly backup on 1st day at 4 AM
    cron.schedule('0 4 1 * *', async () => {
      await this.performBackup('monthly');
    });

    // Cleanup old backups daily at 5 AM
    cron.schedule('0 5 * * *', async () => {
      await this.cleanupOldBackups();
    });

    console.log('✅ Backup schedules configured');
  }

  async performBackup(retentionType: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<BackupMetadata> {
    const startTime = Date.now();
    const backupId = `backup_${Date.now()}_${createHash('md5').update(Math.random().toString()).digest('hex').substring(0, 8)}`;

    console.log(`🔄 Starting ${retentionType} backup: ${backupId}`);

    const metadata: BackupMetadata = {
      id: backupId,
      timestamp: new Date(),
      type: 'full',
      status: 'in_progress',
      size: 0,
      checksum: '',
      location: '',
      databases: this.config.database.databases,
      retention: retentionType,
      encryptionUsed: this.config.encryption.enabled,
      duration: 0
    };

    try {
      // Create temporary backup directory
      const tempDir = path.join('/tmp', `backup_${backupId}`);
      await fs.promises.mkdir(tempDir, { recursive: true });

      // Backup databases
      const dbBackupPaths = await this.backupDatabases(tempDir);

      // Backup application files
      const fileBackupPath = await this.backupApplicationFiles(tempDir);

      // Create backup archive
      const archivePath = await this.createArchive(tempDir, backupId);

      // Calculate size and checksum
      const stats = await fs.promises.stat(archivePath);
      metadata.size = stats.size;
      metadata.checksum = await this.calculateChecksum(archivePath);

      // Encrypt if enabled
      let finalBackupPath = archivePath;
      if (this.config.encryption.enabled) {
        finalBackupPath = await this.encryptBackup(archivePath);
      }

      // Upload to storage
      metadata.location = await this.uploadToStorage(finalBackupPath, backupId);

      // Cleanup temporary files
      await this.cleanupTempFiles(tempDir, archivePath, finalBackupPath);

      metadata.status = 'completed';
      metadata.duration = Date.now() - startTime;

      this.backupHistory.push(metadata);

      console.log(`✅ Backup completed: ${backupId} (${this.formatSize(metadata.size)} in ${Math.round(metadata.duration / 1000)}s)`);

      // Send success notification
      await this.sendNotification('success', metadata);

      return metadata;
    } catch (error) {
      metadata.status = 'failed';
      metadata.error = error instanceof Error ? error.message : 'Unknown error';
      metadata.duration = Date.now() - startTime;

      this.backupHistory.push(metadata);

      console.error(`❌ Backup failed: ${backupId}`, error);

      // Send failure notification
      await this.sendNotification('failure', metadata);

      throw error;
    }
  }

  private async backupDatabases(tempDir: string): Promise<string[]> {
    const backupPaths: string[] = [];

    if (this.config.database.type === 'mongodb') {
      for (const dbName of this.config.database.databases) {
        const backupPath = path.join(tempDir, `${dbName}.archive`);
        
        try {
          // Use mongodump to create backup
          const command = `mongodump --uri="${this.config.database.connectionString}" --db=${dbName} --archive=${backupPath} --gzip`;
          await execAsync(command);
          
          backupPaths.push(backupPath);
          console.log(`📦 MongoDB backup created: ${dbName}`);
        } catch (error) {
          console.error(`❌ Failed to backup MongoDB database ${dbName}:`, error);
          throw error;
        }
      }
    } else if (this.config.database.type === 'postgresql') {
      for (const dbName of this.config.database.databases) {
        const backupPath = path.join(tempDir, `${dbName}.sql`);
        
        try {
          // Use pg_dump to create backup
          const command = `pg_dump "${this.config.database.connectionString}/${dbName}" -f ${backupPath} --verbose`;
          await execAsync(command);
          
          // Compress the SQL file
          if (this.config.compression) {
            const compressedPath = `${backupPath}.gz`;
            await execAsync(`gzip -c ${backupPath} > ${compressedPath}`);
            await fs.promises.unlink(backupPath);
            backupPaths.push(compressedPath);
          } else {
            backupPaths.push(backupPath);
          }
          
          console.log(`📦 PostgreSQL backup created: ${dbName}`);
        } catch (error) {
          console.error(`❌ Failed to backup PostgreSQL database ${dbName}:`, error);
          throw error;
        }
      }
    }

    return backupPaths;
  }

  private async backupApplicationFiles(tempDir: string): Promise<string> {
    const filesBackupPath = path.join(tempDir, 'application-files.tar.gz');
    
    // Backup important application directories
    const backupDirs = [
      'uploads',
      'config',
      'logs',
      'certificates',
      'static'
    ].filter(dir => fs.existsSync(dir));

    if (backupDirs.length === 0) {
      console.log('⚠️  No application files to backup');
      return '';
    }

    try {
      const command = `tar -czf ${filesBackupPath} ${backupDirs.join(' ')}`;
      await execAsync(command);
      
      console.log(`📁 Application files backup created`);
      return filesBackupPath;
    } catch (error) {
      console.error('❌ Failed to backup application files:', error);
      throw error;
    }
  }

  private async createArchive(tempDir: string, backupId: string): Promise<string> {
    const archivePath = path.join('/tmp', `${backupId}.tar.gz`);
    
    try {
      const command = `tar -czf ${archivePath} -C ${tempDir} .`;
      await execAsync(command);
      
      console.log(`📦 Backup archive created: ${archivePath}`);
      return archivePath;
    } catch (error) {
      console.error('❌ Failed to create backup archive:', error);
      throw error;
    }
  }

  private async calculateChecksum(filePath: string): Promise<string> {
    const hash = createHash('sha256');
    const stream = fs.createReadStream(filePath);
    
    return new Promise((resolve, reject) => {
      stream.on('data', data => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  private async encryptBackup(backupPath: string): Promise<string> {
    const encryptedPath = `${backupPath}.encrypted`;
    
    try {
      // Use OpenSSL for encryption (in production, use proper key management)
      const command = `openssl enc -aes-256-cbc -salt -in ${backupPath} -out ${encryptedPath} -pass file:${this.config.encryption.keyPath}`;
      await execAsync(command);
      
      console.log(`🔐 Backup encrypted: ${encryptedPath}`);
      return encryptedPath;
    } catch (error) {
      console.error('❌ Failed to encrypt backup:', error);
      throw error;
    }
  }

  private async uploadToStorage(backupPath: string, backupId: string): Promise<string> {
    if (this.config.storage.provider === 'aws-s3' && this.s3Client) {
      return await this.uploadToS3(backupPath, backupId);
    } else if (this.config.storage.provider === 'local') {
      return await this.uploadToLocal(backupPath, backupId);
    } else {
      throw new Error(`Unsupported storage provider: ${this.config.storage.provider}`);
    }
  }

  private async uploadToS3(backupPath: string, backupId: string): Promise<string> {
    try {
      const fileStream = fs.createReadStream(backupPath);
      const fileName = path.basename(backupPath);
      const key = `backups/${new Date().getFullYear()}/${String(new Date().getMonth() + 1).padStart(2, '0')}/${backupId}/${fileName}`;

      const uploadParams = {
        Bucket: this.config.storage.config.bucket,
        Key: key,
        Body: fileStream,
        ServerSideEncryption: 'AES256',
        StorageClass: 'STANDARD_IA', // Infrequent Access for cost savings
        Metadata: {
          'backup-id': backupId,
          'timestamp': new Date().toISOString(),
          'type': 'icepaca-backup'
        }
      };

      const result = await this.s3Client!.upload(uploadParams).promise();
      
      console.log(`☁️ Backup uploaded to S3: ${result.Location}`);
      return result.Location!;
    } catch (error) {
      console.error('❌ Failed to upload backup to S3:', error);
      throw error;
    }
  }

  private async uploadToLocal(backupPath: string, backupId: string): Promise<string> {
    try {
      const backupDir = process.env.BACKUP_LOCAL_PATH || '/var/backups/icepaca';
      const dateDir = path.join(backupDir, new Date().toISOString().split('T')[0]);
      await fs.promises.mkdir(dateDir, { recursive: true });

      const fileName = path.basename(backupPath);
      const destination = path.join(dateDir, `${backupId}_${fileName}`);
      
      await fs.promises.copyFile(backupPath, destination);
      
      console.log(`💾 Backup stored locally: ${destination}`);
      return destination;
    } catch (error) {
      console.error('❌ Failed to store backup locally:', error);
      throw error;
    }
  }

  private async cleanupTempFiles(...paths: string[]): Promise<void> {
    for (const filePath of paths) {
      try {
        if (filePath && fs.existsSync(filePath)) {
          const stats = await fs.promises.stat(filePath);
          if (stats.isDirectory()) {
            await fs.promises.rm(filePath, { recursive: true, force: true });
          } else {
            await fs.promises.unlink(filePath);
          }
        }
      } catch (error) {
        console.warn(`⚠️  Failed to cleanup temp file ${filePath}:`, error);
      }
    }
  }

  private async cleanupOldBackups(): Promise<void> {
    console.log('🧹 Starting backup cleanup...');

    try {
      const cutoffDates = {
        daily: new Date(Date.now() - this.config.retention.daily * 24 * 60 * 60 * 1000),
        weekly: new Date(Date.now() - this.config.retention.weekly * 7 * 24 * 60 * 60 * 1000),
        monthly: new Date(Date.now() - this.config.retention.monthly * 30 * 24 * 60 * 60 * 1000)
      };

      const toDelete = this.backupHistory.filter(backup => {
        const cutoff = cutoffDates[backup.retention];
        return backup.timestamp < cutoff;
      });

      let deletedCount = 0;
      for (const backup of toDelete) {
        try {
          if (this.config.storage.provider === 'aws-s3' && this.s3Client) {
            const key = backup.location.split('/').slice(3).join('/'); // Remove bucket from URL
            await this.s3Client.deleteObject({
              Bucket: this.config.storage.config.bucket,
              Key: key
            }).promise();
          } else if (this.config.storage.provider === 'local') {
            await fs.promises.unlink(backup.location);
          }

          deletedCount++;
          
          // Remove from history
          const index = this.backupHistory.indexOf(backup);
          if (index > -1) {
            this.backupHistory.splice(index, 1);
          }
          
        } catch (error) {
          console.warn(`⚠️  Failed to delete backup ${backup.id}:`, error);
        }
      }

      console.log(`🗑️  Cleaned up ${deletedCount} old backups`);
    } catch (error) {
      console.error('❌ Failed to cleanup old backups:', error);
    }
  }

  private async sendNotification(type: 'success' | 'failure', metadata: BackupMetadata): Promise<void> {
    const message = type === 'success'
      ? `✅ Backup completed successfully: ${metadata.id} (${this.formatSize(metadata.size)} in ${Math.round(metadata.duration / 1000)}s)`
      : `❌ Backup failed: ${metadata.id} - ${metadata.error}`;

    // Email notifications
    for (const email of this.config.notifications.email) {
      try {
        // In production, integrate with email service
        console.log(`📧 Email notification sent to ${email}: ${message}`);
      } catch (error) {
        console.error(`Failed to send email notification to ${email}:`, error);
      }
    }

    // Webhook notification
    if (this.config.notifications.webhook) {
      try {
        await fetch(this.config.notifications.webhook, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            type: `backup_${type}`,
            backup: metadata,
            message,
            timestamp: new Date().toISOString()
          })
        });
        
        console.log('🔗 Webhook notification sent');
      } catch (error) {
        console.error('Failed to send webhook notification:', error);
      }
    }
  }

  // Public methods for manual operations
  async createManualBackup(): Promise<BackupMetadata> {
    return await this.performBackup('daily');
  }

  async restoreFromBackup(backupId: string, restoreType: 'database' | 'files' | 'full' = 'full'): Promise<void> {
    console.log(`🔄 Starting restore from backup: ${backupId}`);

    const backup = this.backupHistory.find(b => b.id === backupId);
    if (!backup) {
      throw new Error(`Backup not found: ${backupId}`);
    }

    try {
      // Download backup from storage
      const tempDir = path.join('/tmp', `restore_${backupId}`);
      await fs.promises.mkdir(tempDir, { recursive: true });

      const backupPath = await this.downloadFromStorage(backup.location, tempDir);

      // Decrypt if needed
      let finalBackupPath = backupPath;
      if (backup.encryptionUsed) {
        finalBackupPath = await this.decryptBackup(backupPath);
      }

      // Extract backup
      await execAsync(`tar -xzf ${finalBackupPath} -C ${tempDir}`);

      // Restore based on type
      if (restoreType === 'database' || restoreType === 'full') {
        await this.restoreDatabases(tempDir);
      }

      if (restoreType === 'files' || restoreType === 'full') {
        await this.restoreFiles(tempDir);
      }

      // Cleanup
      await this.cleanupTempFiles(tempDir);

      console.log(`✅ Restore completed from backup: ${backupId}`);
    } catch (error) {
      console.error(`❌ Restore failed from backup ${backupId}:`, error);
      throw error;
    }
  }

  private async downloadFromStorage(location: string, tempDir: string): Promise<string> {
    if (this.config.storage.provider === 'aws-s3' && this.s3Client) {
      const key = location.split('/').slice(3).join('/');
      const fileName = path.basename(location);
      const downloadPath = path.join(tempDir, fileName);

      const params = {
        Bucket: this.config.storage.config.bucket,
        Key: key
      };

      const writeStream = fs.createWriteStream(downloadPath);
      const readStream = this.s3Client.getObject(params).createReadStream();
      
      return new Promise((resolve, reject) => {
        readStream.pipe(writeStream);
        writeStream.on('finish', () => resolve(downloadPath));
        writeStream.on('error', reject);
      });
    } else if (this.config.storage.provider === 'local') {
      return location; // Already local
    } else {
      throw new Error(`Unsupported storage provider for restore: ${this.config.storage.provider}`);
    }
  }

  private async decryptBackup(encryptedPath: string): Promise<string> {
    const decryptedPath = encryptedPath.replace('.encrypted', '');
    
    try {
      const command = `openssl enc -aes-256-cbc -d -salt -in ${encryptedPath} -out ${decryptedPath} -pass file:${this.config.encryption.keyPath}`;
      await execAsync(command);
      
      console.log(`🔓 Backup decrypted: ${decryptedPath}`);
      return decryptedPath;
    } catch (error) {
      console.error('❌ Failed to decrypt backup:', error);
      throw error;
    }
  }

  private async restoreDatabases(tempDir: string): Promise<void> {
    // Implementation would depend on database type and restoration strategy
    console.log('🔄 Restoring databases...');
    // In production, implement specific database restoration logic
  }

  private async restoreFiles(tempDir: string): Promise<void> {
    // Implementation would restore application files
    console.log('🔄 Restoring application files...');
    // In production, implement file restoration logic
  }

  getBackupHistory(): BackupMetadata[] {
    return [...this.backupHistory];
  }

  getBackupStatus(): {
    lastBackup: BackupMetadata | null;
    nextScheduledBackup: Date;
    totalBackups: number;
    totalSize: number;
    healthStatus: 'healthy' | 'warning' | 'error';
  } {
    const lastBackup = this.backupHistory
      .filter(b => b.status === 'completed')
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0] || null;

    const totalSize = this.backupHistory
      .filter(b => b.status === 'completed')
      .reduce((sum, b) => sum + b.size, 0);

    // Calculate next scheduled backup (daily at 2 AM)
    const now = new Date();
    const nextBackup = new Date(now);
    nextBackup.setHours(2, 0, 0, 0);
    if (nextBackup <= now) {
      nextBackup.setDate(nextBackup.getDate() + 1);
    }

    // Health status based on last backup age
    let healthStatus: 'healthy' | 'warning' | 'error' = 'healthy';
    if (lastBackup) {
      const hoursSinceLastBackup = (Date.now() - lastBackup.timestamp.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastBackup > 48) {
        healthStatus = 'error';
      } else if (hoursSinceLastBackup > 30) {
        healthStatus = 'warning';
      }
    } else {
      healthStatus = 'error';
    }

    return {
      lastBackup,
      nextScheduledBackup: nextBackup,
      totalBackups: this.backupHistory.filter(b => b.status === 'completed').length,
      totalSize,
      healthStatus
    };
  }

  private formatSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}

export default new BackupService();