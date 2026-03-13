import Joi from 'joi';

// Validation for creating/updating a single setting
export const validateSettings = (data: any) => {
  const schema = Joi.object({
    category: Joi.string().max(50).required(),
    key: Joi.string().max(100).required(),
    value: Joi.alternatives().try(
      Joi.string(),
      Joi.number(),
      Joi.boolean(),
      Joi.object()
    ).required(),
    data_type: Joi.string().valid('string', 'number', 'boolean', 'json').optional(),
    description: Joi.string().optional(),
    is_public: Joi.boolean().optional()
  });

  return schema.validate(data);
};

// Validation for company settings
export const validateCompanySettings = (data: any) => {
  const schema = Joi.object({
    company_name: Joi.string().max(255).required(),
    company_email: Joi.string().email().max(255).required(),
    company_address: Joi.string().max(500).required(),
    phone: Joi.string().max(50).required(),
    tax_id: Joi.string().max(50).required(),
    website: Joi.string().max(255).allow('', null).optional(),
    bank_name: Joi.string().max(255).allow('', null).optional(),
    account_name: Joi.string().max(255).allow('', null).optional(),
    account_number: Joi.string().max(255).allow('', null).optional(),
    bank_branch: Joi.string().max(255).allow('', null).optional(),
    routing_number: Joi.string().max(255).allow('', null).optional(),
    facebook_url: Joi.string().max(500).allow('', null).optional()
  });

  return schema.validate(data);
};

// Validation for system settings
export const validateSystemSettings = (data: any) => {
  const schema = Joi.object({
    default_currency: Joi.string().valid('usd', 'eur', 'gbp', 'cad', 'aud', 'bdt', 'inr', 'pkr').required(),
    timezone: Joi.string().valid('est', 'pst', 'utc', 'gmt', 'cst', 'bdt', 'ist', 'pkt').required(),
    date_format: Joi.string().valid('mm-dd-yyyy', 'dd-mm-yyyy', 'yyyy-mm-dd', 'dd/mm/yyyy', 'mm/dd/yyyy').required(),
    number_format: Joi.string().valid('us', 'eu', 'in', 'bd').required()
  });

  return schema.validate(data);
};

// Validation for notification settings
export const validateNotificationSettings = (data: any) => {
  const schema = Joi.object({
    low_stock_alerts: Joi.boolean().required(),
    purchase_order_approvals: Joi.boolean().required(),
    payment_due_reminders: Joi.boolean().required(),
    supplier_performance: Joi.boolean().required(),
    system_updates: Joi.boolean().required(),
    security_alerts: Joi.boolean().required(),
    notification_emails: Joi.string().max(1000).required()
  });

  return schema.validate(data);
};

// Validation for security settings
export const validateSecuritySettings = (data: any) => {
  const schema = Joi.object({
    require_2fa: Joi.boolean().required(),
    session_timeout: Joi.boolean().required(),
    session_duration: Joi.number().min(5).max(1440).required(), // 5 minutes to 24 hours
    allow_user_registration: Joi.boolean().required(),
    email_verification_required: Joi.boolean().required(),
    default_user_role: Joi.string().valid('viewer', 'editor', 'manager', 'admin').required()
  });

  return schema.validate(data);
};

// Validation for integration settings
export const validateIntegrationSettings = (data: any) => {
  const schema = Joi.object({
    email_service_connected: Joi.boolean().required(),
    email_service_config: Joi.object({
      smtp_host: Joi.string().max(255).optional(),
      smtp_port: Joi.number().min(1).max(65535).optional(),
      smtp_user: Joi.string().max(255).optional(),
      smtp_password: Joi.string().max(255).optional()
    }).optional(),
    accounting_software_connected: Joi.boolean().required(),
    accounting_software_config: Joi.object({
      api_key: Joi.string().max(500).optional(),
      api_url: Joi.string().uri().max(500).optional()
    }).optional(),
    erp_system_connected: Joi.boolean().required(),
    erp_system_config: Joi.object({
      api_key: Joi.string().max(500).optional(),
      api_url: Joi.string().uri().max(500).optional()
    }).optional(),
    api_access_enabled: Joi.boolean().required(),
    api_key: Joi.string().max(500).optional(),
    webhook_url: Joi.string().uri().max(500).optional()
  });

  return schema.validate(data);
};
