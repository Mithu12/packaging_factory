'use client';

import React, { useState, useEffect } from 'react';
import { Check, X, Search, Filter, Eye, EyeOff, ChevronDown, ChevronRight, Layers, Grid3X3, List } from 'lucide-react';
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
      console.log('Loading permission assignment data for role:', role.id);

      const [roleData, permissionsResponse, groupedResponse] = await Promise.all([
        RBACApi.getRoleById(role.id),
        RBACApi.getAllPermissions({ limit: 1000 }), // Get all permissions for assignment
        RBACApi.getPermissionsGrouped()
      ]);

      console.log('Role data:', roleData);
      console.log('Permissions response:', permissionsResponse);
      console.log('Grouped response:', groupedResponse);

      setRoleWithPermissions(roleData || null);
      setAllPermissions(permissionsResponse?.permissions || []);

      // Transform grouped permissions to the expected format
      const grouped: Record<string, Permission[]> = {};
      if (groupedResponse?.modules) {
        groupedResponse.modules.forEach(module => {
          grouped[module.module] = module.permissions || [];
        });
      }
      setGroupedPermissions(grouped);

      // Set currently assigned permissions
      const assignedIds = new Set((roleData?.permissions || []).map(p => p?.id).filter(Boolean));
      setSelectedPermissions(assignedIds);

      console.log('Assigned permission IDs:', Array.from(assignedIds));
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

      // Get currently assigned permissions
      const currentPermissions = new Set((roleWithPermissions?.permissions || []).map(p => p.id));
      const newPermissions = selectedPermissions;

      // Calculate permissions to add and remove
      const toAdd = Array.from(newPermissions).filter(id => !currentPermissions.has(id));
      const toRemove = Array.from(currentPermissions).filter(id => !newPermissions.has(id));

      console.log('Permissions to add:', toAdd);
      console.log('Permissions to remove:', toRemove);

      // Remove permissions first, then add new ones
      if (toRemove.length > 0) {
        await RBACApi.removePermissionsFromRole(role.id, toRemove);
      }

      if (toAdd.length > 0) {
        await RBACApi.assignPermissionsToRole(role.id, toAdd);
      }

      toast({
        title: "Success",
        description: `Role permissions updated successfully. Added ${toAdd.length}, removed ${toRemove.length} permissions.`,
      });

      // Reload data to reflect changes
      await loadData();
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

  const getActionBadgeColor = (action: string): 'default' | 'destructive' | 'outline' | 'secondary' => {
    const colors: Record<string, 'default' | 'destructive' | 'outline' | 'secondary'> = {
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

  const getResourceIcon = (resource: string) => {
    const icons: Record<string, string> = {
      'user': '👤',
      'users': '👥',
      'product': '📦',
      'order': '🛒',
      'inventory': '📊',
      'supplier': '🏢',
      'department': '🏛️',
      'role': '🛡️',
      'permission': '🔐',
      'report': '📈',
      'dashboard': '📋',
      'settings': '⚙️',
      'profile': '👤',
      'file': '📄',
      'image': '🖼️'
    };
    return icons[resource.toLowerCase()] || '📌';
  };


  const modules = Object.keys(groupedPermissions || {});
  const totalSelected = selectedPermissions?.size || 0;
  const totalAvailable = allPermissions?.length || 0;


  useEffect(() => {
    if (modules.length > 0 && !selectedModule) {
      setSelectedModule(modules[0]);
    }
  }, [modules, selectedModule]);

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


  return (
    <div className="flex flex-col h-full max-h-[85vh]">
      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto pr-2">
        <div className="space-y-4 pb-4">
          {/* Enhanced Header */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 -mx-6 px-6 py-4 border-b sticky top-0 z-10">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Assign Permissions</h3>
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">{role.display_name}</span> • {role.department} • Level {role.level}
                  </p>
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-gray-600">
                      <span className="font-semibold text-blue-600">{totalSelected}</span> of {totalAvailable} permissions selected
                    </p>
                    {totalSelected > 0 && (
                      <p className="text-sm text-gray-600">
                        Coverage: <span className="font-semibold text-green-600">{Math.round((totalSelected / totalAvailable) * 100)}%</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Filters */}
          <Card className="border-2 border-blue-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filters & Search
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search permissions by name, action, or resource..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-10"
                  />
                </div>
                <div className="flex gap-3 items-center flex-wrap">
                  <div className="flex items-center space-x-2 bg-blue-50 px-3 py-2 rounded-md">
                    <Switch
                      id="show-assigned"
                      checked={showOnlyAssigned}
                      onCheckedChange={setShowOnlyAssigned}
                    />
                    <Label htmlFor="show-assigned" className="text-sm font-medium cursor-pointer">
                      Show only assigned
                    </Label>
                  </div>
                  {totalSelected > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedPermissions(new Set())}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Clear All
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Module Selector */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Modules
              </CardTitle>
              <CardDescription>
                Select a module to configure permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {modules.map(module => {
                  const stats = getModuleStats(module);
                  const isSelected = selectedModule === module;
                  return (
                    <div
                      key={module}
                      onClick={() => setSelectedModule(module)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-sm text-gray-900">{module}</h4>
                        {stats.assigned > 0 && (
                          <Badge variant="default" className="bg-blue-500 text-xs">
                            {stats.assigned}
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>{stats.assigned}/{stats.total} assigned</span>
                          <span className="font-medium">{stats.percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              stats.percentage === 100 ? 'bg-green-500' : stats.percentage > 0 ? 'bg-blue-500' : 'bg-gray-300'
                            }`}
                            style={{ width: `${stats.percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Module Details */}
          {selectedModule && (
            <Card className="border-2 border-blue-200">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <span>{selectedModule}</span>
                      <Badge variant="outline" className="text-xs">Module</Badge>
                    </CardTitle>
                    <CardDescription className="mt-2">
                      <span className="font-medium text-blue-600">{getModuleStats(selectedModule).assigned}</span> of{' '}
                      <span className="font-medium">{getModuleStats(selectedModule).total}</span> permissions assigned
                      {' '}({getModuleStats(selectedModule).percentage}%)
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleModuleToggle(selectedModule, true)}
                      className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Select All
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleModuleToggle(selectedModule, false)}
                      className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Clear All
                    </Button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-3">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-500 ${
                      getModuleStats(selectedModule).percentage === 100
                        ? 'bg-green-500'
                        : getModuleStats(selectedModule).percentage > 0
                          ? 'bg-blue-500'
                          : 'bg-gray-400'
                    }`}
                    style={{ width: `${getModuleStats(selectedModule).percentage}%` }}
                  />
                </div>
              </CardHeader>

              <CardContent>
                {(() => {
                  const modulePermissions = groupedPermissions[selectedModule] || [];
                  const filteredPermissions = getFilteredPermissions(modulePermissions);

                  if (filteredPermissions.length === 0) {
                    return (
                      <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <div className="text-gray-400 mb-2">
                          <Grid3X3 className="w-12 h-12 mx-auto" />
                        </div>
                        <p className="text-gray-600 font-medium">
                          {showOnlyAssigned
                            ? 'No assigned permissions found'
                            : searchTerm
                              ? 'No permissions match your search'
                              : 'No permissions available'
                          }
                        </p>
                        {(searchTerm || showOnlyAssigned) && (
                          <Button
                            variant="link"
                            className="mt-2"
                            onClick={() => {
                              setSearchTerm('');
                              setShowOnlyAssigned(false);
                            }}
                          >
                            Clear filters
                          </Button>
                        )}
                      </div>
                    );
                  }

                  // Group permissions by resource
                  const groupedByResource = filteredPermissions.reduce((acc, permission) => {
                    const resource = permission.resource || 'Other';
                    if (!acc[resource]) {
                      acc[resource] = [];
                    }
                    acc[resource].push(permission);
                    return acc;
                  }, {} as Record<string, Permission[]>);

                  return (
                    <div className="space-y-6">
                      {Object.entries(groupedByResource)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([resource, permissions]) => {
                          const assignedCount = permissions.filter(p => selectedPermissions.has(p.id)).length;
                          const resourceStats = {
                            assigned: assignedCount,
                            total: permissions.length,
                            percentage: Math.round((assignedCount / permissions.length) * 100)
                          };

                          return (
                            <div key={resource} className="border border-gray-200 rounded-lg overflow-hidden">
                              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 py-3 border-b border-gray-200">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xl">{getResourceIcon(resource)}</span>
                                    <h4 className="font-semibold text-gray-900 capitalize">{resource}</h4>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <Badge variant="outline" className="bg-white">
                                      {resourceStats.assigned}/{resourceStats.total} selected
                                    </Badge>
                                    <span className="text-sm font-medium text-gray-600">
                                      {resourceStats.percentage}%
                                    </span>
                                  </div>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                                  <div
                                    className={`h-1.5 rounded-full transition-all ${
                                      resourceStats.percentage === 100 ? 'bg-green-500' : resourceStats.percentage > 0 ? 'bg-blue-500' : 'bg-gray-400'
                                    }`}
                                    style={{ width: `${resourceStats.percentage}%` }}
                                  />
                                </div>
                              </div>
                              <div className="p-4">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                  {permissions.map(permission => {
                                    const isSelected = selectedPermissions.has(permission.id);
                                    return (
                                      <div
                                        key={permission.id}
                                        className={`p-3 border rounded-lg cursor-pointer transition-all ${
                                          isSelected
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 hover:border-blue-300'
                                        }`}
                                        onClick={() => handlePermissionToggle(permission.id)}
                                      >
                                        <div className="flex items-start gap-3">
                                          <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                                            isSelected
                                              ? 'border-blue-500 bg-blue-500'
                                              : 'border-gray-300'
                                          }`}>
                                            {isSelected && <Check className="w-3 h-3 text-white" />}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <h5 className="font-medium text-sm text-gray-900 mb-1">
                                              {permission.display_name}
                                            </h5>
                                            <div className="flex gap-2 flex-wrap">
                                              <Badge
                                                variant={getActionBadgeColor(permission.action)}
                                                className="text-xs"
                                              >
                                                {permission.action}
                                              </Badge>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          {/* Summary Alert */}
          {totalSelected > 0 && (
            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-sm">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <p className="font-semibold text-blue-900 mb-1">Selection Summary</p>
                    <p>
                      You have selected <span className="font-bold">{totalSelected}</span> permissions out of{' '}
                      <span className="font-bold">{totalAvailable}</span> available (
                      <span className="font-bold">{Math.round((totalSelected / totalAvailable) * 100)}%</span> coverage).
                    </p>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      {/* Fixed Action Bar */}
      <div className="flex-shrink-0 bg-white border-t-2 border-gray-200 px-6 py-4 flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={onClose}
          disabled={saving}
          className="min-w-24"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="min-w-32 bg-blue-600 hover:bg-blue-700"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Saving...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
};