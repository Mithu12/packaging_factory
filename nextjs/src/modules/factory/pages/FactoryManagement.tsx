"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Users, Settings, Plus } from 'lucide-react';
import FactoryList from '../components/FactoryList';
import { Factory } from '../types';

const FactoryManagement: React.FC = () => {
  const [selectedFactory, setSelectedFactory] = useState<Factory | null>(null);

  const handleFactorySelect = (factory: Factory) => {
    setSelectedFactory(factory);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="factory-management-title">Factory Management</h1>
          <p className="text-muted-foreground" data-testid="factory-management-subtitle">
            Manage factories, assign users, and control access permissions
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="flex items-center space-x-1" data-testid="multi-factory-badge">
            <Building2 className="h-3 w-3" />
            <span>Multi-Factory System</span>
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="factories" className="space-y-6" data-testid="factory-management-tabs">
        <TabsList className="grid w-full grid-cols-3" data-testid="factory-tabs-list">
          <TabsTrigger value="factories" className="flex items-center space-x-2" data-testid="factories-tab">
            <Building2 className="h-4 w-4" />
            <span>Factories</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center space-x-2" data-testid="users-tab">
            <Users className="h-4 w-4" />
            <span>User Assignments</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center space-x-2" data-testid="settings-tab">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="factories" className="space-y-6" data-testid="factories-tab-content">
          <Card data-testid="factory-overview-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2" data-testid="factory-overview-title">
                <Building2 className="h-5 w-5" />
                <span>Factory Overview</span>
              </CardTitle>
              <CardDescription data-testid="factory-overview-description">
                Manage all factories in your organization. Each factory can have multiple managers, workers, and viewers with different access levels.
              </CardDescription>
            </CardHeader>
            <CardContent data-testid="factory-overview-content">
              <FactoryList onFactorySelect={handleFactorySelect} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6" data-testid="users-tab-content">
          <Card data-testid="user-assignments-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2" data-testid="user-assignments-title">
                <Users className="h-5 w-5" />
                <span>User Factory Assignments</span>
              </CardTitle>
              <CardDescription data-testid="user-assignments-description">
                View and manage which users have access to which factories and their roles within each factory.
              </CardDescription>
            </CardHeader>
            <CardContent data-testid="user-assignments-content">
              {selectedFactory ? (
                <div className="space-y-4" data-testid="selected-factory-section">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg" data-testid="selected-factory-header">
                    <div>
                      <h3 className="font-medium" data-testid="selected-factory-name">{selectedFactory.name}</h3>
                      <p className="text-sm text-gray-600" data-testid="selected-factory-code">Code: {selectedFactory.code}</p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setSelectedFactory(null)}
                      data-testid="view-all-factories-button"
                    >
                      View All Factories
                    </Button>
                  </div>
                  <FactoryList onFactorySelect={handleFactorySelect} />
                </div>
              ) : (
                <div className="text-center py-8" data-testid="no-factory-selected">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" data-testid="select-factory-icon" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2" data-testid="select-factory-title">Select a Factory</h3>
                  <p className="text-gray-600 mb-4" data-testid="select-factory-description">
                    Choose a factory from the list above to view and manage user assignments.
                  </p>
                  <FactoryList onFactorySelect={handleFactorySelect} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6" data-testid="settings-tab-content">
          <div className="grid gap-6 md:grid-cols-2" data-testid="settings-grid">
            <Card data-testid="access-control-card">
              <CardHeader>
                <CardTitle data-testid="access-control-title">Access Control</CardTitle>
                <CardDescription data-testid="access-control-description">
                  Configure how users access factory data and manage permissions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4" data-testid="access-control-content">
                <div className="flex items-center justify-between p-4 border rounded-lg" data-testid="factory-filtering-setting">
                  <div>
                    <h4 className="font-medium" data-testid="factory-filtering-title">Factory-Based Filtering</h4>
                    <p className="text-sm text-gray-600" data-testid="factory-filtering-description">
                      Users only see data from factories they're assigned to
                    </p>
                  </div>
                  <Badge variant="default" data-testid="factory-filtering-status">Active</Badge>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg" data-testid="role-permissions-setting">
                  <div>
                    <h4 className="font-medium" data-testid="role-permissions-title">Role-Based Permissions</h4>
                    <p className="text-sm text-gray-600" data-testid="role-permissions-description">
                      Different access levels for managers, workers, and viewers
                    </p>
                  </div>
                  <Badge variant="default" data-testid="role-permissions-status">Active</Badge>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg" data-testid="primary-assignment-setting">
                  <div>
                    <h4 className="font-medium" data-testid="primary-assignment-title">Primary Factory Assignment</h4>
                    <p className="text-sm text-gray-600" data-testid="primary-assignment-description">
                      Users can have one primary factory for default context
                    </p>
                  </div>
                  <Badge variant="default" data-testid="primary-assignment-status">Active</Badge>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="factory-roles-card">
              <CardHeader>
                <CardTitle data-testid="factory-roles-title">Factory Roles</CardTitle>
                <CardDescription data-testid="factory-roles-description">
                  Overview of the different roles and their permissions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4" data-testid="factory-roles-content">
                <div className="flex items-start space-x-3 p-3 border rounded-lg" data-testid="manager-role-card">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0" data-testid="manager-role-icon">
                    <span className="text-yellow-600 font-bold text-sm">M</span>
                  </div>
                  <div>
                    <h4 className="font-medium" data-testid="manager-role-title">Factory Manager</h4>
                    <p className="text-sm text-gray-600" data-testid="manager-role-description">
                      Full access to factory operations, orders, and user management
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 border rounded-lg" data-testid="worker-role-card">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0" data-testid="worker-role-icon">
                    <span className="text-blue-600 font-bold text-sm">W</span>
                  </div>
                  <div>
                    <h4 className="font-medium" data-testid="worker-role-title">Factory Worker</h4>
                    <p className="text-sm text-gray-600" data-testid="worker-role-description">
                      Can view and update factory orders and production data
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 border rounded-lg" data-testid="viewer-role-card">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0" data-testid="viewer-role-icon">
                    <span className="text-gray-600 font-bold text-sm">V</span>
                  </div>
                  <div>
                    <h4 className="font-medium" data-testid="viewer-role-title">Factory Viewer</h4>
                    <p className="text-sm text-gray-600" data-testid="viewer-role-description">
                      Read-only access to factory data and reports
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FactoryManagement;
