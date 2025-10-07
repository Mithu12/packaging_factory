import Joi from 'joi';

export const createProductionRunSchema = Joi.object({
  work_order_id: Joi.string().uuid().required(),
  production_line_id: Joi.string().uuid().optional(),
  operator_id: Joi.string().uuid().optional(),
  scheduled_start_time: Joi.date().iso().optional(),
  target_quantity: Joi.number().positive().required(),
  planned_cycle_time_seconds: Joi.number().integer().positive().optional(),
  notes: Joi.string().max(1000).allow('', null).optional(),
});

export const completeProductionRunSchema = Joi.object({
  status: Joi.string().valid('completed').default('completed'),
  produced_quantity: Joi.number().min(0).optional(),
  good_quantity: Joi.number().min(0).optional(),
  rejected_quantity: Joi.number().min(0).optional(),
  notes: Joi.string().max(500).allow('', null).optional(),
});

export const pauseProductionRunSchema = Joi.object({
  notes: Joi.string().max(500).allow('', null).optional(),
});

export const recordDowntimeSchema = Joi.object({
  production_run_id: Joi.string().uuid().required(),
  downtime_reason: Joi.string().max(100).required(),
  downtime_category: Joi.string()
    .valid(
      'machine_breakdown',
      'maintenance',
      'material_shortage',
      'quality_issue',
      'setup_changeover',
      'operator_absence',
      'power_outage',
      'other'
    )
    .required(),
  start_time: Joi.date().iso().required(),
  end_time: Joi.date().iso().optional(),
  is_planned: Joi.boolean().default(false),
  cost_impact: Joi.number().min(0).optional(),
  notes: Joi.string().max(1000).allow('', null).optional(),
});

export const productionRunQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().allow('').optional(),
  status: Joi.string()
    .valid('scheduled', 'in_progress', 'paused', 'completed', 'cancelled')
    .optional().allow(''),
  work_order_id: Joi.string().uuid().optional(),
  production_line_id: Joi.string().uuid().optional(),
  sort_by: Joi.string()
    .valid('run_number', 'actual_start_time', 'status', 'target_quantity', 'efficiency_percentage')
    .default('actual_start_time'),
  sort_order: Joi.string().valid('asc', 'desc').default('desc'),
});

export const productionRunParamsSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

