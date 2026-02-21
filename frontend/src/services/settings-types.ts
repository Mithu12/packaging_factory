export interface Setting {
  id: number;
  category: string;
  key: string;
  value: string | number | boolean | object | null;
  data_type: 'string' | 'number' | 'boolean' | 'json';
  description: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSettingRequest {
  category: string;
  key: string;
  value: string | number | boolean | object;
  data_type?: 'string' | 'number' | 'boolean' | 'json';
  description?: string;
  is_public?: boolean;
}

export interface UpdateSettingRequest {
  value?: string | number | boolean | object;
  data_type?: 'string' | 'number' | 'boolean' | 'json';
  description?: string;
  is_public?: boolean;
}

export interface SettingsByCategory {
  [category: string]: {
    [key: string]: Setting;
  };
}

// Specific setting types for different categories
export interface CompanySettings {
  company_name: string;
  company_email: string;
  company_address: string;
  phone: string;
  tax_id: string;
  invoice_logo?: string;
}

export interface SystemSettings {
  default_currency: string;
  timezone: string;
  date_format: string;
  number_format: string;
}

export interface NotificationSettings {
  low_stock_alerts: boolean;
  purchase_order_approvals: boolean;
  payment_due_reminders: boolean;
  supplier_performance: boolean;
  system_updates: boolean;
  security_alerts: boolean;
  notification_emails: string;
}

export interface SecuritySettings {
  require_2fa: boolean;
  session_timeout: boolean;
  session_duration: number;
  allow_user_registration: boolean;
  email_verification_required: boolean;
  default_user_role: string;
}

export interface EcommerceSettings {
  auto_customer_signup: boolean;
}

export interface IntegrationSettings {
  email_service_connected: boolean;
  email_service_config: {
    smtp_host: string;
    smtp_port: number;
    smtp_user: string;
    smtp_password: string;
  };
  accounting_software_connected: boolean;
  accounting_software_config: {
    api_key: string;
    api_url: string;
  };
  erp_system_connected: boolean;
  erp_system_config: {
    api_key: string;
    api_url: string;
  };
  api_access_enabled: boolean;
  api_key: string;
  webhook_url: string;
}

export interface AllSettings {
  company: CompanySettings;
  system: SystemSettings;
  notifications: NotificationSettings;
  security: SecuritySettings;
  ecommerce: EcommerceSettings;
  integrations: IntegrationSettings;
}
