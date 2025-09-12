import Joi from 'joi';
import { UserRole } from '@/types/auth';

// Login validation schema
export const validateLogin = Joi.object({
  username: Joi.string()
    .min(3)
    .max(50)
    .required()
    .messages({
      'string.min': 'Username must be at least 3 characters long',
      'string.max': 'Username must not exceed 50 characters',
      'any.required': 'Username is required'
    }),
  password: Joi.string()
    .min(6)
    .required()
    .messages({
      'string.min': 'Password must be at least 6 characters long',
      'any.required': 'Password is required'
    })
});

// Registration validation schema
export const validateRegister = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(50)
    .required()
    .messages({
      'string.alphanum': 'Username must contain only alphanumeric characters',
      'string.min': 'Username must be at least 3 characters long',
      'string.max': 'Username must not exceed 50 characters',
      'any.required': 'Username is required'
    }),
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  password: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
      'any.required': 'Password is required'
    }),
  full_name: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Full name must be at least 2 characters long',
      'string.max': 'Full name must not exceed 100 characters',
      'any.required': 'Full name is required'
    }),
  role: Joi.string()
    .valid(...Object.values(UserRole))
    .optional()
    .messages({
      'any.only': 'Role must be one of: admin, manager, employee, viewer'
    })
});

// Change password validation schema
export const validateChangePassword = Joi.object({
  current_password: Joi.string()
    .required()
    .messages({
      'any.required': 'Current password is required'
    }),
  new_password: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
    .required()
    .messages({
      'string.min': 'New password must be at least 8 characters long',
      'string.pattern.base': 'New password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
      'any.required': 'New password is required'
    })
});

// Update profile validation schema
export const validateUpdateProfile = Joi.object({
  full_name: Joi.string()
    .min(2)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Full name must be at least 2 characters long',
      'string.max': 'Full name must not exceed 100 characters'
    }),
  email: Joi.string()
    .email()
    .optional()
    .messages({
      'string.email': 'Please provide a valid email address'
    })
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

// Update user role validation schema (admin only)
export const validateUpdateUserRole = Joi.object({
  role: Joi.string()
    .valid(...Object.values(UserRole))
    .required()
    .messages({
      'any.only': 'Role must be one of: admin, manager, employee, viewer',
      'any.required': 'Role is required'
    })
});

// Password reset request validation schema
export const validatePasswordResetRequest = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    })
});

// Password reset confirm validation schema
export const validatePasswordResetConfirm = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'any.required': 'Reset token is required'
    }),
  new_password: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
    .required()
    .messages({
      'string.min': 'New password must be at least 8 characters long',
      'string.pattern.base': 'New password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
      'any.required': 'New password is required'
    })
});

// Generic validation middleware
export const validateAuth = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }
    next();
  };
};

