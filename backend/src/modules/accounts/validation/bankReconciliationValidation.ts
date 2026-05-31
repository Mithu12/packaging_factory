import Joi from 'joi';

export const reconciliationEntriesQuerySchema = Joi.object({
  bank_account_id: Joi.number().integer().positive().required(),
  statement_date: Joi.date().iso().required(),
});

export const saveReconciliationSchema = Joi.object({
  bank_account_id: Joi.number().integer().positive().required(),
  statement_date: Joi.date().iso().required(),
  statement_balance: Joi.number().required(),
  cleared_ledger_entry_ids: Joi.array().items(Joi.number().integer().positive()).default([]),
  notes: Joi.string().max(1000).optional().allow('', null),
  complete: Joi.boolean().optional(),
});

export const listReconciliationsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(200).optional(),
  bank_account_id: Joi.number().integer().positive().optional(),
  status: Joi.string().valid('in_progress', 'completed').optional(),
});
