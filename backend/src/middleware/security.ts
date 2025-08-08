import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { body, validationResult, sanitizeBody } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import speakeasy from 'speakeasy';
import { User } from '../models/User';

// HTTPS Enforcement
export const enforceHTTPS = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'production' && req.header('x-forwarded-proto') !== 'https') {
    return res.redirect(`https://${req.header('host')}${req.url}`);
  }
  next();
};

// Security Headers with Helmet
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        "https://js.stripe.com",
        "https://checkout.stripe.com",
        "https://www.googletagmanager.com",
        "https://www.google-analytics.com",
        "https://connect.facebook.net",
        "https://www.youtube.com",
        "https://player.vimeo.com"
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com",
        "https://cdnjs.cloudflare.com"
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com",
        "https://cdnjs.cloudflare.com"
      ],
      imgSrc: [
        "'self'",
        "data:",
        "https:",
        "http:",
        "*.cloudinary.com",
        "*.amazonaws.com",
        "www.google-analytics.com"
      ],
      connectSrc: [
        "'self'",
        "https://api.stripe.com",
        "https://checkout.stripe.com",
        "https://www.google-analytics.com",
        "https://vitals.vercel-insights.com",
        "wss:"
      ],
      frameSrc: [
        "'self'",
        "https://js.stripe.com",
        "https://checkout.stripe.com",
        "https://www.youtube.com",
        "https://player.vimeo.com"
      ],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
});

// Rate Limiting
export const createRateLimiter = (windowMs: number, max: number, message?: string) => {
  return rateLimit({
    windowMs,
    max,
    message: message || 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Too many requests, please try again later.',
        retryAfter: Math.round(windowMs / 1000)
      });
    }
  });
};

// Specific rate limiters
export const authRateLimit = createRateLimiter(15 * 60 * 1000, 5, 'Too many authentication attempts');
export const apiRateLimit = createRateLimiter(15 * 60 * 1000, 100, 'API rate limit exceeded');
export const checkoutRateLimit = createRateLimiter(5 * 60 * 1000, 3, 'Too many checkout attempts');
export const passwordResetRateLimit = createRateLimiter(60 * 60 * 1000, 3, 'Too many password reset attempts');

// Input Validation and Sanitization
export const validateEmail = body('email')
  .isEmail()
  .normalizeEmail()
  .withMessage('Please provide a valid email address')
  .custom(async (email: string) => {
    // Check for disposable email domains
    const disposableDomains = ['10minutemail.com', 'tempmail.org', 'guerrillamail.com'];
    const domain = email.split('@')[1];
    if (disposableDomains.includes(domain)) {
      throw new Error('Disposable email addresses are not allowed');
    }
    return true;
  });

export const validatePassword = body('password')
  .isLength({ min: 8, max: 128 })
  .withMessage('Password must be between 8 and 128 characters')
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  .withMessage('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character');

export const validateName = body('name')
  .trim()
  .isLength({ min: 1, max: 100 })
  .withMessage('Name must be between 1 and 100 characters')
  .matches(/^[a-zA-Z\s'-]+$/)
  .withMessage('Name can only contain letters, spaces, hyphens, and apostrophes');

export const validateProductId = body('productId')
  .trim()
  .matches(/^[a-zA-Z0-9-_]+$/)
  .withMessage('Invalid product ID format')
  .isLength({ max: 50 })
  .withMessage('Product ID too long');

export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Sanitize common fields
  const fieldsToSanitize = ['name', 'email', 'message', 'description', 'title'];
  
  fieldsToSanitize.forEach(field => {
    if (req.body[field]) {
      // Remove HTML tags and potentially dangerous characters
      req.body[field] = req.body[field]
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/[<>'"]/g, '') // Remove dangerous characters
        .trim();
    }
  });
  
  next();
};

// Validation error handler
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

// SQL Injection Protection (for raw queries)
export const sanitizeQuery = (query: string): string => {
  // Remove dangerous SQL keywords and characters
  const dangerousPatterns = [
    /(\b(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE|EXEC|EXECUTE|UNION|SELECT)\b)/gi,
    /(--|\/\*|\*\/|;|'|")/g,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi
  ];
  
  let sanitized = query;
  dangerousPatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });
  
  return sanitized.trim();
};

// XSS Protection
export const escapeHtml = (unsafe: string): string => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// CSRF Protection
export const csrfToken = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session) {
    return res.status(500).json({ error: 'Session not configured' });
  }
  
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  
  res.locals.csrfToken = req.session.csrfToken;
  next();
};

export const validateCSRF = (req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'GET') return next();
  
  const token = req.body._csrf || req.headers['x-csrf-token'];
  const sessionToken = req.session?.csrfToken;
  
  if (!token || !sessionToken || token !== sessionToken) {
    return res.status(403).json({ 
      error: 'Invalid CSRF token',
      message: 'Request could not be validated'
    });
  }
  
  next();
};

// Multi-Factor Authentication
export class MFAService {
  // Generate MFA secret for user
  static generateMFASecret(userEmail: string): { secret: string; qrCodeUrl: string } {
    const secret = speakeasy.generateSecret({
      name: `ICEPACA (${userEmail})`,
      issuer: 'ICEPACA',
      length: 32
    });
    
    return {
      secret: secret.base32,
      qrCodeUrl: secret.otpauth_url || ''
    };
  }
  
