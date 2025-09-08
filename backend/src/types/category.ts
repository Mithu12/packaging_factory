// backend/src/types/category.ts

export interface Subcategory {
  id: number;
  name: string;
  description?: string;
  category_id: number;
  created_at: Date;
  updated_at: Date;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
  created_at: Date;
  updated_at: Date;
  subcategories?: Subcategory[];
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

export interface CategoryQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SubcategoryQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  category_id?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CategoryStats {
  total_categories: number;
  total_subcategories: number;
  categories_with_subcategories: number;
  average_subcategories_per_category: number;
}
