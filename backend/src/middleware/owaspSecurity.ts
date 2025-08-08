import { Request, Response, NextFunction } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import mongoose from 'mongoose';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

// OWASP Top 10 2021 Security Implementation

// 1. Broken Access Control
export class AccessControl {
  // Role-based access control
  static requireRole(roles: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const userRoles = req.user.roles || ['user'];
      const hasRequiredRole = roles.some(role => userRoles.includes(role));

      if (!hasRequiredRole) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          required: roles,
          current: userRoles
        });
      }

      next();
    };
  }

  // Resource ownership verification
  static requireOwnership(resourceParam: string = 'id') {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.user) {
          return res.status(401).json({ error: 'Authentication required' });
        }

        const resourceId = req.params[resourceParam];
        const userId = req.user.id;

        // Check if user owns the resource (implementation depends on resource type)
        const isOwner = await this.verifyResourceOwnership(resourceId, userId, req.route.path);

        if (!isOwner && !req.user.roles?.includes('admin')) {
          return res.status(403).json({ error: 'Access denied: Resource not owned by user' });
        }

        next();
      } catch (error) {
        console.error('Ownership verification error:', error);
        res.status(500).json({ error: 'Access verification failed' });
      }
    };
  }

  private static async verifyResourceOwnership(resourceId: string, userId: string, routePath: string): Promise<boolean> {
    // In production, implement specific ownership checks based on resource type
    // This is a simplified example
    try {
      if (routePath.includes('/orders')) {
        // Check order ownership
        const Order = mongoose.model('Order');
        const order = await Order.findOne({ _id: resourceId, userId });
        return !!order;
      }
      
      if (routePath.includes('/reviews')) {
        const Review = mongoose.model('Review');
        const review = await Review.findOne({ _id: resourceId, userId });
        return !!review;
      }

      return true; // Default to allow if no specific check
    } catch (error) {
      console.error('Resource ownership check error:', error);
      return false;
    }
  }

  // IP-based access restrictions
  static restrictByIP(allowedIPs: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      const clientIP = req.ip || req.connection.remoteAddress || '';
      
      if (!allowedIPs.includes(clientIP)) {
        return res.status(403).json({
          error: 'Access denied from this IP address',
          ip: clientIP
        });
      }

      next();
    };
  }
}

// 2. Cryptographic Failures
export class CryptographicSecurity {
  // Strong password requirements
  static validateStrongPassword = body('password')
    .isLength({ min: 12 })
    .withMessage('Password must be at least 12 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character')
    .matches(/^(?!.*(.)\1{2,})/)
    .withMessage('Password cannot contain repeated characters');

