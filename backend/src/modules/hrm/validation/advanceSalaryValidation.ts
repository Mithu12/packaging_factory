import Joi from 'joi';

export const createAdvanceSalarySchema = Joi.object({
  employee_id: Joi.number().integer().positive().required(),
  amount: Joi.number().positive().precision(2).required(),
  monthly_installment: Joi.number().positive().precision(2).required(),
  total_installments: Joi.number().integer().positive().required(),
  start_date: Joi.date().iso().required(),
  loan_type: Joi.string().max(50).default('salary_advance'),
  notes: Joi.string().max(1000).optional().allow('', null),
});

export const approveAdvanceSalarySchema = Joi.object({
  approved: Joi.boolean().required(),
  notes: Joi.string().max(1000).optional().allow('', null),
});

export const advanceSalaryQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  search: Joi.string().max(100).optional().allow(''),
  status: Joi.string().valid('active', 'completed', 'cancelled', 'pending').optional().allow(''),
  employee_id: Joi.number().integer().positive().optional(),
});
