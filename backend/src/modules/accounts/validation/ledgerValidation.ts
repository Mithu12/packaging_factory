import Joi from 'joi';

// Ledger entry query validation schema
export const getLedgerEntriesQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(1000).default(50),
  accountCode: Joi.string().max(20).optional(),
  accountId: Joi.number().integer().positive().optional(),
  costCenterId: Joi.number().integer().positive().optional(),
  voucherType: Joi.string().valid('Payment', 'Receipt', 'Journal', 'Balance Transfer').optional(),
  dateFrom: Joi.date().iso().optional(),
  dateTo: Joi.date().iso().optional(),
  search: Joi.string().max(255).optional().allow(''),
  sortBy: Joi.string().valid('date', 'amount', 'voucher_no', 'account_code').default('date'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});
