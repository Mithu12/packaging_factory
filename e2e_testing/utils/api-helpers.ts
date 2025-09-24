import { APIRequestContext, Page } from '@playwright/test';

export class ApiHelper {
  constructor(private request: APIRequestContext) {}

  async authenticateUser(email: string, password: string): Promise<string> {
    const response = await this.request.post('/auth/login', {
      data: { email, password }
    });
    
    const data = await response.json();
    return data.token;
  }

  // Brand API helpers
  async createBrand(token: string, brandData: { name: string; description?: string; is_active?: boolean }): Promise<any> {
    const response = await this.request.post('/brands', {
      headers: { 'Authorization': `Bearer ${token}` },
      data: brandData
    });
    return response.json();
  }

  async getBrands(token: string): Promise<any> {
    const response = await this.request.get('/brands', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  }

  async getBrand(token: string, id: number): Promise<any> {
    const response = await this.request.get(`/brands/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  }

  async updateBrand(token: string, id: number, brandData: { name?: string; description?: string; is_active?: boolean }): Promise<any> {
    const response = await this.request.put(`/brands/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
      data: brandData
    });
    return response.json();
  }

  async deleteBrand(token: string, id: number): Promise<any> {
    const response = await this.request.delete(`/brands/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  }

  // Category API helpers
  async createCategory(token: string, categoryData: { name: string; description?: string }): Promise<any> {
    const response = await this.request.post('/categories', {
      headers: { 'Authorization': `Bearer ${token}` },
      data: categoryData
    });
    return response.json();
  }

  async getCategories(token: string, params?: any): Promise<any> {
    const url = new URL('/categories', this.request.baseURL);
    if (params) {
      Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    }
    
    const response = await this.request.get(url.toString(), {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  }

  async getCategory(token: string, id: number): Promise<any> {
    const response = await this.request.get(`/categories/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  }

  async updateCategory(token: string, id: number, categoryData: { name?: string; description?: string }): Promise<any> {
    const response = await this.request.put(`/categories/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
      data: categoryData
    });
    return response.json();
  }

  async deleteCategory(token: string, id: number): Promise<any> {
    const response = await this.request.delete(`/categories/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  }

  // Origin API helpers
  async createOrigin(token: string, originData: { name: string; description?: string; status?: 'active' | 'inactive' }): Promise<any> {
    const response = await this.request.post('/origins', {
      headers: { 'Authorization': `Bearer ${token}` },
      data: originData
    });
    return response.json();
  }

  async getOrigins(token: string): Promise<any> {
    const response = await this.request.get('/origins', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  }

  async getOrigin(token: string, id: number): Promise<any> {
    const response = await this.request.get(`/origins/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  }

  async updateOrigin(token: string, id: number, originData: { name?: string; description?: string; status?: 'active' | 'inactive' }): Promise<any> {
    const response = await this.request.put(`/origins/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
      data: originData
    });
    return response.json();
  }

  async deleteOrigin(token: string, id: number): Promise<any> {
    const response = await this.request.delete(`/origins/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  }
}

export class PageHelper {
  constructor(private page: Page) {}

  async login(email: string, password: string): Promise<void> {
    await this.page.goto('/login');
    await this.page.fill('[data-testid="email"]', email);
    await this.page.fill('[data-testid="password"]', password);
    await this.page.click('[data-testid="login-button"]');
    await this.page.waitForURL('/dashboard');
  }

  async logout(): Promise<void> {
    await this.page.click('[data-testid="user-menu"]');
    await this.page.click('[data-testid="logout-button"]');
    await this.page.waitForURL('/login');
  }

  async navigateTo(path: string): Promise<void> {
    await this.page.goto(path);
    await this.page.waitForLoadState('networkidle');
  }

  async waitForToast(message?: string): Promise<void> {
    const toastLocator = this.page.locator('[data-testid="toast"]');
    await toastLocator.waitFor({ state: 'visible' });
    
    if (message) {
      await this.page.locator(`[data-testid="toast"]:has-text("${message}")`).waitFor();
    }
  }

  async closeToast(): Promise<void> {
    const closeButton = this.page.locator('[data-testid="toast-close"]');
    if (await closeButton.isVisible()) {
      await closeButton.click();
    }
  }
}