  // Data encryption utilities
  static encryptSensitiveData(data: string, key?: string): string {
    const encryptionKey = key || process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-gcm', encryptionKey);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  static decryptSensitiveData(encryptedData: string, key?: string): string {
    const encryptionKey = key || process.env.ENCRYPTION_KEY;
    if (!encryptionKey) throw new Error('Encryption key not configured');

    const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipher('aes-256-gcm', encryptionKey);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  // Secure token generation
  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  // Hash sensitive data
  static hashData(data: string, salt?: string): string {
    const saltToUse = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(data, saltToUse, 10000, 64, 'sha512');
    return `${saltToUse}:${hash.toString('hex')}`;
  }
}

// 3. Injection Protection
export class InjectionProtection {
  // SQL Injection protection (for raw queries)
  static sanitizeSQL(query: string): string {
    return query
      .replace(/['"\\;]/g, '') // Remove dangerous characters
      .replace(/(\b(UNION|SELECT|INSERT|DELETE|UPDATE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi, '') // Remove SQL keywords
      .trim();
  }

  // NoSQL Injection protection
  static sanitizeNoSQL = (req: Request, res: Response, next: NextFunction) => {
    const sanitize = (obj: any): any => {
      if (obj && typeof obj === 'object') {
        for (const key in obj) {
          if (key.startsWith('$') || key.includes('.')) {
            delete obj[key];
          } else if (typeof obj[key] === 'object') {
            obj[key] = sanitize(obj[key]);
          }
        }
      }
      return obj;
    };

    req.body = sanitize(req.body);
    req.query = sanitize(req.query);
    req.params = sanitize(req.params);
    
    next();
  };

  // Command injection protection
  static sanitizeCommand(command: string): string {
    return command
      .replace(/[|&;`'"\\<>]/g, '') // Remove shell metacharacters
      .replace(/\$\([^)]*\)/g, '') // Remove command substitution
      .trim();
  }

  // XPath injection protection
  static sanitizeXPath(input: string): string {
    return input
      .replace(/['"]/g, '') // Remove quotes
      .replace(/\[|\]/g, '') // Remove brackets
      .replace(/\(|\)/g, '') // Remove parentheses
      .trim();
  }

  // LDAP injection protection
  static sanitizeLDAP(input: string): string {
    return input
      .replace(/[()\\*]/g, '') // Remove LDAP special characters
      .replace(/\x00/g, '') // Remove null bytes
      .trim();
  }

  // Validate MongoDB ObjectId
  static validateObjectId = param('id')
    .isMongoId()
    .withMessage('Invalid ID format')
    .customSanitizer(value => {
      return mongoose.Types.ObjectId.isValid(value) ? value : null;
    });
}

// 4. Insecure Design Prevention
export class SecureDesign {
  // API versioning enforcement
  static enforceAPIVersion(supportedVersions: string[] = ['v1']) {
    return (req: Request, res: Response, next: NextFunction) => {
      const version = req.headers['api-version'] || req.query.version || 'v1';
      
      if (!supportedVersions.includes(version as string)) {
        return res.status(400).json({
          error: 'Unsupported API version',
          supported: supportedVersions,
          requested: version
        });
      }

      req.apiVersion = version as string;
      next();
    };
  }

  // Request size limits
  static limitRequestSize(maxSize: string = '10mb') {
    return (req: Request, res: Response, next: NextFunction) => {
      const contentLength = parseInt(req.headers['content-length'] || '0');
      const maxBytes = this.parseSize(maxSize);

      if (contentLength > maxBytes) {
        return res.status(413).json({
          error: 'Request too large',
          maxSize,
          received: `${Math.round(contentLength / 1024)}kb`
        });
      }

      next();
    };
  }

  private static parseSize(size: string): number {
    const match = size.match(/^(\d+)(kb|mb|gb)?$/i);
    if (!match) return 10 * 1024 * 1024; // Default 10MB

    const value = parseInt(match[1]);
    const unit = (match[2] || 'b').toLowerCase();

    switch (unit) {
      case 'gb': return value * 1024 * 1024 * 1024;
      case 'mb': return value * 1024 * 1024;
      case 'kb': return value * 1024;
      default: return value;
    }
  }

  // Secure headers validation
  static validateSecureHeaders = (req: Request, res: Response, next: NextFunction) => {
    const requiredHeaders = ['user-agent', 'accept'];
    const suspiciousPatterns = [
      /curl/i,
      /wget/i,
      /bot/i,
      /crawler/i,
      /scanner/i
    ];

    // Check required headers
    for (const header of requiredHeaders) {
      if (!req.headers[header]) {
        return res.status(400).json({
          error: 'Missing required headers',
          required: requiredHeaders
        });
      }
    }

    // Check for suspicious user agents
    const userAgent = req.headers['user-agent'] as string;
    const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(userAgent));

    if (isSuspicious) {
      console.warn('Suspicious user agent detected:', userAgent, 'from IP:', req.ip);
      // Log but don't block - might be legitimate tool
    }

    next();
  };
}

// 5. Security Misconfiguration Prevention
export class SecurityConfiguration {
  // Remove sensitive headers
  static removeSensitiveHeaders = (req: Request, res: Response, next: NextFunction) => {
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  };

  // Environment-specific security
  static environmentSecurity = (req: Request, res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV === 'production') {
      // Production-only security measures
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    } else if (process.env.NODE_ENV === 'development') {
      // Development warnings
      if (req.headers.host?.includes('localhost') && req.protocol !== 'https') {
        console.warn('Development server should use HTTPS for testing');
      }
    }
    next();
  };

  // Debug information prevention
  static preventDebugInfo = (req: Request, res: Response, next: NextFunction) => {
    if (process.env.NODE_ENV === 'production') {
      // Override console methods in production
      const originalSend = res.send;
      res.send = function(body: any) {
        // Remove debug information from responses
        if (typeof body === 'string') {
          body = body.replace(/<!--[\s\S]*?-->/g, ''); // Remove HTML comments
        }
        return originalSend.call(this, body);
      };
    }
    next();
  };
}

// 6. Vulnerable Components Protection
export class ComponentSecurity {
  // Dependency vulnerability scanning (mock implementation)
  static checkDependencyVulnerabilities = async (req: Request, res: Response, next: NextFunction) => {
    // In production, integrate with tools like npm audit, Snyk, or OWASP Dependency Check
    try {
      // Check for known vulnerable packages (mock implementation)
      const vulnerablePackages = await this.scanDependencies();
      
      if (vulnerablePackages.length > 0 && process.env.NODE_ENV === 'production') {
        console.error('Vulnerable dependencies detected:', vulnerablePackages);
        // In production, you might want to block requests or alert administrators
      }
      
      next();
    } catch (error) {
      console.error('Dependency scan error:', error);
      next(); // Continue even if scan fails
    }
  };

  private static async scanDependencies(): Promise<string[]> {
    // Mock implementation - in production, use actual vulnerability database
    const knownVulnerablePackages = [
      'express@4.16.0', // Example vulnerable version
      'lodash@4.17.10',
      'moment@2.29.0'
    ];
    
    // Would check installed packages against vulnerability database
    return []; // Return empty array for mock
  }

  // Version disclosure prevention
  static hideVersionInfo = (req: Request, res: Response, next: NextFunction) => {
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');
    
    // Override JSON responses to remove version info
    const originalJson = res.json;
    res.json = function(obj: any) {
      if (obj && typeof obj === 'object') {
        delete obj.version;
        delete obj.serverInfo;
        delete obj.dependencies;
      }
      return originalJson.call(this, obj);
    };
    
    next();
  };
}

// 7. Identity and Authentication Failures Prevention
export class AuthenticationSecurity {
  // Multi-factor authentication enforcement
  static requireMFA = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Check if MFA is enabled for user
      if (!req.user.mfaEnabled) {
        return res.status(403).json({
          error: 'MFA required',
          message: 'Multi-factor authentication must be enabled for this action'
        });
      }

      // Check for MFA token in request
      const mfaToken = req.headers['x-mfa-token'] as string;
      if (!mfaToken) {
        return res.status(403).json({
          error: 'MFA token required',
          message: 'Please provide MFA token'
        });
      }

      // Verify MFA token (implementation in security middleware)
      const isValidMFA = await this.verifyMFAToken(req.user.id, mfaToken);
      if (!isValidMFA) {
        return res.status(403).json({
          error: 'Invalid MFA token',
          message: 'MFA token is invalid or expired'
        });
      }

      next();
    } catch (error) {
      console.error('MFA verification error:', error);
      res.status(500).json({ error: 'MFA verification failed' });
    }
  };

  private static async verifyMFAToken(userId: string, token: string): Promise<boolean> {
    // Implementation would verify TOTP token
    return true; // Mock implementation
  }

  // Session security
  static secureSession = (req: Request, res: Response, next: NextFunction) => {
    if (req.session) {
      // Regenerate session ID periodically
      const lastRegeneration = req.session.lastRegeneration || 0;
      const now = Date.now();
      
      if (now - lastRegeneration > 30 * 60 * 1000) { // 30 minutes
        req.session.regenerate((err) => {
          if (err) {
            console.error('Session regeneration error:', err);
          }
          req.session!.lastRegeneration = now;
          next();
        });
      } else {
        next();
      }
    } else {
      next();
    }
  };

  // Concurrent session limits
  static limitConcurrentSessions = (maxSessions: number = 3) => {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) return next();

      try {
        // Check active sessions for user (implementation depends on session store)
        const activeSessions = await this.getActiveSessionsForUser(req.user.id);
        
        if (activeSessions.length >= maxSessions) {
          return res.status(429).json({
            error: 'Too many concurrent sessions',
            maxAllowed: maxSessions,
            current: activeSessions.length
          });
        }

        next();
      } catch (error) {
        console.error('Session limit check error:', error);
        next();
      }
    };
  };

  private static async getActiveSessionsForUser(userId: string): Promise<any[]> {
    // Mock implementation - would query session store
    return [];
  }
}

// 8. Software and Data Integrity Failures Prevention
export class IntegritySecurity {
  // Request integrity verification
  static verifyRequestIntegrity = (req: Request, res: Response, next: NextFunction) => {
    const signature = req.headers['x-signature'] as string;
    const timestamp = req.headers['x-timestamp'] as string;
    
    if (req.method !== 'GET' && process.env.REQUIRE_INTEGRITY_CHECK === 'true') {
      if (!signature || !timestamp) {
        return res.status(400).json({
          error: 'Request integrity verification required',
          message: 'Missing signature or timestamp'
        });
      }

      // Verify timestamp is recent (within 5 minutes)
      const requestTime = parseInt(timestamp);
      const now = Date.now();
      
      if (Math.abs(now - requestTime) > 5 * 60 * 1000) {
        return res.status(400).json({
          error: 'Request expired',
          message: 'Request timestamp is too old'
        });
      }

      // Verify signature
      const isValid = this.verifySignature(req, signature, timestamp);
      if (!isValid) {
        return res.status(400).json({
          error: 'Invalid request signature',
          message: 'Request integrity verification failed'
        });
      }
    }

    next();
  };

  private static verifySignature(req: Request, signature: string, timestamp: string): boolean {
    try {
      const secret = process.env.REQUEST_SIGNING_SECRET;
      if (!secret) return true; // Skip verification if no secret configured

      const payload = JSON.stringify(req.body) + timestamp;
      const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
      
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }

  // File upload integrity
  static verifyFileIntegrity = (req: Request, res: Response, next: NextFunction) => {
    if (req.file) {
      const expectedHash = req.headers['x-file-hash'] as string;
      
      if (expectedHash) {
        const fileBuffer = req.file.buffer;
        const actualHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        
        if (actualHash !== expectedHash) {
          return res.status(400).json({
            error: 'File integrity verification failed',
            message: 'File hash mismatch'
          });
        }
      }
    }

    next();
  };
}

// 9. Security Logging and Monitoring Failures Prevention
export class SecurityLogging {
  // Security event logging
  static logSecurityEvent = (eventType: string, details: any = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'SECURITY_EVENT',
      event: eventType,
      details,
      severity: this.getEventSeverity(eventType)
    };

    // In production, send to secure logging service (SIEM)
    console.log('SECURITY_LOG:', JSON.stringify(logEntry));
    
    // Send to monitoring service
    this.sendToMonitoring(logEntry);
  };

  private static getEventSeverity(eventType: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const severityMap: { [key: string]: any } = {
      'LOGIN_FAILURE': 'MEDIUM',
      'BRUTE_FORCE_ATTEMPT': 'HIGH',
      'INJECTION_ATTEMPT': 'CRITICAL',
      'UNAUTHORIZED_ACCESS': 'HIGH',
      'SUSPICIOUS_ACTIVITY': 'MEDIUM',
      'MFA_FAILURE': 'HIGH',
      'DATA_BREACH': 'CRITICAL'
    };

    return severityMap[eventType] || 'LOW';
  }

  private static sendToMonitoring(logEntry: any): void {
    // Mock implementation - would send to monitoring service
    if (logEntry.severity === 'CRITICAL' || logEntry.severity === 'HIGH') {
      console.warn('HIGH PRIORITY SECURITY EVENT:', logEntry);
    }
  }

  // Request logging middleware
  static logSecurityRequests = (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    
    // Log suspicious patterns
    const suspiciousPatterns = [
      /\.\./,              // Directory traversal
      /<script/i,          // XSS attempts
      /union.*select/i,    // SQL injection
      /javascript:/i,      // XSS
      /eval\(/i,          // Code injection
      /exec\(/i           // Code injection
    ];

    const url = req.originalUrl;
    const userAgent = req.get('User-Agent') || '';
    const body = JSON.stringify(req.body);

    const isSuspicious = suspiciousPatterns.some(pattern => 
      pattern.test(url) || pattern.test(userAgent) || pattern.test(body)
    );

    if (isSuspicious) {
      this.logSecurityEvent('SUSPICIOUS_ACTIVITY', {
        ip: req.ip,
        userAgent,
        url,
        method: req.method,
        body: req.body
      });
    }

    // Log response
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      
      if (res.statusCode >= 400) {
        this.logSecurityEvent('HTTP_ERROR', {
          ip: req.ip,
          url,
          method: req.method,
          statusCode: res.statusCode,
          duration
        });
      }
    });

    next();
  };
}

// 10. Server-Side Request Forgery (SSRF) Prevention
export class SSRFProtection {
  // URL validation
  static validateURL = (url: string): boolean => {
    try {
      const parsed = new URL(url);
      
      // Block internal networks
      const hostname = parsed.hostname;
      
      // Block localhost
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return false;
      }

      // Block private IP ranges
      const privateRanges = [
        /^10\./,
        /^192\.168\./,
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
        /^169\.254\./, // Link-local
        /^::1$/,       // IPv6 localhost
        /^fc00::/,     // IPv6 private
        /^fe80::/      // IPv6 link-local
      ];

      if (privateRanges.some(range => range.test(hostname))) {
        return false;
      }

      // Block dangerous protocols
      const allowedProtocols = ['http:', 'https:'];
      if (!allowedProtocols.includes(parsed.protocol)) {
        return false;
      }

      // Block dangerous ports
      const dangerousPorts = [22, 23, 25, 53, 135, 137, 138, 139, 445, 993, 995, 1433, 3306, 3389, 5432, 5984, 6379, 7001, 8020, 8086, 8888, 9042, 9160, 9200, 9300, 11211, 27017, 27018, 27019];
      const port = parseInt(parsed.port) || (parsed.protocol === 'https:' ? 443 : 80);
      
      if (dangerousPorts.includes(port)) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  };

  // SSRF protection middleware
  static preventSSRF = (req: Request, res: Response, next: NextFunction) => {
    const urlFields = ['url', 'callback', 'redirect', 'webhook', 'endpoint'];
    
    const checkObject = (obj: any): boolean => {
      for (const key in obj) {
        if (urlFields.includes(key.toLowerCase())) {
          if (typeof obj[key] === 'string' && !this.validateURL(obj[key])) {
            return false;
          }
        }
        
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          if (!checkObject(obj[key])) {
            return false;
          }
        }
      }
      return true;
    };

    if (!checkObject(req.body) || !checkObject(req.query)) {
      return res.status(400).json({
        error: 'Invalid URL detected',
        message: 'URLs pointing to internal networks are not allowed'
      });
    }

    next();
  };
}

// Combined OWASP security middleware
export const owaspSecurityMiddleware = [
  SecurityConfiguration.removeSensitiveHeaders,
  SecurityConfiguration.environmentSecurity,
  SecurityConfiguration.preventDebugInfo,
  InjectionProtection.sanitizeNoSQL,
  SecureDesign.validateSecureHeaders,
  SecurityLogging.logSecurityRequests,
  SSRFProtection.preventSSRF,
  IntegritySecurity.verifyRequestIntegrity,
  AuthenticationSecurity.secureSession
];

export default {
  AccessControl,
  CryptographicSecurity,
  InjectionProtection,
  SecureDesign,
  SecurityConfiguration,
  ComponentSecurity,
  AuthenticationSecurity,
  IntegritySecurity,
  SecurityLogging,
  SSRFProtection,
  owaspSecurityMiddleware
};