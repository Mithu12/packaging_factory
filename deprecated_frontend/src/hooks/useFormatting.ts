import { useState, useEffect } from 'react';
import { SettingsApi } from '@/services/settings-api';
import { SystemSettings } from '@/services/settings-types';
import FormattingUtils from '@/utils/formatting';

export const useFormatting = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFormattingSettings();
  }, []);

  const loadFormattingSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const systemSettings = await SettingsApi.getSystemSettings();
      FormattingUtils.setSettings(systemSettings);
    } catch (err: any) {
      console.error('Error loading formatting settings:', err);
      setError(err.message || 'Failed to load formatting settings');
      // Use default settings if loading fails
      FormattingUtils.setSettings({
        default_currency: 'bdt',
        timezone: 'bdt',
        date_format: 'dd/mm/yyyy',
        number_format: 'bd'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshSettings = () => {
    loadFormattingSettings();
  };

  return {
    isLoading,
    error,
    refreshSettings,
    formatCurrency: FormattingUtils.formatCurrency.bind(FormattingUtils),
    formatNumber: FormattingUtils.formatNumber.bind(FormattingUtils),
    formatDate: FormattingUtils.formatDate.bind(FormattingUtils),
    formatDateTime: FormattingUtils.formatDateTime.bind(FormattingUtils),
    formatRelativeDate: FormattingUtils.formatRelativeDate.bind(FormattingUtils),
    getCurrencySymbol: FormattingUtils.getCurrencySymbol.bind(FormattingUtils),
    getCurrencyName: FormattingUtils.getCurrencyName.bind(FormattingUtils),
    formatPercentage: FormattingUtils.formatPercentage.bind(FormattingUtils),
    formatFileSize: FormattingUtils.formatFileSize.bind(FormattingUtils),
    parseDate: FormattingUtils.parseDate.bind(FormattingUtils),
    getTimezoneOffset: FormattingUtils.getTimezoneOffset.bind(FormattingUtils),
    toLocalTime: FormattingUtils.toLocalTime.bind(FormattingUtils),
    getSettings: FormattingUtils.getSettings.bind(FormattingUtils)
  };
};
