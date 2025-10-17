import Joi from 'joi';

// Employment type validation schema
export const employmentTypeSchema = Joi.string().valid(
  'permanent',
  'contract',
  'intern',
  'consultant'
).required();

// Gender validation schema
export const genderSchema = Joi.string().valid(
  'male',
  'female',
  'other'
).required();

// Marital status validation schema
export const maritalStatusSchema = Joi.string().valid(
  'single',
  'married',
  'divorced',
  'widowed'
).required();

// Shift type validation schema
export const shiftTypeSchema = Joi.string().valid(
  'day',
  'night',
  'rotating'
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

// Create employee validation schema
export const createEmployeeSchema = Joi.object({
  employee_id: Joi.string().max(50).optional(),
  factory_id: Joi.number().optional(),
  user_id: Joi.number().optional(),
  first_name: Joi.string().max(100).required(),
  last_name: Joi.string().max(100).required(),
  date_of_birth: Joi.date().iso().max('now').optional(),
  gender: genderSchema.optional(),
  marital_status: maritalStatusSchema.optional(),
  nationality: Joi.string().max(100).optional(),
  address: Joi.string().max(500).optional(),
  city: Joi.string().max(100).optional(),
  state: Joi.string().max(100).optional(),
  postal_code: Joi.string().max(20).optional(),
  country: Joi.string().max(100).optional(),
  phone: Joi.string().max(20).optional(),
  emergency_contact_name: Joi.string().max(200).optional(),
  emergency_contact_phone: Joi.string().max(20).optional(),
  emergency_contact_relationship: Joi.string().max(100).optional(),
  blood_group: Joi.string().max(10).optional(),
  cnic: Joi.string().max(50).optional(),
  passport_number: Joi.string().max(50).optional(),
  tax_id: Joi.string().max(50).optional(),
  designation_id: Joi.number().optional(),
  reporting_manager_id: Joi.number().optional(),
  department_id: Joi.number().optional(),
  employment_type: employmentTypeSchema,
  join_date: Joi.date().iso().optional(),
  confirmation_date: Joi.date().iso().optional(),
  termination_date: Joi.date().iso().optional(),
  probation_period_months: Joi.number().min(0).max(24).optional(),
  notice_period_days: Joi.number().min(0).max(365).optional(),
  work_location: Joi.string().max(255).optional(),
  shift_type: shiftTypeSchema,
  bank_account_number: Joi.string().max(100).optional(),
  bank_name: Joi.string().max(200).optional(),
  skill_level: skillLevelSchema,
  availability_status: availabilityStatusSchema,
  hourly_rate: Joi.number().min(0).precision(2).optional(),
});

// Update employee validation schema
export const updateEmployeeSchema = Joi.object({
  first_name: Joi.string().max(100).optional(),
  last_name: Joi.string().max(100).optional(),
  date_of_birth: Joi.date().iso().max('now').optional(),
  gender: genderSchema.optional(),
  marital_status: maritalStatusSchema.optional(),
  nationality: Joi.string().max(100).optional(),
  address: Joi.string().max(500).optional(),
  city: Joi.string().max(100).optional(),
  state: Joi.string().max(100).optional(),
  postal_code: Joi.string().max(20).optional(),
  country: Joi.string().max(100).optional(),
  phone: Joi.string().max(20).optional(),
  emergency_contact_name: Joi.string().max(200).optional(),
  emergency_contact_phone: Joi.string().max(20).optional(),
  emergency_contact_relationship: Joi.string().max(100).optional(),
  blood_group: Joi.string().max(10).optional(),
  cnic: Joi.string().max(50).optional(),
  passport_number: Joi.string().max(50).optional(),
  tax_id: Joi.string().max(50).optional(),
  designation_id: Joi.number().optional(),
  reporting_manager_id: Joi.number().optional(),
  department_id: Joi.number().optional(),
  employment_type: employmentTypeSchema.optional(),
  join_date: Joi.date().iso().optional(),
  confirmation_date: Joi.date().iso().optional(),
  termination_date: Joi.date().iso().optional(),
  probation_period_months: Joi.number().min(0).max(24).optional(),
  notice_period_days: Joi.number().min(0).max(365).optional(),
  work_location: Joi.string().max(255).optional(),
  shift_type: shiftTypeSchema.optional(),
  bank_account_number: Joi.string().max(100).optional(),
  bank_name: Joi.string().max(200).optional(),
  skill_level: skillLevelSchema.optional(),
  availability_status: availabilityStatusSchema.optional(),
  hourly_rate: Joi.number().min(0).precision(2).optional(),
});

// Employee query validation schema
export const employeeQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  search: Joi.string().max(255).optional().allow(''),
  factory_id: Joi.number().optional(),
  department_id: Joi.number().optional(),
  designation_id: Joi.number().optional(),
  employment_type: employmentTypeSchema.optional(),
  is_active: Joi.boolean().optional(),
  sort_by: Joi.string().valid('created_at', 'first_name', 'last_name', 'employee_id', 'join_date').optional(),
  sort_order: Joi.string().valid('asc', 'desc').optional(),
});

// Employee ID validation schema
export const employeeIdSchema = Joi.object({
  id: Joi.number().required(),
});

// Bulk import employees validation schema
export const bulkImportEmployeesSchema = Joi.object({
  employees: Joi.array().items(createEmployeeSchema).min(1).max(100).required(),
});

// Update employee salary validation schema
export const updateEmployeeSalarySchema = Joi.object({
  employee_id: Joi.number().required(),
  new_salary: Joi.number().min(0).precision(2).required(),
  effective_date: Joi.date().iso().required(),
  reason: Joi.string().max(500).required(),
});

// Upload employee document validation schema
export const uploadEmployeeDocumentSchema = Joi.object({
  employee_id: Joi.number().required(),
  document_type: Joi.string().max(100).required(),
  file: Joi.object({
    filename: Joi.string().required(),
    path: Joi.string().required(),
    size: Joi.number().max(10 * 1024 * 1024).required(), // 10MB max
    mimetype: Joi.string().required()
  }).required(),
});

// Custom validation for employee status transitions
export const employeeTransitionSchema = Joi.object({
  status: Joi.string().valid('active', 'inactive', 'terminated').optional(),
  notes: Joi.string().max(1000).optional().allow(''),
}).custom((value, helpers) => {
  // Additional business logic validation can be added here
  // For example, validating that terminated employees can't be reactivated
  return value;
}, 'Employee transition validation');

// Employee document types validation
export const documentTypeSchema = Joi.string().valid(
  'resume',
  'cnic',
  'passport',
  'educational_certificate',
  'experience_certificate',
  'medical_record',
  'contract',
  'other'
).required();
