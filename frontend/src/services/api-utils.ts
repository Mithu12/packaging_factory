import { ApiError } from './types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:9000/api';

export async function handleResponse<T>(response: Response): Promise<T> {
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

export async function makeRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const config: RequestInit = {
    ...options,
  };

  // Only set Content-Type for non-FormData requests
  if (!(options.body instanceof FormData)) {
    config.headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
  } else {
    // For FormData, let the browser set the Content-Type with boundary
    config.headers = {
      ...options.headers,
    };
  }

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
      error
    );
  }
}
