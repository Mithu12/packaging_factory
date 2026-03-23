"use client";

import React, { useState, useEffect } from 'react';
import { Plus, Search, Users, Shield, Settings, Eye, Edit, Trash2, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { RBACApi } from '@/services/rbac-api';
import { Role, DepartmentStats } from '@/services/rbac-types';
import { RoleForm } from '@/components/rbac/RoleForm';
import { PermissionAssignment } from '@/components/rbac/PermissionAssignment';
import { RoleDetailsDialog } from '@/components/rbac/RoleDetailsDialog';

const RoleManagement: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [departmentStats, setDepartmentStats] = useState<DepartmentStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('Loading role data...');
      
      const [rolesData, statsData] = await Promise.all([
        RBACApi.getAllRoles(),
        RBACApi.getDepartmentStats()
      ]);
      
      console.log('Roles data received:', rolesData);
      console.log('Stats data received:', statsData);
      
      setRoles(rolesData?.roles || []);
      setDepartmentStats(statsData || []);
    } catch (error) {
      console.error('Error loading role data:', error);
      toast({
        title: "Error",
        description: `Failed to load role data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
      // Set empty arrays as fallback
      setRoles([]);
      setDepartmentStats([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async (roleData: any) => {
    try {
      await RBACApi.createRole(roleData);
      toast({
        title: "Success",
        description: "Role created successfully",
      });
      setShowCreateDialog(false);
      loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create role",
        variant: "destructive",
      });
    }
  };

  const handleUpdateRole = async (roleData: any) => {
    if (!selectedRole) return;
    
    try {
      await RBACApi.updateRole(selectedRole.id, roleData);
      toast({
        title: "Success",
        description: "Role updated successfully",
      });
      setShowEditDialog(false);
      setSelectedRole(null);
      loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update role",
        variant: "destructive",
      });
    }
  };

  const handleDeleteRole = async (role: Role) => {
    if (!confirm(`Are you sure you want to delete the role "${role.display_name}"?`)) {
      return;
    }

    try {
      await RBACApi.deleteRole(role.id);
      toast({
        title: "Success",
        description: "Role deleted successfully",
      });
      loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete role",
        variant: "destructive",
      });
    }
  };

  const [rolePermissionCounts, setRolePermissionCounts] = useState<Record<number, number>>({});

  const loadRolePermissionCounts = async () => {
    try {
      const counts: Record<number, number> = {};
      for (const role of roles) {
        const roleData = await RBACApi.getRoleById(role.id);
        counts[role.id] = roleData?.permissions?.length || 0;
      }
      setRolePermissionCounts(counts);
    } catch (error) {
      console.error('Error loading permission counts:', error);
    }
  };

  useEffect(() => {
    if (roles.length > 0) {
      loadRolePermissionCounts();
    }
  }, [roles]);

  const filteredRoles = roles?.filter(role => {
    const matchesSearch = role.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (role.description && role.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesDepartment = !selectedDepartment || role.department === selectedDepartment;
    return matchesSearch && matchesDepartment;
  });

  const uniqueDepartments = [...new Set(roles?.map(role => role.department).filter(Boolean))];

  const getLevelBadgeColor = (level: number) => {
    if (level === 1) return 'destructive'; // System Admin
    if (level === 2) return 'default'; // Executive
    if (level === 3) return 'secondary'; // Managers
    if (level <= 4) return 'default'; // Staff/Supervisors
    return 'secondary'; // Operational
  };

  const getDepartmentBadgeColor = (department: string) => {
    const colors: Record<string, 'default' | 'destructive' | 'secondary' | 'default'> = {
      'IT': 'destructive',
      'Management': 'default',
      'Finance': 'default',
      'HR': 'secondary',
      'Sales': 'default',
      'Purchase': 'default',
      'Inventory': 'secondary',
      'Operations': 'default',
      'Customer Service': 'secondary',
      'Marketing': 'default',
      'Compliance': 'default',
      'General': 'secondary'
    };
    return colors[department] || 'default';
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Role Management</h1>
          <p className="text-gray-600 mt-2">
            Manage user roles and permissions across your organization
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button type="button" variant="add">
              <Plus className="w-4 h-4 mr-2" />
              Create Role
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Role</DialogTitle>
            </DialogHeader>
            <RoleForm onSubmit={handleCreateRole} onCancel={() => setShowCreateDialog(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Department Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Roles</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roles?.length}</div>
            <p className="text-xs text-muted-foreground">Active roles in system</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Departments</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueDepartments?.length}</div>
            <p className="text-xs text-muted-foreground">Unique departments</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {departmentStats?.reduce((sum, dept) => sum + dept.total_users, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Users with assigned roles</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Permission Coverage</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">173</div>
            <p className="text-xs text-muted-foreground">Total permissions available</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search roles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Departments</option>
              {uniqueDepartments?.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Roles Table */}
      <Card>
        <CardHeader>
          <CardTitle>Roles ({filteredRoles?.length})</CardTitle>
          <CardDescription>
            Manage roles and their permissions across different organizational levels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRoles?.map((role) => (
                <TableRow key={role.id} className="cursor-pointer hover:bg-gray-50">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{role.display_name}</span>
                      <span className="text-sm text-gray-500">{role.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getDepartmentBadgeColor(role.department || 'General')}>
                      {role.department || 'General'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getLevelBadgeColor(role.level)}>
                      Level {role.level}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {rolePermissionCounts[role.id] || 0} perms
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRole(role);
                          setShowPermissionsDialog(true);
                        }}
                      >
                        <Settings className="w-3 h-3 mr-1" />
                        Manage
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={role.is_active ? 'default' : 'secondary'}>
                      {role.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {role.description || 'No description'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedRole(role);
                          setShowDetailsDialog(true);
                        }}
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedRole(role);
                          setShowEditDialog(true);
                        }}
                        title="Edit Role"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteRole(role)}
                        disabled={role.name === 'admin'}
                        title="Delete Role"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredRoles?.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No roles found matching your criteria</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Role Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
          </DialogHeader>
          {selectedRole && (
            <RoleForm
              initialData={selectedRole}
              onSubmit={handleUpdateRole}
              onCancel={() => {
                setShowEditDialog(false);
                setSelectedRole(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Permission Assignment Dialog */}
      <Dialog open={showPermissionsDialog} onOpenChange={setShowPermissionsDialog}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
          {selectedRole && (
            <PermissionAssignment
              role={selectedRole}
              onClose={() => {
                setShowPermissionsDialog(false);
                setSelectedRole(null);
                loadData();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Role Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Role Details - {selectedRole?.display_name}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 h-full overflow-hidden">
            {selectedRole && (
              <RoleDetailsDialog
                role={selectedRole}
                onClose={() => {
                  setShowDetailsDialog(false);
                  setSelectedRole(null);
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RoleManagement;
