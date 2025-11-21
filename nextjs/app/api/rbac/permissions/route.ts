// app/api/rbac/permissions/route.ts

import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  // Extract the path after /api/rbac/permissions
  const pathname = request.nextUrl.pathname;
  const path = pathname.replace('/api/rbac/permissions', '') || '/';
  
  // Extract search parameters
  const searchParams = request.nextUrl.searchParams;
  const page = searchParams.get('page');
  const limit = searchParams.get('limit');
  const search = searchParams.get('search');
  const module = searchParams.get('module');
  const action = searchParams.get('action');
  const resource = searchParams.get('resource');

  // Mock data for demonstration - in real implementation, this would come from DB
  const mockPermissions = [
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
    {
      id: 6,
      name: 'products.create',
      display_name: 'Create Products',
      description: 'Permission to create new products',
      module: 'Inventory',
      action: 'create',
      resource: 'products',
      created_at: new Date().toISOString(),
    },
    {
      id: 7,
      name: 'products.read',
      display_name: 'Read Products',
      description: 'Permission to read product information',
      module: 'Inventory',
      action: 'read',
      resource: 'products',
      created_at: new Date().toISOString(),
    },
    {
      id: 8,
      name: 'products.update',
      display_name: 'Update Products',
      description: 'Permission to update product information',
      module: 'Inventory',
      action: 'update',
      resource: 'products',
      created_at: new Date().toISOString(),
    },
    {
      id: 9,
      name: 'products.delete',
      display_name: 'Delete Products',
      description: 'Permission to delete products',
      module: 'Inventory',
      action: 'delete',
      resource: 'products',
      created_at: new Date().toISOString(),
    },
    {
      id: 10,
      name: 'inventory.read',
      display_name: 'Read Inventory',
      description: 'Permission to read inventory levels',
      module: 'Inventory',
      action: 'read',
      resource: 'inventory',
      created_at: new Date().toISOString(),
    },
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
      id: 13,
      name: 'customers.create',
      display_name: 'Create Customers',
      description: 'Permission to create customer records',
      module: 'Sales',
      action: 'create',
      resource: 'customers',
      created_at: new Date().toISOString(),
    },
    {
      id: 14,
      name: 'orders.create',
      display_name: 'Create Orders',
      description: 'Permission to create sales orders',
      module: 'Sales',
      action: 'create',
      resource: 'orders',
      created_at: new Date().toISOString(),
    },
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
  ];

  // Apply filtering based on query parameters
  let filteredPermissions = mockPermissions;
  
  if (search) {
    filteredPermissions = filteredPermissions.filter(permission => 
      permission.name.toLowerCase().includes(search.toLowerCase()) ||
      permission.display_name.toLowerCase().includes(search.toLowerCase()) ||
      permission.module.toLowerCase().includes(search.toLowerCase()) ||
      permission.action.toLowerCase().includes(search.toLowerCase()) ||
      permission.resource.toLowerCase().includes(search.toLowerCase())
    );
  }
  
  if (module) {
    filteredPermissions = filteredPermissions.filter(permission => permission.module === module);
  }
  
  if (action) {
    filteredPermissions = filteredPermissions.filter(permission => permission.action === action);
  }
  
  if (resource) {
    filteredPermissions = filteredPermissions.filter(permission => permission.resource === resource);
  }

  // Apply pagination
  const pageNum = parseInt(page || '1');
  const limitNum = parseInt(limit || '10');
  const startIndex = (pageNum - 1) * limitNum;
  const paginatedPermissions = filteredPermissions.slice(startIndex, startIndex + limitNum);

  // Handle specific endpoints
  if (path === '/grouped') {
    // Group permissions by module
    const groupedPermissions = filteredPermissions.reduce((acc, permission) => {
      if (!acc[permission.module]) {
        acc[permission.module] = [];
      }
      acc[permission.module].push(permission);
      return acc;
    }, {} as Record<string, typeof mockPermissions>);

    // Get unique actions and resources for each module
    const modules = Object.entries(groupedPermissions).map(([module, permissions]) => {
      const actions = [...new Set(permissions.map(p => p.action))];
      const resources = [...new Set(permissions.map(p => p.resource))];
      
      return {
        module,
        permissions,
        permission_count: permissions.length,
        actions,
        resources,
      };
    });

    return Response.json({
      success: true,
      data: {
        modules,
        summary: {
          total_modules: modules.length,
          total_permissions: filteredPermissions.length,
          unique_actions: [...new Set(filteredPermissions.map(p => p.action))],
          unique_resources: [...new Set(filteredPermissions.map(p => p.resource))],
        }
      },
      message: 'Grouped permissions retrieved successfully'
    });
  }

  if (path.startsWith('/module/')) {
    const moduleName = path.replace('/module/', '');
    const modulePermissions = filteredPermissions.filter(p => p.module === moduleName);
    
    // Group by action and resource
    const byAction = modulePermissions.reduce((acc, permission) => {
      if (!acc[permission.action]) {
        acc[permission.action] = [];
      }
      acc[permission.action].push(permission);
      return acc;
    }, {} as Record<string, typeof modulePermissions>);
    
    const byResource = modulePermissions.reduce((acc, permission) => {
      if (!acc[permission.resource]) {
        acc[permission.resource] = [];
      }
      acc[permission.resource].push(permission);
      return acc;
    }, {} as Record<string, typeof modulePermissions>);

    return Response.json({
      success: true,
      data: {
        module: moduleName,
        permissions: modulePermissions,
        by_action: byAction,
        by_resource: byResource,
        statistics: {
          total_permissions: modulePermissions.length,
          unique_actions: Object.keys(byAction).length,
          unique_resources: Object.keys(byResource).length,
        }
      },
      message: `Permissions for module ${moduleName} retrieved successfully`
    });
  }

  if (path === '/stats') {
    // Calculate permission statistics
    const byModule = filteredPermissions.reduce((acc, permission) => {
      const existing = acc.find(m => m.module === permission.module);
      if (existing) {
        existing.total_permissions++;
        if (!existing.actions.includes(permission.action)) {
          existing.actions.push(permission.action);
        }
        if (!existing.resources.includes(permission.resource)) {
          existing.resources.push(permission.resource);
        }
      } else {
        acc.push({
          module: permission.module,
          total_permissions: 1,
          unique_actions: 1,
          unique_resources: 1,
          actions: [permission.action],
          resources: [permission.resource],
        });
      }
      return acc;
    }, [] as Array<{
      module: string;
      total_permissions: number;
      unique_actions: number;
      unique_resources: number;
      actions: string[];
      resources: string[];
    }>);

    const byAction = filteredPermissions.reduce((acc, permission) => {
      const existing = acc.find(a => a.action === permission.action);
      if (existing) {
        existing.count++;
        if (!existing.modules.includes(permission.module)) {
          existing.modules.push(permission.module);
        }
        if (!existing.resources.includes(permission.resource)) {
          existing.resources.push(permission.resource);
        }
      } else {
        acc.push({
          action: permission.action,
          count: 1,
          modules: [permission.module],
          resources: [permission.resource],
        });
      }
      return acc;
    }, [] as Array<{
      action: string;
      count: number;
      modules: string[];
      resources: string[];
    }>);

    return Response.json({
      success: true,
      data: {
        overview: {
          total_permissions: filteredPermissions.length,
          total_modules: byModule.length,
          total_actions: byAction.length,
          total_resources: [...new Set(filteredPermissions.map(p => p.resource))].length,
        },
        by_module: byModule,
        by_action: byAction,
        unique_modules: [...new Set(filteredPermissions.map(p => p.module))],
        unique_actions: [...new Set(filteredPermissions.map(p => p.action))],
        unique_resources: [...new Set(filteredPermissions.map(p => p.resource))],
      },
      message: 'Permission statistics retrieved successfully'
    });
  }

  return Response.json({
    success: true,
    data: {
      permissions: paginatedPermissions,
      pagination: {
        current_page: pageNum,
        per_page: limitNum,
        total: filteredPermissions.length,
        total_pages: Math.ceil(filteredPermissions.length / limitNum),
      },
      filters: {
        search,
        module,
        action,
        resource,
      }
    },
    message: 'Permissions retrieved successfully'
  });
}

