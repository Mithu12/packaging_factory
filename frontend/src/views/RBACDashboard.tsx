"use client";

import React, { useState } from 'react';
import { Shield, Users, BarChart3, UserCheck, Settings } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import RoleManagement from './RoleManagement';
import { UserRoleAssignment } from '@/components/rbac/UserRoleAssignment';
import { RoleAnalytics } from '@/components/rbac/RoleAnalytics';

// Mock users data - in real implementation, this would come from API
const mockUsers = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@company.com',
    full_name: 'System Administrator',
    role: 'admin',
    role_id: 1,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 2,
    username: 'accountant',
    email: 'accounts@company.com',
    full_name: 'John Accountant',
    role: 'accounts',
    role_id: 3,
    is_active: true,
    created_at: '2024-01-15T00:00:00Z'
  },
  {
    id: 3,
    username: 'emp',
    email: 'employee@company.com',
    full_name: 'Jane Employee',
    role: 'employee',
    role_id: 12,
    is_active: true,
    created_at: '2024-02-01T00:00:00Z'
  }
];

const RBACDashboard: React.FC = () => {
  const [users, setUsers] = useState(mockUsers);
  const [activeTab, setActiveTab] = useState('overview');

  const handleUserUpdate = () => {
    // Refresh users data
    // In real implementation, this would reload from API
    console.log('User updated, refreshing data...');
  };

  const getQuickStats = () => {
    return {
      totalRoles: 19,
      totalUsers: users.length,
      activeUsers: users.filter(u => u.is_active).length,
      usersWithRoles: users.filter(u => u.role_id).length,
      totalPermissions: 173,
      departments: 9
    };
  };

  const stats = getQuickStats();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Role-Based Access Control</h1>
          <p className="text-gray-600 mt-2">
            Comprehensive management of roles, permissions, and user access across your organization
          </p>
        </div>
        <div className="flex gap-2">
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-500" />
              <div>
                <div className="text-sm font-medium">System Status</div>
                <div className="text-xs text-green-600">All systems operational</div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Quick Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Roles</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRoles}</div>
            <p className="text-xs text-muted-foreground">Active roles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">System users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeUsers}</div>
            <p className="text-xs text-muted-foreground">
              {Math.round((stats.activeUsers / stats.totalUsers) * 100)}% of users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.usersWithRoles}</div>
            <p className="text-xs text-muted-foreground">Users with roles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Permissions</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPermissions}</div>
            <p className="text-xs text-muted-foreground">Total available</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Departments</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.departments}</div>
            <p className="text-xs text-muted-foreground">Organizational units</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Role Management
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            User Assignment
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Permissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <RoleAnalytics />
        </TabsContent>

        <TabsContent value="roles">
          <RoleManagement />
        </TabsContent>

        <TabsContent value="users">
          <UserRoleAssignment users={users} onUserUpdate={handleUserUpdate} />
        </TabsContent>

        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <CardTitle>Permission Management</CardTitle>
              <CardDescription>
                Advanced permission management features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Permission Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Total Permissions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">173</div>
                      <p className="text-sm text-gray-600">Across 13 modules</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Permission Assignments</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">679</div>
                      <p className="text-sm text-gray-600">Role-permission mappings</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Module Coverage</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">100%</div>
                      <p className="text-sm text-gray-600">All modules configured</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Permission Modules */}
                <Card>
                  <CardHeader>
                    <CardTitle>Permission Modules</CardTitle>
                    <CardDescription>
                      Overview of available permission modules and their usage
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[
                        { module: 'Finance', permissions: 25, description: 'Accounts, vouchers, payments, expenses' },
                        { module: 'Sales', permissions: 20, description: 'Customers, orders, invoices, POS' },
                        { module: 'Inventory', permissions: 20, description: 'Products, stock, transfers, warehouses' },
                        { module: 'Purchase', permissions: 15, description: 'Suppliers, orders, receipts, payments' },
                        { module: 'HR', permissions: 15, description: 'Employees, payroll, leave, attendance' },
                        { module: 'Operations', permissions: 12, description: 'Technicians, service requests, work orders' },
                        { module: 'Customer Service', permissions: 12, description: 'Complaints, feedback, call logs' },
                        { module: 'Self Service', permissions: 12, description: 'Profile, payslips, leave requests' },
                        { module: 'Marketing', permissions: 12, description: 'Campaigns, SMS, email, segments' },
                        { module: 'User Management', permissions: 11, description: 'Users, roles, permission assignment' },
                        { module: 'System', permissions: 10, description: 'Settings, backup, API, database' },
                        { module: 'Dashboard', permissions: 5, description: 'Executive, departmental, KPI access' },
                        { module: 'Reports', permissions: 4, description: 'Generate, schedule, export, share' }
                      ].map((module) => (
                        <Card key={module.module} className="border-l-4 border-l-blue-500">
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                              <CardTitle className="text-sm font-medium">{module.module}</CardTitle>
                              <div className="text-lg font-bold text-blue-600">{module.permissions}</div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-xs text-gray-600">{module.description}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>
                      Common permission management tasks
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                        <h4 className="font-medium">Audit Permissions</h4>
                        <p className="text-sm text-gray-600 mt-1">Review role-permission assignments</p>
                      </div>
                      <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                        <h4 className="font-medium">Bulk Assignment</h4>
                        <p className="text-sm text-gray-600 mt-1">Assign multiple permissions at once</p>
                      </div>
                      <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                        <h4 className="font-medium">Permission Templates</h4>
                        <p className="text-sm text-gray-600 mt-1">Create reusable permission sets</p>
                      </div>
                      <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                        <h4 className="font-medium">Access Reports</h4>
                        <p className="text-sm text-gray-600 mt-1">Generate permission usage reports</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RBACDashboard;
