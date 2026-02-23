export interface EcommerceSlider {
  id: string;
  title: string;
  description: string;
  image_url: string;
  link_url: string;
  order_index: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateSliderRequest {
  title: string;
  description?: string;
  image_url: string;
  link_url?: string;
  order_index?: number;
  is_active?: boolean;
}

export interface UpdateSliderRequest {
  title?: string;
  description?: string;
  image_url?: string;
  link_url?: string;
  order_index?: number;
  is_active?: boolean;
}
