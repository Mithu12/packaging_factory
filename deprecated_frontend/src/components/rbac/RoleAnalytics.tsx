import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, Users, Shield, Building, Activity, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RBACApi } from '@/services/rbac-api';
import { Role, DepartmentStats } from '@/services/rbac-types';

export const RoleAnalytics: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [departmentStats, setDepartmentStats] = useState<DepartmentStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      console.log('Loading analytics data...');
      
      const [rolesResponse, statsData] = await Promise.all([
        RBACApi.getAllRoles({ limit: 1000 }), // Get all roles for analytics
        RBACApi.getDepartmentStats()
      ]);
      
      console.log('Analytics roles response:', rolesResponse);
      console.log('Analytics stats data:', statsData);
      
      // Extract the roles array from the response object
      setRoles(rolesResponse?.roles || []);
      setDepartmentStats(statsData || []);
    } catch (error) {
      console.error('Error loading analytics data:', error);
      // Set fallback data
      setRoles([]);
      setDepartmentStats([]);
    } finally {
      setLoading(false);
    }
  };

  const getRoleDistributionData = () => {
    // Ensure roles is an array before using reduce
    if (!Array.isArray(roles) || roles.length === 0) {
      return [];
    }

    const levelCounts = roles.reduce((acc, role) => {
      const level = `Level ${role.level}`;
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalRoles = roles.length;
    return Object.entries(levelCounts).map(([level, count]) => ({
      level,
      count,
      percentage: Math.round((count / totalRoles) * 100)
    }));
  };

  const getDepartmentData = () => {
    if (!departmentStats || !Array.isArray(departmentStats)) return [];
    
    return departmentStats.map(dept => ({
      department: dept?.department || 'Unknown',
      total_users: dept?.total_users || 0,
      active_users: dept?.active_users || 0,
      roles_count: dept?.total_roles || 0, // Use total_roles from backend
      active_roles: dept?.active_roles || 0, // Add active_roles
      utilization: (dept?.total_users || 0) > 0 ? Math.round(((dept?.active_users || 0) / (dept?.total_users || 1)) * 100) : 0
    }));
  };

  const getPermissionCoverageData = () => {
    // Mock permission coverage data - in real implementation, this would come from API
    const modules = [
      { module: 'Finance', permissions: 25, roles_using: 5, coverage: 80 },
      { module: 'Sales', permissions: 20, roles_using: 7, coverage: 75 },
      { module: 'Inventory', permissions: 20, roles_using: 4, coverage: 60 },
      { module: 'HR', permissions: 15, roles_using: 3, coverage: 65 },
      { module: 'Purchase', permissions: 15, roles_using: 4, coverage: 70 },
      { module: 'Operations', permissions: 12, roles_using: 3, coverage: 55 },
      { module: 'Customer Service', permissions: 12, roles_using: 5, coverage: 85 },
      { module: 'Marketing', permissions: 12, roles_using: 2, coverage: 40 },
      { module: 'User Management', permissions: 11, roles_using: 2, coverage: 30 },
      { module: 'System', permissions: 10, roles_using: 1, coverage: 20 }
    ];
    
    return modules;
  };

  const getRoleHierarchyData = () => {
    // Ensure roles is an array before using filter
    if (!Array.isArray(roles)) {
      return [];
    }

    const hierarchyData = [1, 2, 3, 4, 5, 6].map(level => {
      const rolesAtLevel = roles.filter(role => role.level === level);
      return {
        level: `Level ${level}`,
        roles: rolesAtLevel.length,
        departments: [...new Set(rolesAtLevel.map(r => r.department).filter(Boolean))].length
      };
    });
    
    return hierarchyData;
  };

  const getTopMetrics = () => {
    // Ensure departmentStats and roles are arrays before using array methods
    const safeRoles = Array.isArray(roles) ? roles : [];
    const safeDepartmentStats = Array.isArray(departmentStats) ? departmentStats : [];
    
    const totalUsers = safeDepartmentStats.reduce((sum, dept) => sum + (dept.total_users || 0), 0);
    const activeUsers = safeDepartmentStats.reduce((sum, dept) => sum + (dept.active_users || 0), 0);
    const totalDepartments = safeDepartmentStats.length;
    const avgRolesPerDept = totalDepartments > 0 ? Math.round(safeRoles.length / totalDepartments) : 0;

    return {
      totalRoles: safeRoles.length,
      totalUsers,
      activeUsers,
      totalDepartments,
      avgRolesPerDept,
      userUtilization: totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0
    };
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const metrics = getTopMetrics();
  const roleDistribution = getRoleDistributionData();
  const departmentData = getDepartmentData();
  const permissionCoverage = getPermissionCoverageData();
  const hierarchyData = getRoleHierarchyData();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold">Role Analytics</h2>
        <p className="text-gray-600 mt-2">
          Comprehensive insights into your organization's role-based access control system
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Roles</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalRoles}</div>
            <p className="text-xs text-muted-foreground">Active roles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalUsers}</div>
            <p className="text-xs text-muted-foreground">System users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeUsers}</div>
            <p className="text-xs text-muted-foreground">{metrics.userUtilization}% utilization</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Departments</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalDepartments}</div>
            <p className="text-xs text-muted-foreground">Organizational units</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Roles/Dept</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgRolesPerDept}</div>
            <p className="text-xs text-muted-foreground">Role distribution</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Permissions</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">173</div>
            <p className="text-xs text-muted-foreground">Total available</p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="hierarchy">Hierarchy</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Role Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Role Distribution by Level</CardTitle>
                <CardDescription>
                  Distribution of roles across different access levels
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={roleDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ level, count }) => `${level}: ${count}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {roleDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Department Users */}
            <Card>
              <CardHeader>
                <CardTitle>User Distribution by Department</CardTitle>
                <CardDescription>
                  Active vs total users across departments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={departmentData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="department" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      fontSize={12}
                    />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="total_users" fill="#8884d8" name="Total Users" />
                    <Bar dataKey="active_users" fill="#82ca9d" name="Active Users" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="departments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Department Analysis</CardTitle>
              <CardDescription>
                Detailed breakdown of users, roles, and utilization by department
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {departmentData?.map((dept, index) => (
                  <div key={dept.department} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold">{dept.department}</h3>
                        <p className="text-sm text-gray-600">
                          {dept.roles_count} roles • {dept.total_users} users
                        </p>
                      </div>
                      <Badge variant="outline">
                        {dept.utilization}% active
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 mb-3">
                      <div className="text-center">
                        <div className="text-lg font-bold">{dept.total_users}</div>
                        <div className="text-xs text-gray-500">Total Users</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold">{dept.active_users}</div>
                        <div className="text-xs text-gray-500">Active Users</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold">{dept.roles_count}</div>
                        <div className="text-xs text-gray-500">Roles</div>
                      </div>
                    </div>
                    
                    <Progress value={dept.utilization} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Permission Coverage by Module</CardTitle>
              <CardDescription>
                How well each module's permissions are utilized across roles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {permissionCoverage?.map((module) => (
                  <div key={module.module} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-semibold">{module.module}</h3>
                      <div className="flex gap-2">
                        <Badge variant="outline">
                          {module.permissions} permissions
                        </Badge>
                        <Badge variant="secondary">
                          {module.roles_using} roles
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Coverage</span>
                      <span>{module.coverage}%</span>
                    </div>
                    
                    <Progress value={module.coverage} className="h-2" />
                    
                    {module.coverage < 50 && (
                      <Alert className="mt-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">
                          Low utilization - consider reviewing role assignments for this module
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hierarchy" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Role Hierarchy Distribution</CardTitle>
                <CardDescription>
                  Number of roles at each hierarchical level
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={hierarchyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="level" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="roles" fill="#8884d8" name="Number of Roles" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Hierarchy Details</CardTitle>
                <CardDescription>
                  Breakdown of roles and departments by level
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {hierarchyData?.map((level, index) => (
                    <div key={level.level} className="flex justify-between items-center p-3 border rounded">
                      <div>
                        <div className="font-medium">{level.level}</div>
                        <div className="text-sm text-gray-500">
                          {level.departments} departments
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">{level.roles}</div>
                        <div className="text-xs text-gray-500">roles</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
