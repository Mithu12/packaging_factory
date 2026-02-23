import { apiClient } from "./apiClient";

export interface EcommerceSlider {
  id: string;
  title: string;
  description: string;
  image_url: string;
  link_url: string;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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

export const ecomApiService = {
  getAllSliders: async (): Promise<EcommerceSlider[]> => {
    const response = await apiClient.get<EcommerceSlider[]>("/ecom/sliders");
    return response.data;
  },

  getPublicSliders: async (): Promise<EcommerceSlider[]> => {
    const response = await apiClient.get<EcommerceSlider[]>("/ecom/sliders/public");
    return response.data;
  },

  getSliderById: async (id: string): Promise<EcommerceSlider> => {
    const response = await apiClient.get<EcommerceSlider>(`/ecom/sliders/${id}`);
    return response.data;
  },

  createSlider: async (data: CreateSliderRequest): Promise<EcommerceSlider> => {
    const response = await apiClient.post<EcommerceSlider>("/ecom/sliders", data);
    return response.data;
  },

  updateSlider: async (id: string, data: UpdateSliderRequest): Promise<EcommerceSlider> => {
    const response = await apiClient.patch<EcommerceSlider>(`/ecom/sliders/${id}`, data);
    return response.data;
  },

  deleteSlider: async (id: string): Promise<void> => {
    await apiClient.delete(`/ecom/sliders/${id}`);
  },

  uploadSliderImage: async (file: File): Promise<{ imageUrl: string }> => {
    const formData = new FormData();
    formData.append("image", file);
    const response = await apiClient.post<{ imageUrl: string }>("/ecom/sliders/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },
};
