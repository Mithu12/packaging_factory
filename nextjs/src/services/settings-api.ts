import { makeRequest } from './api-utils';
import { 
  Setting, 
  CreateSettingRequest, 
  SettingsByCategory,
  CompanySettings,
  SystemSettings,
  NotificationSettings,
  SecuritySettings,
  IntegrationSettings
} from './settings-types';

class SettingsApiService {
  private baseUrl = '/settings';

  // Get all settings
  async getAllSettings(): Promise<SettingsByCategory> {
    return makeRequest<SettingsByCategory>(`${this.baseUrl}`, {
      method: 'GET'
    });
  }

  // Get settings by category
  async getSettingsByCategory(category: string): Promise<{ [key: string]: Setting }> {
    return makeRequest<{ [key: string]: Setting }>(`${this.baseUrl}/${category}`, {
      method: 'GET'
    });
  }

  // Get a specific setting
  async getSetting(category: string, key: string): Promise<Setting> {
    return makeRequest<Setting>(`${this.baseUrl}/${category}/${key}`, {
      method: 'GET'
    });
  }

  // Create or update a setting
  async setSetting(data: CreateSettingRequest): Promise<Setting> {
    return makeRequest<Setting>(`${this.baseUrl}`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Update multiple settings in a category
  async updateSettings(category: string, settings: { [key: string]: any }): Promise<Setting[]> {
    return makeRequest<Setting[]>(`${this.baseUrl}/${category}`, {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
  }

  // Delete a setting
  async deleteSetting(category: string, key: string): Promise<void> {
    return makeRequest<void>(`${this.baseUrl}/${category}/${key}`, {
      method: 'DELETE'
    });
  }

  // Initialize default settings
  async initializeDefaultSettings(): Promise<void> {
    return makeRequest<void>(`${this.baseUrl}/initialize`, {
      method: 'POST'
    });
  }

  // Convenience methods for specific categories
  async getCompanySettings(): Promise<CompanySettings> {
    const settings = await this.getSettingsByCategory('company');
    const result: any = {};
    Object.values(settings).forEach(setting => {
      result[setting.key] = setting.value;
    });
    return result as CompanySettings;
  }

  async updateCompanySettings(settings: Partial<CompanySettings>): Promise<Setting[]> {
    return this.updateSettings('company', settings);
  }

  async getSystemSettings(): Promise<SystemSettings> {
    const settings = await this.getSettingsByCategory('system');
    const result: any = {};
    Object.values(settings).forEach(setting => {
      result[setting.key] = setting.value;
    });
    return result as SystemSettings;
  }

  async updateSystemSettings(settings: Partial<SystemSettings>): Promise<Setting[]> {
    return this.updateSettings('system', settings);
  }

  async getNotificationSettings(): Promise<NotificationSettings> {
    const settings = await this.getSettingsByCategory('notifications');
    const result: any = {};
    Object.values(settings).forEach(setting => {
      result[setting.key] = setting.value;
    });
    return result as NotificationSettings;
  }

  async updateNotificationSettings(settings: Partial<NotificationSettings>): Promise<Setting[]> {
    return this.updateSettings('notifications', settings);
  }

  async getSecuritySettings(): Promise<SecuritySettings> {
    const settings = await this.getSettingsByCategory('security');
    const result: any = {};
    Object.values(settings).forEach(setting => {
      result[setting.key] = setting.value;
    });
    return result as SecuritySettings;
  }

  async updateSecuritySettings(settings: Partial<SecuritySettings>): Promise<Setting[]> {
    return this.updateSettings('security', settings);
  }

  async getIntegrationSettings(): Promise<IntegrationSettings> {
    const settings = await this.getSettingsByCategory('integrations');
    const result: any = {};
    Object.values(settings).forEach(setting => {
      result[setting.key] = setting.value;
    });
    return result as IntegrationSettings;
  }

  async updateIntegrationSettings(settings: Partial<IntegrationSettings>): Promise<Setting[]> {
    return this.updateSettings('integrations', settings);
  }
}

export const SettingsApi = new SettingsApiService();
