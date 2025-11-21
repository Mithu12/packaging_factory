// app/api/rbac/users/route.ts

import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  // Extract the path after /api/rbac/users
  const pathname = request.nextUrl.pathname;
  const path = pathname.replace('/api/rbac/users', '') || '/';
  
  if (path === '/with-permission') {
    // Handle GET /api/rbac/users/with-permission?module=X&action=Y&resource=Z
    const searchParams = request.nextUrl.searchParams;
    const module = searchParams.get('module');
    const action = searchParams.get('action');
    const resource = searchParams.get('resource');
    
    // Mock data for users with specific permission
    const mockUsersWithPermission = [
      {
        id: 1,
        username: 'admin',
        email: 'admin@company.com',
        full_name: 'System Administrator',
        is_active: true,
        last_login: new Date().toISOString(),
        role_name: 'admin',
        role_display_name: 'System Administrator',
        permission_source: 'role'
      },
      {
        id: 2,
        username: 'manager',
        email: 'manager@company.com',
        full_name: 'Jane Manager',
        is_active: true,
        last_login: new Date().toISOString(),
        role_name: 'finance_manager',
        role_display_name: 'Finance Manager',
        permission_source: 'role'
      },
      {
        id: 3,
        username: 'specialist',
        email: 'specialist@company.com',
        full_name: 'John Specialist',
        is_active: true,
        last_login: new Date().toISOString(),
        role_name: 'finance_staff',
        role_display_name: 'Finance Staff',
        permission_source: 'direct'
      }
    ];

    return Response.json({
      success: true,
      data: {
        permission: { module, action, resource },
        users: mockUsersWithPermission,
        summary: {
          total_users: mockUsersWithPermission.length,
          active_users: mockUsersWithPermission.filter(u => u.is_active).length,
          inactive_users: mockUsersWithPermission.filter(u => !u.is_active).length,
        }
      },
      message: 'Users with permission retrieved successfully'
    });
  }

  // Default case
  return Response.json({ error: 'Route not found' }, { status: 404 });
}

export async function POST(request: NextRequest) {
  // Extract the path after /api/rbac/users
  const pathname = request.nextUrl.pathname;
  
  if (pathname.includes('/users/assign-permissions')) {
    try {
      const body = await request.json();
      const { user_id, permission_ids, expires_at } = body;
      
      if (!user_id || !Array.isArray(permission_ids)) {
        return Response.json(
          { success: false, message: 'user_id and permission_ids are required' },
          { status: 400 }
        );
      }

      // In a real implementation, this would assign permissions to the user in the database
      return Response.json({
        success: true,
        data: {
          user_id,
          assigned_permissions: permission_ids.length,
          expires_at,
          assigned_by: 1 // Mock user ID of the assigner
        },
        message: `${permission_ids.length} permissions assigned to user ${user_id} successfully`
      });
    } catch (error) {
      return Response.json(
        { success: false, message: 'Invalid request body' },
        { status: 400 }
      );
    }
  }

  if (pathname.includes('/users/remove-permissions')) {
    try {
      const body = await request.json();
      const { user_id, permission_ids } = body;
      
      if (!user_id || !Array.isArray(permission_ids)) {
        return Response.json(
          { success: false, message: 'user_id and permission_ids are required' },
          { status: 400 }
        );
      }

      // In a real implementation, this would remove permissions from the user in the database
      return Response.json({
        success: true,
        data: {
          user_id,
          removed_permissions: permission_ids.length,
          removed_by: 1 // Mock user ID of the remover
        },
        message: `${permission_ids.length} permissions removed from user ${user_id} successfully`
      });
    } catch (error) {
      return Response.json(
        { success: false, message: 'Invalid request body' },
        { status: 400 }
      );
    }
  }

  if (pathname.includes('/users')) {
    try {
      const body = await request.json();
      
      // In a real implementation, this would create a new user with RBAC role
      const newUser = {
        id: Date.now(), // Mock ID
        username: body.username,
        email: body.email,
        full_name: body.full_name,
        mobile_number: body.mobile_number,
        departments: body.departments,
        role_id: body.role_id,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // RBAC specific fields
        role: 'employee',
        role_details: null,
        role_permissions: [],
        direct_permissions: [],
        all_permissions: [],
      };

      return Response.json({
        success: true,
        data: newUser,
        message: 'User created successfully'
      });
    } catch (error) {
      return Response.json(
        { success: false, message: 'Invalid request body' },
        { status: 400 }
      );
    }
  }

  return Response.json({ error: 'Route not found' }, { status: 404 });
}

export async function PUT(request: NextRequest) {
  // This route should be in [id]/route.ts, not in the main route.ts
  // For now, we'll parse the ID from the URL
  const pathname = request.nextUrl.pathname;
  const segments = pathname.split('/');
  const userId = parseInt(segments[segments.indexOf('users') + 1]);

  if (isNaN(userId)) {
    return Response.json(
      { success: false, message: 'Invalid user ID' },
      { status: 400 }
    );
  }

  // Handle updateUserRole
  try {
    const body = await request.json();

    if (body.role_id !== undefined) {
      // Update user's role
      return Response.json({
        success: true,
        data: {
          user_id: userId,
          new_role_id: body.role_id,
          new_role_name: 'updated_role', // This would come from the database
          total_permissions: 50, // This would be calculated from the new role
          updated_by: 1 // Mock user ID of the updater
        },
        message: `User ${userId} role updated successfully`
      });
    }

    // Handle general user update
    return Response.json({
      success: true,
      data: {
        id: userId,
        username: body.username || 'user',
        email: body.email || 'user@example.com',
        full_name: body.full_name || 'User Name',
        mobile_number: body.mobile_number,
        departments: body.departments,
        role_id: body.role_id,
        is_active: body.is_active !== undefined ? body.is_active : true,
        updated_at: new Date().toISOString()
      },
      message: 'User updated successfully'
    });
  } catch (error) {
    return Response.json(
      { success: false, message: 'Invalid request body' },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  // This route should be in [id]/route.ts, not in the main route.ts
  // For now, we'll parse the ID from the URL
  const pathname = request.nextUrl.pathname;
  const segments = pathname.split('/');
  const userId = parseInt(segments[segments.indexOf('users') + 1]);

  if (isNaN(userId)) {
    return Response.json(
      { success: false, message: 'Invalid user ID' },
      { status: 400 }
    );
  }

  // In a real implementation, this would soft-delete the user in the database
  return Response.json({
    success: true,
    data: { id: userId },
    message: 'User deleted successfully'
  });
}