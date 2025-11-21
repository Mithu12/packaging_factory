// app/api/rbac/roles/[id]/permissions/route.ts

import { NextRequest } from 'next/server';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const roleId = parseInt(resolvedParams.id);

  try {
    const body = await request.json();
    const { permission_ids } = body;
    
    if (!Array.isArray(permission_ids)) {
      return Response.json(
        { success: false, message: 'permission_ids must be an array' },
        { status: 400 }
      );
    }

    // In a real implementation, this would assign permissions to the role in the database
    // For now, return a mock response
    return Response.json({
      success: true,
      data: {
        role_id: roleId,
        assigned_permissions: permission_ids.length
      },
      message: `${permission_ids.length} permissions assigned to role ${roleId} successfully`
    });
  } catch (error) {
    return Response.json(
      { success: false, message: 'Invalid request body' },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const roleId = parseInt(resolvedParams.id);

  try {
    const body = await request.json();
    const { permission_ids } = body;
    
    if (!Array.isArray(permission_ids)) {
      return Response.json(
        { success: false, message: 'permission_ids must be an array' },
        { status: 400 }
      );
    }

    // In a real implementation, this would remove permissions from the role in the database
    // For now, return a mock response
    return Response.json({
      success: true,
      data: {
        role_id: roleId,
        removed_permissions: permission_ids.length
      },
      message: `${permission_ids.length} permissions removed from role ${roleId} successfully`
    });
  } catch (error) {
    return Response.json(
      { success: false, message: 'Invalid request body' },
      { status: 400 }
    );
  }
}