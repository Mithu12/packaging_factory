import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RBACApi } from '@/services/rbac-api';

export const RBACDebug: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testGetAllRoles = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    
    try {
      console.log('Testing getAllRoles...');
      const roles = await RBACApi.getAllRoles();
      console.log('Roles received:', roles);
      setResults({ type: 'roles', data: roles });
    } catch (err) {
      console.error('Error testing getAllRoles:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const testGetDepartmentStats = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    
    try {
      console.log('Testing getDepartmentStats...');
      const stats = await RBACApi.getDepartmentStats();
      console.log('Department stats received:', stats);
      setResults({ type: 'stats', data: stats });
    } catch (err) {
      console.error('Error testing getDepartmentStats:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const testDirectAPICall = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    
    try {
      console.log('Testing direct API call...');
      const response = await fetch('/api/roles', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Direct response status:', response.status);
      const data = await response.json();
      console.log('Direct response data:', data);
      setResults({ type: 'direct', status: response.status, data });
    } catch (err) {
      console.error('Error testing direct API call:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const testRoleDetails = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    
    try {
      console.log('Testing getRoleById...');
      const roleDetails = await RBACApi.getRoleById(1);
      console.log('Role details received:', roleDetails);
      setResults({ type: 'roleDetails', data: roleDetails });
    } catch (err) {
      console.error('Error testing getRoleById:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const testAllPermissions = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    
    try {
      console.log('Testing getAllPermissions...');
      const permissions = await RBACApi.getAllPermissions();
      console.log('Permissions received:', permissions);
      setResults({ type: 'permissions', data: permissions });
    } catch (err) {
      console.error('Error testing getAllPermissions:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>RBAC API Debug Tool</CardTitle>
        <CardDescription>
          Test RBAC API endpoints to debug role loading issues
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4 flex-wrap">
          <Button onClick={testGetAllRoles} disabled={loading}>
            Test Get All Roles
          </Button>
          <Button onClick={testGetDepartmentStats} disabled={loading}>
            Test Get Department Stats
          </Button>
          <Button onClick={testDirectAPICall} disabled={loading}>
            Test Direct API Call
          </Button>
          <Button onClick={testRoleDetails} disabled={loading}>
            Test Role Details (ID: 1)
          </Button>
          <Button onClick={testAllPermissions} disabled={loading}>
            Test All Permissions
          </Button>
        </div>

        {loading && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded">
            Loading...
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded">
            <h4 className="font-semibold text-red-800">Error:</h4>
            <pre className="text-sm text-red-700 mt-2">{error}</pre>
          </div>
        )}

        {results && (
          <div className="p-4 bg-green-50 border border-green-200 rounded">
            <h4 className="font-semibold text-green-800">Results ({results.type}):</h4>
            <pre className="text-sm text-green-700 mt-2 overflow-auto max-h-96">
              {JSON.stringify(results, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
