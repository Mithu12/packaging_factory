"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  MoreHorizontal,
  Download,
  Upload,
  Filter,
  Users,
  UserCheck,
  UserX,
  Building,
  Building2,
  CheckSquare,
  Square,
  ChevronDown
} from 'lucide-react';
import { Department, DepartmentListResponse, CreateDepartmentForm } from '../types';
import DepartmentForm from '../components/DepartmentForm';
import HRMApiService from '../services/hrm-api';

// Dummy data for departments
const DUMMY_DEPARTMENTS = [
  {
    id: 1,
    name: 'Human Resources',
    code: 'HR001',
    description: 'Manages employee relations, recruitment, and organizational development',
    manager_id: 2,
    manager: {
      id: 2,
      first_name: 'Sarah',
      last_name: 'Johnson',
      employee_id: 'EMP002',
      is_active: true,
      created_at: '2023-01-15T00:00:00Z',
      updated_at: '2023-01-15T00:00:00Z'
    },
    is_active: true,
    created_at: '2023-01-15T00:00:00Z',
    updated_at: '2023-01-15T00:00:00Z'
  },
  {
    id: 2,
    name: 'Information Technology',
    code: 'IT002',
    description: 'Responsible for technology infrastructure and software development',
    manager_id: 3,
    manager: {
      id: 3,
      first_name: 'Michael',
      last_name: 'Chen',
      employee_id: 'EMP003',
      is_active: true,
      created_at: '2023-01-15T00:00:00Z',
      updated_at: '2023-01-15T00:00:00Z'
    },
    is_active: true,
    created_at: '2023-01-15T00:00:00Z',
    updated_at: '2023-01-15T00:00:00Z'
  },
  {
    id: 3,
    name: 'Finance & Accounting',
    code: 'FIN003',
    description: 'Handles financial planning, budgeting, and accounting operations',
    manager_id: 4,
    manager: {
      id: 4,
      first_name: 'Emily',
      last_name: 'Davis',
      employee_id: 'EMP004',
      is_active: true,
      created_at: '2023-01-15T00:00:00Z',
      updated_at: '2023-01-15T00:00:00Z'
    },
    is_active: true,
    created_at: '2023-01-15T00:00:00Z',
    updated_at: '2023-01-15T00:00:00Z'
  },
  {
    id: 4,
    name: 'Marketing',
    code: 'MKT004',
    description: 'Manages brand promotion, advertising, and market research',
    manager_id: 5,
    manager: {
      id: 5,
      first_name: 'David',
      last_name: 'Wilson',
      employee_id: 'EMP005',
      is_active: true,
      created_at: '2023-01-15T00:00:00Z',
      updated_at: '2023-01-15T00:00:00Z'
    },
    is_active: true,
    created_at: '2023-01-15T00:00:00Z',
    updated_at: '2023-01-15T00:00:00Z'
  },
  {
    id: 5,
    name: 'Operations',
    code: 'OPS005',
    description: 'Oversees day-to-day business operations and logistics',
    manager_id: 6,
    manager: {
      id: 6,
      first_name: 'Lisa',
      last_name: 'Anderson',
      employee_id: 'EMP006',
      is_active: true,
      created_at: '2023-01-15T00:00:00Z',
      updated_at: '2023-01-15T00:00:00Z'
    },
    is_active: false,
    created_at: '2023-01-15T00:00:00Z',
    updated_at: '2023-01-15T00:00:00Z'
  },
  {
    id: 6,
    name: 'Quality Assurance',
    code: 'QA006',
    description: 'Ensures product quality and compliance with standards',
    manager_id: 7,
    manager: {
      id: 7,
      first_name: 'Robert',
      last_name: 'Taylor',
      employee_id: 'EMP007',
      is_active: true,
      created_at: '2023-01-15T00:00:00Z',
      updated_at: '2023-01-15T00:00:00Z'
    },
    is_active: true,
    created_at: '2023-01-15T00:00:00Z',
    updated_at: '2023-01-15T00:00:00Z'
  }
];

// Generate employee counts for each department (dummy data)
const generateEmployeeCounts = (departments: Department[]) => {
  return departments.map(dept => ({
    ...dept,
    employee_count: Math.floor(Math.random() * 20) + 5 // 5-25 employees per department
  }));
};

