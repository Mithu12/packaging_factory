import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Users, Calendar, Clock, CheckCircle, XCircle } from 'lucide-react';
import { RBACApi } from '@/services/rbac-api';
import { Role, RoleWithPermissions } from '@/services/rbac-types';

interface RoleDetailsDialogProps {
  role: Role;
  onClose: () => void;
}

export const RoleDetailsDialog: React.FC<RoleDetailsDialogProps> = ({ role, onClose }) => {
  const [roleDetails, setRoleDetails] = useState<RoleWithPermissions | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRoleDetails();
  }, [role.id]);

  const loadRoleDetails = async () => {
    try {
      setLoading(true);
      console.log('Loading role details for role ID:', role.id);
      const details = await RBACApi.getRoleById(role.id);
      console.log('Role details received:', details);
      setRoleDetails(details || null);
    } catch (error) {
      console.error('Error loading role details:', error);
      setRoleDetails(null);
    } finally {
      setLoading(false);
    }
  };

  const getPermissionsByModule = () => {
    if (!roleDetails?.permissions) return {};
    
    return roleDetails.permissions.reduce((acc, permission) => {
      if (!permission?.module) return acc;
      if (!acc[permission.module]) {
        acc[permission.module] = [];
      }
      acc[permission.module].push(permission);
      return acc;
    }, {} as Record<string, typeof roleDetails.permissions>);
  };

  const getLevelDescription = (level: number) => {
    const descriptions = {
      1: 'System Administrator - Complete system control and configuration',
      2: 'Executive Management - Strategic oversight and high-level approvals',
      3: 'Department Manager - Full departmental control with approval authority',
      4: 'Staff/Supervisor - Operational management and team coordination',
      5: 'Operator - Day-to-day operational tasks and standard procedures',
      6: 'Employee - Self-service access and basic operational tasks'
    };
    return descriptions[level as keyof typeof descriptions] || 'Custom role level';
  };

  const getActionBadgeColor = (action: string) => {
    const colors: Record<string, string> = {
      'create': 'default',
      'read': 'secondary',
      'update': 'outline',
      'delete': 'destructive',
      'approve': 'default',
      'reject': 'destructive',
      'manage': 'default',
      'process': 'outline',
      'assign': 'secondary',
      'send': 'outline'
    };
    return colors[action] || 'outline';
  };

  const getDepartmentBadgeColor = (department: string) => {
    const colors: Record<string, string> = {
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
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!roleDetails) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Failed to load role details</p>
        <Button onClick={onClose} className="mt-4">Close</Button>
      </div>
    );
  }

  const permissionsByModule = getPermissionsByModule();
  const moduleNames = Object.keys(permissionsByModule);

  return (
    <div className="flex flex-col max-h-[80vh]">
      {/* Header - Fixed at top */}
      <div className="flex justify-between items-start pb-4 border-b">
        <div>
          <h3 className="text-xl font-semibold">{roleDetails.display_name}</h3>
          <p className="text-sm text-gray-600 mt-1">{roleDetails.name}</p>
        </div>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto space-y-6 pt-4">

      {/* Role Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Level</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roleDetails.level}</div>
            <p className="text-xs text-muted-foreground">Access level</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Department</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">
              <Badge variant={getDepartmentBadgeColor(roleDetails.department || 'General')}>
                {roleDetails.department || 'General'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Organization unit</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Permissions</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roleDetails.permissions.length}</div>
            <p className="text-xs text-muted-foreground">Assigned permissions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            {roleDetails.is_active ? 
              <CheckCircle className="h-4 w-4 text-green-500" /> : 
              <XCircle className="h-4 w-4 text-red-500" />
            }
          </CardHeader>
          <CardContent>
            <Badge variant={roleDetails.is_active ? 'default' : 'secondary'}>
              {roleDetails.is_active ? 'Active' : 'Inactive'}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">Current status</p>
          </CardContent>
        </Card>
      </div>

      {/* Role Information */}
      <Card>
        <CardHeader>
          <CardTitle>Role Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium text-sm text-gray-700 mb-1">Description</h4>
            <p className="text-sm text-gray-600">
              {roleDetails.description || 'No description provided'}
            </p>
          </div>
          
          <Separator />
          
          <div>
            <h4 className="font-medium text-sm text-gray-700 mb-1">Access Level Details</h4>
            <p className="text-sm text-gray-600">
              {getLevelDescription(roleDetails.level)}
            </p>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-sm text-gray-700 mb-1">Created</h4>
              <p className="text-sm text-gray-600 flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                {new Date(roleDetails.created_at).toLocaleDateString()}
              </p>
            </div>
            <div>
              <h4 className="font-medium text-sm text-gray-700 mb-1">Last Updated</h4>
              <p className="text-sm text-gray-600 flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                {new Date(roleDetails.updated_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permissions */}
      <Card>
        <CardHeader>
          <CardTitle>Assigned Permissions ({roleDetails.permissions.length})</CardTitle>
          <CardDescription>
            Permissions grouped by module for {roleDetails.display_name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {roleDetails.permissions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No permissions assigned to this role</p>
            </div>
          ) : (
            <Tabs value={moduleNames[0]} className="w-full">
              <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
                {moduleNames.slice(0, 6).map(module => (
                  <TabsTrigger key={module} value={module} className="text-xs">
                    {module.split(' ')[0]}
                    <span className="ml-1 text-xs bg-gray-200 rounded-full px-1">
                      {permissionsByModule[module].length}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>

              {moduleNames.map(module => (
                <TabsContent key={module} value={module}>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">{module} Module</h4>
                      <Badge variant="outline">
                        {permissionsByModule[module].length} permissions
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {permissionsByModule[module].map(permission => (
                        <div key={permission.id} className="p-3 border rounded-lg bg-gray-50">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-medium text-sm">
                              {permission.display_name}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mb-2">{permission.name}</p>
                          <div className="flex gap-1 flex-wrap">
                            <Badge variant={getActionBadgeColor(permission.action)} className="text-xs">
                              {permission.action}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {permission.resource}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Additional Information */}
      {roleDetails.user_count !== undefined && (
        <Card>
          <CardHeader>
            <CardTitle>Usage Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Users with this role</p>
                <p className="text-2xl font-bold">{roleDetails.user_count}</p>
              </div>
              <Users className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
};
