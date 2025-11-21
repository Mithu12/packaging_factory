// app/api/rbac/departments/route.ts

import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  // Extract the path after /api/rbac/departments
  const pathname = request.nextUrl.pathname;
  const path = pathname.replace('/api/rbac/departments', '') || '/';
  
  if (path === '/stats') {
    // Mock department statistics data
    const mockDepartmentStats = [
      {
        department: 'IT',
        total_users: 12,
        active_users: 11,
        total_roles: 5,
        active_roles: 5,
        roles: [
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
            id: 6,
            name: 'it_support',
            display_name: 'IT Support',
            description: 'Provide technical support',
            level: 5,
            department: 'IT',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        ]
      },
      {
        department: 'Finance',
        total_users: 8,
        active_users: 8,
        total_roles: 4,
        active_roles: 4,
        roles: [
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
            id: 11,
            name: 'finance_staff',
            display_name: 'Finance Staff',
            description: 'Handle day-to-day financial operations',
            level: 4,
            department: 'Finance',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        ]
      },
      {
        department: 'HR',
        total_users: 5,
        active_users: 5,
        total_roles: 3,
        active_roles: 3,
        roles: [
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
          }
        ]
      },
      {
        department: 'Sales',
        total_users: 15,
        active_users: 14,
        total_roles: 4,
        active_roles: 4,
        roles: [
          {
            id: 4,
            name: 'sales_manager',
            display_name: 'Sales Manager',
            description: 'Manage sales operations and team',
            level: 3,
            department: 'Sales',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 14,
            name: 'sales_executive',
            display_name: 'Sales Executive',
            description: 'Handle customer relations and sales',
            level: 4,
            department: 'Sales',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        ]
      },
      {
        department: 'Inventory',
        total_users: 10,
        active_users: 10,
        total_roles: 3,
        active_roles: 3,
        roles: [
          {
            id: 5,
            name: 'inventory_manager',
            display_name: 'Inventory Manager',
            description: 'Manage inventory operations',
            level: 3,
            department: 'Inventory',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        ]
      }
    ];

    return Response.json({
      success: true,
      data: mockDepartmentStats,
      message: 'Department statistics retrieved successfully'
    });
  }

  // Default case
  return Response.json({ error: 'Route not found' }, { status: 404 });
}

export async function POST(request: NextRequest) {
  return Response.json({ error: 'Route not found' }, { status: 404 });
}