import Joi from 'joi';

const numericIdSchema = Joi.alternatives().try(
  Joi.number().integer().positive(),
  Joi.string().pattern(/^\d+$/)
);

export const createConsumptionSchema = Joi.object({
  work_order_id: numericIdSchema.required(),
  work_order_requirement_id: numericIdSchema.required(),
  material_id: numericIdSchema.required(),
  consumed_quantity: Joi.number().positive().required(),
  wastage_quantity: Joi.number().min(0).default(0),
  wastage_reason: Joi.string().allow('', null).optional(),
  consumption_date: Joi.date().iso().required(),
  production_line_id: numericIdSchema.allow(null).optional(),
  operator_id: numericIdSchema.allow(null).optional(),
  batch_number: Joi.string().allow('', null).optional(),
  notes: Joi.string().max(500).allow('', null).optional(),
});

export const consumptionQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().allow('').optional(),
  work_order_id: numericIdSchema.optional(),
  production_line_id: numericIdSchema.optional(),
  sort_by: Joi.string()
    .valid('consumption_date', 'material_name', 'consumed_quantity', 'wastage_quantity')
    .default('consumption_date'),
  sort_order: Joi.string().valid('asc', 'desc').default('desc'),
});

export const consumptionParamsSchema = Joi.object({
  id: numericIdSchema.required(),
});

export const bulkConsumptionSchema = Joi.object({
  consumptions: Joi.array().items(
    Joi.object({
      material_id: numericIdSchema.required(),
      consumed_quantity: Joi.number().positive().required(),
      wastage_quantity: Joi.number().min(0).default(0),
      wastage_reason: Joi.string().allow('', null).optional(),
    })
  ).min(1).required(),
  work_order_id: numericIdSchema.required(),
  production_line_id: numericIdSchema.allow(null).optional(),
  operator_id: numericIdSchema.allow(null).optional(),
  batch_number: Joi.string().allow('', null).optional(),
  notes: Joi.string().max(500).allow('', null).optional(),
});
