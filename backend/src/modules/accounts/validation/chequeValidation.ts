import Joi from 'joi';

export const createChequeSchema = Joi.object({
  cheque_no: Joi.string().max(50).required(),
  cheque_date: Joi.date().iso().required(),
  instrument_type: Joi.string().valid('cheque', 'pay_order').optional(),
  bank_account_id: Joi.number().integer().positive().optional().allow(null),
  drawee_bank_name: Joi.string().max(255).optional().allow('', null),
  payee: Joi.string().max(255).required(),
  amount: Joi.number().min(0).required(),
  currency: Joi.string().max(10).optional().allow('', null),
  voucher_id: Joi.number().integer().positive().optional().allow(null),
  memo: Joi.string().max(1000).optional().allow('', null),
});

export const updateChequeStatusSchema = Joi.object({
  status: Joi.string().valid('issued', 'cleared', 'bounced', 'cancelled').required(),
  cleared_date: Joi.date().iso().optional().allow(null),
});

export const getChequesQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(200).optional(),
  status: Joi.string().valid('issued', 'cleared', 'bounced', 'cancelled').optional(),
  instrument_type: Joi.string().valid('cheque', 'pay_order').optional(),
  bank_account_id: Joi.number().integer().positive().optional(),
  search: Joi.string().max(100).optional().allow(''),
});
