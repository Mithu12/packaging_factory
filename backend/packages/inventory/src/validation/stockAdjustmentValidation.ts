import Joi from "joi";

export const createStockAdjustmentSchema = Joi.object({
  product_id: Joi.number().integer().positive().required(),
  adjustment_type: Joi.string().valid("increase", "decrease", "set").required(),
  quantity: Joi.number().positive().required(),
  reason: Joi.string().max(255).required(),
  reference: Joi.string().max(100).optional(),
  notes: Joi.string().optional(),
  adjusted_by: Joi.string().max(100).optional(),
});

export const stockAdjustmentQuerySchema = Joi.object({
  product_id: Joi.number().integer().positive().optional(),
  adjustment_type: Joi.string().valid("increase", "decrease", "set").optional(),
  limit: Joi.number().integer().min(1).max(100).default(10),
  offset: Joi.number().integer().min(0).default(0),
  start_date: Joi.date().iso().optional(),
  end_date: Joi.date().iso().optional(),
});
