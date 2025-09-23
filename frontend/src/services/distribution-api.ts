import { makeRequest } from './api-utils';

// Distribution Types (frontend version)
export interface DistributionCenter {
  id: number;
  code: string;
  name: string;
  type: 'warehouse' | 'distribution_center' | 'retail_store' | 'cross_dock';
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  contact_person?: string;
  phone?: string;
  email?: string;
  capacity_volume?: number;
  capacity_weight?: number;
  operating_hours?: Record<string, { open: string; close: string }>;
  facilities?: string[];
  status: 'active' | 'inactive' | 'maintenance';
  is_primary: boolean;
  manager_id?: number;
  manager_name?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDistributionCenterRequest {
  name: string;
  type?: 'warehouse' | 'distribution_center' | 'retail_store' | 'cross_dock';
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  contact_person?: string;
  phone?: string;
  email?: string;
  capacity_volume?: number;
  capacity_weight?: number;
  operating_hours?: Record<string, { open: string; close: string }>;
  facilities?: string[];
  manager_id?: number;
  notes?: string;
}

export interface UpdateDistributionCenterRequest extends Partial<CreateDistributionCenterRequest> {
  status?: 'active' | 'inactive' | 'maintenance';
  is_primary?: boolean;
}

export interface ProductLocation {
  id: number;
  product_id: number;
  distribution_center_id: number;
  current_stock: number;
  reserved_stock: number;
  available_stock: number;
  min_stock_level: number;
  max_stock_level?: number;
  reorder_point?: number;
  location_in_warehouse?: string;
  last_count_date?: string;
  last_movement_date?: string;
  status: 'active' | 'inactive' | 'blocked';
  created_at: string;
  updated_at: string;
  // Joined fields
  product_name?: string;
  product_sku?: string;
  center_name?: string;
  center_type?: string;
}

export interface CreateProductLocationRequest {
  product_id: number;
  distribution_center_id: number;
  current_stock: number;
  min_stock_level?: number;
  max_stock_level?: number;
  reorder_point?: number;
  location_in_warehouse?: string;
}

export interface UpdateProductLocationRequest extends Partial<CreateProductLocationRequest> {
  status?: 'active' | 'inactive' | 'blocked';
}

export interface StockTransfer {
  id: number;
  transfer_number: string;
  product_id: number;
  from_center_id?: number;
  to_center_id: number;
  quantity: number;
  unit_cost?: number;
  total_cost?: number;
  request_date: string;
  shipped_date?: string;
  received_date?: string;
  status: 'pending' | 'approved' | 'shipped' | 'in_transit' | 'received' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  requested_by: number;
  approved_by?: number;
  shipped_by?: number;
  received_by?: number;
  tracking_number?: string;
  carrier?: string;
  shipping_cost?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  product_name?: string;
  product_sku?: string;
  from_center_name?: string;
  to_center_name?: string;
  requested_by_name?: string;
  approved_by_name?: string;
}

export interface DistributionCenterStats {
  id: number;
  name: string;
  type: string;
  status: string;
  total_products: number;
  total_stock: number;
  total_inventory_value: number;
  low_stock_products: number;
  outbound_transfers: number;
  inbound_transfers: number;
}

export interface ProductAllocationView {
  product_id: number;
  sku: string;
  product_name: string;
  distribution_center_id: number;
  center_name: string;
  center_type: string;
  city?: string;
  state?: string;
  available_stock: number;
  reserved_stock: number;
  current_stock: number;
  latitude?: number;
  longitude?: number;
  stock_status: 'out_of_stock' | 'low_stock' | 'in_stock';
}

export interface AllocationRequest {
  product_id: number;
  quantity: number;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  preferred_center_ids?: number[];
  delivery_location?: {
    latitude: number;
    longitude: number;
  };
}

export interface AllocationResult {
  product_id: number;
  allocations: {
    distribution_center_id: number;
    center_name: string;
    quantity: number;
    available_stock: number;
    distance_score?: number;
    confidence: number;
  }[];
  total_allocated: number;
  total_requested: number;
  is_fully_allocated: boolean;
  reasons: string[];
}

// Query Parameters
export interface DistributionCenterQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  status?: string;
  city?: string;
  state?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ProductLocationQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  distribution_center_id?: number;
  product_id?: number;
  status?: string;
  stock_status?: 'low_stock' | 'out_of_stock' | 'in_stock';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface StockTransferQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  product_id?: number;
  from_center_id?: number;
  to_center_id?: number;
  status?: string;
  priority?: string;
  date_from?: string;
  date_to?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// API Service Class
export class DistributionApi {
  private static baseUrl = '/distribution';

