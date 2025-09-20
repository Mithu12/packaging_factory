import { makeRequest } from './api-utils';
import {
  Product,
  ProductWithDetails,
  CreateProductRequest,
  UpdateProductRequest,
  ProductQueryParams,
  ProductStats,
  StockAdjustmentRequest
} from './types';

export class ProductApi {
  static async getProducts(params?: ProductQueryParams) {
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
      products: Product[];
      total: number;
      page: number;
      limit: number;
    }>(`/products${queryString ? `?${queryString}` : ''}`);
  }

  static async getProduct(id: number) {
    return makeRequest<ProductWithDetails>(`/products/${id}`);
  }

  static async createProduct(data: CreateProductRequest) {
    return makeRequest<Product>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async createProductWithImage(data: CreateProductRequest, imageFile?: File) {
    const formData = new FormData();
    
    // Add all product data as JSON string
    formData.append('data', JSON.stringify(data));
    
    // Add image file if provided
    if (imageFile) {
      formData.append('image', imageFile);
    }
    
    return makeRequest<Product>('/products/with-image', {
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type, let browser set it with boundary for FormData
      },
    });
  }

  static async updateProduct(id: number, data: UpdateProductRequest) {
    return makeRequest<Product>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async updateProductWithImage(id: number, data: UpdateProductRequest, imageFile?: File) {
    const formData = new FormData();
    
    // Add all product data as JSON string
    formData.append('data', JSON.stringify(data));
    
    // Add image file if provided
    if (imageFile) {
      formData.append('image', imageFile);
    }
    
    return makeRequest<Product>(`/products/${id}/with-image`, {
      method: 'PUT',
      body: formData,
      headers: {
        // Don't set Content-Type, let browser set it with boundary for FormData
      },
    });
  }

  static async updateProductImage(id: number, imageFile: File) {
    const formData = new FormData();
    formData.append('image', imageFile);
    
    return makeRequest<Product>(`/products/${id}/image`, {
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type, let browser set it with boundary for FormData
      },
    });
  }

  static async toggleProductStatus(id: number) {
    return makeRequest<Product>(`/products/${id}/toggle-status`, {
      method: 'PATCH',
    });
  }

  static async updateProductStock(id: number, data: StockAdjustmentRequest) {
    return makeRequest<Product>(`/products/${id}/stock`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  static async deleteProduct(id: number) {
    return makeRequest<{ message: string }>(`/products/${id}`, {
      method: 'DELETE',
    });
  }

  static async getProductStats() {
    return makeRequest<ProductStats>('/products/stats');
  }

  static async searchProducts(query: string, limit = 10) {
    return makeRequest<Product[]>(`/products/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  }

  static async searchProductByBarcode(barcode: string) {
    return makeRequest<Product>(`/products/barcode/${encodeURIComponent(barcode)}`);
  }

  static async getLowStockProducts() {
    return makeRequest<Product[]>('/products/low-stock');
  }

  static async getProductsByCategory(categoryId: number) {
    return makeRequest<Product[]>(`/products/category/${categoryId}`);
  }

  static async getProductsBySupplier(supplierId: number) {
    return makeRequest<Product[]>(`/products/supplier/${supplierId}`);
  }

  static async checkProductReferences(id: number) {
    return makeRequest<{
      hasReferences: boolean;
      references: {
        purchase_order_items: number;
        inventory_transactions: number;
      };
    }>(`/products/${id}/references`);
  }
}
