import Joi from "joi";

const REASON_VALUES = [
  "defective",
  "wrong_item",
  "damaged",
  "quality_issue",
  "over_supply",
  "expired",
  "other",
] as const;

const STATUS_VALUES = [
  "draft",
  "submitted",
  "approved",
  "rejected",
  "cancelled",
] as const;

const CONDITION_VALUES = ["damaged", "defective", "expired", "wrong_item", "other"] as const;

const lineItemCreateSchema = Joi.object({
  po_line_item_id: Joi.number().integer().positive().required().messages({
    "any.required": "PO line item ID is required",
  }),
  grn_line_item_id: Joi.number().integer().positive().optional(),
  return_quantity: Joi.number().positive().required().messages({
    "number.positive": "Return quantity must be positive",
    "any.required": "Return quantity is required",
  }),
  condition: Joi.string()
    .valid(...CONDITION_VALUES)
    .default("damaged"),
  notes: Joi.string().allow("").max(200).optional(),
});

const grnLinkageConsistency = (
  value: any,
  helpers: any
): any => {
  const headerHasGrn =
    value.purchase_order_receipt_id !== undefined &&
    value.purchase_order_receipt_id !== null;
  const lineItems: any[] = Array.isArray(value.line_items) ? value.line_items : [];
  for (const li of lineItems) {
    const lineHasGrn = li.grn_line_item_id !== undefined && li.grn_line_item_id !== null;
    if (headerHasGrn && !lineHasGrn) {
      return helpers.error("any.custom", {
        message:
          "When purchase_order_receipt_id is set, every line item must include grn_line_item_id",
      });
    }
    if (!headerHasGrn && lineHasGrn) {
      return helpers.error("any.custom", {
        message:
          "When purchase_order_receipt_id is not set, line items must not include grn_line_item_id",
      });
    }
  }
  return value;
};

export const createPurchaseReturnSchema = Joi.object({
  purchase_order_id: Joi.number().integer().positive().required(),
  purchase_order_receipt_id: Joi.number().integer().positive().optional(),
  return_date: Joi.date().iso().optional(),
  reason: Joi.string()
    .valid(...REASON_VALUES)
    .required(),
  reason_notes: Joi.string().allow("").max(1000).optional(),
  distribution_center_id: Joi.number().integer().positive().optional(),
  notes: Joi.string().allow("").max(1000).optional(),
  line_items: Joi.array().items(lineItemCreateSchema).min(1).required().messages({
    "array.min": "At least one line item is required",
  }),
}).custom(grnLinkageConsistency, "GRN linkage consistency");

export const updatePurchaseReturnSchema = Joi.object({
  return_date: Joi.date().iso().optional(),
  reason: Joi.string()
    .valid(...REASON_VALUES)
    .optional(),
  reason_notes: Joi.string().allow("").max(1000).optional(),
  distribution_center_id: Joi.number().integer().positive().optional(),
  notes: Joi.string().allow("").max(1000).optional(),
  line_items: Joi.array().items(lineItemCreateSchema).min(1).optional(),
});

export const approvalActionSchema = Joi.object({
  notes: Joi.string().allow("").max(1000).optional(),
});

export const cancelPurchaseReturnSchema = Joi.object({
  reason: Joi.string().min(1).max(500).required().messages({
    "any.required": "Cancellation reason is required",
  }),
});

export const purchaseReturnQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().max(100).optional(),
  status: Joi.string()
    .valid(...STATUS_VALUES)
    .optional(),
  supplier_id: Joi.number().integer().positive().optional(),
  purchase_order_id: Joi.number().integer().positive().optional(),
  start_date: Joi.date().iso().optional(),
  end_date: Joi.date().iso().optional(),
  sortBy: Joi.string()
    .valid("id", "return_number", "return_date", "total_amount", "created_at", "updated_at")
    .default("created_at"),
  sortOrder: Joi.string().valid("asc", "desc").default("desc"),
});
