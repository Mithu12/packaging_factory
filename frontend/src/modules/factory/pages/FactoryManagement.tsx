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
          <h1 className="text-3xl font-bold tracking-tight">Factory Management</h1>
          <p className="text-muted-foreground">
            Manage factories, assign users, and control access permissions
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="flex items-center space-x-1">
            <Building2 className="h-3 w-3" />
            <span>Multi-Factory System</span>
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="factories" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="factories" className="flex items-center space-x-2">
            <Building2 className="h-4 w-4" />
            <span>Factories</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>User Assignments</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="factories" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building2 className="h-5 w-5" />
                <span>Factory Overview</span>
              </CardTitle>
              <CardDescription>
                Manage all factories in your organization. Each factory can have multiple managers, workers, and viewers with different access levels.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FactoryList onFactorySelect={handleFactorySelect} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>User Factory Assignments</span>
              </CardTitle>
              <CardDescription>
                View and manage which users have access to which factories and their roles within each factory.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedFactory ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="font-medium">{selectedFactory.name}</h3>
                      <p className="text-sm text-gray-600">Code: {selectedFactory.code}</p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setSelectedFactory(null)}
                    >
                      View All Factories
                    </Button>
                  </div>
                  <FactoryList onFactorySelect={handleFactorySelect} />
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Factory</h3>
                  <p className="text-gray-600 mb-4">
                    Choose a factory from the list above to view and manage user assignments.
                  </p>
                  <FactoryList onFactorySelect={handleFactorySelect} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Access Control</CardTitle>
                <CardDescription>
                  Configure how users access factory data and manage permissions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Factory-Based Filtering</h4>
                    <p className="text-sm text-gray-600">
                      Users only see data from factories they're assigned to
                    </p>
                  </div>
                  <Badge variant="default">Active</Badge>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Role-Based Permissions</h4>
                    <p className="text-sm text-gray-600">
                      Different access levels for managers, workers, and viewers
                    </p>
                  </div>
                  <Badge variant="default">Active</Badge>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Primary Factory Assignment</h4>
                    <p className="text-sm text-gray-600">
                      Users can have one primary factory for default context
                    </p>
                  </div>
                  <Badge variant="default">Active</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Factory Roles</CardTitle>
                <CardDescription>
                  Overview of the different roles and their permissions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-3 p-3 border rounded-lg">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-yellow-600 font-bold text-sm">M</span>
                  </div>
                  <div>
                    <h4 className="font-medium">Factory Manager</h4>
                    <p className="text-sm text-gray-600">
                      Full access to factory operations, orders, and user management
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 border rounded-lg">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 font-bold text-sm">W</span>
                  </div>
                  <div>
                    <h4 className="font-medium">Factory Worker</h4>
                    <p className="text-sm text-gray-600">
                      Can view and update factory orders and production data
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 border rounded-lg">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-gray-600 font-bold text-sm">V</span>
                  </div>
                  <div>
                    <h4 className="font-medium">Factory Viewer</h4>
                    <p className="text-sm text-gray-600">
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
