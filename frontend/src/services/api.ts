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

export { ApiError };
