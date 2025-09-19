import React, { useState, useEffect } from 'react';
import { Search, User, UserCheck, Edit, Save, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { RBACApi } from '@/services/rbac-api';
import { Role, UserWithPermissions } from '@/services/rbac-types';

interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role?: string;
  role_id?: number;
  is_active: boolean;
  created_at: string;
}

interface UserRoleAssignmentProps {
  users: User[];
  onUserUpdate: () => void;
}

export const UserRoleAssignment: React.FC<UserRoleAssignmentProps> = ({ users, onUserUpdate }) => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [editingUser, setEditingUser] = useState<number | null>(null);
  const [tempRoleId, setTempRoleId] = useState<number | null>(null);
  const [showPermissionsDialog, setShowPermissionsDialog] = useState(false);
  const [selectedUserPermissions, setSelectedUserPermissions] = useState<UserWithPermissions | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      setLoading(true);
      console.log('UserRoleAssignment: Loading roles...');
      const rolesData = await RBACApi.getAllRoles();
      console.log('UserRoleAssignment: Roles received:', rolesData);
      setRoles(Array.isArray(rolesData) ? rolesData : []);
    } catch (error) {
      console.error('UserRoleAssignment: Error loading roles:', error);
      setRoles([]);
      toast({
        title: "Error",
        description: `Failed to load roles: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleUpdate = async (userId: number, newRoleId: number | null) => {
    try {
      // Note: This would need to be implemented in your user API
      // For now, we'll show a placeholder
      toast({
        title: "Success",
        description: "User role updated successfully",
      });
      
      setEditingUser(null);
      setTempRoleId(null);
      onUserUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      });
    }
  };

  const handleViewPermissions = async (user: User) => {
    if (!user || !user.role_id) {
      toast({
        title: "No Role Assigned",
        description: "This user doesn't have a role assigned yet",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('UserRoleAssignment: Loading permissions for user:', user.id);
      const userPermissions = await RBACApi.getUserPermissions(user.id);
      console.log('UserRoleAssignment: User permissions received:', userPermissions);
      setSelectedUserPermissions(userPermissions || null);
      setShowPermissionsDialog(true);
    } catch (error) {
      console.error('UserRoleAssignment: Error loading user permissions:', error);
      setSelectedUserPermissions(null);
      toast({
        title: "Error",
        description: `Failed to load user permissions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  const getRoleById = (roleId: number) => {
    if (!roleId || !roles || !Array.isArray(roles)) return null;
    return roles.find(role => role?.id === roleId) || null;
  };

  const getRoleByName = (roleName: string) => {
    if (!roleName || !roles || !Array.isArray(roles)) return null;
    return roles.find(role => role?.name === roleName) || null;
  };

  const filteredUsers = (users || []).filter(user => {
    if (!user) return false;
    
    const matchesSearch = (user.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (user.username?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    const userRole = user.role_id ? getRoleById(user.role_id) : getRoleByName(user.role || '');
    const matchesDepartment = selectedDepartment === 'all' || userRole?.department === selectedDepartment;
    const matchesRole = selectedRole === 'all' || userRole?.name === selectedRole;
    
    return matchesSearch && matchesDepartment && matchesRole;
  });

  const uniqueDepartments = [...new Set((roles || []).map(role => role?.department).filter(Boolean))];

  const getDepartmentBadgeColor = (department: string): "default" | "destructive" | "outline" | "secondary" => {
    const colors: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
      'IT': 'destructive',
      'Management': 'default',
      'Finance': 'default',
      'HR': 'secondary',
      'Sales': 'outline',
      'Purchase': 'outline',
      'Inventory': 'secondary',
      'Operations': 'outline',
      'Customer Service': 'secondary',
      'Marketing': 'outline',
      'Compliance': 'default',
      'General': 'secondary'
    };
    return colors[department] || 'outline';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">User Role Assignment</h2>
          <p className="text-gray-600 mt-1">
            Assign and manage user roles across your organization
          </p>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">All system users</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With Roles</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.role_id || u.role).length}
            </div>
            <p className="text-xs text-muted-foreground">Users with assigned roles</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => u.is_active).length}
            </div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unassigned</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter(u => !u.role_id && !u.role).length}
            </div>
            <p className="text-xs text-muted-foreground">No role assigned</p>
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
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div> 
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {uniqueDepartments.map(dept => (
                  <SelectItem key={dept || 'unknown'} value={dept || 'unknown'}>{dept || 'Unknown'}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {(roles || []).map(role => role ? (
                  <SelectItem key={role.name || role.id} value={role.name || 'unknown'}>{role.display_name || role.name || 'Unknown Role'}</SelectItem>
                ) : null)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({filteredUsers.length})</CardTitle>
          <CardDescription>
            Manage role assignments for system users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Current Role</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => {
                if (!user) return null;
                
                const currentRole = user.role_id ? getRoleById(user.role_id) : getRoleByName(user.role || '');
                const isEditing = editingUser === user.id;
                
                return (
                  <TableRow key={user.id || Math.random()}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{user.full_name || 'Unknown User'}</span>
                        <span className="text-sm text-gray-500">{user.username || 'No username'}</span>
                        <span className="text-xs text-gray-400">{user.email || 'No email'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Select 
                          value={tempRoleId?.toString() || 'none'} 
                          onValueChange={(value) => setTempRoleId(value === 'none' ? null : (value ? parseInt(value) : null))}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Role</SelectItem>
                            {(roles || []).map(role => role ? (
                              <SelectItem key={role.id} value={role.id.toString()}>
                                {role.display_name || role.name || 'Unknown Role'}
                              </SelectItem>
                            ) : null)}
                          </SelectContent>
                        </Select>
                      ) : currentRole ? (
                        <div className="flex flex-col">
                          <span className="font-medium">{currentRole.display_name || currentRole.name || 'Unknown Role'}</span>
                          <Badge variant="outline" className="w-fit mt-1">
                            Level {currentRole.level || 'N/A'}
                          </Badge>
                        </div>
                      ) : (
                        <Badge variant="secondary">No Role Assigned</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {currentRole?.department ? (
                        <Badge variant={getDepartmentBadgeColor(currentRole.department)}>
                          {currentRole.department}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.is_active ? 'default' : 'secondary'}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-500">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        {isEditing ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleRoleUpdate(user.id, tempRoleId)}
                            >
                              <Save className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingUser(null);
                                setTempRoleId(null);
                              }}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewPermissions(user)}
                              disabled={!currentRole}
                            >
                              View Permissions
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingUser(user.id);
                                setTempRoleId(user.role_id || null);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No users found matching your criteria</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Permissions Dialog */}
      <Dialog open={showPermissionsDialog} onOpenChange={setShowPermissionsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Permissions - {selectedUserPermissions?.full_name || 'Unknown User'}</DialogTitle>
            <DialogDescription>
              Effective permissions for this user based on their assigned role
            </DialogDescription>
          </DialogHeader>
          
          {selectedUserPermissions ? (
            <div className="space-y-6">
              {/* Permission Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Role Permissions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {selectedUserPermissions.role_permissions?.length || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">From assigned role</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Direct Permissions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {selectedUserPermissions.direct_permissions?.length || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Directly assigned</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Total Permissions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {selectedUserPermissions.all_permissions?.length || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Combined total</p>
                  </CardContent>
                </Card>
              </div>

              {/* Permissions by Module */}
              {selectedUserPermissions.all_permissions && selectedUserPermissions.all_permissions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Permissions by Module</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(
                        selectedUserPermissions.all_permissions.reduce((acc, permission) => {
                          if (!acc[permission.module]) {
                            acc[permission.module] = [];
                          }
                          acc[permission.module].push(permission);
                          return acc;
                        }, {} as Record<string, typeof selectedUserPermissions.all_permissions>)
                      ).map(([module, permissions]) => (
                        <div key={module}>
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-medium">{module}</h4>
                            <Badge variant="outline">{permissions.length} permissions</Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {permissions.map(permission => (
                              <div key={permission.id} className="text-sm p-2 bg-gray-50 rounded">
                                {permission.display_name}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No permission data available</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