  // =====================================================
  // Distribution Centers
  // =====================================================

  static async getDistributionCenters(params?: DistributionCenterQueryParams) {
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
      centers: DistributionCenter[];
      total: number;
      page: number;
      totalPages: number;
    }>(`${this.baseUrl}/centers${queryString ? `?${queryString}` : ''}`);
  }

  static async getDistributionCenterStats() {
    return makeRequest<DistributionCenterStats[]>(`${this.baseUrl}/centers/stats`);
  }

  static async getDistributionCenter(id: number) {
    return makeRequest<DistributionCenter>(`${this.baseUrl}/centers/${id}`);
  }

  static async createDistributionCenter(data: CreateDistributionCenterRequest) {
    return makeRequest<DistributionCenter>(`${this.baseUrl}/centers`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  static async updateDistributionCenter(id: number, data: UpdateDistributionCenterRequest) {
    return makeRequest<DistributionCenter>(`${this.baseUrl}/centers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  static async deleteDistributionCenter(id: number) {
    return makeRequest<{ message: string }>(`${this.baseUrl}/centers/${id}`, {
      method: 'DELETE'
    });
  }

  static async setPrimaryDistributionCenter(id: number) {
    return makeRequest<{ message: string }>(`${this.baseUrl}/centers/${id}/set-primary`, {
      method: 'POST'
    });
  }

  // =====================================================
  // Product Locations
  // =====================================================

  static async getProductLocations(params?: ProductLocationQueryParams) {
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
      locations: ProductLocation[];
      total: number;
      page: number;
      totalPages: number;
    }>(`${this.baseUrl}/locations${queryString ? `?${queryString}` : ''}`);
  }

  static async getProductAllocationView() {
    return makeRequest<ProductAllocationView[]>(`${this.baseUrl}/locations/allocation-view`);
  }

  static async getProductLocation(id: number) {
    return makeRequest<ProductLocation>(`${this.baseUrl}/locations/${id}`);
  }

  static async getProductLocationsByProduct(productId: number) {
    return makeRequest<ProductLocation[]>(`${this.baseUrl}/locations/product/${productId}`);
  }

  static async createProductLocation(data: CreateProductLocationRequest) {
    return makeRequest<ProductLocation>(`${this.baseUrl}/locations`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  static async updateProductLocation(id: number, data: UpdateProductLocationRequest) {
    return makeRequest<ProductLocation>(`${this.baseUrl}/locations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  static async adjustStock(id: number, adjustment: number, reason: string) {
    return makeRequest<ProductLocation>(`${this.baseUrl}/locations/${id}/adjust-stock`, {
      method: 'POST',
      body: JSON.stringify({ adjustment, reason })
    });
  }

  static async allocateProduct(request: AllocationRequest) {
    return makeRequest<AllocationResult>(`${this.baseUrl}/locations/allocate`, {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  static async bulkCreateProductLocations(productId: number, centerIds: number[], initialStock: number = 0) {
    return makeRequest<ProductLocation[]>(`${this.baseUrl}/locations/bulk-create`, {
      method: 'POST',
      body: JSON.stringify({
        product_id: productId,
        center_ids: centerIds,
        initial_stock: initialStock
      })
    });
  }
}
