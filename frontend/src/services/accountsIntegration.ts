import { ApiService } from './api';
import { makeRequest } from './api-utils';

/**
 * Accounts Integration Service
 * Handles optional integration between expenses and accounts modules on the frontend
 * This service gracefully handles cases where accounts module is not available
 */

export interface AccountsIntegrationStatus {
  available: boolean;
  canIntegrate: boolean;
  voucherInfo?: { voucherId: number; voucherNo: string } | null;
}

export interface ModuleStatus {
  available: boolean;
  services: string[];
}

class AccountsIntegrationService {
  private accountsModuleAvailable: boolean | null = null;

  /**
   * Check if accounts module is available
   * This is cached after first check to avoid repeated API calls
   */
  async isAccountsModuleAvailable(): Promise<boolean> {
    if (this.accountsModuleAvailable !== null) {
      return this.accountsModuleAvailable;
    }

    try {
      // Try to access a basic accounts endpoint to check availability
      await makeRequest('/accounts/account-groups?limit=1');
      this.accountsModuleAvailable = true;
      return true;
    } catch (error) {
      // If we get a 404 or similar, accounts module is not available
      this.accountsModuleAvailable = false;
      return false;
    }
  }

  /**
   * Get accounts integration status for a specific expense
   */
  async getExpenseAccountsIntegrationStatus(expenseId: number): Promise<AccountsIntegrationStatus | null> {
    try {
      const response = await makeRequest<AccountsIntegrationStatus>(`/expenses/${expenseId}/accounts-integration`);
      return response;
    } catch (error) {
      console.warn('Failed to get accounts integration status:', error);
      return null;
    }
  }

  /**
   * Check if accounts features should be shown in the UI
   */
  async shouldShowAccountsFeatures(): Promise<boolean> {
    return await this.isAccountsModuleAvailable();
  }

  /**
   * Get chart of accounts (if available)
   */
  async getChartOfAccounts(params?: any): Promise<any[] | null> {
    if (!(await this.isAccountsModuleAvailable())) {
      return null;
    }

    try {
      const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
      const response = await makeRequest<any>(`/accounts/chart-of-accounts${queryString}`);
      return Array.isArray(response) ? response : response?.data || [];
    } catch (error) {
      console.warn('Failed to get chart of accounts:', error);
      return null;
    }
  }

  /**
   * Get cost centers (if available)
   */
  async getCostCenters(params?: any): Promise<any[] | null> {
    if (!(await this.isAccountsModuleAvailable())) {
      return null;
    }

    try {
      const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
      const response = await makeRequest<any>(`/accounts/cost-centers${queryString}`);
      return Array.isArray(response) ? response : response?.data || [];
    } catch (error) {
      console.warn('Failed to get cost centers:', error);
      return null;
    }
  }

  /**
   * Get vouchers related to expenses (if available)
   */
  async getExpenseVouchers(params?: any): Promise<any[] | null> {
    if (!(await this.isAccountsModuleAvailable())) {
      return null;
    }

    try {
      const queryParams = { ...params, type: 'Payment' };
      const queryString = `?${new URLSearchParams(queryParams).toString()}`;
      const response = await makeRequest<any>(`/accounts/vouchers${queryString}`);
      return Array.isArray(response) ? response : response?.data || [];
    } catch (error) {
      console.warn('Failed to get expense vouchers:', error);
      return null;
    }
  }

  /**
   * Reset the cached availability status (useful for testing or when module status changes)
   */
  resetAvailabilityCache(): void {
    this.accountsModuleAvailable = null;
  }
}

// Export singleton instance
export const accountsIntegrationService = new AccountsIntegrationService();

/**
 * React hook for using accounts integration
 */
export const useAccountsIntegration = () => {
  const [isAvailable, setIsAvailable] = React.useState<boolean | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const checkAvailability = async () => {
      setIsLoading(true);
      try {
        const available = await accountsIntegrationService.isAccountsModuleAvailable();
        setIsAvailable(available);
      } catch (error) {
        console.error('Failed to check accounts module availability:', error);
        setIsAvailable(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAvailability();
  }, []);

  return {
    isAvailable,
    isLoading,
    service: accountsIntegrationService
  };
};

// Import React for the hook
import React from 'react';
