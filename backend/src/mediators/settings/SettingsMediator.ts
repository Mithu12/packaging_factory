import pool from "@/database/connection";
import { 
  Setting, 
  CreateSettingRequest, 
  UpdateSettingRequest, 
  SettingsByCategory,
  AllSettings,
  CompanySettings,
  SystemSettings,
  NotificationSettings,
  SecuritySettings,
  EcommerceSettings,
  IntegrationSettings
} from "@/types/settings";
import { createError } from "@/middleware/errorHandler";
import { MyLogger } from "@/utils/new-logger";

class SettingsMediator {
  
  // Get all settings
  async getAllSettings(): Promise<SettingsByCategory> {
    let action = 'Get All Settings'
    try {
      MyLogger.info(action)

      const client = await pool.connect()
      
      try {
        const query = `
          SELECT * FROM settings 
          ORDER BY category, key
        `
        const result = await client.query(query)
        
        const settings: SettingsByCategory = {}
        
        result.rows.forEach((setting: Setting) => {
          if (!settings[setting.category]) {
            settings[setting.category] = {}
          }
          
          // Parse value based on data type
          let parsedValue: any = setting.value
          if (setting.data_type === 'number' && setting.value) {
            parsedValue = parseFloat(setting.value)
          } else if (setting.data_type === 'boolean' && setting.value) {
            parsedValue = setting.value === 'true'
          } else if (setting.data_type === 'json' && setting.value) {
            try {
              parsedValue = JSON.parse(setting.value)
            } catch (e) {
              parsedValue = setting.value
            }
          }
          
          settings[setting.category][setting.key] = {
            ...setting,
            value: parsedValue
          }
        })
        
        MyLogger.success(action, { settingsCount: result.rows.length })
        return settings
        
      } finally {
        client.release()
      }
    } catch (error) {
      MyLogger.error(action, error)
      throw createError('Failed to fetch settings', 500)
    }
  }

  // Get settings by category
  async getSettingsByCategory(category: string): Promise<{ [key: string]: Setting }> {
    let action = 'Get Settings By Category'
    try {
      MyLogger.info(action, { category })

      const client = await pool.connect()
      
      try {
        const query = `
          SELECT * FROM settings 
          WHERE category = $1
          ORDER BY key
        `
        const result = await client.query(query, [category])
        
        const settings: { [key: string]: Setting } = {}
        
        result.rows.forEach((setting: Setting) => {
          // Parse value based on data type
          let parsedValue: any = setting.value
          if (setting.data_type === 'number' && setting.value) {
            parsedValue = parseFloat(setting.value)
          } else if (setting.data_type === 'boolean' && setting.value) {
            parsedValue = setting.value === 'true'
          } else if (setting.data_type === 'json' && setting.value) {
            try {
              parsedValue = JSON.parse(setting.value)
            } catch (e) {
              parsedValue = setting.value
            }
          }
          
          settings[setting.key] = {
            ...setting,
            value: parsedValue
          }
        })
        
        MyLogger.success(action, { category, settingsCount: result.rows.length })
        return settings
        
      } finally {
        client.release()
      }
    } catch (error) {
      MyLogger.error(action, error)
      throw createError('Failed to fetch settings', 500)
    }
  }

  // Get a specific setting
  async getSetting(category: string, key: string): Promise<Setting | null> {
    let action = 'Get Setting'
    try {
      MyLogger.info(action, { category, key })

      const client = await pool.connect()
      
      try {
        const query = `
          SELECT * FROM settings 
          WHERE category = $1 AND key = $2
        `
        const result = await client.query(query, [category, key])
        
        if (result.rows.length === 0) {
          return null
        }
        
        const setting = result.rows[0] as Setting
        
        // Parse value based on data type
        let parsedValue: any = setting.value
        if (setting.data_type === 'number' && setting.value) {
          parsedValue = parseFloat(setting.value)
        } else if (setting.data_type === 'boolean' && setting.value) {
          parsedValue = setting.value === 'true'
        } else if (setting.data_type === 'json' && setting.value) {
          try {
            parsedValue = JSON.parse(setting.value)
          } catch (e) {
            parsedValue = setting.value
          }
        }
        
        MyLogger.success(action, { category, key })
        return {
          ...setting,
          value: parsedValue
        }
        
      } finally {
        client.release()
      }
    } catch (error) {
      MyLogger.error(action, error)
      throw createError('Failed to fetch setting', 500)
    }
  }

