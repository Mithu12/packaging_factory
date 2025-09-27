import Joi from 'joi';
import { VoucherType, VoucherStatus } from '@/types/accounts';

// Base voucher validation schema
const voucherBaseSchema = Joi.object({
  type: Joi.string().valid(...Object.values(VoucherType)).required(),
  date: Joi.date().iso().required(),
  reference: Joi.string().max(255).optional().allow(''),
  payee: Joi.string().max(255).optional().allow(''),
  narration: Joi.string().max(1000).required(),
  costCenterId: Joi.number().integer().positive().optional(),
});

// Voucher line validation schema
const voucherLineSchema = Joi.object({
  accountId: Joi.number().integer().positive().required(),
  debit: Joi.number().min(0).precision(2).required(),
  credit: Joi.number().min(0).precision(2).required(),
  costCenterId: Joi.number().integer().positive().optional(),
  description: Joi.string().max(500).optional().allow(''),
}).custom((value, helpers) => {
  // Ensure either debit or credit is non-zero, but not both
  if (value.debit > 0 && value.credit > 0) {
    return helpers.error('custom.debitCreditBoth');
  }
  if (value.debit === 0 && value.credit === 0) {
    return helpers.error('custom.debitCreditNone');
  }
  return value;
}, 'Debit/Credit validation').messages({
  'custom.debitCreditBoth': 'A line cannot have both debit and credit amounts',
  'custom.debitCreditNone': 'A line must have either a debit or credit amount'
});

// Create voucher validation schema
export const createVoucherSchema = voucherBaseSchema.keys({
  lines: Joi.array().items(voucherLineSchema).min(2).required()
}).custom((value, helpers) => {
  // Validate that debits equal credits
  const totalDebits = value.lines.reduce((sum: number, line: any) => sum + line.debit, 0);
  const totalCredits = value.lines.reduce((sum: number, line: any) => sum + line.credit, 0);
  
  if (Math.abs(totalDebits - totalCredits) > 0.01) { // Allow for small rounding differences
    return helpers.error('custom.unbalanced');
  }
  
  return value;
}, 'Voucher balance validation').messages({
  'custom.unbalanced': 'Total debits must equal total credits'
});

// Update voucher validation schema
export const updateVoucherSchema = Joi.object({
  date: Joi.date().iso().optional(),
  reference: Joi.string().max(255).optional().allow(''),
  payee: Joi.string().max(255).optional().allow(''),
  narration: Joi.string().max(1000).optional(),
  costCenterId: Joi.number().integer().positive().optional(),
  status: Joi.string().valid(...Object.values(VoucherStatus)).optional(),
  lines: Joi.array().items(
    voucherLineSchema.keys({
      id: Joi.number().integer().positive().optional()
    })
  ).min(2).optional()
}).custom((value, helpers) => {
  // If lines are provided, validate balance
  if (value.lines) {
    const totalDebits = value.lines.reduce((sum: number, line: any) => sum + line.debit, 0);
    const totalCredits = value.lines.reduce((sum: number, line: any) => sum + line.credit, 0);
    
    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      return helpers.error('custom.unbalanced');
    }
  }
  
  return value;
}, 'Voucher balance validation').messages({
  'custom.unbalanced': 'Total debits must equal total credits'
});

// Query parameters validation schema
export const getVouchersQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(1000).default(50),
  search: Joi.string().max(255).optional().allow(''),
  type: Joi.string().valid(...Object.values(VoucherType)).optional(),
  status: Joi.string().valid(...Object.values(VoucherStatus)).optional(),
  costCenterId: Joi.number().integer().positive().optional(),
  dateFrom: Joi.date().iso().optional(),
  dateTo: Joi.date().iso().optional(),
  sortBy: Joi.string().valid('id', 'voucherNo', 'date', 'amount', 'status', 'created_at').default('created_at'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
}).custom((value, helpers) => {
  // Validate date range
  if (value.dateFrom && value.dateTo && new Date(value.dateFrom) > new Date(value.dateTo)) {
    return helpers.error('custom.invalidDateRange');
  }
  return value;
}, 'Date range validation').messages({
  'custom.invalidDateRange': 'dateFrom must be before dateTo'
});
