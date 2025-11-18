export interface Origin {
  id: number;
  name: string;
  description?: string;
  status: 'active' | 'inactive';
  created_at: Date;
  updated_at: Date;
}

export interface CreateOriginRequest {
  name: string;
  description?: string;
  status?: 'active' | 'inactive';
}

export interface UpdateOriginRequest {
  name?: string;
  description?: string;
  status?: 'active' | 'inactive';
}

export interface OriginWithProductCount extends Origin {
  product_count: number;
}