export async function POST(request: NextRequest) {
  // Handle permission-related POST requests
  const pathname = request.nextUrl.pathname;
  
  if (pathname.includes('/permissions/search')) {
    try {
      const body = await request.json();
      const { query, modules, actions, resources, exact_match } = body;
      
      // Mock search functionality
      let results = mockPermissions; // Using the mock data from above
      
      if (query) {
        results = results.filter(permission => 
          permission.name.toLowerCase().includes(query.toLowerCase()) ||
          permission.display_name.toLowerCase().includes(query.toLowerCase()) ||
          permission.description?.toLowerCase().includes(query.toLowerCase())
        );
      }
      
      if (modules && Array.isArray(modules) && modules.length > 0) {
        results = results.filter(permission => modules.includes(permission.module));
      }
      
      if (actions && Array.isArray(actions) && actions.length > 0) {
        results = results.filter(permission => actions.includes(permission.action));
      }
      
      if (resources && Array.isArray(resources) && resources.length > 0) {
        results = results.filter(permission => resources.includes(permission.resource));
      }

      return Response.json({
        success: true,
        data: {
          permissions: results,
          search_criteria: { query, modules, actions, resources, exact_match },
          results_summary: {
            total_found: results.length,
            total_searched: mockPermissions.length,
          }
        },
        message: 'Permissions search completed successfully'
      });
    } catch (error) {
      return Response.json(
        { success: false, message: 'Invalid search request' },
        { status: 400 }
      );
    }
  }

  return Response.json({ error: 'Route not found' }, { status: 404 });
}

