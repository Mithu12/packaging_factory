// /home/m22/projects/slf/er/erp-system/nextjs/app/api/inventory/brands/[id]/route.ts
import { NextRequest } from 'next/server';
import { apiRequest } from '@/lib/api';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  try {
    const response = await apiRequest(`/api/inventory/brands/${resolvedParams.id}`, {}, request);

    if (!response.ok) {
      const errorData = await response.json();
      return Response.json(
        { success: false, error: errorData.error || 'Failed to fetch brand' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return Response.json({ success: true, data: data.data });
  } catch (error) {
    console.error('Error in GET /api/inventory/brands/[id]:', error);
    return Response.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  try {
    const body = await request.json();

    const response = await apiRequest(`/api/inventory/brands/${resolvedParams.id}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    }, request);

    if (!response.ok) {
      const errorData = await response.json();
      return Response.json(
        { success: false, error: errorData.error || 'Failed to update brand' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return Response.json({ success: true, data: data.data });
  } catch (error) {
    console.error('Error in PUT /api/inventory/brands/[id]:', error);
    return Response.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  try {
    const response = await apiRequest(`/api/inventory/brands/${resolvedParams.id}`, {
      method: 'DELETE'
    }, request);

    if (!response.ok) {
      const errorData = await response.json();
      return Response.json(
        { success: false, error: errorData.error || 'Failed to delete brand' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return Response.json({ success: true, data: data.data });
  } catch (error) {
    console.error('Error in DELETE /api/inventory/brands/[id]:', error);
    return Response.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}