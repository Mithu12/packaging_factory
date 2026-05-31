import Joi from "joi";

export const createPreProductionEntrySchema = Joi.object({
  production_type: Joi.string()
    .valid("printing", "corrugation_media", "corrugation_liner")
    .required()
    .messages({
      "any.only":
        "Production type must be one of: printing, corrugation_media, corrugation_liner",
      "any.required": "Production type is required",
    }),
  raw_material_id: Joi.number().integer().positive().required().messages({
    "number.base": "Raw material is required",
    "any.required": "Raw material is required",
  }),
  raw_consumed_quantity: Joi.number().positive().precision(4).required().messages({
    "number.positive": "Consumed quantity must be positive",
    "any.required": "Consumed quantity is required",
  }),
  finished_product_id: Joi.number().integer().positive().required().messages({
    "number.base": "Finished product is required",
    "any.required": "Finished product is required",
  }),
  finished_produced_quantity: Joi.number().positive().precision(4).required().messages({
    "number.positive": "Produced quantity must be positive",
    "any.required": "Produced quantity is required",
  }),
  distribution_center_id: Joi.number().integer().positive().optional(),
  notes: Joi.string().max(1000).allow("", null).optional(),
});

export const preProductionEntryQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  production_type: Joi.string()
    .valid("printing", "corrugation_media", "corrugation_liner")
    .optional(),
  distribution_center_id: Joi.number().integer().positive().optional(),
});