// Define mock permissions here for use in the GET handler
const mockPermissions = [
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
  {
    id: 6,
    name: 'products.create',
    display_name: 'Create Products',
    description: 'Permission to create new products',
    module: 'Inventory',
    action: 'create',
    resource: 'products',
    created_at: new Date().toISOString(),
  },
  {
    id: 7,
    name: 'products.read',
    display_name: 'Read Products',
    description: 'Permission to read product information',
    module: 'Inventory',
    action: 'read',
    resource: 'products',
    created_at: new Date().toISOString(),
  },
  {
    id: 8,
    name: 'products.update',
    display_name: 'Update Products',
    description: 'Permission to update product information',
    module: 'Inventory',
    action: 'update',
    resource: 'products',
    created_at: new Date().toISOString(),
  },
  {
    id: 9,
    name: 'products.delete',
    display_name: 'Delete Products',
    description: 'Permission to delete products',
    module: 'Inventory',
    action: 'delete',
    resource: 'products',
    created_at: new Date().toISOString(),
  },
  {
    id: 10,
    name: 'inventory.read',
    display_name: 'Read Inventory',
    description: 'Permission to read inventory levels',
    module: 'Inventory',
    action: 'read',
    resource: 'inventory',
    created_at: new Date().toISOString(),
  },
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
    id: 13,
    name: 'customers.create',
    display_name: 'Create Customers',
    description: 'Permission to create customer records',
    module: 'Sales',
    action: 'create',
    resource: 'customers',
    created_at: new Date().toISOString(),
  },
  {
    id: 14,
    name: 'orders.create',
    display_name: 'Create Orders',
    description: 'Permission to create sales orders',
    module: 'Sales',
    action: 'create',
    resource: 'orders',
    created_at: new Date().toISOString(),
  },
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
];