  // Verify MFA token
  static verifyMFAToken(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2 // Allow 2 steps of time drift
    });
  }
  
  // Generate backup codes
  static generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }
  
  // Verify backup code
  static async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    try {
      const user = await User.findById(userId);
      if (!user || !user.security?.backupCodes) return false;
      
      const codeIndex = user.security.backupCodes.indexOf(code);
      if (codeIndex === -1) return false;
      
      // Remove used backup code
      user.security.backupCodes.splice(codeIndex, 1);
      await user.save();
      
      return true;
    } catch (error) {
      console.error('Error verifying backup code:', error);
      return false;
    }
  }
}

// Zero-Trust Authentication Middleware
export const zeroTrustAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No authentication token provided' });
    }
    
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
    const user = await User.findById(decoded.userId).select('+security');
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    // Check if user account is active
    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is disabled' });
    }
    
    // Check for suspicious activity
    const now = new Date();
    const lastLogin = user.security?.lastLoginAt;
    
    if (lastLogin) {
      const timeDiff = now.getTime() - lastLogin.getTime();
      const hoursDiff = timeDiff / (1000 * 60 * 60);
      
      // If login from different IP and more than 24 hours since last login, require MFA
      const clientIP = req.ip || req.connection.remoteAddress;
      const lastIP = user.security?.lastLoginIP;
      
      if (hoursDiff > 24 || (lastIP && lastIP !== clientIP)) {
        if (!user.security?.mfaEnabled) {
          // Require MFA setup
          return res.status(403).json({ 
            error: 'MFA required',
            message: 'Please set up multi-factor authentication',
            requireMFA: true
          });
        }
        
        // Check for MFA token in request
        const mfaToken = req.headers['x-mfa-token'];
        if (!mfaToken || !MFAService.verifyMFAToken(user.security.mfaSecret, mfaToken as string)) {
          return res.status(403).json({
            error: 'MFA verification required',
            message: 'Please provide valid MFA token',
            requireMFAVerification: true
          });
        }
      }
    }
    
    // Update login information
    user.security = {
      ...user.security,
      lastLoginAt: now,
      lastLoginIP: req.ip || req.connection.remoteAddress || '',
      loginAttempts: 0
    };
    await user.save();
    
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid authentication token' });
    }
    
    console.error('Zero-trust auth error:', error);
    return res.status(500).json({ error: 'Authentication service error' });
  }
};

// Brute Force Protection
export const bruteForceProtection = async (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.body;
  
  if (!email) return next();
  
  try {
    const user = await User.findOne({ email }).select('+security');
    
    if (user && user.security?.loginAttempts && user.security.loginAttempts >= 5) {
      const lockTime = user.security.lockUntil;
      
      if (lockTime && lockTime > new Date()) {
        const remainingTime = Math.ceil((lockTime.getTime() - Date.now()) / 1000 / 60);
        return res.status(423).json({
          error: 'Account temporarily locked',
          message: `Account is locked due to multiple failed login attempts. Try again in ${remainingTime} minutes.`,
          lockRemainingMinutes: remainingTime
        });
      }
      
      // Reset if lock time has expired
      if (lockTime && lockTime <= new Date()) {
        user.security.loginAttempts = 0;
        user.security.lockUntil = undefined;
        await user.save();
      }
    }
    
    next();
  } catch (error) {
    console.error('Brute force protection error:', error);
    next();
  }
};

// Log failed login attempts
export const logFailedLogin = async (email: string) => {
  try {
    const user = await User.findOne({ email }).select('+security');
    
    if (user) {
      user.security = user.security || {};
      user.security.loginAttempts = (user.security.loginAttempts || 0) + 1;
      
      // Lock account after 5 failed attempts for 30 minutes
      if (user.security.loginAttempts >= 5) {
        user.security.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
      }
      
      await user.save();
    }
  } catch (error) {
    console.error('Error logging failed login:', error);
  }
};

// Security audit logging
export const auditLog = (action: string, userId?: string, details?: any) => {
  const logEntry = {
    timestamp: new Date(),
    action,
    userId: userId || 'anonymous',
    details,
    ip: 'req.ip', // Would be populated from middleware
    userAgent: 'req.userAgent'
  };
  
  // In production, send to secure logging service
  console.log('AUDIT:', JSON.stringify(logEntry));
};

// File Upload Security
export const secureFileUpload = (req: Request, res: Response, next: NextFunction) => {
  if (!req.file) return next();
  
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
  const maxSize = 5 * 1024 * 1024; // 5MB
  
  if (!allowedTypes.includes(req.file.mimetype)) {
    return res.status(400).json({
      error: 'Invalid file type',
      message: 'Only JPEG, PNG, WebP images and PDF files are allowed'
    });
  }
  
  if (req.file.size > maxSize) {
    return res.status(400).json({
      error: 'File too large',
      message: 'File size must be less than 5MB'
    });
  }
  
  // Scan filename for dangerous patterns
  const dangerousPatterns = /\.(php|js|exe|bat|cmd|sh|py)$/i;
  if (dangerousPatterns.test(req.file.originalname)) {
    return res.status(400).json({
      error: 'Dangerous file type',
      message: 'File type not allowed for security reasons'
    });
  }
  
  next();
};

export default {
  enforceHTTPS,
  securityHeaders,
  createRateLimiter,
  authRateLimit,
  apiRateLimit,
  checkoutRateLimit,
  passwordResetRateLimit,
  validateEmail,
  validatePassword,
  validateName,
  validateProductId,
  sanitizeInput,
  handleValidationErrors,
  sanitizeQuery,
  escapeHtml,
  csrfToken,
  validateCSRF,
  MFAService,
  zeroTrustAuth,
  bruteForceProtection,
  logFailedLogin,
  auditLog,
  secureFileUpload
};