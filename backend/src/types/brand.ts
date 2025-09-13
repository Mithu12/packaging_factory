export interface Brand {
  id: number;
  name: string;
  description?: string;
  status: 'active' | 'inactive';
  product_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateBrandRequest {
  name: string;
  description?: string;
  status?: 'active' | 'inactive';
}

export interface UpdateBrandRequest {
  name?: string;
  description?: string;
  status?: 'active' | 'inactive';
}

export interface BrandWithProductCount extends Brand {
  product_count: number;
}
