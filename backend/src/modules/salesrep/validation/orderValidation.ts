import Joi from "joi";

// Order item validation schema
const orderItemSchema = Joi.object({
  product_id: Joi.number()
    .integer()
    .positive()
    .optional()
    .allow(null)
    .messages({
      "number.base": "Product ID must be a number",
      "number.integer": "Product ID must be an integer",
      "number.positive": "Product ID must be positive",
    }),
  product_name: Joi.string().min(1).max(255).required().messages({
    "string.empty": "Product name is required",
    "string.min": "Product name must be at least 1 character",
    "string.max": "Product name must not exceed 255 characters",
  }),
  quantity: Joi.number().positive().precision(2).required().messages({
    "number.base": "Quantity must be a number",
    "number.positive": "Quantity must be positive",
    "number.precision": "Quantity must have at most 2 decimal places",
  }),
  unit_price: Joi.number().min(0).precision(2).required().messages({
    "number.base": "Unit price must be a number",
    "number.min": "Unit price must be non-negative",
    "number.precision": "Unit price must have at most 2 decimal places",
  }),
  discount: Joi.number().min(0).precision(2).optional().default(0).messages({
    "number.base": "Discount must be a number",
    "number.min": "Discount must be non-negative",
    "number.precision": "Discount must have at most 2 decimal places",
  }),
});

// Create order validation schema
export const createOrderSchema = Joi.object({
  customer_id: Joi.number().integer().positive().required().messages({
    "number.base": "Customer ID must be a number",
    "number.integer": "Customer ID must be an integer",
    "number.positive": "Customer ID must be positive",
    "any.required": "Customer ID is required",
  }),
  order_date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .messages({
      "string.pattern.base": "Order date must be in YYYY-MM-DD format",
    }),
  items: Joi.array().items(orderItemSchema).min(1).required().messages({
    "array.min": "Order must have at least one item",
    "any.required": "Items are required",
  }),
  discount_amount: Joi.number()
    .min(0)
    .precision(2)
    .optional()
    .default(0)
    .messages({
      "number.base": "Discount amount must be a number",
      "number.min": "Discount amount must be non-negative",
      "number.precision": "Discount amount must have at most 2 decimal places",
    }),
  tax_amount: Joi.number().min(0).precision(2).optional().default(0).messages({
    "number.base": "Tax amount must be a number",
    "number.min": "Tax amount must be non-negative",
    "number.precision": "Tax amount must have at most 2 decimal places",
  }),
  status: Joi.string()
    .valid(
      "draft",
      "confirmed",
      "processing",
      "shipped",
      "delivered",
      "cancelled"
    )
    .optional()
    .default("draft")
    .messages({
      "any.only":
        "Status must be one of: draft, confirmed, processing, shipped, delivered, cancelled",
    }),
  notes: Joi.string().max(2000).optional().allow(null, "").messages({
    "string.max": "Notes must not exceed 2000 characters",
  }),
});

// Update order validation schema
export const updateOrderSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    "number.base": "Order ID must be a number",
    "number.integer": "Order ID must be an integer",
    "number.positive": "Order ID must be positive",
    "any.required": "Order ID is required",
  }),
  customer_id: Joi.number().integer().positive().optional().messages({
    "number.base": "Customer ID must be a number",
    "number.integer": "Customer ID must be an integer",
    "number.positive": "Customer ID must be positive",
  }),
  order_date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .messages({
      "string.pattern.base": "Order date must be in YYYY-MM-DD format",
    }),
  items: Joi.array().items(orderItemSchema).min(1).optional().messages({
    "array.min": "Order must have at least one item",
  }),
  discount_amount: Joi.number().min(0).precision(2).optional().messages({
    "number.base": "Discount amount must be a number",
    "number.min": "Discount amount must be non-negative",
    "number.precision": "Discount amount must have at most 2 decimal places",
  }),
  tax_amount: Joi.number().min(0).precision(2).optional().messages({
    "number.base": "Tax amount must be a number",
    "number.min": "Tax amount must be non-negative",
    "number.precision": "Tax amount must have at most 2 decimal places",
  }),
  status: Joi.string()
    .valid(
      "draft",
      "confirmed",
      "processing",
      "shipped",
      "delivered",
      "cancelled"
    )
    .optional()
    .messages({
      "any.only":
        "Status must be one of: draft, confirmed, processing, shipped, delivered, cancelled",
    }),
  notes: Joi.string().max(2000).optional().allow(null, "").messages({
    "string.max": "Notes must not exceed 2000 characters",
  }),
})
  .min(1)
  .messages({
    "object.min": "At least one field must be provided for update",
  });

// Update order status validation schema
export const updateOrderStatusSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    "number.base": "Order ID must be a number",
    "number.integer": "Order ID must be an integer",
    "number.positive": "Order ID must be positive",
    "any.required": "Order ID is required",
  }),
  status: Joi.string()
    .valid(
      "draft",
      "confirmed",
      "processing",
      "shipped",
      "delivered",
      "cancelled"
    )
    .required()
    .messages({
      "any.only":
        "Status must be one of: draft, confirmed, processing, shipped, delivered, cancelled",
      "any.required": "Status is required",
    }),
  notes: Joi.string().max(1000).optional().allow(null, "").messages({
    "string.max": "Notes must not exceed 1000 characters",
  }),
});

// Order filters validation schema
export const orderFiltersSchema = Joi.object({
  customer_id: Joi.number().integer().positive().optional().messages({
    "number.base": "Customer ID must be a number",
    "number.integer": "Customer ID must be an integer",
    "number.positive": "Customer ID must be positive",
  }),
  status: Joi.string()
    .valid(
      "draft",
      "confirmed",
      "processing",
      "shipped",
      "delivered",
      "cancelled"
    )
    .optional()
    .messages({
      "any.only":
        "Status must be one of: draft, confirmed, processing, shipped, delivered, cancelled",
    }),
  date_from: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .messages({
      "string.pattern.base": "Date must be in YYYY-MM-DD format",
    }),
  date_to: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .messages({
      "string.pattern.base": "Date must be in YYYY-MM-DD format",
    }),
  min_amount: Joi.number().min(0).optional().messages({
    "number.base": "Minimum amount must be a number",
    "number.min": "Minimum amount must be non-negative",
  }),
  max_amount: Joi.number().min(0).optional().messages({
    "number.base": "Maximum amount must be a number",
    "number.min": "Maximum amount must be non-negative",
  }),
  page: Joi.number().integer().min(1).optional().default(1).messages({
    "number.base": "Page must be a number",
    "number.integer": "Page must be an integer",
    "number.min": "Page must be at least 1",
  }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .optional()
    .default(10)
    .messages({
      "number.base": "Limit must be a number",
      "number.integer": "Limit must be an integer",
      "number.min": "Limit must be at least 1",
      "number.max": "Limit must not exceed 100",
    }),
})
  .custom((value, helpers) => {
    // Validate date range
    if (
      value.date_from &&
      value.date_to &&
      new Date(value.date_from) > new Date(value.date_to)
    ) {
      return helpers.error("custom.invalidDateRange");
    }
    return value;
  }, "Date range validation")
  .messages({
    "custom.invalidDateRange": "date_from cannot be after date_to",
  });

// Parameter validation schemas
export const orderIdSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    "number.base": "Order ID must be a number",
    "number.integer": "Order ID must be an integer",
    "number.positive": "Order ID must be positive",
    "any.required": "Order ID is required",
  }),
});
