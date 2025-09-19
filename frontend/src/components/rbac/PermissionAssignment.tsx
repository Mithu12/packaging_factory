import React, { useState, useEffect } from 'react';
import { Check, X, Search, Filter, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { RBACApi } from '@/services/rbac-api';
import { Role, Permission, RoleWithPermissions } from '@/services/rbac-types';

interface PermissionAssignmentProps {
  role: Role;
  onClose: () => void;
}

export const PermissionAssignment: React.FC<PermissionAssignmentProps> = ({ role, onClose }) => {
  const [roleWithPermissions, setRoleWithPermissions] = useState<RoleWithPermissions | null>(null);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [groupedPermissions, setGroupedPermissions] = useState<Record<string, Permission[]>>({});
  const [selectedPermissions, setSelectedPermissions] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('');
  const [showOnlyAssigned, setShowOnlyAssigned] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [role.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [roleData, permissionsData] = await Promise.all([
        RBACApi.getRoleById(role.id),
        RBACApi.getAllPermissions()
      ]);
      
      setRoleWithPermissions(roleData || null);
      setAllPermissions(permissionsData?.permissions || []);
      setGroupedPermissions(permissionsData?.grouped || {});
      
      // Set currently assigned permissions
      const assignedIds = new Set((roleData?.permissions || []).map(p => p?.id).filter(Boolean));
      setSelectedPermissions(assignedIds);
    } catch (error) {
      console.error('Error loading permission data:', error);
      toast({
        title: "Error",
        description: `Failed to load permission data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
      // Set fallback values
      setRoleWithPermissions(null);
      setAllPermissions([]);
      setGroupedPermissions({});
      setSelectedPermissions(new Set());
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionToggle = (permissionId: number) => {
    const newSelected = new Set(selectedPermissions);
    if (newSelected.has(permissionId)) {
      newSelected.delete(permissionId);
    } else {
      newSelected.add(permissionId);
    }
    setSelectedPermissions(newSelected);
  };

  const handleModuleToggle = (module: string, assign: boolean) => {
    const modulePermissions = groupedPermissions[module] || [];
    const newSelected = new Set(selectedPermissions);
    
    modulePermissions.forEach(permission => {
      if (assign) {
        newSelected.add(permission.id);
      } else {
        newSelected.delete(permission.id);
      }
    });
    
    setSelectedPermissions(newSelected);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      console.log('Saving role permissions for role:', role.id);
      console.log('Selected permissions:', Array.from(selectedPermissions));
      
      const updateData = {
        permission_ids: Array.from(selectedPermissions)
      };
      
      await RBACApi.updateRole(role.id, updateData);
      
      toast({
        title: "Success",
        description: "Role permissions updated successfully",
      });
      
      onClose();
    } catch (error) {
      console.error('Error saving role permissions:', error);
      toast({
        title: "Error",
        description: `Failed to update role permissions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getFilteredPermissions = (modulePermissions: Permission[]) => {
    if (!modulePermissions || !Array.isArray(modulePermissions)) return [];
    
    let filtered = modulePermissions;
    
    if (searchTerm) {
      filtered = filtered.filter(permission =>
        permission?.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        permission?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        permission?.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        permission?.resource?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (showOnlyAssigned) {
      filtered = filtered.filter(permission => permission?.id && selectedPermissions.has(permission.id));
    }
    
    return filtered;
  };

  const getModuleStats = (module: string) => {
    const modulePermissions = groupedPermissions?.[module] || [];
    const assigned = modulePermissions.filter(p => p?.id && selectedPermissions.has(p.id)).length;
    const total = modulePermissions.length;
    return { assigned, total, percentage: total > 0 ? Math.round((assigned / total) * 100) : 0 };
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

  const modules = Object.keys(groupedPermissions || {});
  const totalSelected = selectedPermissions?.size || 0;
  const totalAvailable = allPermissions?.length || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold">Assign Permissions</h3>
          <p className="text-sm text-gray-600">
            Role: {role.display_name} ({role.department})
          </p>
          <p className="text-sm text-gray-500">
            {totalSelected} of {totalAvailable} permissions selected
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap items-center">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search permissions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="show-assigned"
                checked={showOnlyAssigned}
                onCheckedChange={setShowOnlyAssigned}
              />
              <Label htmlFor="show-assigned" className="text-sm">
                Show only assigned
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permission Assignment by Module */}
      <Tabs value={selectedModule || modules[0]} onValueChange={setSelectedModule}>
        <TabsList className="grid w-full grid-cols-6 lg:grid-cols-13">
          {modules.map(module => {
            const stats = getModuleStats(module);
            return (
              <TabsTrigger key={module} value={module} className="text-xs relative">
                {module.split(' ')[0]}
                {stats.assigned > 0 && (
                  <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {stats.assigned}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {modules.map(module => {
          const modulePermissions = groupedPermissions[module] || [];
          const filteredPermissions = getFilteredPermissions(modulePermissions);
          const stats = getModuleStats(module);
          
          return (
            <TabsContent key={module} value={module}>
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-lg">{module} Module</CardTitle>
                      <CardDescription>
                        {stats.assigned} of {stats.total} permissions assigned ({stats.percentage}%)
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleModuleToggle(module, true)}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Select All
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleModuleToggle(module, false)}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Clear All
                      </Button>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${stats.percentage}%` }}
                    ></div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  {filteredPermissions.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">
                        {showOnlyAssigned 
                          ? 'No assigned permissions found'
                          : searchTerm 
                            ? 'No permissions match your search'
                            : 'No permissions available'
                        }
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {filteredPermissions.map(permission => {
                        const isSelected = selectedPermissions.has(permission.id);
                        return (
                          <div
                            key={permission.id}
                            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                              isSelected 
                                ? 'border-blue-500 bg-blue-50' 
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => handlePermissionToggle(permission.id)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                                    isSelected 
                                      ? 'border-blue-500 bg-blue-500' 
                                      : 'border-gray-300'
                                  }`}>
                                    {isSelected && <Check className="w-3 h-3 text-white" />}
                                  </div>
                                  <span className="font-medium text-sm">
                                    {permission.display_name}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 mb-2">
                                  {permission.name}
                                </p>
                                <div className="flex gap-1 flex-wrap">
                                  <Badge variant={getActionBadgeColor(permission.action)} className="text-xs">
                                    {permission.action}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {permission.resource}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Summary */}
      {totalSelected > 0 && (
        <Alert>
          <AlertDescription>
            <strong>Summary:</strong> You have selected {totalSelected} permissions out of {totalAvailable} available. 
            This represents {Math.round((totalSelected / totalAvailable) * 100)}% of all system permissions.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
