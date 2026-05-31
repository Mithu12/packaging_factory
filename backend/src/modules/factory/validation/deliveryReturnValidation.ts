import Joi from 'joi';

const idLike = Joi.alternatives().try(
  Joi.number().integer().positive(),
  Joi.string().pattern(/^\d+$/)
);

const returnItemSchema = Joi.object({
  delivery_item_id: idLike.required(),
  returned_quantity: Joi.number().positive().precision(3).required(),
  condition: Joi.string().max(30).optional().allow('', null),
  notes: Joi.string().max(500).optional().allow('', null),
});

export const createDeliveryReturnSchema = Joi.object({
  items: Joi.array().items(returnItemSchema).min(1).required(),
  return_date: Joi.date().iso().optional(),
  return_reason: Joi.string().max(50).optional().allow('', null),
  notes: Joi.string().max(1000).optional().allow('', null),
  distribution_center_id: idLike.optional().allow(null),
});

export const returnIdSchema = Joi.object({
  returnId: idLike.required(),
});

export const deliveryIdParamSchema = Joi.object({
  deliveryId: idLike.required(),
});

export const rejectReturnSchema = Joi.object({
  reason: Joi.string().max(500).optional().allow('', null),
});
