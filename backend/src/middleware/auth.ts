// Authentication middleware for JWT token verification
import { Request, Response, NextFunction } from 'express';
import AuthService from '../services/authService';
import { User } from '../models/User';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: string;
        iat: number;
        exp: number;
      };
    }
  }
}

// Middleware to authenticate JWT token
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from cookie or Authorization header
    const token = req.cookies.token || 
      (req.headers.authorization && req.headers.authorization.startsWith('Bearer ') 
        ? req.headers.authorization.substring(7) 
        : null);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    // Verify token
    const payload = AuthService.verifyToken(token);
    if (!payload) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    // Check if user still exists and is active
    const user = await User.findById(payload.userId).select('-password -twoFactorSecret -backupCodes');
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    // Attach user info to request
    req.user = payload;
    next();

  } catch (error: any) {
    console.error('Authentication error:', error);
    res.status(401).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

// Middleware to check if user has specific role
export const requireRole = (roles: string | string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userRoles = Array.isArray(roles) ? roles : [roles];
    if (!userRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Middleware for admin-only routes
export const requireAdmin = requireRole('admin');

// Middleware for moderator or admin routes
export const requireModerator = requireRole(['admin', 'moderator']);

// Optional authentication middleware (doesn't fail if no token)
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies.token || 
      (req.headers.authorization && req.headers.authorization.startsWith('Bearer ') 
        ? req.headers.authorization.substring(7) 
        : null);

    if (token) {
      const payload = AuthService.verifyToken(token);
      if (payload) {
        const user = await User.findById(payload.userId).select('-password -twoFactorSecret -backupCodes');
        if (user && user.isActive) {
          req.user = payload;
        }
      }
    }

    next();

  } catch (error: any) {
    // Continue without authentication for optional auth
    next();
  }
};

// Middleware to check if user owns the resource
export const requireOwnership = (getUserId: (req: Request) => string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const resourceUserId = getUserId(req);
      
      // Allow if user owns the resource or is admin/moderator
      if (req.user.userId === resourceUserId || 
          ['admin', 'moderator'].includes(req.user.role)) {
        next();
      } else {
        res.status(403).json({
          success: false,
          message: 'Access denied. You can only access your own resources.'
        });
      }

    } catch (error: any) {
      console.error('Ownership check error:', error);
      res.status(500).json({
        success: false,
        message: 'Authorization check failed'
      });
    }
  };
};

// Rate limiting middleware for authentication endpoints
export const authRateLimit = (windowMs: number = 15 * 60 * 1000, max: number = 5) => {
  const attempts = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    
    // Clean up old entries
    for (const [key, value] of attempts.entries()) {
      if (now > value.resetTime) {
        attempts.delete(key);
      }
    }

    const current = attempts.get(ip);
    
    if (!current) {
      attempts.set(ip, { count: 1, resetTime: now + windowMs });
      next();
    } else if (current.count < max) {
      current.count++;
      next();
    } else {
      res.status(429).json({
        success: false,
        message: 'Too many authentication attempts. Please try again later.',
        retryAfter: Math.ceil((current.resetTime - now) / 1000)
      });
    }
  };
};