// app/api/rbac/roles/route.ts

import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  // Extract the path after /api/rbac/roles
  const pathname = request.nextUrl.pathname;
  const path = pathname.replace('/api/rbac/roles', '') || '/';
  
  // Extract search parameters
  const searchParams = request.nextUrl.searchParams;
  const page = searchParams.get('page');
  const limit = searchParams.get('limit');
  const search = searchParams.get('search');
  const department = searchParams.get('department');
  const level = searchParams.get('level');
  const is_active = searchParams.get('is_active');

  // Mock data for demonstration - in real implementation, this would come from DB
  const mockRoles = [
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
    },
    {
      id: 4,
      name: 'sales_executive',
      display_name: 'Sales Executive',
      description: 'Manage sales operations and customer relations',
      level: 4,
      department: 'Sales',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 5,
      name: 'inventory_staff',
      display_name: 'Inventory Staff',
      description: 'Manage inventory and warehouse operations',
      level: 5,
      department: 'Inventory',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  // Apply filtering based on query parameters
  let filteredRoles = mockRoles;
  
  if (search) {
    filteredRoles = filteredRoles.filter(role => 
      role.name.toLowerCase().includes(search.toLowerCase()) ||
      role.display_name.toLowerCase().includes(search.toLowerCase()) ||
      (role.description && role.description.toLowerCase().includes(search.toLowerCase()))
    );
  }
  
  if (department) {
    filteredRoles = filteredRoles.filter(role => role.department === department);
  }
  
  if (level) {
    filteredRoles = filteredRoles.filter(role => role.level === parseInt(level));
  }
  
  if (is_active !== null && is_active !== undefined) {
    const isActive = is_active === 'true';
    filteredRoles = filteredRoles.filter(role => role.is_active === isActive);
  }

  // Apply pagination
  const pageNum = parseInt(page || '1');
  const limitNum = parseInt(limit || '10');
  const startIndex = (pageNum - 1) * limitNum;
  const paginatedRoles = filteredRoles.slice(startIndex, startIndex + limitNum);

  return Response.json({
    success: true,
    data: {
      roles: paginatedRoles,
      pagination: {
        current_page: pageNum,
        per_page: limitNum,
        total: filteredRoles.length,
        total_pages: Math.ceil(filteredRoles.length / limitNum),
      },
      filters: {
        search,
        department,
        level: level ? parseInt(level) : undefined,
        is_active: is_active ? is_active === 'true' : undefined,
      }
    },
    message: 'Roles retrieved successfully'
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Basic validation
    if (!body.name || !body.display_name) {
      return Response.json(
        { success: false, message: 'Name and display name are required' },
        { status: 400 }
      );
    }

    // In a real implementation, this would create the role in the database
    // For now, return a mock created role
    const newRole = {
      id: Date.now(), // Mock ID
      name: body.name,
      display_name: body.display_name,
      description: body.description || '',
      level: body.level || 5,
      department: body.department || '',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return Response.json({
      success: true,
      data: newRole,
      message: 'Role created successfully'
    });
  } catch (error) {
    return Response.json(
      { success: false, message: 'Invalid request body' },
      { status: 400 }
    );
  }
}

// Handle requests to specific role endpoints
export async function PUT(request: NextRequest) {
  // Extract the path after /api/rbac/roles
  const pathname = request.nextUrl.pathname;
  const segments = pathname.split('/').filter(s => s);
  const idIndex = segments.indexOf('roles');
  
  if (idIndex !== -1 && segments.length > idIndex + 1) {
    const roleId = segments[idIndex + 1];
    
    if (pathname.includes('/roles/' + roleId)) {
      try {
        const body = await request.json();
        
        // In a real implementation, this would update the role in the database
        // For now, return a mock updated role
        const updatedRole = {
          id: parseInt(roleId),
          name: body.name || 'admin',
          display_name: body.display_name || 'System Administrator',
          description: body.description || 'Full system access and control',
          level: body.level || 1,
          department: body.department || 'IT',
          is_active: body.is_active !== undefined ? body.is_active : true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
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
  }
  
  return Response.json({ error: 'Route not found' }, { status: 404 });
}

export async function DELETE(request: NextRequest) {
  // Extract the path after /api/rbac/roles
  const pathname = request.nextUrl.pathname;
  const segments = pathname.split('/').filter(s => s);
  const idIndex = segments.indexOf('roles');
  
  if (idIndex !== -1 && segments.length > idIndex + 1) {
    const roleId = segments[idIndex + 1];
    
    if (pathname.includes('/roles/' + roleId)) {
      // In a real implementation, this would soft-delete the role in the database
      return Response.json({
        success: true,
        data: { id: parseInt(roleId) },
        message: 'Role deleted successfully'
      });
    }
  }
  
  return Response.json({ error: 'Route not found' }, { status: 404 });
}