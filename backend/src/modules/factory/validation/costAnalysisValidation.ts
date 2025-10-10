import Joi from 'joi';

// Query validation schemas for cost analysis endpoints

export const costAnalysisQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  search: Joi.string().min(1).max(100).optional(),
  work_order_id: Joi.string().uuid().optional(),
  product_id: Joi.string().uuid().optional(),
  start_date: Joi.date().iso().optional(),
  end_date: Joi.date().iso().min(Joi.ref('start_date')).optional(),
  sort_by: Joi.string().valid('work_order_number', 'product_name', 'total_cost', 'cost_per_unit', 'cost_variance').optional(),
  sort_order: Joi.string().valid('asc', 'desc').optional()
});

export const costVarianceQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  search: Joi.string().min(1).max(100).optional(),
  status: Joi.string().valid('favorable', 'unfavorable', 'on_target').optional(),
  min_variance: Joi.number().optional(),
  max_variance: Joi.number().min(Joi.ref('min_variance')).optional(),
  start_date: Joi.date().iso().optional(),
  end_date: Joi.date().iso().min(Joi.ref('start_date')).optional(),
  sort_by: Joi.string().valid('work_order_number', 'product_name', 'variance', 'variance_percentage').optional(),
  sort_order: Joi.string().valid('asc', 'desc').optional()
});

export const costTrendQuerySchema = Joi.object({
  period_type: Joi.string().valid('month', 'quarter', 'year').optional(),
  start_date: Joi.date().iso().optional(),
  end_date: Joi.date().iso().min(Joi.ref('start_date')).optional()
});

export const costCenterQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  search: Joi.string().min(1).max(100).optional(),
  sort_by: Joi.string().valid('name', 'total_cost', 'efficiency', 'variance').optional(),
  sort_order: Joi.string().valid('asc', 'desc').optional()
});
