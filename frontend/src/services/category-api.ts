import { makeRequest } from './api-utils';
import {
  Category,
  Subcategory,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CreateSubcategoryRequest,
  UpdateSubcategoryRequest,
  CategoryQueryParams,
  SubcategoryQueryParams,
  CategoryStats
} from './types';

export class CategoryApi {
  // Category methods
  static async getCategories(params?: CategoryQueryParams) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    const queryString = queryParams.toString();
    return makeRequest<{
      categories: Category[];
      total: number;
      page: number;
      limit: number;
    }>(`/categories${queryString ? `?${queryString}` : ''}`);
  }

  static async getCategory(id: number) {
    return makeRequest<Category>(`/categories/${id}`);
  }

  static async createCategory(data: CreateCategoryRequest) {
    return makeRequest<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async updateCategory(id: number, data: UpdateCategoryRequest) {
    return makeRequest<Category>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async deleteCategory(id: number) {
    return makeRequest<{ message: string }>(`/categories/${id}`, {
      method: 'DELETE',
    });
  }

  static async getCategoryStats() {
    return makeRequest<CategoryStats>('/categories/stats');
  }

  static async searchCategories(query: string, limit = 10) {
    return makeRequest<Category[]>(`/categories/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  }

  // Subcategory methods
  static async getSubcategories(params?: SubcategoryQueryParams) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    const queryString = queryParams.toString();
    return makeRequest<{
      subcategories: Subcategory[];
      total: number;
      page: number;
      limit: number;
    }>(`/categories/subcategories${queryString ? `?${queryString}` : ''}`);
  }

  static async getSubcategory(id: number) {
    return makeRequest<Subcategory>(`/categories/subcategories/${id}`);
  }

  static async createSubcategory(data: CreateSubcategoryRequest) {
    return makeRequest<Subcategory>('/categories/subcategories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async updateSubcategory(id: number, data: UpdateSubcategoryRequest) {
    return makeRequest<Subcategory>(`/categories/subcategories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async deleteSubcategory(id: number) {
    return makeRequest<{ message: string }>(`/categories/subcategories/${id}`, {
      method: 'DELETE',
    });
  }

  static async searchSubcategories(query: string, limit = 10) {
    return makeRequest<Subcategory[]>(`/categories/subcategories/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  }
}
