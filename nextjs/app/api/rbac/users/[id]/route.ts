// app/api/rbac/users/[id]/route.ts

import { NextRequest } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const userId = parseInt(resolvedParams.id);
  const pathname = request.nextUrl.pathname;

  if (pathname.includes(`/api/rbac/users/${resolvedParams.id}/permissions`)) {
    // Extract search parameters
    const searchParams = request.nextUrl.searchParams;
    const module = searchParams.get('module');
    const action = searchParams.get('action');
    const resource = searchParams.get('resource');
    
    // Mock data for user permissions
    const mockUserPermissions = {
      id: userId,
      username: userId === 1 ? 'admin' : userId === 2 ? 'manager' : 'employee',
      email: userId === 1 ? 'admin@company.com' : userId === 2 ? 'manager@company.com' : 'employee@company.com',
      full_name: userId === 1 ? 'System Administrator' : userId === 2 ? 'Jane Manager' : 'John Employee',
      mobile_number: '+1234567890',
      departments: ['IT', 'Finance'],
      role: userId === 1 ? 'admin' : userId === 2 ? 'finance_manager' : 'employee',
      role_id: userId,
      is_active: true,
      last_login: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // RBAC specific fields
      role_details: {
        id: userId,
        name: userId === 1 ? 'admin' : userId === 2 ? 'finance_manager' : 'employee',
        display_name: userId === 1 ? 'System Administrator' : userId === 2 ? 'Finance Manager' : 'Employee',
        description: 'Sample role description',
        level: userId,
        department: 'IT',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      role_permissions: [
        {
          id: 1,
          name: 'users.read',
          display_name: 'Read Users',
          description: 'Permission to read user information',
          module: 'User Management',
          action: 'read',
          resource: 'users',
          created_at: new Date().toISOString(),
        },
        {
          id: 2,
          name: 'roles.manage',
          display_name: 'Manage Roles',
          description: 'Permission to manage user roles',
          module: 'User Management',
          action: 'manage',
          resource: 'roles',
          created_at: new Date().toISOString(),
        }
      ],
      direct_permissions: userId === 1 ? [
        {
          id: 3,
          name: 'system.config',
          display_name: 'Configure System',
          description: 'Permission to configure system settings',
          module: 'System',
          action: 'update',
          resource: 'settings',
          created_at: new Date().toISOString(),
        }
      ] : [],
      all_permissions: [
        {
          id: 1,
          name: 'users.read',
          display_name: 'Read Users',
          description: 'Permission to read user information',
          module: 'User Management',
          action: 'read',
          resource: 'users',
          created_at: new Date().toISOString(),
        },
        {
          id: 2,
          name: 'roles.manage',
          display_name: 'Manage Roles',
          description: 'Permission to manage user roles',
          module: 'User Management',
          action: 'manage',
          resource: 'roles',
          created_at: new Date().toISOString(),
        },
        ...(userId === 1 ? [{
          id: 3,
          name: 'system.config',
          display_name: 'Configure System',
          description: 'Permission to configure system settings',
          module: 'System',
          action: 'update',
          resource: 'settings',
          created_at: new Date().toISOString(),
        }] : [])
      ]
    };

    // Apply filtering based on query parameters
    let filteredPermissions = mockUserPermissions.all_permissions;
    
    if (module) {
      filteredPermissions = filteredPermissions.filter(p => p.module === module);
    }
    
    if (action) {
      filteredPermissions = filteredPermissions.filter(p => p.action === action);
    }
    
    if (resource) {
      filteredPermissions = filteredPermissions.filter(p => p.resource === resource);
    }

    // Group permissions by module
    const permissionsByModule: Record<string, any[]> = {};
    filteredPermissions.forEach(permission => {
      if (!permissionsByModule[permission.module]) {
        permissionsByModule[permission.module] = [];
      }
      permissionsByModule[permission.module].push(permission);
    });

    return Response.json({
      success: true,
      data: {
        ...mockUserPermissions,
        summary: {
          total_permissions: filteredPermissions.length,
          role_permissions: mockUserPermissions.role_permissions.length,
          direct_permissions: mockUserPermissions.direct_permissions.length,
          role_name: mockUserPermissions.role,
          role_level: mockUserPermissions.role_details?.level || 1,
        },
        permissions_by_module: permissionsByModule
      },
      message: 'User permissions retrieved successfully'
    });
  }

  if (pathname.includes(`/api/rbac/users/${resolvedParams.id}/check-permission`)) {
    try {
      // For POST requests to check permission, we need to read the body
      // But this is a GET request, so we expect query parameters
      const searchParams = request.nextUrl.searchParams;
      const module = searchParams.get('module');
      const action = searchParams.get('action');
      const resource = searchParams.get('resource');
      
      if (!module || !action || !resource) {
        return Response.json(
          { success: false, message: 'module, action, and resource are required' },
          { status: 400 }
        );
      }

      // Mock permission check
      const hasPermission = Math.random() > 0.3; // 70% chance of having permission
      
      return Response.json({
        success: true,
        data: {
          user_id: userId,
          permission: { module, action, resource },
          has_permission: hasPermission,
          checked_at: new Date().toISOString()
        },
        message: 'Permission check completed'
      });
    } catch (error) {
      return Response.json(
        { success: false, message: 'Error checking permission' },
        { status: 500 }
      );
    }
  }

  if (pathname.includes(`/api/rbac/users/${resolvedParams.id}/check-permissions`)) {
    try {
      // For POST requests to check multiple permissions (this would be handled in POST)
      // We'll handle this case in the POST method
      return Response.json({ error: 'Use POST method to check multiple permissions' }, { status: 405 });
    } catch (error) {
      return Response.json(
        { success: false, message: 'Error checking permissions' },
        { status: 500 }
      );
    }
  }

  // Default case: return user info without permissions
  const mockUser = {
    id: userId,
    username: userId === 1 ? 'admin' : userId === 2 ? 'manager' : 'employee',
    email: userId === 1 ? 'admin@company.com' : userId === 2 ? 'manager@company.com' : 'employee@company.com',
    full_name: userId === 1 ? 'System Administrator' : userId === 2 ? 'Jane Manager' : 'John Employee',
    mobile_number: '+1234567890',
    departments: ['IT', 'Finance'],
    role: userId === 1 ? 'admin' : userId === 2 ? 'finance_manager' : 'employee',
    role_id: userId,
    is_active: true,
    last_login: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return Response.json({
    success: true,
    data: mockUser,
    message: 'User retrieved successfully'
  });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const userId = parseInt(resolvedParams.id);
  const pathname = request.nextUrl.pathname;

  if (pathname.includes(`/api/rbac/users/${resolvedParams.id}/check-permission`)) {
    try {
      const body = await request.json();
      const { module, action, resource } = body;
      
      if (!module || !action || !resource) {
        return Response.json(
          { success: false, message: 'module, action, and resource are required' },
          { status: 400 }
        );
      }

      // Mock permission check
      const hasPermission = Math.random() > 0.3; // 70% chance of having permission
      
      return Response.json({
        success: true,
        data: {
          user_id: userId,
          permission: { module, action, resource },
          has_permission: hasPermission,
          checked_at: new Date().toISOString()
        },
        message: 'Permission check completed'
      });
    } catch (error) {
      return Response.json(
        { success: false, message: 'Error checking permission' },
        { status: 500 }
      );
    }
  }

  if (pathname.includes(`/api/rbac/users/${resolvedParams.id}/check-permissions`)) {
    try {
      const body = await request.json();
      const { permissions } = body;
      
      if (!Array.isArray(permissions)) {
        return Response.json(
          { success: false, message: 'permissions must be an array' },
          { status: 400 }
        );
      }

      // Check each permission
      const individualChecks = permissions.map((perm: any) => ({
        permission: perm,
        has_permission: Math.random() > 0.3 // Random mock result
      }));
      
      const passedChecks = individualChecks.filter((check: any) => check.has_permission).length;
      
      return Response.json({
        success: true,
        data: {
          user_id: userId,
          has_any_permission: passedChecks > 0,
          individual_checks: individualChecks,
          summary: {
            total_checks: permissions.length,
            passed_checks: passedChecks,
            failed_checks: permissions.length - passedChecks,
          },
          checked_at: new Date().toISOString()
        },
        message: 'Multiple permission check completed'
      });
    } catch (error) {
      return Response.json(
        { success: false, message: 'Error checking permissions' },
        { status: 500 }
      );
    }
  }

  return Response.json({ error: 'Route not found' }, { status: 404 });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const userId = parseInt(resolvedParams.id);
  
  try {
    const body = await request.json();
    
    // Handle update role request
    if (body.role_id !== undefined) {
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
    
    // Handle other user updates
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

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const userId = parseInt(resolvedParams.id);
  
  // In a real implementation, this would soft-delete the user in the database
  return Response.json({
    success: true,
    data: { id: userId },
    message: 'User deleted successfully'
  });
}