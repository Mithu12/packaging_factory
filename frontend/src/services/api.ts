const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`,
      response.status,
      errorData.error?.details
    );
  }

  const data = await response.json();
  return data.data || data;
}

export class ApiService {
  private static async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      return await handleResponse<T>(response);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        'Network error occurred',
        0,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  // Supplier API methods
  static async getSuppliers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    status?: 'active' | 'inactive';
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const searchParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString());
        }
      });
    }

    const queryString = searchParams.toString();
    const endpoint = `/suppliers${queryString ? `?${queryString}` : ''}`;
    
    return this.request<{
      suppliers: Supplier[];
      total: number;
      page: number;
      limit: number;
    }>(endpoint);
  }

  static async getSupplier(id: number) {
    return this.request<Supplier>(`/suppliers/${id}`);
  }

  static async createSupplier(data: CreateSupplierRequest) {
    return this.request<Supplier>('/suppliers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async updateSupplier(id: number, data: UpdateSupplierRequest) {
    return this.request<Supplier>(`/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async deleteSupplier(id: number) {
    return this.request<void>(`/suppliers/${id}`, {
      method: 'DELETE',
    });
  }

  static async toggleSupplierStatus(id: number) {
    return this.request<Supplier>(`/suppliers/${id}/toggle-status`, {
      method: 'PATCH',
    });
  }

  static async getSupplierStats() {
    return this.request<SupplierStats>('/suppliers/stats');
  }

  static async getSupplierCategories() {
    return this.request<string[]>('/suppliers/categories');
  }

  static async searchSuppliers(query: string, limit: number = 10) {
    return this.request<Supplier[]>(`/suppliers/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  }

  // Category API methods
  static async getCategories(params?: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const searchParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString());
        }
      });
    }

    const queryString = searchParams.toString();
    const endpoint = `/categories${queryString ? `?${queryString}` : ''}`;
    
    return this.request<{
      categories: Category[];
      total: number;
      page: number;
      limit: number;
    }>(endpoint);
  }

  static async getCategory(id: number) {
    return this.request<Category>(`/categories/${id}`);
  }

  static async createCategory(data: CreateCategoryRequest) {
    return this.request<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async updateCategory(id: number, data: UpdateCategoryRequest) {
    return this.request<Category>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async deleteCategory(id: number) {
    return this.request<void>(`/categories/${id}`, {
      method: 'DELETE',
    });
  }

  static async getCategoryStats() {
    return this.request<CategoryStats>('/categories/stats');
  }

  static async searchCategories(query: string, limit: number = 10) {
    return this.request<Category[]>(`/categories/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  }

  // Subcategory API methods
  static async getSubcategories(params?: {
    page?: number;
    limit?: number;
    search?: string;
    category_id?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const searchParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString());
        }
      });
    }

    const queryString = searchParams.toString();
    const endpoint = `/categories/subcategories${queryString ? `?${queryString}` : ''}`;
    
    return this.request<{
      subcategories: Subcategory[];
      total: number;
      page: number;
      limit: number;
    }>(endpoint);
  }

  static async getSubcategory(id: number) {
    return this.request<Subcategory>(`/categories/subcategories/${id}`);
  }

  static async createSubcategory(data: CreateSubcategoryRequest) {
    return this.request<Subcategory>('/categories/subcategories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async updateSubcategory(id: number, data: UpdateSubcategoryRequest) {
    return this.request<Subcategory>(`/categories/subcategories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async deleteSubcategory(id: number) {
    return this.request<void>(`/categories/subcategories/${id}`, {
      method: 'DELETE',
    });
  }

  static async searchSubcategories(query: string, limit: number = 10) {
    return this.request<Subcategory[]>(`/categories/subcategories/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  }

  // Product API methods
  static async getProducts(params?: {
    page?: number;
    limit?: number;
    search?: string;
    category_id?: number;
    subcategory_id?: number;
    supplier_id?: number;
    status?: string;
    low_stock?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const searchParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString());
        }
      });
    }

    const queryString = searchParams.toString();
    const endpoint = `/products${queryString ? `?${queryString}` : ''}`;
    
    return this.request<{
      products: Product[];
      total: number;
      page: number;
      limit: number;
    }>(endpoint);
  }

  static async getProduct(id: number) {
    return this.request<ProductWithDetails>(`/products/${id}`);
  }

  static async createProduct(data: CreateProductRequest) {
    return this.request<Product>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async updateProduct(id: number, data: UpdateProductRequest) {
    return this.request<Product>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async deleteProduct(id: number) {
    return this.request<void>(`/products/${id}`, {
      method: 'DELETE',
    });
  }

  static async toggleProductStatus(id: number) {
    return this.request<Product>(`/products/${id}/toggle-status`, {
      method: 'PATCH',
    });
  }

  static async updateProductStock(id: number, data: StockAdjustmentRequest) {
    return this.request<Product>(`/products/${id}/stock`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  static async getProductStats() {
    return this.request<ProductStats>('/products/stats');
  }

  static async searchProducts(query: string, limit: number = 10) {
    return this.request<Product[]>(`/products/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  }

  static async getLowStockProducts() {
    return this.request<Product[]>('/products/low-stock');
  }

  static async getProductsByCategory(categoryId: number) {
    return this.request<Product[]>(`/products/category/${categoryId}`);
  }

  static async getProductsBySupplier(supplierId: number) {
    return this.request<Product[]>(`/products/supplier/${supplierId}`);
  }

  static async checkProductReferences(id: number) {
    return this.request<{
      hasReferences: boolean;
      references: {
        purchase_order_items: number;
        inventory_transactions: number;
      };
    }>(`/products/${id}/references`);
  }
}

// Types
export interface Supplier {
  id: number;
  supplier_code: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  category?: string;
  tax_id?: string;
  vat_id?: string;
  payment_terms?: string;
  bank_name?: string;
  bank_account?: string;
  bank_routing?: string;
  swift_code?: string;
  iban?: string;
  status: 'active' | 'inactive';
  rating: number;
  total_orders: number;
  last_order_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierRequest {
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  category?: string;
  tax_id?: string;
  vat_id?: string;
  payment_terms?: string;
  bank_name?: string;
  bank_account?: string;
  bank_routing?: string;
  swift_code?: string;
  iban?: string;
  status?: string; // active, inactive
  notes?: string;
}

export interface UpdateSupplierRequest extends Partial<CreateSupplierRequest> {
  rating?: number;
  total_orders?: number;
  last_order_date?: string;
}

export interface SupplierStats {
  total_suppliers: number;
  active_suppliers: number;
  inactive_suppliers: number;
  categories_count: number;
  average_rating: number;
}

// Category Types
export interface Category {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  subcategories?: Subcategory[];
}

export interface Subcategory {
  id: number;
  name: string;
  description?: string;
  category_id: number;
  created_at: string;
  updated_at: string;
  category_name?: string;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
}

export interface UpdateCategoryRequest extends Partial<CreateCategoryRequest> {}

export interface CreateSubcategoryRequest {
  name: string;
  description?: string;
  category_id: number;
}

export interface UpdateSubcategoryRequest extends Partial<CreateSubcategoryRequest> {}

export interface CategoryStats {
  total_categories: number;
  total_subcategories: number;
  categories_with_subcategories: number;
  average_subcategories_per_category: number;
}

// Product Types
export interface Product {
  id: number;
  product_code: string;
  sku: string;
  name: string;
  description?: string;
  category_id: number;
  subcategory_id?: number;
  unit_of_measure: string;
  cost_price: number;
  selling_price: number;
  current_stock: number;
  min_stock_level: number;
  max_stock_level?: number;
  supplier_id: number;
  status: 'active' | 'inactive' | 'discontinued' | 'out_of_stock';
  barcode?: string;
  weight?: number;
  dimensions?: string;
  tax_rate?: number;
  reorder_point?: number;
  reorder_quantity?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  category_name?: string;
  subcategory_name?: string;
  supplier_name?: string;
}

export interface ProductWithDetails extends Product {
  category: {
    id: number;
    name: string;
  };
  subcategory?: {
    id: number;
    name: string;
  };
  supplier: {
    id: number;
    name: string;
    supplier_code: string;
  };
}

export interface CreateProductRequest {
  sku: string;
  name: string;
  description?: string;
  category_id: number;
  subcategory_id?: number;
  unit_of_measure: string;
  cost_price: number;
  selling_price: number;
  current_stock: number;
  min_stock_level: number;
  max_stock_level?: number;
  supplier_id: number;
  status?: 'active' | 'inactive' | 'discontinued' | 'out_of_stock';
  barcode?: string;
  weight?: number;
  dimensions?: string;
  tax_rate?: number;
  reorder_point?: number;
  reorder_quantity?: number;
  notes?: string;
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {}

export interface ProductStats {
  total_products: number;
  active_products: number;
  inactive_products: number;
  discontinued_products: number;
  out_of_stock_products: number;
  low_stock_products: number;
  total_inventory_value: number;
  average_cost_price: number;
  average_selling_price: number;
  categories_count: number;
  suppliers_count: number;
}

export interface StockAdjustmentRequest {
  product_id: number;
  adjustment_type: 'increase' | 'decrease' | 'set';
  quantity: number;
  reason: string;
  reference?: string;
  notes?: string;
}

export { ApiError };
