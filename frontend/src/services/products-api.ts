// =====================================================
// Products Frontend API Service
// =====================================================

import { makeRequest } from '@/services/api-utils';

// =====================================================
// Types (matching backend types)
// =====================================================

export interface Product {
  id: number;
  product_code: string;
  sku: string;
  name: string;
  description?: string;
  category_id: number;
  subcategory_id?: number;
  brand_id?: number;
  unit_of_measure: string;
  cost_price: number;
  selling_price: number;
  wholesale_price?: number;
  current_stock: number;
  min_stock_level: number;
  max_stock_level: number;
  supplier_id?: number;
  status: 'active' | 'inactive' | 'discontinued';
  barcode?: string;
  weight?: number;
  tax_rate: number;
  reorder_point: number;
  reorder_quantity: number;
  warranty_period?: number;
  origin_id?: number;
  created_at: string;
  updated_at?: string;
  // Populated from joins
  category_name?: string;
  subcategory_name?: string;
  brand_name?: string;
  supplier_name?: string;
  origin_name?: string;
}

export interface ProductStats {
  total_products: number;
  active_products: number;
  low_stock_products: number;
  total_value: number;
  average_cost: number;
  top_categories: Array<{
    category_name: string;
    product_count: number;
  }>;
}

// Request/Response Types for Products
export interface ProductQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  category_id?: number;
  subcategory_id?: number;
  brand_id?: number;
  supplier_id?: number;
  status?: 'active' | 'inactive' | 'discontinued';
  low_stock?: boolean;
  sort_by?: 'name' | 'sku' | 'current_stock' | 'cost_price' | 'created_at';
  sort_order?: 'asc' | 'desc';
}

// =====================================================
// Products API Service
// =====================================================

export class ProductsApiService {
  private static readonly BASE_URL = '/products';

  // =====================================================
  // Product CRUD Operations
  // =====================================================

  // Get all products with pagination and filtering
  static async getProducts(params?: ProductQueryParams): Promise<{
    products: Product[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const queryString = params ? '?' + new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null) {
          acc[key] = String(value);
        }
        return acc;
      }, {} as Record<string, string>)
    ).toString() : '';

    return makeRequest<{
      products: Product[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`${this.BASE_URL}${queryString}`);
  }

  // Get product by ID
  static async getProductById(id: number): Promise<Product> {
    return makeRequest<Product>(`${this.BASE_URL}/${id}`);
  }

  // Get product statistics
  static async getProductStats(): Promise<ProductStats> {
    return makeRequest<ProductStats>(`${this.BASE_URL}/stats`);
  }

  // Search products
  static async searchProducts(query: string): Promise<Product[]> {
    return makeRequest<Product[]>(`${this.BASE_URL}/search?search=${encodeURIComponent(query)}`);
  }

  // Get products by category
  static async getProductsByCategory(categoryId: number): Promise<Product[]> {
    return makeRequest<Product[]>(`${this.BASE_URL}/category/${categoryId}`);
  }

  // Get low stock products
  static async getLowStockProducts(): Promise<Product[]> {
    return makeRequest<Product[]>(`${this.BASE_URL}/low-stock`);
  }
}

// =====================================================
// React Query Keys (Optional - for better integration)
// =====================================================

export const productsQueryKeys = {
  all: ['products'] as const,
  lists: () => [...productsQueryKeys.all, 'list'] as const,
  list: (params?: ProductQueryParams) => [...productsQueryKeys.lists(), params] as const,
  stats: () => [...productsQueryKeys.all, 'stats'] as const,
  detail: (id: number) => [...productsQueryKeys.all, 'detail', id] as const,
  search: (query: string) => [...productsQueryKeys.all, 'search', query] as const,
  byCategory: (categoryId: number) => [...productsQueryKeys.all, 'category', categoryId] as const,
  lowStock: () => [...productsQueryKeys.all, 'low-stock'] as const,
};

export default ProductsApiService;
