import Joi from 'joi';

// ==================== ROLE VALIDATION SCHEMAS ====================

export const createRoleSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .pattern(/^[a-z_]+$/)
    .required()
    .messages({
      'string.min': 'Role name must be at least 2 characters long',
      'string.max': 'Role name must not exceed 100 characters',
      'string.pattern.base': 'Role name must contain only lowercase letters and underscores',
      'any.required': 'Role name is required'
    }),
  display_name: Joi.string()
    .min(2)
    .max(200)
    .required()
    .messages({
      'string.min': 'Display name must be at least 2 characters long',
      'string.max': 'Display name must not exceed 200 characters',
      'any.required': 'Display name is required'
    }),
  description: Joi.string()
    .max(500)
    .optional()
    .allow('', null)
    .messages({
      'string.max': 'Description must not exceed 500 characters'
    }),
  level: Joi.number()
    .integer()
    .min(1)
    .max(10)
    .required()
    .messages({
      'number.min': 'Role level must be at least 1',
      'number.max': 'Role level must not exceed 10',
      'any.required': 'Role level is required'
    }),
  department: Joi.string()
    .max(100)
    .optional()
    .allow('', null)
    .messages({
      'string.max': 'Department must not exceed 100 characters'
    }),
  permission_ids: Joi.array()
    .items(Joi.number().integer().positive())
    .optional()
    .messages({
      'array.items': 'Permission IDs must be positive integers'
    })
});

export const updateRoleSchema = Joi.object({
  display_name: Joi.string()
    .min(2)
    .max(200)
    .optional()
    .messages({
      'string.min': 'Display name must be at least 2 characters long',
      'string.max': 'Display name must not exceed 200 characters'
    }),
  description: Joi.string()
    .max(500)
    .optional()
    .allow('', null)
    .messages({
      'string.max': 'Description must not exceed 500 characters'
    }),
  level: Joi.number()
    .integer()
    .min(1)
    .max(10)
    .optional()
    .messages({
      'number.min': 'Role level must be at least 1',
      'number.max': 'Role level must not exceed 10'
    }),
  department: Joi.string()
    .max(100)
    .optional()
    .allow('', null)
    .messages({
      'string.max': 'Department must not exceed 100 characters'
    }),
  is_active: Joi.boolean()
    .optional()
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

// ==================== PERMISSION VALIDATION SCHEMAS ====================

export const createPermissionSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .pattern(/^[a-z_\.]+$/)
    .required()
    .messages({
      'string.min': 'Permission name must be at least 2 characters long',
      'string.max': 'Permission name must not exceed 100 characters',
      'string.pattern.base': 'Permission name must contain only lowercase letters, underscores, and dots',
      'any.required': 'Permission name is required'
    }),
  display_name: Joi.string()
    .min(2)
    .max(200)
    .required()
    .messages({
      'string.min': 'Display name must be at least 2 characters long',
      'string.max': 'Display name must not exceed 200 characters',
      'any.required': 'Display name is required'
    }),
  description: Joi.string()
    .max(500)
    .optional()
    .allow('', null)
    .messages({
      'string.max': 'Description must not exceed 500 characters'
    }),
  module: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Module must be at least 2 characters long',
      'string.max': 'Module must not exceed 100 characters',
      'any.required': 'Module is required'
    }),
  action: Joi.string()
    .valid('create', 'read', 'update', 'delete', 'approve', 'reject', 'assign', 'track', 'manage', 'export', 'import')
    .required()
    .messages({
      'any.only': 'Action must be one of: create, read, update, delete, approve, reject, assign, track, manage, export, import',
      'any.required': 'Action is required'
    }),
  resource: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Resource must be at least 2 characters long',
      'string.max': 'Resource must not exceed 100 characters',
      'any.required': 'Resource is required'
    })
});

export const updatePermissionSchema = Joi.object({
  display_name: Joi.string()
    .min(2)
    .max(200)
    .optional()
    .messages({
      'string.min': 'Display name must be at least 2 characters long',
      'string.max': 'Display name must not exceed 200 characters'
    }),
  description: Joi.string()
    .max(500)
    .optional()
    .allow('', null)
    .messages({
      'string.max': 'Description must not exceed 500 characters'
    })
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

// ==================== ROLE-PERMISSION ASSIGNMENT SCHEMAS ====================

export const assignRolePermissionsSchema = Joi.object({
  permission_ids: Joi.array()
    .items(Joi.number().integer().positive())
    .min(1)
    .required()
    .messages({
      'array.items': 'Permission IDs must be positive integers',
      'array.min': 'At least one permission ID is required',
      'any.required': 'Permission IDs are required'
    })
});

export const removeRolePermissionsSchema = Joi.object({
  permission_ids: Joi.array()
    .items(Joi.number().integer().positive())
    .min(1)
    .required()
    .messages({
      'array.items': 'Permission IDs must be positive integers',
      'array.min': 'At least one permission ID is required',
      'any.required': 'Permission IDs are required'
    })
});

// ==================== USER-PERMISSION ASSIGNMENT SCHEMAS ====================

export const assignUserPermissionsSchema = Joi.object({
  user_id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.positive': 'User ID must be a positive integer',
      'any.required': 'User ID is required'
    }),
  permission_ids: Joi.array()
    .items(Joi.number().integer().positive())
    .min(1)
    .required()
    .messages({
      'array.items': 'Permission IDs must be positive integers',
      'array.min': 'At least one permission ID is required',
      'any.required': 'Permission IDs are required'
    }),
  expires_at: Joi.string()
    .isoDate()
    .optional()
    .messages({
      'string.isoDate': 'Expiration date must be a valid ISO date'
    })
});

