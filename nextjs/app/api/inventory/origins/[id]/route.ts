// /home/m22/projects/slf/er/erp-system/nextjs/app/api/inventory/origins/[id]/route.ts
import { NextRequest } from 'next/server';
import { apiRequest } from '@/lib/api';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const response = await apiRequest(`/api/inventory/origins/${params.id}`, {}, request);

    if (!response.ok) {
      const errorData = await response.json();
      return Response.json(
        { success: false, error: errorData.error || 'Failed to fetch origin' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return Response.json({ success: true, data: data.data });
  } catch (error) {
    console.error('Error in GET /api/inventory/origins/[id]:', error);
    return Response.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();

    const response = await apiRequest(`/api/inventory/origins/${params.id}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    }, request);

    if (!response.ok) {
      const errorData = await response.json();
      return Response.json(
        { success: false, error: errorData.error || 'Failed to update origin' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return Response.json({ success: true, data: data.data });
  } catch (error) {
    console.error('Error in PUT /api/inventory/origins/[id]:', error);
    return Response.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const response = await apiRequest(`/api/inventory/origins/${params.id}`, {
      method: 'DELETE'
    }, request);

    if (!response.ok) {
      const errorData = await response.json();
      return Response.json(
        { success: false, error: errorData.error || 'Failed to delete origin' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return Response.json({ success: true, data: data.data });
  } catch (error) {
    console.error('Error in DELETE /api/inventory/origins/[id]:', error);
    return Response.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}