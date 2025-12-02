import { makeRequest } from './api-utils';
import {
  ExpenseCategory,
  CreateExpenseCategoryRequest,
  UpdateExpenseCategoryRequest,
  ExpenseCategoryQueryParams,
  ExpenseCategoryListResponse
} from './types';

export class ExpenseCategoryApi {
  private static baseUrl = '/expense-categories';

  // Get all expense categories with pagination and filtering
  static async getExpenseCategories(params?: ExpenseCategoryQueryParams): Promise<ExpenseCategoryListResponse> {
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
      console.error('Error fetching expense categories:', error);
      throw error;
    }
  }

  // Get active expense categories (for dropdowns)
  static async getActiveExpenseCategories(): Promise<ExpenseCategory[]> {
    try {
      return await makeRequest(`${this.baseUrl}/active`, { method: 'GET' });
    } catch (error) {
      console.error('Error fetching active expense categories:', error);
      throw error;
    }
  }

  // Get expense category by ID
  static async getExpenseCategory(id: number): Promise<ExpenseCategory> {
    try {
      return await makeRequest(`${this.baseUrl}/${id}`, { method: 'GET' });
    } catch (error) {
      console.error(`Error fetching expense category ${id}:`, error);
      throw error;
    }
  }

  // Create new expense category
  static async createExpenseCategory(data: CreateExpenseCategoryRequest): Promise<ExpenseCategory> {
    try {
      return await makeRequest(this.baseUrl, { 
        method: 'POST', 
        body: JSON.stringify(data) 
      });
    } catch (error) {
      console.error('Error creating expense category:', error);
      throw error;
    }
  }

  // Update expense category
  static async updateExpenseCategory(id: number, data: UpdateExpenseCategoryRequest): Promise<ExpenseCategory> {
    try {
      return await makeRequest(`${this.baseUrl}/${id}`, { 
        method: 'PUT', 
        body: JSON.stringify(data) 
      });
    } catch (error) {
      console.error(`Error updating expense category ${id}:`, error);
      throw error;
    }
  }

  // Delete expense category
  static async deleteExpenseCategory(id: number): Promise<void> {
    try {
      await makeRequest(`${this.baseUrl}/${id}`, { method: 'DELETE' });
    } catch (error) {
      console.error(`Error deleting expense category ${id}:`, error);
      throw error;
    }
  }
}