export const removeUserPermissionsSchema = Joi.object({
  user_id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.positive': 'User ID must be a positive integer',
      'any.required': 'User ID is required'
    }),
  permission_ids: Joi.array()
    .items(Joi.number().integer().positive())
    .min(1)
    .required()
    .messages({
      'array.items': 'Permission IDs must be positive integers',
      'array.min': 'At least one permission ID is required',
      'any.required': 'Permission IDs are required'
    })
});

export const updateUserRoleSchema = Joi.object({
  role_id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.positive': 'Role ID must be a positive integer',
      'any.required': 'Role ID is required'
    })
});

// ==================== PERMISSION CHECK SCHEMAS ====================

export const checkPermissionSchema = Joi.object({
  module: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Module must be at least 2 characters long',
      'string.max': 'Module must not exceed 100 characters',
      'any.required': 'Module is required'
    }),
  action: Joi.string()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.min': 'Action must be at least 2 characters long',
      'string.max': 'Action must not exceed 50 characters',
      'any.required': 'Action is required'
    }),
  resource: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Resource must be at least 2 characters long',
      'string.max': 'Resource must not exceed 100 characters',
      'any.required': 'Resource is required'
    })
});

export const checkMultiplePermissionsSchema = Joi.object({
  permissions: Joi.array()
    .items(checkPermissionSchema)
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one permission check is required',
      'any.required': 'Permissions array is required'
    })
});

// ==================== QUERY VALIDATION SCHEMAS ====================

export const roleQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(1000).optional().default(10),
  search: Joi.string().max(100).optional(),
  department: Joi.string().max(100).optional(),
  level: Joi.number().integer().min(1).max(10).optional(),
  is_active: Joi.boolean().optional(),
  sort_by: Joi.string().valid('name', 'display_name', 'level', 'department', 'created_at').optional().default('level'),
  sort_order: Joi.string().valid('asc', 'desc').optional().default('asc')
});

export const permissionQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(1000).optional().default(10),
  search: Joi.string().max(100).optional(),
  module: Joi.string().max(100).optional(),
  action: Joi.string().max(50).optional(),
  resource: Joi.string().max(100).optional(),
  sort_by: Joi.string().valid('name', 'display_name', 'module', 'action', 'resource', 'created_at').optional().default('module'),
  sort_order: Joi.string().valid('asc', 'desc').optional().default('asc')
});

export const userPermissionQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(1000).optional().default(10),
  include_expired: Joi.boolean().optional().default(false),
  module: Joi.string().max(100).optional(),
  action: Joi.string().max(50).optional(),
  resource: Joi.string().max(100).optional()
});

// ==================== BULK OPERATIONS SCHEMAS ====================

export const bulkAssignRolePermissionsSchema = Joi.object({
  role_ids: Joi.array()
    .items(Joi.number().integer().positive())
    .min(1)
    .required()
    .messages({
      'array.items': 'Role IDs must be positive integers',
      'array.min': 'At least one role ID is required',
      'any.required': 'Role IDs are required'
    }),
  permission_ids: Joi.array()
    .items(Joi.number().integer().positive())
    .min(1)
    .required()
    .messages({
      'array.items': 'Permission IDs must be positive integers',
      'array.min': 'At least one permission ID is required',
      'any.required': 'Permission IDs are required'
    })
});

export const bulkAssignUserPermissionsSchema = Joi.object({
  user_ids: Joi.array()
    .items(Joi.number().integer().positive())
    .min(1)
    .required()
    .messages({
      'array.items': 'User IDs must be positive integers',
      'array.min': 'At least one user ID is required',
      'any.required': 'User IDs are required'
    }),
  permission_ids: Joi.array()
    .items(Joi.number().integer().positive())
    .min(1)
    .required()
    .messages({
      'array.items': 'Permission IDs must be positive integers',
      'array.min': 'At least one permission ID is required',
      'any.required': 'Permission IDs are required'
    }),
  expires_at: Joi.string()
    .isoDate()
    .optional()
    .messages({
      'string.isoDate': 'Expiration date must be a valid ISO date'
    })
});

// ==================== ROLE HIERARCHY SCHEMAS ====================

export const createRoleHierarchySchema = Joi.object({
  parent_role_id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.positive': 'Parent role ID must be a positive integer',
      'any.required': 'Parent role ID is required'
    }),
  child_role_id: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.positive': 'Child role ID must be a positive integer',
      'any.required': 'Child role ID is required'
    })
}).custom((value, helpers) => {
  if (value.parent_role_id === value.child_role_id) {
    return helpers.error('custom.sameRole');
  }
  return value;
}).messages({
  'custom.sameRole': 'Parent and child role cannot be the same'
});
