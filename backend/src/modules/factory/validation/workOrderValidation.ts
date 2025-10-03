import Joi from 'joi';

// Work order status validation schema
export const workOrderStatusSchema = Joi.string().valid(
  'draft',
  'planned',
  'released',
  'in_progress',
  'completed',
  'on_hold',
  'cancelled'
).required();

// Work order priority validation schema
export const workOrderPrioritySchema = Joi.string().valid(
  'low',
  'medium',
  'high',
  'urgent'
).required();

// Skill level validation schema
export const skillLevelSchema = Joi.string().valid(
  'beginner',
  'intermediate',
  'expert',
  'master'
).required();

// Availability status validation schema
export const availabilityStatusSchema = Joi.string().valid(
  'available',
  'busy',
  'off_duty',
  'on_leave'
).required();

// Production line status validation schema
export const productionLineStatusSchema = Joi.string().valid(
  'available',
  'busy',
  'maintenance',
  'offline'
).required();

// Create work order validation schema
export const createWorkOrderSchema = Joi.object({
  customer_order_id: Joi.string().uuid().optional(),
  product_id: Joi.string().uuid().required(),
  quantity: Joi.number().positive().precision(3).required(),
  deadline: Joi.date().iso().greater('now').required(),
  priority: workOrderPrioritySchema,
  estimated_hours: Joi.number().positive().precision(2).required(),
  production_line_id: Joi.string().uuid().optional(),
  assigned_operators: Joi.array().items(Joi.string().uuid()).optional(),
  notes: Joi.string().max(2000).optional().allow(''),
  specifications: Joi.string().max(2000).optional().allow(''),
});

// Update work order validation schema
export const updateWorkOrderSchema = Joi.object({
  quantity: Joi.number().positive().precision(3).optional(),
  deadline: Joi.date().iso().greater('now').optional(),
  priority: workOrderPrioritySchema.optional(),
  estimated_hours: Joi.number().positive().precision(2).optional(),
  production_line_id: Joi.string().uuid().optional(),
  assigned_operators: Joi.array().items(Joi.string().uuid()).optional(),
  notes: Joi.string().max(2000).optional().allow(''),
  specifications: Joi.string().max(2000).optional().allow(''),
  progress: Joi.number().min(0).max(100).precision(2).optional(),
  actual_hours: Joi.number().min(0).precision(2).optional(),
});

// Update work order status validation schema
export const updateWorkOrderStatusSchema = Joi.object({
  status: workOrderStatusSchema,
  notes: Joi.string().max(1000).optional().allow(''),
});

// Work order query validation schema
export const workOrderQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  search: Joi.string().max(255).optional().allow(''),
  status: workOrderStatusSchema.optional(),
  priority: workOrderPrioritySchema.optional(),
  production_line_id: Joi.string().uuid().optional(),
  assigned_operator_id: Joi.string().uuid().optional(),
  customer_order_id: Joi.string().uuid().optional(),
  created_date_from: Joi.date().iso().optional(),
  created_date_to: Joi.date().iso().optional(),
  deadline_from: Joi.date().iso().optional(),
  deadline_to: Joi.date().iso().optional(),
  sort_by: Joi.string().valid('created_at', 'deadline', 'priority', 'status', 'progress').optional(),
  sort_order: Joi.string().valid('asc', 'desc').optional(),
});

// Work order ID validation schema
export const workOrderIdSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

// Bulk update work order status validation schema
export const bulkUpdateWorkOrderStatusSchema = Joi.object({
  work_order_ids: Joi.array().items(Joi.string().uuid()).min(1).required(),
  status: workOrderStatusSchema,
  notes: Joi.string().max(1000).optional().allow(''),
});

// Create production line validation schema
export const createProductionLineSchema = Joi.object({
  name: Joi.string().max(255).required(),
  code: Joi.string().max(50).required(),
  description: Joi.string().max(1000).optional().allow(''),
  capacity: Joi.number().positive().precision(2).required(),
  location: Joi.string().max(255).optional().allow(''),
});

// Update production line validation schema
export const updateProductionLineSchema = Joi.object({
  name: Joi.string().max(255).optional(),
  code: Joi.string().max(50).optional(),
  description: Joi.string().max(1000).optional().allow(''),
  capacity: Joi.number().positive().precision(2).optional(),
  location: Joi.string().max(255).optional().allow(''),
  status: productionLineStatusSchema.optional(),
  is_active: Joi.boolean().optional(),
});

// Create operator validation schema
export const createOperatorSchema = Joi.object({
  employee_id: Joi.string().max(50).required(),
  name: Joi.string().max(255).required(),
  skill_level: skillLevelSchema,
  department: Joi.string().max(100).optional().allow(''),
  hourly_rate: Joi.number().min(0).precision(2).optional(),
});

// Update operator validation schema
export const updateOperatorSchema = Joi.object({
  employee_id: Joi.string().max(50).optional(),
  name: Joi.string().max(255).optional(),
  skill_level: skillLevelSchema.optional(),
  department: Joi.string().max(100).optional().allow(''),
  availability_status: availabilityStatusSchema.optional(),
  hourly_rate: Joi.number().min(0).precision(2).optional(),
  is_active: Joi.boolean().optional(),
});

// Work order assignment validation schema
export const createWorkOrderAssignmentSchema = Joi.object({
  work_order_id: Joi.string().uuid().required(),
  production_line_id: Joi.string().uuid().required(),
  operator_ids: Joi.array().items(Joi.string().uuid()).min(1).required(),
  estimated_start_time: Joi.date().iso().optional(),
  notes: Joi.string().max(1000).optional().allow(''),
});

// Update work order assignment validation schema
export const updateWorkOrderAssignmentSchema = Joi.object({
  operator_ids: Joi.array().items(Joi.string().uuid()).min(1).optional(),
  estimated_start_time: Joi.date().iso().optional(),
  actual_start_time: Joi.date().iso().optional(),
  estimated_completion_time: Joi.date().iso().optional(),
  actual_completion_time: Joi.date().iso().optional(),
  notes: Joi.string().max(1000).optional().allow(''),
});

// Custom validation for work order status transitions
export const workOrderTransitionSchema = Joi.object({
  status: workOrderStatusSchema,
  notes: Joi.string().max(1000).optional().allow(''),
}).custom((value, helpers) => {
  // Additional business logic validation can be added here
  // For example, validating that completed work orders can't be moved back to in_progress
  return value;
}, 'Work order transition validation');
