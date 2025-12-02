import { SystemSettings } from '@/services/settings-types';

// Default formatting settings (Bangladesh standards)
const DEFAULT_FORMATTING: SystemSettings = {
  default_currency: 'bdt',
  timezone: 'bdt',
  date_format: 'dd/mm/yyyy',
  number_format: 'bd'
};

// Currency symbols mapping
const CURRENCY_SYMBOLS: Record<string, string> = {
  bdt: '৳',
  usd: '$',
  eur: '€',
  gbp: '£',
  inr: '₹',
  pkr: '₨',
  cad: 'C$',
  aud: 'A$'
};

// Currency names mapping
const CURRENCY_NAMES: Record<string, string> = {
  bdt: 'BDT',
  usd: 'USD',
  eur: 'EUR',
  gbp: 'GBP',
  inr: 'INR',
  pkr: 'PKR',
  cad: 'CAD',
  aud: 'AUD'
};

// Timezone offsets mapping
const TIMEZONE_OFFSETS: Record<string, number> = {
  bdt: 6,    // UTC+6
  ist: 5.5,  // UTC+5:30
  pkt: 5,    // UTC+5
  utc: 0,    // UTC+0
  gmt: 0,    // UTC+0
  est: -5,   // UTC-5
  pst: -8,   // UTC-8
  cst: -6    // UTC-6
};

class FormattingUtils {
  private static settings: SystemSettings = DEFAULT_FORMATTING;

  // Initialize formatting settings
  static setSettings(settings: SystemSettings) {
    this.settings = { ...DEFAULT_FORMATTING, ...settings };
  }

  // Get current settings
  static getSettings(): SystemSettings {
    return this.settings;
  }

  // Format currency amount
  static formatCurrency(amount: number | string, currency?: string): string {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return '0.00';

    const curr = currency || this.settings.default_currency;
    const symbol = CURRENCY_SYMBOLS[curr] || curr.toUpperCase();
    
    // Format number based on number format setting
    const formattedNumber = this.formatNumber(numAmount);
    
    // Position symbol based on currency
    if (curr === 'bdt' || curr === 'inr' || curr === 'pkr') {
      return `${symbol} ${formattedNumber}`;
    } else {
      return `${symbol}${formattedNumber}`;
    }
  }

  // Format number based on locale
  static formatNumber(number: number | string): string {
    const num = typeof number === 'string' ? parseFloat(number) : number;
    if (isNaN(num)) return '0.00';

    switch (this.settings.number_format) {
      case 'bd':
        // Bangladesh format: 1,23,456.78 (lakh/crore system)
        return this.formatBangladeshNumber(num);
      case 'in':
        // Indian format: 1,23,456.78 (lakh/crore system)
        return this.formatIndianNumber(num);
      case 'eu':
        // European format: 1.234,56
        return num.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      case 'us':
      default:
        // US format: 1,234.56
        return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  }

// Format Bangladesh number (lakh/crore system)
  private static formatBangladeshNumber(num: number): string {
    if (isNaN(num)) return "0.00";

    // Convert to string, keep decimals as-is
    const [integerPartRaw, decimalPartRaw] = num.toString().split(".");

    // Work with integer part
    let integerPart = integerPartRaw;
    const isNegative = integerPart.startsWith("-");
    if (isNegative) {
      integerPart = integerPart.slice(1); // remove negative sign for formatting
    }

    let lastThree = integerPart.slice(-3);
    let otherNumbers = integerPart.slice(0, -3);

    if (otherNumbers !== "") {
      lastThree = "," + lastThree;
    }

    const formattedInt =
        otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree;

    // Re-attach decimal part (up to original precision, or .00 if absent)
    const formattedDecimal =
        decimalPartRaw !== undefined && decimalPartRaw.length > 0
            ? "." + decimalPartRaw
            : ".00";

    return (isNegative ? "-" : "") + formattedInt + formattedDecimal;
  }


  // Format Indian number (lakh/crore system)
  private static formatIndianNumber(num: number): string {
    return this.formatBangladeshNumber(num); // Same as Bangladesh format
  }

  // Format date based on locale
  static formatDate(date: string | Date, format?: string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return 'Invalid Date';

    const formatType = format || this.settings.date_format;
    
    const day = dateObj.getDate().toString().padStart(2, '0');
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const year = dateObj.getFullYear();

    switch (formatType) {
      case 'dd/mm/yyyy':
        return `${day}/${month}/${year}`;
      case 'dd-mm-yyyy':
        return `${day}-${month}-${year}`;
      case 'mm/dd/yyyy':
        return `${month}/${day}/${year}`;
      case 'mm-dd-yyyy':
        return `${month}-${day}-${year}`;
      case 'yyyy-mm-dd':
        return `${year}-${month}-${day}`;
      default:
        return `${day}/${month}/${year}`;
    }
  }

  // Format date and time
  static formatDateTime(date: string | Date, format?: string): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return 'Invalid Date';

    const formattedDate = this.formatDate(dateObj, format);
    const time = dateObj.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    return `${formattedDate} ${time}`;
  }

  // Format relative date (e.g., "2 days ago")
  static formatRelativeDate(date: string | Date): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return 'Invalid Date';

    const now = new Date();
    const diffInMs = now.getTime() - dateObj.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));

    if (diffInDays > 0) {
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    } else if (diffInHours > 0) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else if (diffInMinutes > 0) {
      return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  }

  // Get currency symbol
  static getCurrencySymbol(currency?: string): string {
    const curr = currency || this.settings.default_currency;
    return CURRENCY_SYMBOLS[curr] || curr.toUpperCase();
  }

  // Get currency name
  static getCurrencyName(currency?: string): string {
    const curr = currency || this.settings.default_currency;
    return CURRENCY_NAMES[curr] || curr.toUpperCase();
  }

  // Format percentage
  static formatPercentage(value: number, decimals: number = 2): string {
    return `${value.toFixed(decimals)}%`;
  }

  // Format file size
  static formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  }

  // Parse date from various formats
  static parseDate(dateString: string, format?: string): Date | null {
    const formatType = format || this.settings.date_format;
    
    try {
      let day: number, month: number, year: number;
      
      switch (formatType) {
        case 'dd/mm/yyyy':
        case 'dd-mm-yyyy':
          const parts1 = dateString.split(/[\/\-]/);
          day = parseInt(parts1[0]);
          month = parseInt(parts1[1]) - 1; // Month is 0-indexed
          year = parseInt(parts1[2]);
          break;
        case 'mm/dd/yyyy':
        case 'mm-dd-yyyy':
          const parts2 = dateString.split(/[\/\-]/);
          month = parseInt(parts2[0]) - 1; // Month is 0-indexed
          day = parseInt(parts2[1]);
          year = parseInt(parts2[2]);
          break;
        case 'yyyy-mm-dd':
          const parts3 = dateString.split('-');
          year = parseInt(parts3[0]);
          month = parseInt(parts3[1]) - 1; // Month is 0-indexed
          day = parseInt(parts3[2]);
          break;
        default:
          return new Date(dateString);
      }
      
      const date = new Date(year, month, day);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  }

  // Get timezone offset
  static getTimezoneOffset(timezone?: string): number {
    const tz = timezone || this.settings.timezone;
    return TIMEZONE_OFFSETS[tz] || 0;
  }

  // Convert to local timezone
  static toLocalTime(date: string | Date, timezone?: string): Date {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const offset = this.getTimezoneOffset(timezone);
    const utc = dateObj.getTime() + (dateObj.getTimezoneOffset() * 60000);
    return new Date(utc + (offset * 3600000));
  }
}

export default FormattingUtils;
