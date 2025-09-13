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
import expressAsyncHandler from 'express-async-handler';

const router = express.Router();

// Public routes (no authentication required)

// Login
router.post('/login', 
  authRateLimit(5, 15 * 60 * 1000), // 5 attempts per 15 minutes
  validateAuth(validateLogin),
  expressAsyncHandler(async (req, res, next) => {
    const result = await AuthMediator.login(req.body);
    res.json({
      success: true,
      message: 'Login successful',
      data: result
    });
  })
);

// Register (only for admin or if no users exist)
router.post('/register',
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

// Update current user profile
router.put('/profile',
  authenticate,
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
  adminOnly,
  validateAuth(validateUpdateUserRole),
  expressAsyncHandler(async (req, res, next) => {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
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
  adminOnly,
  validateAuth(validateUpdateProfile),
  expressAsyncHandler(async (req, res, next) => {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
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
  adminOnly,
  expressAsyncHandler(async (req, res, next) => {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
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
  adminOnly,
  expressAsyncHandler(async (req, res, next) => {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
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
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }
    
    const user = await AuthMediator.getUserProfile(userId);
    return res.json({
      success: true,
      message: 'User retrieved successfully',
      data: user
    });
  })
);

export default router;
