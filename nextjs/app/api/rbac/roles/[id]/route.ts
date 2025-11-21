// app/api/rbac/roles/[id]/route.ts

import { NextRequest } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const roleId = parseInt(resolvedParams.id);

  // Mock data for demonstration - in real implementation, this would come from DB
  const mockRolesWithPermissions = [
    {
      id: 1,
      name: 'admin',
      display_name: 'System Administrator',
      description: 'Full system access and control',
      level: 1,
      department: 'IT',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      permissions: [
        {
          id: 1,
          name: 'users.create',
          display_name: 'Create Users',
          description: 'Permission to create new users',
          module: 'User Management',
          action: 'create',
          resource: 'users',
          created_at: new Date().toISOString(),
        },
        {
          id: 2,
          name: 'users.read',
          display_name: 'Read Users',
          description: 'Permission to read user information',
          module: 'User Management',
          action: 'read',
          resource: 'users',
          created_at: new Date().toISOString(),
        },
        {
          id: 3,
          name: 'users.update',
          display_name: 'Update Users',
          description: 'Permission to update user information',
          module: 'User Management',
          action: 'update',
          resource: 'users',
          created_at: new Date().toISOString(),
        },
        {
          id: 4,
          name: 'users.delete',
          display_name: 'Delete Users',
          description: 'Permission to delete users',
          module: 'User Management',
          action: 'delete',
          resource: 'users',
          created_at: new Date().toISOString(),
        },
        {
          id: 5,
          name: 'roles.manage',
          display_name: 'Manage Roles',
          description: 'Permission to manage user roles',
          module: 'User Management',
          action: 'manage',
          resource: 'roles',
          created_at: new Date().toISOString(),
        },
      ],
      user_count: 12
    },
    {
      id: 2,
      name: 'finance_manager',
      display_name: 'Finance Manager',
      description: 'Manage financial operations and approvals',
      level: 2,
      department: 'Finance',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      permissions: [
        {
          id: 11,
          name: 'payments.create',
          display_name: 'Create Payments',
          description: 'Permission to create payment records',
          module: 'Finance',
          action: 'create',
          resource: 'payments',
          created_at: new Date().toISOString(),
        },
        {
          id: 12,
          name: 'payments.approve',
          display_name: 'Approve Payments',
          description: 'Permission to approve payments',
          module: 'Finance',
          action: 'approve',
          resource: 'payments',
          created_at: new Date().toISOString(),
        },
        {
          id: 16,
          name: 'expenses.create',
          display_name: 'Create Expenses',
          description: 'Permission to create expense records',
          module: 'Finance',
          action: 'create',
          resource: 'expenses',
          created_at: new Date().toISOString(),
        },
        {
          id: 17,
          name: 'expenses.approve',
          display_name: 'Approve Expenses',
          description: 'Permission to approve expenses',
          module: 'Finance',
          action: 'approve',
          resource: 'expenses',
          created_at: new Date().toISOString(),
        },
      ],
      user_count: 5
    },
    {
      id: 3,
      name: 'hr_manager',
      display_name: 'HR Manager',
      description: 'Manage employee data and HR operations',
      level: 2,
      department: 'HR',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      permissions: [
        {
          id: 15,
          name: 'employees.create',
          display_name: 'Create Employees',
          description: 'Permission to create employee records',
          module: 'HR',
          action: 'create',
          resource: 'employees',
          created_at: new Date().toISOString(),
        },
        {
          id: 18,
          name: 'employees.update',
          display_name: 'Update Employees',
          description: 'Permission to update employee records',
          module: 'HR',
          action: 'update',
          resource: 'employees',
          created_at: new Date().toISOString(),
        },
        {
          id: 19,
          name: 'leave.approve',
          display_name: 'Approve Leave',
          description: 'Permission to approve employee leave',
          module: 'HR',
          action: 'approve',
          resource: 'leave',
          created_at: new Date().toISOString(),
        },
      ],
      user_count: 7
    },
  ];

  const role = mockRolesWithPermissions.find(r => r.id === roleId);

  if (!role) {
    return Response.json(
      { success: false, message: 'Role not found' },
      { status: 404 }
    );
  }

  return Response.json({
    success: true,
    data: role,
    message: 'Role retrieved successfully'
  });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const roleId = parseInt(resolvedParams.id);
  
  try {
    const body = await request.json();
    
    // In a real implementation, this would update the role in the database
    // For now, return a mock updated role
    const updatedRole = {
      id: roleId,
      name: body.name || 'admin',
      display_name: body.display_name || 'System Administrator',
      description: body.description || 'Full system access and control',
      level: body.level || 1,
      department: body.department || 'IT',
      is_active: body.is_active !== undefined ? body.is_active : true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      permissions: [],
      user_count: 0
    };

    return Response.json({
      success: true,
      data: updatedRole,
      message: 'Role updated successfully'
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
  
  // In a real implementation, this would soft-delete the role in the database
  return Response.json({
    success: true,
    data: { id: roleId },
    message: 'Role deleted successfully'
  });
}