  // Create or update a setting
  async setSetting(data: CreateSettingRequest): Promise<Setting> {
    let action = 'Set Setting'
    try {
      MyLogger.info(action, { category: data.category, key: data.key })

      const client = await pool.connect()
      
      try {
        await client.query('BEGIN')
        
        // Convert value to string based on data type
        let stringValue: string
        const dataType = data.data_type || 'string'
        
        if (dataType === 'json') {
          stringValue = JSON.stringify(data.value)
        } else {
          stringValue = String(data.value)
        }
        
        const upsertQuery = `
          INSERT INTO settings (category, key, value, data_type, description, is_public)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (category, key)
          DO UPDATE SET 
            value = EXCLUDED.value,
            data_type = EXCLUDED.data_type,
            description = EXCLUDED.description,
            is_public = EXCLUDED.is_public,
            updated_at = CURRENT_TIMESTAMP
          RETURNING *
        `
        
        const result = await client.query(upsertQuery, [
          data.category,
          data.key,
          stringValue,
          dataType,
          data.description || null,
          data.is_public || false
        ])
        
        await client.query('COMMIT')
        
        const setting = result.rows[0] as Setting
        
        // Parse value for response
        let parsedValue: any = setting.value
        if (setting.data_type === 'number' && setting.value) {
          parsedValue = parseFloat(setting.value)
        } else if (setting.data_type === 'boolean' && setting.value) {
          parsedValue = setting.value === 'true'
        } else if (setting.data_type === 'json' && setting.value) {
          try {
            parsedValue = JSON.parse(setting.value)
          } catch (e) {
            parsedValue = setting.value
          }
        }
        
        MyLogger.success(action, { category: data.category, key: data.key })
        return {
          ...setting,
          value: parsedValue
        }
        
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }
    } catch (error) {
      MyLogger.error(action, error)
      throw createError('Failed to set setting', 500)
    }
  }

  // Update multiple settings at once
  async updateSettings(category: string, settings: { [key: string]: any }): Promise<Setting[]> {
    let action = 'Update Settings'
    try {
      MyLogger.info(action, { category, settingsCount: Object.keys(settings).length })

      const client = await pool.connect()
      
      try {
        await client.query('BEGIN')
        
        const updatedSettings: Setting[] = []
        
        for (const [key, value] of Object.entries(settings)) {
          // Determine data type
          let dataType = 'string'
          if (typeof value === 'number') {
            dataType = 'number'
          } else if (typeof value === 'boolean') {
            dataType = 'boolean'
          } else if (typeof value === 'object') {
            dataType = 'json'
          }
          
          // Convert value to string
          let stringValue: string
          if (dataType === 'json') {
            stringValue = JSON.stringify(value)
          } else {
            stringValue = String(value)
          }
          
          const upsertQuery = `
            INSERT INTO settings (category, key, value, data_type)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (category, key)
            DO UPDATE SET 
              value = EXCLUDED.value,
              data_type = EXCLUDED.data_type,
              updated_at = CURRENT_TIMESTAMP
            RETURNING *
          `
          
          const result = await client.query(upsertQuery, [
            category,
            key,
            stringValue,
            dataType
          ])
          
          const setting = result.rows[0] as Setting
          
          // Parse value for response
          let parsedValue: any = setting.value
          if (setting.data_type === 'number' && setting.value) {
            parsedValue = parseFloat(setting.value)
          } else if (setting.data_type === 'boolean' && setting.value) {
            parsedValue = setting.value === 'true'
          } else if (setting.data_type === 'json' && setting.value) {
            try {
              parsedValue = JSON.parse(setting.value)
            } catch (e) {
              parsedValue = setting.value
            }
          }
          
          updatedSettings.push({
            ...setting,
            value: parsedValue
          })
        }
        
        await client.query('COMMIT')
        
        MyLogger.success(action, { category, updatedCount: updatedSettings.length })
        return updatedSettings
        
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }
    } catch (error) {
      MyLogger.error(action, error)
      throw createError('Failed to update settings', 500)
    }
  }

