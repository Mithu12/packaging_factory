export interface Brand {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  product_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateBrandRequest {
  is_active: boolean;
  name: string;
  description?: string;
}

export interface UpdateBrandRequest {
  name?: string;
  description?: string;
  is_active?: boolean;
}

export interface BrandWithProductCount extends Brand {
  product_count: number;
}
