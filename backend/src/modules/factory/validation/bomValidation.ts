import Joi from "joi";

// BOM validation schemas
export const createBOMSchema = Joi.object({
  parent_product_id: Joi.number().required().messages({
    "number.base": "Parent product ID must be a valid number",
    "any.required": "Parent product ID is required",
  }),
  version: Joi.string().max(20).required().messages({
    "string.max": "Version must not exceed 20 characters",
    "any.required": "Version is required",
  }),
  effective_date: Joi.date().required().messages({
    "date.base": "Effective date must be a valid date",
    "any.required": "Effective date is required",
  }),
  category: Joi.string().valid("media", "liner", "both").required().messages({
    "any.only": "Category must be one of: media, liner, both",
    "any.required": "Category is required",
  }),
  components: Joi.array()
    .items(
      Joi.object({
        component_product_id: Joi.number().required().messages({
          "number.base": "Component product ID must be a valid number",
          "any.required": "Component product ID is required",
        }),
        quantity_required: Joi.number().positive().precision(4).required().messages({
          "number.positive": "Quantity required must be positive",
          "number.precision": "Quantity required must have at most 4 decimal places",
          "any.required": "Quantity required is required",
        }),
        unit_of_measure: Joi.string().max(20).required().messages({
          "string.max": "Unit of measure must not exceed 20 characters",
          "any.required": "Unit of measure is required",
        }),
        is_optional: Joi.boolean().default(false),
        scrap_factor: Joi.number().min(0).max(100).precision(2).default(0).messages({
          "number.min": "Scrap factor must be at least 0",
          "number.max": "Scrap factor must not exceed 100",
          "number.precision": "Scrap factor must have at most 2 decimal places",
        }),
        specifications: Joi.string().max(1000).allow("", null).optional().default(""),
        notes: Joi.string().max(1000).allow("", null).optional(),
      })
    )
    .min(1)
    .required()
    .messages({
      "array.min": "At least one component is required",
      "any.required": "Components are required",
    }),
  notes: Joi.string().max(1000).allow("", null).optional(),
});

export const updateBOMSchema = Joi.object({
  version: Joi.string().max(20).optional().messages({
    "string.max": "Version must not exceed 20 characters",
  }),
  effective_date: Joi.date().optional().messages({
    "date.base": "Effective date must be a valid date",
  }),
  is_active: Joi.boolean().optional(),
  category: Joi.string().valid("media", "liner", "both").optional().messages({
    "any.only": "Category must be one of: media, liner, both",
  }),
  components: Joi.array()
    .items(
      Joi.object({
        id: Joi.number().optional().messages({
          "number.base": "Component ID must be a valid number",
        }),
        component_product_id: Joi.number().optional().messages({
          "number.base": "Component product ID must be a valid number",
        }),
        quantity_required: Joi.number().positive().precision(4).optional().messages({
          "number.positive": "Quantity required must be positive",
          "number.precision": "Quantity required must have at most 4 decimal places",
        }),
        unit_of_measure: Joi.string().max(20).optional().messages({
          "string.max": "Unit of measure must not exceed 20 characters",
        }),
        is_optional: Joi.boolean().optional(),
        scrap_factor: Joi.number().min(0).max(100).precision(2).optional().messages({
          "number.min": "Scrap factor must be at least 0",
          "number.max": "Scrap factor must not exceed 100",
          "number.precision": "Scrap factor must have at most 2 decimal places",
        }),
        specifications: Joi.string().max(1000).allow("", null).optional().default(""),
        notes: Joi.string().max(1000).allow("", null).optional(),
      })
    )
    .optional(),
  notes: Joi.string().max(1000).allow("", null).optional(),
});

export const bomQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  search: Joi.string().max(100).optional(),
  parent_product_id: Joi.number().optional(),
  is_active: Joi.boolean().optional(),
  category: Joi.string().valid("media", "liner", "both").optional(),
  sort_by: Joi.string().valid("created_at", "version", "total_cost").optional(),
  sort_order: Joi.string().valid("asc", "desc").optional(),
});

export const bomIdSchema = Joi.object({
  id: Joi.number().required().messages({
    "number.base": "BOM ID must be a valid number",
    "any.required": "BOM ID is required",
  }),
});

// Material Requirements validation schemas
export const materialRequirementsQuerySchema = Joi.object({
  work_order_id: Joi.number().optional(),
  status: Joi.string().valid("", "pending", "allocated", "short", "fulfilled", "cancelled").optional(),
  priority: Joi.number().integer().min(1).optional(),
  material_id: Joi.number().optional(),
  required_date_from: Joi.date().optional(),
  required_date_to: Joi.date().optional(),
  sort_by: Joi.string().valid("required_date", "priority", "status").optional(),
  sort_order: Joi.string().valid("asc", "desc").optional(),
});

export const updateMaterialRequirementStatusSchema = Joi.object({
  status: Joi.string().valid("pending", "allocated", "short", "fulfilled", "cancelled").required().messages({
    "any.only": "Status must be one of: pending, allocated, short, fulfilled, cancelled",
    "any.required": "Status is required",
  }),
  notes: Joi.string().max(1000).allow("").optional().default(""),
});

// Bulk operations
export const bulkUpdateMaterialRequirementStatusSchema = Joi.object({
  requirement_ids: Joi.array().items(Joi.number()).min(1).required().messages({
    "array.min": "At least one requirement ID is required",
    "any.required": "Requirement IDs are required",
  }),
  status: Joi.string().valid("pending", "allocated", "short", "fulfilled", "cancelled").required().messages({
    "any.only": "Status must be one of: pending, allocated, short, fulfilled, cancelled",
    "any.required": "Status is required",
  }),
  notes: Joi.string().max(1000).allow("").optional().default(""),
});

// Material allocation
export const allocateMaterialsSchema = Joi.object({
  allocated_quantity: Joi.number().positive().precision(4).required().messages({
    "number.positive": "Allocated quantity must be positive",
    "number.precision": "Allocated quantity must have at most 4 decimal places",
    "any.required": "Allocated quantity is required",
  }),
  allocated_from_location: Joi.string().max(255).required().messages({
    "string.max": "Location must not exceed 255 characters",
    "any.required": "Allocation location is required",
  }),
  notes: Joi.string().max(1000).allow("").optional().default(""),
});

// Material consumption
export const consumeMaterialsSchema = Joi.object({
  consumed_quantity: Joi.number().positive().precision(4).required().messages({
    "number.positive": "Consumed quantity must be positive",
    "number.precision": "Consumed quantity must have at most 4 decimal places",
    "any.required": "Consumed quantity is required",
  }),
  wastage_quantity: Joi.number().min(0).precision(4).optional().messages({
    "number.min": "Wastage quantity must be non-negative",
    "number.precision": "Wastage quantity must have at most 4 decimal places",
  }),
  wastage_reason: Joi.string().max(500).allow("").optional(),
  notes: Joi.string().max(1000).allow("").optional().default(""),
});

// Material shortage resolution
export const resolveShortageSchema = Joi.object({
  resolved_action: Joi.string()
    .valid("purchase", "substitute", "delay", "split", "cancelled")
    .required()
    .messages({
      "any.only": "Resolved action must be one of: purchase, substitute, delay, split, cancelled",
      "any.required": "Resolved action is required",
    }),
  notes: Joi.string().max(1000).allow("").optional().default(""), 
});