  // Delete a setting
  async deleteSetting(category: string, key: string): Promise<void> {
    let action = 'Delete Setting'
    try {
      MyLogger.info(action, { category, key })

      const client = await pool.connect()
      
      try {
        const query = `
          DELETE FROM settings 
          WHERE category = $1 AND key = $2
        `
        const result = await client.query(query, [category, key])
        
        if (result.rowCount === 0) {
          throw createError('Setting not found', 404)
        }
        
        MyLogger.success(action, { category, key })
        
      } finally {
        client.release()
      }
    } catch (error) {
      MyLogger.error(action, error)
      throw error
    }
  }

  // Initialize default settings
  async initializeDefaultSettings(): Promise<void> {
    let action = 'Initialize Default Settings'
    try {
      MyLogger.info(action)

      const defaultSettings = [
        // Company settings
        { category: 'company', key: 'company_name', value: 'Your Company Name', data_type: 'string' as const },
        { category: 'company', key: 'company_email', value: 'admin@company.com', data_type: 'string' as const },
        { category: 'company', key: 'company_address', value: 'Dhaka, Bangladesh', data_type: 'string' as const },
        { category: 'company', key: 'phone', value: '+880 1234 567890', data_type: 'string' as const },
        { category: 'company', key: 'tax_id', value: 'VAT-123456789', data_type: 'string' as const },
        { category: 'company', key: 'invoice_logo', value: '', data_type: 'string' as const, description: 'Invoice logo URL' },
        
        // System settings
        { category: 'system', key: 'default_currency', value: 'bdt', data_type: 'string' as const },
        { category: 'system', key: 'timezone', value: 'bdt', data_type: 'string' as const },
        { category: 'system', key: 'date_format', value: 'dd/mm/yyyy', data_type: 'string' as const },
        { category: 'system', key: 'number_format', value: 'bd', data_type: 'string' as const },
        
        // Notification settings
        { category: 'notifications', key: 'low_stock_alerts', value: 'true', data_type: 'boolean' as const },
        { category: 'notifications', key: 'purchase_order_approvals', value: 'true', data_type: 'boolean' as const },
        { category: 'notifications', key: 'payment_due_reminders', value: 'true', data_type: 'boolean' as const },
        { category: 'notifications', key: 'supplier_performance', value: 'false', data_type: 'boolean' as const },
        { category: 'notifications', key: 'system_updates', value: 'true', data_type: 'boolean' as const },
        { category: 'notifications', key: 'security_alerts', value: 'true', data_type: 'boolean' as const },
        { category: 'notifications', key: 'notification_emails', value: 'manager@company.com, finance@company.com', data_type: 'string' as const },
        
        // Security settings
        { category: 'security', key: 'require_2fa', value: 'false', data_type: 'boolean' as const },
        { category: 'security', key: 'session_timeout', value: 'true', data_type: 'boolean' as const },
        { category: 'security', key: 'session_duration', value: '60', data_type: 'number' as const },
        { category: 'security', key: 'allow_user_registration', value: 'false', data_type: 'boolean' as const },
        { category: 'security', key: 'email_verification_required', value: 'true', data_type: 'boolean' as const },
        { category: 'security', key: 'default_user_role', value: 'viewer', data_type: 'string' as const },
        
        // Integration settings
        { category: 'integrations', key: 'email_service_connected', value: 'true', data_type: 'boolean' as const },
        { category: 'integrations', key: 'accounting_software_connected', value: 'false', data_type: 'boolean' as const },
        { category: 'integrations', key: 'erp_system_connected', value: 'false', data_type: 'boolean' as const },
        { category: 'integrations', key: 'api_access_enabled', value: 'false', data_type: 'boolean' as const },
        { category: 'integrations', key: 'api_key', value: 'sk_test_...', data_type: 'string' as const },
        { category: 'integrations', key: 'webhook_url', value: '', data_type: 'string' as const },
        
        // E-commerce settings
        { category: 'ecommerce', key: 'auto_customer_signup', value: 'false', data_type: 'boolean' as const },
      ]

      for (const setting of defaultSettings) {
        await this.setSetting(setting)
      }
      
      MyLogger.success(action, { settingsCount: defaultSettings.length })
    } catch (error) {
      MyLogger.error(action, error)
      throw error
    }
  }
}

export default SettingsMediator;
