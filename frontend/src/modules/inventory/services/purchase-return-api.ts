import { makeRequest } from '@/services/api-utils';
import {
  PurchaseReturn,
  PurchaseReturnWithDetails,
  PurchaseReturnQueryParams,
  PurchaseReturnStats,
  CreatePurchaseReturnRequest,
  UpdatePurchaseReturnRequest,
  EligiblePurchaseReturnLine,
} from '@/services/types';

export class PurchaseReturnApi {
  private static baseUrl = '/purchase-returns';

  static async getPurchaseReturns(params?: PurchaseReturnQueryParams): Promise<{
    purchase_returns: PurchaseReturn[];
    total: number;
    page: number;
    limit: number;
    total_pages: number;
  }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });
    }
    const url = queryParams.toString()
      ? `${this.baseUrl}?${queryParams.toString()}`
      : this.baseUrl;
    return await makeRequest(url, { method: 'GET' });
  }

  static async getPurchaseReturn(id: number): Promise<PurchaseReturnWithDetails> {
    return await makeRequest(`${this.baseUrl}/${id}`, { method: 'GET' });
  }

  static async getPurchaseReturnStats(): Promise<PurchaseReturnStats> {
    return await makeRequest(`${this.baseUrl}/stats`, { method: 'GET' });
  }

  static async searchPurchaseReturns(query: string, limit: number = 10): Promise<PurchaseReturn[]> {
    const params = new URLSearchParams({ q: query, limit: limit.toString() });
    return await makeRequest(`${this.baseUrl}/search?${params.toString()}`, { method: 'GET' });
  }

  static async getEligibleLines(
    purchaseOrderId: number,
    purchaseOrderReceiptId?: number
  ): Promise<EligiblePurchaseReturnLine[]> {
    const params = new URLSearchParams({ purchase_order_id: purchaseOrderId.toString() });
    if (purchaseOrderReceiptId) {
      params.append('purchase_order_receipt_id', purchaseOrderReceiptId.toString());
    }
    return await makeRequest(`${this.baseUrl}/eligible-lines?${params.toString()}`, {
      method: 'GET',
    });
  }

  static async createPurchaseReturn(data: CreatePurchaseReturnRequest): Promise<PurchaseReturn> {
    return await makeRequest(this.baseUrl, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async updatePurchaseReturn(
    id: number,
    data: UpdatePurchaseReturnRequest
  ): Promise<PurchaseReturn> {
    return await makeRequest(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async submitPurchaseReturn(id: number, notes?: string): Promise<PurchaseReturn> {
    return await makeRequest(`${this.baseUrl}/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  }

  static async approvePurchaseReturn(id: number, notes?: string): Promise<PurchaseReturn> {
    return await makeRequest(`${this.baseUrl}/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  }

  static async rejectPurchaseReturn(id: number, notes?: string): Promise<PurchaseReturn> {
    return await makeRequest(`${this.baseUrl}/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  }

  static async cancelPurchaseReturn(id: number, reason: string): Promise<PurchaseReturn> {
    return await makeRequest(`${this.baseUrl}/${id}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    });
  }

  static async deletePurchaseReturn(id: number): Promise<void> {
    await makeRequest(`${this.baseUrl}/${id}`, { method: 'DELETE' });
  }
}
