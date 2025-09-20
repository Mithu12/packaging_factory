import express from 'express';
import { AuthMediator } from '@/mediators/auth/AuthMediator';
import { authenticate, adminOnly, managerAndAbove } from '@/middleware/auth';
import { 
  validateAuth, 
  validateLogin, 
  validateRegister, 
  validateChangePassword, 
  validateUpdateProfile,
  validateUpdateUserRole,
  validatePasswordResetRequest,
  validatePasswordResetConfirm
} from '@/validation/authValidation';
import { authRateLimit } from '@/middleware/auth';
import { auditMiddleware } from '@/middleware/audit';
import expressAsyncHandler from 'express-async-handler';
import { createError } from '@/utils/responseHelper';

const router = express.Router();

// Public routes (no authentication required)

// Login
router.post('/login', 
  authRateLimit(5, 15 * 60 * 1000), // 5 attempts per 15 minutes
  auditMiddleware,
  validateAuth(validateLogin),
  expressAsyncHandler(async (req, res, next) => {
    const result = await AuthMediator.login(req.body);
    
    // Set HTTP-only cookie with the token
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: false, // Set to false for development/IP access, true for HTTPS production
      sameSite: 'lax' as const, // Changed from 'strict' to 'lax' for cross-origin requests
      maxAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
      path: '/',
      domain: undefined // Don't set domain for IP address access
    };
    
    // Log cookie setting for debugging
    console.log('🍪 Setting cookie with options:', cookieOptions);
    console.log('🌐 Request origin:', req.headers.origin);
    console.log('🔗 Request host:', req.headers.host);
    
    res.cookie('authToken', result.token, cookieOptions);
    
    // Remove token from response for security
    const { token, ...responseData } = result;
    
    res.json({
      success: true,
      message: 'Login successful',
      data: responseData
    });
  })
);

// Logout
router.post('/logout',
  auditMiddleware,
  expressAsyncHandler(async (req, res, next) => {
    // Clear the auth cookie
    res.clearCookie('authToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });
    
    res.json({
      success: true,
      message: 'Logout successful'
    });
  })
);

// Register (only for admin or if no users exist)
router.post('/register',
  auditMiddleware,
  validateAuth(validateRegister),
  expressAsyncHandler(async (req, res, next) => {
    const result = await AuthMediator.register(req.body);
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: result
    });
  })
);

// Password reset request
router.post('/forgot-password',
  auditMiddleware,
  validateAuth(validatePasswordResetRequest),
  expressAsyncHandler(async (req, res, next) => {
    await AuthMediator.generatePasswordResetToken(req.body.email);
    res.json({
      success: true,
      message: 'If the email exists, a password reset link has been sent'
    });
  })
);

// Password reset confirm
router.post('/reset-password',
  auditMiddleware,
  validateAuth(validatePasswordResetConfirm),
  expressAsyncHandler(async (req, res, next) => {
    await AuthMediator.resetPasswordWithToken(req.body.token, req.body.new_password);
    res.json({
      success: true,
      message: 'Password reset successful'
    });
  })
);

// Protected routes (authentication required)

// Get current user profile
router.get('/profile',
  authenticate,
  expressAsyncHandler(async (req, res, next) => {
    const user = await AuthMediator.getUserProfile(req.user!.user_id);
    res.json({
      success: true,
      message: 'Profile retrieved successfully',
      data: user
    });
  })
);

// Get current user profile with permissions (for frontend RBAC)
router.get('/profile/permissions',
  authenticate,
  expressAsyncHandler(async (req, res, next) => {
    const userId = req.user!.user_id;
    const userWithPermissions = await AuthMediator.getUserWithPermissions(userId);
    res.json({
      success: true,
      message: 'User profile with permissions retrieved successfully',
      data: userWithPermissions
    });
  })
);

