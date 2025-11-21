// /home/m22/projects/slf/er/erp-system/nextjs/app/api/inventory/purchase-orders/stats/route.ts
import { NextRequest } from 'next/server';
import { apiRequest } from '@/lib/api';

export async function GET(request: NextRequest) {
  try {
    const response = await apiRequest('/api/inventory/purchase-orders/stats', {}, request);

    if (!response.ok) {
      const errorData = await response.json();
      return Response.json(
        { success: false, error: errorData.error || 'Failed to fetch purchase order stats' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return Response.json({ success: true, data: data.data });
  } catch (error) {
    console.error('Error in GET /api/inventory/purchase-orders/stats:', error);
    return Response.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}