import { Request, Response, NextFunction } from 'express';
import { AuthMediator } from '@/mediators/auth/AuthMediator';
import { createError } from '@/utils/responseHelper';
import { UserRole } from '@/types/auth';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        user_id: number;
        username: string;
        role: UserRole;
      };
    }
  }
}

// Authentication middleware
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw createError('Access token required', 401);
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token) {
      throw createError('Access token required', 401);
    }
    
    // Verify token
    const payload = AuthMediator.verifyToken(token);
    
    // Add user info to request
    req.user = {
      user_id: payload.user_id,
      username: payload.username,
      role: payload.role
    };
    
    next();
  } catch (error) {
    next(error);
  }
};

// Role-based authorization middleware
export const authorize = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(createError('Authentication required', 401));
    }
    
    if (!roles.includes(req.user.role)) {
      return next(createError('Insufficient permissions', 403));
    }
    
    next();
  };
};

// Admin only middleware
export const adminOnly = authorize(UserRole.ADMIN);

// Manager and above middleware
export const managerAndAbove = authorize(UserRole.ADMIN, UserRole.MANAGER);

// Employee and above middleware
export const employeeAndAbove = authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.EMPLOYEE);

// Optional authentication middleware (doesn't throw error if no token)
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      if (token) {
        try {
          const payload = AuthMediator.verifyToken(token);
          req.user = {
            user_id: payload.user_id,
            username: payload.username,
            role: payload.role
          };
        } catch (error) {
          // Token is invalid, but we don't throw error for optional auth
          req.user = undefined;
        }
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

// Check if user owns resource or is admin
export const ownerOrAdmin = (getUserId: (req: Request) => number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(createError('Authentication required', 401));
    }
    
    const resourceUserId = getUserId(req);
    
    if (req.user.user_id !== resourceUserId && req.user.role !== UserRole.ADMIN) {
      return next(createError('Access denied', 403));
    }
    
    next();
  };
};

// Rate limiting for authentication endpoints
export const authRateLimit = (maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000) => {
  const attempts = new Map<string, { count: number; resetTime: number }>();
  
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip + ':' + (req.body.username || req.body.email || 'unknown');
    const now = Date.now();
    
    const attempt = attempts.get(key);
    
    if (!attempt || now > attempt.resetTime) {
      attempts.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    if (attempt.count >= maxAttempts) {
      return next(createError('Too many authentication attempts. Please try again later.', 429));
    }
    
    attempt.count++;
    next();
  };
};

