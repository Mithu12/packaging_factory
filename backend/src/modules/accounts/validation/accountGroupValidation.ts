import Joi from "joi";

// Account Group validation schemas
const accountGroupBaseSchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  code: Joi.string().min(2).max(20).required(),
  category: Joi.string().valid('Assets', 'Liabilities', 'Equity', 'Revenue', 'Expenses').required(),
  parentId: Joi.number().integer().positive().optional().allow(null),
  description: Joi.string().max(1000).optional().allow(null, ""),
  status: Joi.string().valid('Active', 'Inactive').default('Active'),
});

export const createAccountGroupSchema = accountGroupBaseSchema;

export const updateAccountGroupSchema = accountGroupBaseSchema
  .keys({
    name: Joi.string().min(2).max(255).optional(),
    code: Joi.string().min(2).max(20).optional(),
    category: Joi.string().valid('Assets', 'Liabilities', 'Equity', 'Revenue', 'Expenses').optional(),
  })
  .min(1); // At least one field must be provided for update

export const getAccountGroupsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(1000).default(10),
  search: Joi.string().optional().allow(""),
  category: Joi.string().valid('Assets', 'Liabilities', 'Equity', 'Revenue', 'Expenses').optional(),
  status: Joi.string().valid('Active', 'Inactive').optional(),
  parentId: Joi.number().integer().positive().optional(),
  sortBy: Joi.string()
    .valid("id", "name", "code", "category", "created_at", "updated_at")
    .default("id"),
  sortOrder: Joi.string().valid("asc", "desc").default("asc"),
});

// Chart of Accounts validation schemas
const chartOfAccountBaseSchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  code: Joi.string().min(2).max(20).required(),
  type: Joi.string().valid('Control', 'Posting').required(),
  category: Joi.string().valid('Assets', 'Liabilities', 'Equity', 'Revenue', 'Expenses').required(),
  parentId: Joi.number().integer().positive().optional().allow(null),
  groupId: Joi.number().integer().positive().optional().allow(null),
  currency: Joi.string().length(3).default('USD'),
  status: Joi.string().valid('Active', 'Inactive').default('Active'),
  notes: Joi.string().max(1000).optional().allow(null, ""),
});

export const createChartOfAccountSchema = chartOfAccountBaseSchema;

export const updateChartOfAccountSchema = chartOfAccountBaseSchema
  .keys({
    name: Joi.string().min(2).max(255).optional(),
    code: Joi.string().min(2).max(20).optional(),
    type: Joi.string().valid('Control', 'Posting').optional(),
    category: Joi.string().valid('Assets', 'Liabilities', 'Equity', 'Revenue', 'Expenses').optional(),
  })
  .min(1); // At least one field must be provided for update

export const getChartOfAccountsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(1000).default(10),
  search: Joi.string().optional().allow(""),
  category: Joi.string().valid('Assets', 'Liabilities', 'Equity', 'Revenue', 'Expenses').optional(),
  type: Joi.string().valid('Control', 'Posting').optional(),
  status: Joi.string().valid('Active', 'Inactive').optional(),
  groupId: Joi.number().integer().positive().optional(),
  parentId: Joi.number().integer().positive().optional(),
  sortBy: Joi.string()
    .valid("id", "name", "code", "category", "type", "balance", "created_at", "updated_at")
    .default("id"),
  sortOrder: Joi.string().valid("asc", "desc").default("asc"),
});

// Cost Center validation schemas
const costCenterBaseSchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  code: Joi.string().min(2).max(20).required(),
  owner: Joi.string().max(255).optional().allow(null, ""),
  department: Joi.string().max(255).optional().allow(null, ""),
  type: Joi.string().valid('Department', 'Project', 'Location').required(),
  status: Joi.string().valid('Active', 'Inactive').default('Active'),
  budget: Joi.number().min(0).default(0),
  startDate: Joi.date().optional().allow(null),
  endDate: Joi.date().optional().allow(null),
  description: Joi.string().max(1000).optional().allow(null, ""),
});

export const createCostCenterSchema = costCenterBaseSchema;

export const updateCostCenterSchema = costCenterBaseSchema
  .keys({
    name: Joi.string().min(2).max(255).optional(),
    code: Joi.string().min(2).max(20).optional(),
    type: Joi.string().valid('Department', 'Project', 'Location').optional(),
  })
  .min(1); // At least one field must be provided for update

export const getCostCentersQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(1000).default(10),
  search: Joi.string().optional().allow(""),
  type: Joi.string().valid('Department', 'Project', 'Location').optional(),
  status: Joi.string().valid('Active', 'Inactive').optional(),
  department: Joi.string().optional().allow(""),
  sortBy: Joi.string()
    .valid("id", "name", "code", "type", "budget", "actual_spend", "created_at", "updated_at")
    .default("id"),
  sortOrder: Joi.string().valid("asc", "desc").default("asc"),
});

// Voucher validation schemas
const voucherLineSchema = Joi.object({
  accountId: Joi.number().integer().positive().required(),
  debit: Joi.number().min(0).default(0),
  credit: Joi.number().min(0).default(0),
  costCenterId: Joi.number().integer().positive().optional().allow(null),
  narration: Joi.string().max(500).optional().allow(null, ""),
});

const voucherBaseSchema = Joi.object({
  type: Joi.string().valid('Payment', 'Receipt', 'Journal', 'Balance Transfer').required(),
  date: Joi.date().required(),
  reference: Joi.string().max(255).optional().allow(null, ""),
  payee: Joi.string().max(255).optional().allow(null, ""),
  amount: Joi.number().positive().required(),
  currency: Joi.string().length(3).default('USD'),
  costCenterId: Joi.number().integer().positive().optional().allow(null),
  narration: Joi.string().min(1).max(1000).required(),
  lines: Joi.array().items(voucherLineSchema).min(2).required(),
});

export const createVoucherSchema = voucherBaseSchema;

export const updateVoucherSchema = voucherBaseSchema
  .keys({
    type: Joi.string().valid('Payment', 'Receipt', 'Journal', 'Balance Transfer').optional(),
    date: Joi.date().optional(),
    amount: Joi.number().positive().optional(),
    narration: Joi.string().min(1).max(1000).optional(),
    lines: Joi.array().items(voucherLineSchema).min(2).optional(),
  })
  .min(1); // At least one field must be provided for update

export const getVouchersQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(1000).default(10),
  search: Joi.string().optional().allow(""),
  type: Joi.string().valid('Payment', 'Receipt', 'Journal', 'Balance Transfer').optional(),
  status: Joi.string().valid('Draft', 'Pending Approval', 'Posted', 'Void').optional(),
  dateFrom: Joi.date().optional(),
  dateTo: Joi.date().optional(),
  preparedBy: Joi.number().integer().positive().optional(),
  approvedBy: Joi.number().integer().positive().optional(),
  costCenterId: Joi.number().integer().positive().optional(),
  sortBy: Joi.string()
    .valid("id", "voucher_no", "date", "amount", "status", "created_at", "updated_at")
    .default("id"),
  sortOrder: Joi.string().valid("asc", "desc").default("desc"),
});

// Ledger validation schemas
export const getLedgerQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(1000).default(10),
  accountId: Joi.number().integer().positive().optional(),
  dateFrom: Joi.date().optional(),
  dateTo: Joi.date().optional(),
  type: Joi.string().optional().allow(""),
  costCenterId: Joi.number().integer().positive().optional(),
  sortBy: Joi.string()
    .valid("date", "voucher_no", "debit", "credit", "balance", "created_at")
    .default("date"),
  sortOrder: Joi.string().valid("asc", "desc").default("desc"),
});
