import Joi from 'joi';

export const createMaterialAllocationSchema = Joi.object({
  work_order_requirement_id: Joi.string().required(),
  inventory_item_id: Joi.number().integer().positive().required(),
  allocated_quantity: Joi.number().positive().required(),
  allocated_from_location: Joi.string().required(),
  expiry_date: Joi.date().optional().allow(null),
  batch_number: Joi.string().optional().allow(null, ''),
  notes: Joi.string().optional().allow(null, '')
});

export const updateMaterialAllocationSchema = Joi.object({
  allocated_quantity: Joi.number().positive().optional(),
  allocated_from_location: Joi.string().optional(),
  expiry_date: Joi.date().optional().allow(null),
  batch_number: Joi.string().optional().allow(null, ''),
  notes: Joi.string().optional().allow(null, ''),
  status: Joi.string().valid('allocated', 'consumed', 'returned', 'short').optional()
});

export const materialAllocationQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  search: Joi.string().optional().allow(''),
  status: Joi.string().valid('allocated', 'consumed', 'returned', 'short').optional(),
  work_order_id: Joi.string().optional(),
  sort_by: Joi.string().valid('allocated_date', 'allocated_quantity', 'status').optional(),
  sort_order: Joi.string().valid('asc', 'desc').optional()
});

export const allocationIdSchema = Joi.object({
  id: Joi.string().required()
});

export const returnAllocationSchema = Joi.object({
  notes: Joi.string().optional().allow(null, '')
});

