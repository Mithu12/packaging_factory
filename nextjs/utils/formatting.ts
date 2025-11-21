class FormattingUtils {
  private static settings = {
    default_currency: 'USD',
    timezone: 'UTC',
    date_format: 'MM/DD/YYYY',
    number_format: 'standard'
  };

  static setSettings(settings: any) {
    FormattingUtils.settings = { ...FormattingUtils.settings, ...settings };
  }

  static formatCurrency(amount: number, currency?: string): string {
    const curr = currency || FormattingUtils.settings.default_currency || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr,
    }).format(amount);
  }

  static formatNumber(num: number): string {
    return new Intl.NumberFormat('en-US').format(num);
  }

  static formatDate(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString();
  }

  static formatDateTime(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString();
  }

  static formatRelativeDate(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    const now = new Date();
    const diffInSeconds = (d.getTime() - now.getTime()) / 1000;
    const diffInDays = Math.floor(diffInSeconds / 86400);

    if (Math.abs(diffInDays) < 1) {
      return 'Today';
    }

    if (diffInDays === 1) {
      return 'Tomorrow';
    } else if (diffInDays === -1) {
      return 'Yesterday';
    } else if (diffInDays < 7 && diffInDays > 1) {
      return `In ${diffInDays} days`;
    } else if (diffInDays > -7 && diffInDays < -1) {
      return `${Math.abs(diffInDays)} days ago`;
    }

    return this.formatDate(d);
  }

  static getCurrencySymbol(currency?: string): string {
    const curr = currency || FormattingUtils.settings.default_currency || 'USD';
    return Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr,
    }).format(0).replace(/\d/g, '').trim();
  }

  static getCurrencyName(currency?: string): string {
    const curr = currency || FormattingUtils.settings.default_currency || 'USD';
    return curr;
  }

  static formatPercentage(value: number): string {
    return `${(value * 100).toFixed(2)}%`;
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static parseDate(dateString: string): Date {
    return new Date(dateString);
  }

  static getTimezoneOffset(): number {
    return new Date().getTimezoneOffset();
  }

  static toLocalTime(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString();
  }

  static getSettings() {
    return { ...FormattingUtils.settings };
  }
}

export default FormattingUtils;