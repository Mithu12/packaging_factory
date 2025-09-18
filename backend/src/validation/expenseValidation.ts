import Joi from 'joi';

export const createExpenseSchema = Joi.object({
  title: Joi.string().min(2).max(255).required(),
  description: Joi.string().max(1000).optional().allow(null, ''),
  category_id: Joi.number().integer().positive().required(),
  amount: Joi.number().positive().precision(2).required(),
  currency: Joi.string().length(3).default('USD').optional(),
  expense_date: Joi.date().iso().required(),
  payment_method: Joi.string().max(50).default('cash').optional(),
  vendor_name: Joi.string().max(255).optional().allow(null, ''),
  vendor_contact: Joi.string().max(255).optional().allow(null, ''),
  receipt_number: Joi.string().max(100).optional().allow(null, ''),
  receipt_url: Joi.string().uri().max(500).optional().allow(null, ''),
  department: Joi.string().max(100).optional().allow(null, ''),
  project: Joi.string().max(100).optional().allow(null, ''),
  tags: Joi.array().items(Joi.string().max(50)).optional().allow(null),
  notes: Joi.string().max(1000).optional().allow(null, ''),
});

export const updateExpenseSchema = Joi.object({
  title: Joi.string().min(2).max(255).optional(),
  description: Joi.string().max(1000).optional().allow(null, ''),
  category_id: Joi.number().integer().positive().optional(),
  amount: Joi.number().positive().precision(2).optional(),
  currency: Joi.string().length(3).optional(),
  expense_date: Joi.date().iso().optional(),
  payment_method: Joi.string().max(50).optional(),
  vendor_name: Joi.string().max(255).optional().allow(null, ''),
  vendor_contact: Joi.string().max(255).optional().allow(null, ''),
  receipt_number: Joi.string().max(100).optional().allow(null, ''),
  receipt_url: Joi.string().uri().max(500).optional().allow(null, ''),
  department: Joi.string().max(100).optional().allow(null, ''),
  project: Joi.string().max(100).optional().allow(null, ''),
  tags: Joi.array().items(Joi.string().max(50)).optional().allow(null),
  notes: Joi.string().max(1000).optional().allow(null, ''),
});

export const expenseQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().optional().allow(null, ''),
  category_id: Joi.number().integer().positive().optional(),
  status: Joi.string().valid('pending', 'approved', 'rejected', 'paid').optional(),
  payment_method: Joi.string().optional().allow(null, ''),
  department: Joi.string().optional().allow(null, ''),
  project: Joi.string().optional().allow(null, ''),
  start_date: Joi.date().iso().optional(),
  end_date: Joi.date().iso().optional(),
  min_amount: Joi.number().min(0).optional(),
  max_amount: Joi.number().min(0).optional(),
  created_by: Joi.number().integer().positive().optional(),
  sortBy: Joi.string().valid('id', 'expense_number', 'title', 'amount', 'expense_date', 'status', 'created_at', 'updated_at').default('created_at'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

export const approveExpenseSchema = Joi.object({
  notes: Joi.string().max(500).optional().allow(null, ''),
});

export const rejectExpenseSchema = Joi.object({
  reason: Joi.string().max(500).required(),
});

export const payExpenseSchema = Joi.object({
  notes: Joi.string().max(500).optional().allow(null, ''),
});

// Expense Category Schemas
export const createExpenseCategorySchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  description: Joi.string().max(500).optional().allow(null, ''),
  color: Joi.string().pattern(/^#[0-9A-F]{6}$/i).default('#3B82F6').optional(),
});

export const updateExpenseCategorySchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  description: Joi.string().max(500).optional().allow(null, ''),
  color: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional(),
  is_active: Joi.boolean().optional(),
});

export const expenseCategoryQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().optional().allow(null, ''),
  is_active: Joi.boolean().optional(),
  sortBy: Joi.string().valid('id', 'name', 'created_at', 'updated_at').default('name'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
});
