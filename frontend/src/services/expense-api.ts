import { makeRequest } from './api-utils';
import {
  Expense,
  CreateExpenseRequest,
  UpdateExpenseRequest,
  ExpenseQueryParams,
  ExpenseStats,
  ExpenseListResponse
} from './types';

export class ExpenseApi {
  private static baseUrl = '/expenses';

  // Get all expenses with pagination and filtering
  static async getExpenses(params?: ExpenseQueryParams): Promise<ExpenseListResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, value.toString());
          }
        });
      }

      const url = queryParams.toString() 
        ? `${this.baseUrl}?${queryParams.toString()}`
        : this.baseUrl;

      return await makeRequest(url, { method: 'GET' });
    } catch (error) {
      console.error('Error fetching expenses:', error);
      throw error;
    }
  }

  // Get expense by ID
  static async getExpense(id: number): Promise<Expense> {
    try {
      return await makeRequest(`${this.baseUrl}/${id}`, { method: 'GET' });
    } catch (error) {
      console.error(`Error fetching expense ${id}:`, error);
      throw error;
    }
  }

  // Create new expense
  static async createExpense(data: CreateExpenseRequest): Promise<Expense> {
    try {
      return await makeRequest(this.baseUrl, { 
        method: 'POST', 
        body: JSON.stringify(data) 
      });
    } catch (error) {
      console.error('Error creating expense:', error);
      throw error;
    }
  }

  // Create expense with receipt image
  static async createExpenseWithReceipt(data: CreateExpenseRequest, receiptFile?: File): Promise<Expense> {
    try {
      if (receiptFile) {
        // Use FormData for file upload
        const formData = new FormData();
        formData.append('data', JSON.stringify(data));
        formData.append('receipt', receiptFile);

        return await makeRequest(`${this.baseUrl}/with-receipt`, { 
          method: 'POST', 
          body: formData,
          headers: {} // Let browser set Content-Type for FormData
        });
      } else {
        // Fallback to regular create if no file
        return await this.createExpense(data);
      }
    } catch (error) {
      console.error('Error creating expense with receipt:', error);
      throw error;
    }
  }

  // Update expense
  static async updateExpense(id: number, data: UpdateExpenseRequest): Promise<Expense> {
    try {
      return await makeRequest(`${this.baseUrl}/${id}`, { 
        method: 'PUT', 
        body: JSON.stringify(data) 
      });
    } catch (error) {
      console.error(`Error updating expense ${id}:`, error);
      throw error;
    }
  }

  // Update expense receipt image
  static async updateExpenseReceipt(id: number, receiptFile: File): Promise<Expense> {
    try {
      const formData = new FormData();
      formData.append('receipt', receiptFile);

      return await makeRequest(`${this.baseUrl}/${id}/receipt`, { 
        method: 'POST', 
        body: formData,
        headers: {} // Let browser set Content-Type for FormData
      });
    } catch (error) {
      console.error(`Error updating expense receipt ${id}:`, error);
      throw error;
    }
  }

  // Approve expense
  static async approveExpense(id: number, notes?: string): Promise<Expense> {
    try {
      return await makeRequest(`${this.baseUrl}/${id}/approve`, { 
        method: 'PATCH', 
        body: JSON.stringify({ notes }) 
      });
    } catch (error) {
      console.error(`Error approving expense ${id}:`, error);
      throw error;
    }
  }

  // Reject expense
  static async rejectExpense(id: number, reason: string): Promise<Expense> {
    try {
      return await makeRequest(`${this.baseUrl}/${id}/reject`, { 
        method: 'PATCH', 
        body: JSON.stringify({ reason }) 
      });
    } catch (error) {
      console.error(`Error rejecting expense ${id}:`, error);
      throw error;
    }
  }

  // Mark expense as paid
  static async payExpense(id: number, notes?: string): Promise<Expense> {
    try {
      return await makeRequest(`${this.baseUrl}/${id}/pay`, { 
        method: 'PATCH', 
        body: JSON.stringify({ notes }) 
      });
    } catch (error) {
      console.error(`Error marking expense ${id} as paid:`, error);
      throw error;
    }
  }

  // Delete expense
  static async deleteExpense(id: number): Promise<void> {
    try {
      await makeRequest(`${this.baseUrl}/${id}`, { method: 'DELETE' });
    } catch (error) {
      console.error(`Error deleting expense ${id}:`, error);
      throw error;
    }
  }

  // Get account debited for an expense (from voucher for paid/approved, or preview for pending)
  static async getExpenseAccountDebited(expenseId: number): Promise<{ account: { id: number; name: string; code: string } | null }> {
    try {
      return await makeRequest(`${this.baseUrl}/${expenseId}/account-debited`, { method: 'GET' });
    } catch (error) {
      console.error('Error fetching expense account debited:', error);
      return { account: null };
    }
  }

  // Get expense account preview for category and optional cost center
  static async getExpenseAccountPreview(
    categoryId: number,
    costCenterId?: number
  ): Promise<{ account: { id: number; name: string; code: string } | null }> {
    try {
      const params = new URLSearchParams();
      params.append('category_id', categoryId.toString());
      if (costCenterId !== undefined && costCenterId !== null) {
        params.append('cost_center_id', costCenterId.toString());
      }
      return await makeRequest(`${this.baseUrl}/preview-account?${params.toString()}`, { method: 'GET' });
    } catch (error) {
      console.error('Error fetching expense account preview:', error);
      return { account: null };
    }
  }

  // Get expense statistics
  static async getExpenseStats(params?: { start_date?: string; end_date?: string; department?: string }): Promise<ExpenseStats> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, value.toString());
          }
        });
      }

      const url = queryParams.toString() 
        ? `${this.baseUrl}/stats?${queryParams.toString()}`
        : `${this.baseUrl}/stats`;

      return await makeRequest(url, { method: 'GET' });
    } catch (error) {
      console.error('Error fetching expense stats:', error);
      throw error;
    }
  }
}
