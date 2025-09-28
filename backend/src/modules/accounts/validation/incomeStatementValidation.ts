import Joi from 'joi';

// Income statement query validation schema
export const getIncomeStatementQuerySchema = Joi.object({
  dateFrom: Joi.date().iso().optional(),
  dateTo: Joi.date().iso().optional(),
  costCenterId: Joi.number().integer().positive().optional(),
  scenario: Joi.string().valid('actual', 'budget', 'forecast').default('actual'),
});