const DepartmentManagement: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedDepartments, setSelectedDepartments] = useState<number[]>([]);
  const [bulkAction, setBulkAction] = useState<string>('');

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  const [filters, setFilters] = useState({
    status: ''
  });

  useEffect(() => {
    loadDepartments().then(r => console.log(r));
  }, [pagination.page, searchTerm, filters]);

  const loadDepartments = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
      };

      if (searchTerm) {
        params.search = searchTerm;
      }

      if (filters.status && filters.status !== 'all') {
        params.is_active = filters.status === 'active';
      }

      const response = await HRMApiService.getDepartments(params);
      
      setDepartments(response.departments);
      setPagination(prev => ({
        ...prev,
        total: response.total,
        totalPages: response.totalPages
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDepartment = async (data: CreateDepartmentForm) => {
      await HRMApiService.createDepartment(data);
      setIsFormOpen(false);
      await loadDepartments();
  };

  const handleUpdateDepartment = async (id: number, data: Partial<CreateDepartmentForm>) => {
      await HRMApiService.updateDepartment(id, data);
      setIsFormOpen(false);
      setSelectedDepartment(null);
      await loadDepartments();
  };

  const handleDeleteDepartment = async (id: number) => {
    try {
      await HRMApiService.deleteDepartment(id);
      loadDepartments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete department');
    }
  };

  const handleToggleStatus = async (id: number) => {
    try {
      await HRMApiService.toggleDepartmentStatus(id);
      loadDepartments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update department status');
    }
  };

  const handleViewDepartment = (department: Department) => {
    setSelectedDepartment(department);
    setIsViewDialogOpen(true);
  };

  const handleEditDepartment = (department: Department) => {
    setSelectedDepartment(department);
    setIsFormOpen(true);
  };

  const handleExportDepartments = async () => {
    try {
      const params = {
        search: searchTerm,
        is_active: filters.status && filters.status !== 'all' ? filters.status === 'active' : undefined,
      };
      
      const blob = await HRMApiService.exportDepartments(params);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `departments-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to export departments');
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedDepartments.length === 0) return;

    try {
      await HRMApiService.bulkUpdateDepartments(action, selectedDepartments);
      setSelectedDepartments([]);
      setBulkAction('');
      loadDepartments();
    } catch (err) {
      setError('Bulk action failed');
    }
  };

  const getStatusBadge = (department: Department) => {
    return department.is_active ? (
      <Badge variant="default">Active</Badge>
    ) : (
      <Badge variant="secondary">Inactive</Badge>
    );
  };

  const getEmployeeCountBadge = (count: number) => {
    return (
      <div className="flex items-center gap-1">
        <Users className="h-3 w-3" />
        <span>{count}</span>
      </div>
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedDepartments(departments.map(d => d.id));
    } else {
      setSelectedDepartments([]);
    }
  };

  const handleSelectDepartment = (departmentId: number, checked: boolean) => {
    if (checked) {
      setSelectedDepartments(prev => [...prev, departmentId]);
    } else {
      setSelectedDepartments(prev => prev.filter(id => id !== departmentId));
    }
  };

  if (loading && departments.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Department Management</h1>
          <p className="text-muted-foreground">
            Manage organizational departments, structure, and team assignments
          </p>
        </div>
        <div className="flex gap-2">
          {selectedDepartments.length > 0 && (
            <>
              <Select value={bulkAction} onValueChange={setBulkAction}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Bulk Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="activate">Activate</SelectItem>
                  <SelectItem value="deactivate">Deactivate</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => handleBulkAction(bulkAction)}
                disabled={!bulkAction}
              >
                Apply ({selectedDepartments.length})
              </Button>
            </>
          )}
          <Button variant="outline" onClick={handleExportDepartments}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button type="button" variant="add" onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Department
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search departments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Department List */}
      <Card>
        <CardHeader>
          <CardTitle>Departments ({pagination.total})</CardTitle>
          <CardDescription>
            A list of all departments in your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedDepartments?.length === departments?.length && departments?.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Head of Department</TableHead>
                <TableHead>Employees</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments?.map((department) => (
                <TableRow key={department.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedDepartments.includes(department.id)}
                      onCheckedChange={(checked) => handleSelectDepartment(department.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{department.name}</p>
                      <p className="text-sm text-muted-foreground">{department.code}</p>
                      {department.description && (
                        <p className="text-sm text-muted-foreground mt-1">{department.description}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {department.manager ? (
                      <div>
                        <p className="font-medium">
                          {department.manager.first_name} {department.manager.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {department.manager.employee_id}
                        </p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">No manager assigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {getEmployeeCountBadge((department as any).employee_count || 0)}
                  </TableCell>
                  <TableCell>{getStatusBadge(department)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleViewDepartment(department)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditDepartment(department)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleToggleStatus(department.id)}>
                          {department.is_active ? (
                            <>
                              <UserX className="h-4 w-4 mr-2" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <UserCheck className="h-4 w-4 mr-2" />
                              Activate
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                              className="text-destructive"
                              onSelect={(e) => e.preventDefault()}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Department</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{department.name}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteDepartment(department.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} results
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page <= 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Department Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedDepartment ? 'Edit Department' : 'Add New Department'}
            </DialogTitle>
            <DialogDescription>
              {selectedDepartment
                ? 'Update department information and settings'
                : 'Create a new department with organizational details'
              }
            </DialogDescription>
          </DialogHeader>
          <DepartmentForm
            department={selectedDepartment || undefined}
            onSubmit={selectedDepartment ?
              (data) => handleUpdateDepartment(selectedDepartment.id, data) :
              handleCreateDepartment
            }
            onCancel={() => {
              setIsFormOpen(false);
              setSelectedDepartment(null);
            }}
            loading={loading}
          />
        </DialogContent>
      </Dialog>

      {/* Department Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Department Details</DialogTitle>
            <DialogDescription>
              Complete information about {selectedDepartment?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedDepartment && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="employees">Employees</TabsTrigger>
                <TabsTrigger value="structure">Structure</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Department Name</label>
                    <p className="text-sm text-muted-foreground">{selectedDepartment.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Department Code</label>
                    <p className="text-sm text-muted-foreground">{selectedDepartment.code}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Head of Department</label>
                    <p className="text-sm text-muted-foreground">
                      {selectedDepartment.manager ?
                        `${selectedDepartment.manager.first_name} ${selectedDepartment.manager.last_name}` :
                        'Not assigned'
                      }
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <p className="text-sm text-muted-foreground">
                      {getStatusBadge(selectedDepartment)}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium">Description</label>
                    <p className="text-sm text-muted-foreground">
                      {selectedDepartment.description || 'No description provided'}
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="employees" className="space-y-4">
                <div className="text-center text-muted-foreground py-8">
                  Employee list for this department would be displayed here
                </div>
              </TabsContent>

              <TabsContent value="structure" className="space-y-4">
                <div className="text-center text-muted-foreground py-8">
                  Department structure and hierarchy would be displayed here
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Error Display */}
      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded">
          <p>{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setError(null)}
            className="mt-2"
          >
            Dismiss
          </Button>
        </div>
      )}
    </div>
  );
};

export default DepartmentManagement;
