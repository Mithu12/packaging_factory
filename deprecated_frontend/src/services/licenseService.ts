import { apiClient } from './apiClient';

interface LicenseInfo {
  valid: boolean;
  clientName?: string;
  clientId?: string;
  issueDate?: string;
  expiryDate?: string;
  daysRemaining?: number;
  maxUsers?: number;
  features?: string[];
  error?: string;
}

interface MachineIdResponse {
  success: boolean;
  machineId: string;
}

interface InstallLicenseResponse {
  success: boolean;
  message: string;
  valid?: boolean;
  license?: any;
}

/**
 * License Service - Handles license validation and management
 */
class LicenseService {
  private static instance: LicenseService;
  private cachedLicenseInfo?: LicenseInfo;
  private lastCheck?: number;
  private checkInterval = 3600000; // 1 hour

  private constructor() {}

  public static getInstance(): LicenseService {
    if (!LicenseService.instance) {
      LicenseService.instance = new LicenseService();
    }
    return LicenseService.instance;
  }

  /**
   * Get current license information
   */
  async getLicenseInfo(forceRefresh: boolean = false): Promise<LicenseInfo> {
    const now = Date.now();

    // Return cached data if available and not expired
    if (
      !forceRefresh &&
      this.cachedLicenseInfo &&
      this.lastCheck &&
      now - this.lastCheck < this.checkInterval
    ) {
      return this.cachedLicenseInfo;
    }

    try {
      const response = await apiClient.get('/api/license/info');
      const licenseInfo: LicenseInfo = response.data;

      this.cachedLicenseInfo = licenseInfo;
      this.lastCheck = now;

      return licenseInfo;
    } catch (error: any) {
      console.error('Error fetching license info:', error);
      return {
        valid: false,
        error: error.response?.data?.message || 'Failed to fetch license information',
      };
    }
  }

  /**
   * Install a new license key
   */
  async installLicense(licenseKey: string): Promise<InstallLicenseResponse> {
    try {
      const response = await apiClient.post('/api/license/install', {
        licenseKey,
      });

      // Clear cache after installing new license
      this.cachedLicenseInfo = undefined;
      this.lastCheck = undefined;

      return response.data;
    } catch (error: any) {
      console.error('Error installing license:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to install license',
      };
    }
  }

  /**
   * Get machine ID for license binding
   */
  async getMachineId(): Promise<MachineIdResponse> {
    try {
      const response = await apiClient.get('/api/license/machine-id');
      return response.data;
    } catch (error: any) {
      console.error('Error getting machine ID:', error);
      return {
        success: false,
        machineId: '',
      };
    }
  }

  /**
   * Check if license is valid
   */
  async isLicenseValid(): Promise<boolean> {
    const info = await this.getLicenseInfo();
    return info.valid;
  }

  /**
   * Check if license is expiring soon
   */
  async isLicenseExpiringSoon(days: number = 30): Promise<boolean> {
    const info = await this.getLicenseInfo();
    if (!info.valid || !info.daysRemaining) {
      return false;
    }
    return info.daysRemaining <= days;
  }

  /**
   * Get days until expiry
   */
  async getDaysUntilExpiry(): Promise<number> {
    const info = await this.getLicenseInfo();
    return info.daysRemaining || 0;
  }

  /**
   * Check if a specific feature is enabled
   */
  async hasFeature(feature: string): Promise<boolean> {
    const info = await this.getLicenseInfo();
    if (!info.valid) {
      return false;
    }

    // If no features specified, all are enabled
    if (!info.features || info.features.length === 0) {
      return true;
    }

    return info.features.includes(feature);
  }

  /**
   * Clear cached license info
   */
  clearCache(): void {
    this.cachedLicenseInfo = undefined;
    this.lastCheck = undefined;
  }
}

export const licenseService = LicenseService.getInstance();
export type { LicenseInfo, MachineIdResponse, InstallLicenseResponse };

