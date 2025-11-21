import { SystemSettings } from '@/types/settings';

export class SettingsApi {
  static async getSystemSettings(): Promise<SystemSettings> {
    // Mock implementation that returns default system settings
    // In a real implementation, this would call an API endpoint
    try {
      const response = await fetch('/api/settings/system', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch system settings');
      }

      const data = await response.json();
      return data.data || {
        default_currency: 'USD',
        timezone: 'UTC',
        date_format: 'MM/DD/YYYY',
        number_format: 'standard'
      };
    } catch (error) {
      // Return default settings if API call fails
      console.warn('Using default system settings:', error);
      return {
        default_currency: 'USD',
        timezone: 'UTC',
        date_format: 'MM/DD/YYYY',
        number_format: 'standard'
      };
    }
  }
}