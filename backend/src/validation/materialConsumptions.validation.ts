import Joi from 'joi';

export const createConsumptionSchema = Joi.object({
  work_order_requirement_id: Joi.string().uuid().required(),
  material_id: Joi.string().required(),
  consumed_quantity: Joi.number().positive().required(),
  wastage_quantity: Joi.number().min(0).default(0),
  wastage_reason: Joi.string().allow('', null).optional(),
  consumption_date: Joi.date().iso().required(),
  production_line_id: Joi.string().uuid().allow(null).optional(),
  operator_id: Joi.string().uuid().allow(null).optional(),
  batch_number: Joi.string().allow('', null).optional(),
  notes: Joi.string().max(500).allow('', null).optional(),
});

export const consumptionQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().allow('').optional(),
  work_order_id: Joi.string().uuid().optional(),
  production_line_id: Joi.string().uuid().optional(),
  sort_by: Joi.string()
    .valid('consumption_date', 'material_name', 'consumed_quantity', 'wastage_quantity')
    .default('consumption_date'),
  sort_order: Joi.string().valid('asc', 'desc').default('desc'),
});

export const consumptionParamsSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