// Check single permission (for frontend RBAC)
router.post('/check-permission',
  authenticate,
  expressAsyncHandler(async (req, res, next) => {
    const userId = req.user!.user_id;
    const { module, action, resource } = req.body;
    
    if (!module || !action || !resource) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: module, action, resource'
      });
      return;
    }

    const hasPermission = await AuthMediator.hasPermission(userId, { module, action, resource });
    res.json({
      success: true,
      message: 'Permission check completed',
      data: { hasPermission }
    });
  })
);

// Check multiple permissions (for frontend RBAC)
router.post('/check-any-permission',
  authenticate,
  expressAsyncHandler(async (req, res, next) => {
    const userId = req.user!.user_id;
    const { permissions } = req.body;
    
    if (!permissions || !Array.isArray(permissions)) {
      res.status(400).json({
        success: false,
        message: 'Missing required field: permissions (array)'
      });
      return;
    }

    const hasPermission = await AuthMediator.hasAnyPermission(userId, permissions);
    res.json({
      success: true,
      message: 'Permission check completed',
      data: { hasPermission }
    });
  })
);

// Update current user profile
router.put('/profile',
  authenticate,
  auditMiddleware,
  validateAuth(validateUpdateProfile),
  expressAsyncHandler(async (req, res, next) => {
    const user = await AuthMediator.updateProfile(req.user!.user_id, req.body);
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  })
);

// Change password
router.put('/change-password',
  authenticate,
  auditMiddleware,
  validateAuth(validateChangePassword),
  expressAsyncHandler(async (req, res, next) => {
    await AuthMediator.changePassword(req.user!.user_id, req.body);
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  })
);

// Admin routes

// Get all users (admin only)
router.get('/users',
  authenticate,
  adminOnly,
  expressAsyncHandler(async (req, res, next) => {
    const users = await AuthMediator.getAllUsers();
    res.json({
      success: true,
      message: 'Users retrieved successfully',
      data: users
    });
  })
);

// Update user role (admin only)
router.put('/users/:id/role',
  authenticate,
  auditMiddleware,
  adminOnly,
  validateAuth(validateUpdateUserRole),
  expressAsyncHandler(async (req, res, next) => {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      throw createError('Invalid user ID', 400);
    }
    
    const user = await AuthMediator.updateUserRole(userId, req.body.role);
    res.json({
      success: true,
      message: 'User role updated successfully',
      data: user
    });
  })
);

// Update user profile (admin only)
router.put('/users/:id',
  authenticate,
  auditMiddleware,
  adminOnly,
  validateAuth(validateUpdateProfile),
  expressAsyncHandler(async (req, res, next) => {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      throw createError('Invalid user ID', 400);
    }
    
    const user = await AuthMediator.updateProfile(userId, req.body);
    res.json({
      success: true,
      message: 'User profile updated successfully',
      data: user
    });
  })
);

// Deactivate user (admin only)
router.delete('/users/:id',
  authenticate,
  auditMiddleware,
  adminOnly,
  expressAsyncHandler(async (req, res, next) => {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      throw createError('Invalid user ID', 400);
    }
    
    await AuthMediator.deactivateUser(userId);
    res.json({
      success: true,
      message: 'User deactivated successfully'
    });
  })
);

// Reactivate user (admin only)
router.patch('/users/:id/reactivate',
  authenticate,
  auditMiddleware,
  adminOnly,
  expressAsyncHandler(async (req, res, next) => {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      throw createError('Invalid user ID', 400);
    }
    
    const user = await AuthMediator.reactivateUser(userId);
    res.json({
      success: true,
      message: 'User reactivated successfully',
      data: user
    });
  })
);

// Manager routes

// Get user by ID (manager and above)
router.get('/users/:id',
  authenticate,
  managerAndAbove,
  expressAsyncHandler(async (req, res, next) => {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      throw createError('Invalid user ID', 400);
    }
    
    const user = await AuthMediator.getUserProfile(userId);
    res.json({
      success: true,
      message: 'User retrieved successfully',
      data: user
    });
  })
);

export default router;
