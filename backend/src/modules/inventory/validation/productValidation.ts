import Joi from "joi";

export const createProductSchema = Joi.object({
  sku: Joi.string().min(2).max(50).required(),
  name: Joi.string().min(2).max(255).required(),
  description: Joi.string().max(1000).optional().allow(null, ""),
  category_id: Joi.number().integer().positive().required(),
  subcategory_id: Joi.number().integer().positive().optional().allow(null),
  brand_id: Joi.number().integer().positive().optional().allow(null),
  origin_id: Joi.number().integer().positive().optional().allow(null),
  unit_of_measure: Joi.string().min(1).max(20).required(),
  cost_price: Joi.number().positive().precision(2).required(),
  selling_price: Joi.number().positive().precision(2).required(),
  current_stock: Joi.number().min(0).required(),
  min_stock_level: Joi.number().min(0).required(),
  max_stock_level: Joi.number().min(0).optional().allow(null),
  supplier_id: Joi.number().integer().positive().required(),
  status: Joi.string()
    .valid("active", "inactive", "discontinued", "out_of_stock")
    .default("active"),
  barcode: Joi.string().max(50).required(),
  weight: Joi.number().positive().precision(2).optional().allow(null),
  dimensions: Joi.string().max(100).optional().allow(null, ""),
  tax_rate: Joi.number().min(0).max(100).precision(2).optional().allow(null),
  warranty_period: Joi.number().min(0).integer().optional().allow(null),
  service_time: Joi.number().min(0).integer().optional().allow(null),
  reorder_point: Joi.number().min(0).optional().allow(null),
  reorder_quantity: Joi.number().min(0).optional().allow(null),
  notes: Joi.string().max(1000).optional().allow(null, ""),
  image_url: Joi.string().max(500).optional().allow(null, ""),
});

export const updateProductSchema = Joi.object({
  sku: Joi.string().min(2).max(50).optional(),
  name: Joi.string().min(2).max(255).optional(),
  description: Joi.string().max(1000).optional().allow(null, ""),
  category_id: Joi.number().integer().positive().optional(),
  subcategory_id: Joi.number().integer().positive().optional().allow(null),
  brand_id: Joi.number().integer().positive().optional().allow(null),
  origin_id: Joi.number().integer().positive().optional().allow(null),
  unit_of_measure: Joi.string().min(1).max(20).optional(),
  cost_price: Joi.number().positive().precision(2).optional(),
  selling_price: Joi.number().positive().precision(2).optional(),
  current_stock: Joi.number().min(0).optional(),
  min_stock_level: Joi.number().min(0).optional(),
  max_stock_level: Joi.number().min(0).optional().allow(null),
  supplier_id: Joi.number().integer().positive().optional(),
  status: Joi.string()
    .valid("active", "inactive", "discontinued", "out_of_stock")
    .optional(),
  weight: Joi.number().positive().precision(2).optional().allow(null),
  dimensions: Joi.string().max(100).optional().allow(null, ""),
  tax_rate: Joi.number().min(0).max(100).precision(2).optional().allow(null),
  warranty_period: Joi.number().min(0).integer().optional().allow(null),
  service_time: Joi.number().min(0).integer().optional().allow(null),
  reorder_point: Joi.number().min(0).optional().allow(null),
  reorder_quantity: Joi.number().min(0).optional().allow(null),
  notes: Joi.string().max(1000).optional().allow(null, ""),
  image_url: Joi.string().max(500).optional().allow(null, ""),
});

export const productQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(1000).default(10),
  search: Joi.string().optional().allow(null, ""),
  category_id: Joi.number().integer().positive().optional(),
  subcategory_id: Joi.number().integer().positive().optional(),
  brand_id: Joi.number().integer().positive().optional(),
  origin_id: Joi.number().integer().positive().optional(),
  supplier_id: Joi.number().integer().positive().optional(),
  status: Joi.string()
    .valid("active", "inactive", "discontinued", "out_of_stock")
    .optional(),
  low_stock: Joi.boolean().optional(),
  sortBy: Joi.string()
    .valid(
      "id",
      "name",
      "sku",
      "cost_price",
      "selling_price",
      "current_stock",
      "created_at",
      "updated_at"
    )
    .default("created_at"),
  sortOrder: Joi.string().valid("asc", "desc").default("desc"),
});

export const stockAdjustmentSchema = Joi.object({
  product_id: Joi.number().integer().positive().required(),
  adjustment_type: Joi.string().valid("increase", "decrease", "set").required(),
  quantity: Joi.number().positive().required(),
  reason: Joi.string().min(2).max(255).required(),
  reference: Joi.string().max(100).optional().allow(null, ""),
  notes: Joi.string().max(1000).optional().allow(null, ""),
  distribution_center_id: Joi.number().integer().positive().optional(),
});
