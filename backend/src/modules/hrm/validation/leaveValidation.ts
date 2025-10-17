import Joi from 'joi';

// Leave type validation schema
export const leaveTypeSchema = Joi.string().valid(
  'annual',
  'sick',
  'casual',
  'maternity',
  'paternity',
  'emergency',
  'unpaid',
  'other'
).required();

// Leave status validation schema
export const leaveStatusSchema = Joi.string().valid(
  'draft',
  'submitted',
  'approved',
  'rejected',
  'cancelled'
).required();

// Leave application type validation schema
export const leaveApplicationTypeSchema = Joi.string().valid(
  'full_day',
  'half_day',
  'multiple_days'
).required();

// Create leave type validation schema
export const createLeaveTypeSchema = Joi.object({
  name: Joi.string().max(255).required(),
  code: Joi.string().max(50).required(),
  days_per_year: Joi.number().min(0).max(365).required(),
  max_consecutive_days: Joi.number().min(1).max(365).optional(),
  requires_approval: Joi.boolean().optional(),
  is_active: Joi.boolean().optional(),
  description: Joi.string().max(1000).optional().allow(''),
});

// Update leave type validation schema
export const updateLeaveTypeSchema = Joi.object({
  name: Joi.string().max(255).optional(),
  code: Joi.string().max(50).optional(),
  days_per_year: Joi.number().min(0).max(365).optional(),
  max_consecutive_days: Joi.number().min(1).max(365).optional(),
  requires_approval: Joi.boolean().optional(),
  is_active: Joi.boolean().optional(),
  description: Joi.string().max(1000).optional().allow(''),
});

// Create leave application validation schema
export const createLeaveApplicationSchema = Joi.object({
  employee_id: Joi.number().required(),
  leave_type_id: Joi.number().required(),
  start_date: Joi.date().iso().required(),
  end_date: Joi.date().iso().min(Joi.ref('start_date')).required(),
  application_type: leaveApplicationTypeSchema,
  reason: Joi.string().max(1000).required(),
  contact_number: Joi.string().max(20).optional(),
  emergency_contact: Joi.string().max(200).optional(),
});

// Update leave application validation schema
export const updateLeaveApplicationSchema = Joi.object({
  start_date: Joi.date().iso().optional(),
  end_date: Joi.date().iso().optional(),
  application_type: leaveApplicationTypeSchema.optional(),
  reason: Joi.string().max(1000).optional(),
  contact_number: Joi.string().max(20).optional(),
  emergency_contact: Joi.string().max(200).optional(),
});

// Process leave application validation schema (for approval/rejection)
export const processLeaveApplicationSchema = Joi.object({
  application_id: Joi.number().required(),
  action: Joi.string().valid('approve', 'reject').required(),
  processed_by: Joi.number().optional(),
  notes: Joi.string().max(1000).optional().allow(''),
});

// Leave balance query validation schema
export const leaveBalanceQuerySchema = Joi.object({
  employee_id: Joi.number().required(),
  year: Joi.number().integer().min(2020).max(2030).optional(),
});

// Leave application query validation schema
export const leaveApplicationQuerySchema = Joi.object({
  employee_id: Joi.number().optional(),
  leave_type_id: Joi.number().optional(),
  status: leaveStatusSchema.optional(),
  start_date_from: Joi.date().iso().optional(),
  start_date_to: Joi.date().iso().optional(),
  end_date_from: Joi.date().iso().optional(),
  end_date_to: Joi.date().iso().optional(),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  sort_by: Joi.string().valid('created_at', 'start_date', 'end_date', 'status').optional(),
  sort_order: Joi.string().valid('asc', 'desc').optional(),
});

// Leave calendar query validation schema
export const leaveCalendarQuerySchema = Joi.object({
  year: Joi.number().integer().min(2020).max(2030).required(),
  month: Joi.number().integer().min(1).max(12).required(),
  department_id: Joi.number().optional(),
  employee_id: Joi.number().optional(),
});

// Bulk leave operations validation schema
export const bulkLeaveOperationSchema = Joi.object({
  application_ids: Joi.array().items(Joi.number()).min(1).required(),
  action: Joi.string().valid('approve', 'reject', 'cancel').required(),
  notes: Joi.string().max(1000).optional().allow(''),
});

// Leave dashboard query validation schema
export const leaveDashboardQuerySchema = Joi.object({
  year: Joi.number().integer().min(2020).max(2030).optional(),
  department_id: Joi.number().optional(),
});

// Custom validation for leave application dates
export const leaveApplicationDateSchema = Joi.object({
  start_date: Joi.date().iso().required(),
  end_date: Joi.date().iso().min(Joi.ref('start_date')).required(),
}).custom((value, helpers) => {
  // Additional business logic validation can be added here
  // For example, validating that employee has enough leave balance
  return value;
}, 'Leave application date validation');

// Leave type code uniqueness validation
export const leaveTypeCodeSchema = Joi.string().max(50).required().custom((value, helpers) => {
  // Additional validation for code uniqueness can be added here
  return value;
}, 'Leave type code validation');
