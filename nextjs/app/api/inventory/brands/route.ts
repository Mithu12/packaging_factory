// /home/m22/projects/slf/er/erp-system/nextjs/app/api/inventory/brands/route.ts
import { NextRequest } from 'next/server';
import { apiRequest } from '@/lib/api';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const params = new URLSearchParams(searchParams);
    const backendParams = new URLSearchParams();

    // Copy pagination parameters
    for (const [key, value] of params) {
      if (['page', 'limit', 'search', 'status'].includes(key)) {
        backendParams.append(key, value);
      }
    }

    const response = await apiRequest(`/api/inventory/brands?${backendParams}`, {}, request);

    if (!response.ok) {
      const errorData = await response.json();
      return Response.json(
        { success: false, error: errorData.error || 'Failed to fetch brands' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return Response.json({ success: true, ...data });
  } catch (error) {
    console.error('Error in GET /api/inventory/brands:', error);
    return Response.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await apiRequest('/api/inventory/brands', {
      method: 'POST',
      body: JSON.stringify(body)
    }, request);

    if (!response.ok) {
      const errorData = await response.json();
      return Response.json(
        { success: false, error: errorData.error || 'Failed to create brand' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return Response.json({ success: true, data: data.data });
  } catch (error) {
    console.error('Error in POST /api/inventory/brands:', error);
    return Response.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}