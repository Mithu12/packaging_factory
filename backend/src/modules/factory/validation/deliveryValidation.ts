import Joi from 'joi';

const deliveryItemSchema = Joi.object({
  order_line_item_id: Joi.alternatives()
    .try(Joi.number().integer().positive(), Joi.string().pattern(/^\d+$/))
    .required(),
  quantity: Joi.number().positive().precision(3).required(),
  bundles: Joi.number().integer().min(0).optional().allow(null),
  item_code: Joi.string().max(100).optional().allow('', null),
});

export const createDeliverySchema = Joi.object({
  items: Joi.array().items(deliveryItemSchema).min(1).required(),
  delivery_date: Joi.date().iso().optional(),
  tracking_number: Joi.string().max(100).optional().allow('', null),
  carrier: Joi.string().max(100).optional().allow('', null),
  estimated_delivery_date: Joi.date().iso().optional().allow(null),
  notes: Joi.string().optional().allow('', null),
  vat_number: Joi.string().max(50).optional().allow('', null),
});

export const deliveryIdSchema = Joi.object({
  deliveryId: Joi.alternatives()
    .try(Joi.number().integer().positive(), Joi.string().pattern(/^\d+$/))
    .required(),
});

export const customerIdSchema = Joi.object({
  customerId: Joi.alternatives()
    .try(Joi.number().integer().positive(), Joi.string().pattern(/^\d+$/))
    .required(),
});

export const cancelDeliverySchema = Joi.object({
  reason: Joi.string().max(500).optional().allow('', null),
});
