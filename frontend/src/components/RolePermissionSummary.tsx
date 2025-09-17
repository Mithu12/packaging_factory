import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { getAccessibleModules, getModuleActions, getRoleDisplayName, getRoleColor } from '@/utils/rbac';

export const RolePermissionSummary: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  const accessibleModules = getAccessibleModules(user);
  const userRole = getRoleDisplayName(user.role);
  const roleColor = getRoleColor(user.role);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>Role & Permissions</span>
          <Badge variant={roleColor as any}>{userRole}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">User Information</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>Name:</strong> {user.full_name}</p>
              <p><strong>Username:</strong> {user.username}</p>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Role:</strong> {userRole}</p>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">Accessible Modules</h4>
            <div className="flex flex-wrap gap-2">
              {accessibleModules.map((module) => {
                const actions = getModuleActions(user, module);
                return (
                  <div key={module} className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs">
                      {module.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      ({actions.length} actions)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">Module Permissions</h4>
            <div className="space-y-2">
              {accessibleModules.map((module) => {
                const actions = getModuleActions(user, module);
                return (
                  <div key={module} className="border rounded p-2">
                    <div className="font-medium text-sm mb-1">
                      {module.replace('_', ' ').toUpperCase()}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {actions.map((action) => (
                        <Badge key={action} variant="secondary" className="text-xs">
                          {action}
                        </Badge>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RolePermissionSummary;
