import Joi from 'joi';

const customerAddressSchema = Joi.object({
  street: Joi.string().optional().allow(''),
  city: Joi.string().optional().allow(''),
  state: Joi.string().optional().allow(''),
  postal_code: Joi.string().optional().allow(''),
  country: Joi.string().optional().allow(''),
  shipping_line: Joi.string().optional().allow(''),
  billing_line: Joi.string().optional().allow(''),
}).optional();

const emailOptional = Joi.alternatives()
  .try(Joi.string().email().max(255), Joi.string().valid(''), Joi.valid(null))
  .optional();

// Create customer validation schema
export const createCustomerSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  email: emailOptional,
  phone: Joi.string().max(20).optional().allow(''),
  company: Joi.string().max(255).optional().allow(''),
  address: customerAddressSchema,
  credit_limit: Joi.number().min(0).optional(),
  payment_terms: Joi.string().valid('net_15', 'net_30', 'net_45', 'net_60', 'cash_on_delivery', 'advance_payment').default('net_30'),
  is_active: Joi.boolean().optional(),
})
  .custom((value, helpers) => {
    const emailTrim =
      value.email != null && value.email !== ''
        ? String(value.email).trim()
        : '';
    const phoneTrim =
      value.phone != null ? String(value.phone).trim() : '';
    if (!emailTrim && !phoneTrim) {
      return helpers.error('custom.contactRequired');
    }
    if (!emailTrim && phoneTrim.length < 3) {
      return helpers.error('custom.phoneTooShort');
    }
    return value;
  }, 'Contact validation')
  .messages({
    'custom.contactRequired': 'Provide email or phone',
    'custom.phoneTooShort': 'Phone number is too short',
  });

// Update customer validation schema
export const updateCustomerSchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(),
  email: emailOptional,
  phone: Joi.string().max(20).optional().allow(''),
  company: Joi.string().max(255).optional().allow(''),
  address: customerAddressSchema,
  credit_limit: Joi.number().min(0).optional(),
  payment_terms: Joi.string().valid('net_15', 'net_30', 'net_45', 'net_60', 'cash_on_delivery', 'advance_payment').optional(),
  is_active: Joi.boolean().optional(),
});

// Customer ID validation schema
export const customerIdSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});
