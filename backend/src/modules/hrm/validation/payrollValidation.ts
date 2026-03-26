import Joi from 'joi';

// Payroll period status validation schema
export const payrollPeriodStatusSchema = Joi.string().valid(
  'draft',
  'open',
  'closed',
  'cancelled'
).required();

// Payroll component type validation schema
export const payrollComponentTypeSchema = Joi.string().valid(
  'earning',
  'deduction'
).required();

// Payroll calculation type validation schema
export const payrollCalculationTypeSchema = Joi.string().valid(
  'fixed',
  'percentage',
  'hourly'
).required();

// Create payroll period validation schema
export const createPayrollPeriodSchema = Joi.object({
  name: Joi.string().max(255).required(),
  start_date: Joi.date().iso().required(),
  end_date: Joi.date().iso().min(Joi.ref('start_date')).required(),
  status: payrollPeriodStatusSchema.optional(),
  description: Joi.string().max(1000).optional().allow(''),
});

// Update payroll period validation schema
export const updatePayrollPeriodSchema = Joi.object({
  name: Joi.string().max(255).optional(),
  start_date: Joi.date().iso().optional(),
  end_date: Joi.date().iso().optional(),
  status: payrollPeriodStatusSchema.optional(),
  description: Joi.string().max(1000).optional().allow(''),
});

// Create payroll component validation schema
export const createPayrollComponentSchema = Joi.object({
  name: Joi.string().max(255).required(),
  code: Joi.string().max(50).required(),
  component_type: payrollComponentTypeSchema,
  calculation_type: payrollCalculationTypeSchema,
  amount: Joi.number().min(0).precision(2).when('calculation_type', {
    is: 'fixed',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  percentage: Joi.number().min(0).max(100).precision(2).when('calculation_type', {
    is: 'percentage',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  is_taxable: Joi.boolean().optional(),
  is_active: Joi.boolean().optional(),
  description: Joi.string().max(1000).optional().allow(''),
});

// Update payroll component validation schema
export const updatePayrollComponentSchema = Joi.object({
  name: Joi.string().max(255).optional(),
  code: Joi.string().max(50).optional(),
  component_type: payrollComponentTypeSchema.optional(),
  calculation_type: payrollCalculationTypeSchema.optional(),
  amount: Joi.number().min(0).precision(2).optional(),
  percentage: Joi.number().min(0).max(100).precision(2).optional(),
  is_taxable: Joi.boolean().optional(),
  is_active: Joi.boolean().optional(),
  description: Joi.string().max(1000).optional().allow(''),
});

// Payroll calculation request validation schema
export const payrollCalculationSchema = Joi.object({
  period_id: Joi.number().required(),
  employee_ids: Joi.array().items(Joi.number()).optional(),
  include_bonuses: Joi.boolean().optional(),
  include_overtime: Joi.boolean().optional(),
  include_deductions: Joi.boolean().optional(),
});

// Payroll run status validation schema
export const payrollRunStatusSchema = Joi.string().valid(
  'draft',
  'calculated',
  'approved',
  'paid',
  'cancelled'
).required();

// Approve payroll run validation schema
export const approvePayrollRunSchema = Joi.object({
  run_id: Joi.number().required(),
  approved_by: Joi.number().optional(),
  notes: Joi.string().max(1000).optional().allow(''),
});

// Record payroll payments (per-employee lines on a run)
export const recordPayrollPaymentsSchema = Joi.object({
  employee_ids: Joi.array().items(Joi.number().integer().positive()).min(1).required(),
  payment_method: Joi.string()
    .valid('bank_transfer', 'check', 'cash', 'other')
    .required(),
  payment_date: Joi.string().required(),
  bank_account_number: Joi.string().max(100).optional().allow(''),
  bank_name: Joi.string().max(200).optional().allow(''),
  check_number: Joi.string().max(100).optional().allow(''),
  notes: Joi.string().max(2000).optional().allow(''),
});

// Payroll summary query validation schema
export const payrollSummaryQuerySchema = Joi.object({
  period_id: Joi.number().required(),
  group_by: Joi.string().valid('department', 'designation', 'location').optional(),
});

// Payroll component query validation schema
export const payrollComponentQuerySchema = Joi.object({
  component_type: payrollComponentTypeSchema.optional(),
  is_active: Joi.boolean().optional(),
});

// Bulk update payroll component status validation schema
export const bulkUpdatePayrollComponentSchema = Joi.object({
  component_ids: Joi.array().items(Joi.number()).min(1).required(),
  is_active: Joi.boolean().required(),
});

// Employee salary structure validation schema
export const employeeSalaryStructureSchema = Joi.object({
  employee_id: Joi.number().required(),
  base_salary: Joi.number().min(0).precision(2).required(),
  components: Joi.array().items(Joi.object({
    component_id: Joi.number().required(),
    amount: Joi.number().min(0).precision(2).optional(),
    percentage: Joi.number().min(0).max(100).precision(2).optional(),
  })).optional(),
});

// Payroll period query validation schema
export const payrollPeriodQuerySchema = Joi.object({
  status: payrollPeriodStatusSchema.optional(),
  start_date_from: Joi.date().iso().optional(),
  start_date_to: Joi.date().iso().optional(),
  end_date_from: Joi.date().iso().optional(),
  end_date_to: Joi.date().iso().optional(),
});

// Custom validation for payroll period dates
export const payrollPeriodDateSchema = Joi.object({
  start_date: Joi.date().iso().required(),
  end_date: Joi.date().iso().min(Joi.ref('start_date')).required(),
}).custom((value, helpers) => {
  // Additional business logic validation can be added here
  // For example, validating that period doesn't overlap with existing periods
  return value;
}, 'Payroll period date validation');

// Payroll component code uniqueness validation
export const payrollComponentCodeSchema = Joi.string().max(50).required().custom((value, helpers) => {
  // Additional validation for code uniqueness can be added here
  return value;
}, 'Payroll component code validation');
