"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  Calendar
} from 'lucide-react';
import { HRMApiService } from '@/modules/hrm/services/hrm-api';
import { Employee, EmployeeListResponse, CreateEmployeeForm, Department } from '@/modules/hrm/types';
import EmployeeForm from '@/modules/hrm/components/EmployeeForm';

const EmployeeManagement: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<number | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [filters, setFilters] = useState({
    department_id: '',
    designation_id: '',
    employment_type: '',
    is_active: ''
  });
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    loadEmployees();
  }, [pagination.page, debouncedSearchTerm, filters]);

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      const response = await HRMApiService.getDepartments({ is_active: true, limit: 100 });
      if (response && response.departments) {
        setDepartments(response.departments);
      }
    } catch (err) {
      console.error('Failed to load departments', err);
    }
  };

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const response: EmployeeListResponse = await HRMApiService.getEmployees({
        search: debouncedSearchTerm || undefined,
        department_id: filters.department_id ? parseInt(filters.department_id) : undefined,
        designation_id: filters.designation_id ? parseInt(filters.designation_id) : undefined,
        employment_type: filters.employment_type && filters.employment_type !== 'all' ? filters.employment_type : undefined,
        is_active: filters.is_active && filters.is_active !== 'all' ? filters.is_active === 'true' : undefined,
        page: pagination.page,
        limit: pagination.limit,
        sort_by: 'created_at',
        sort_order: 'desc'
      });

      setEmployees(response.employees);
      setPagination({
        page: response.page,
        limit: response.limit,
        total: response.total,
        totalPages: response.totalPages
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEmployee = async (data: CreateEmployeeForm) => {
    try {
      await HRMApiService.createEmployee(data);
      setIsFormOpen(false);
      loadEmployees();
    } catch (err) {
      throw err;
    }
  };

  const handleUpdateEmployee = async (id: number, data: Partial<CreateEmployeeForm>) => {
    const dateFields = ['date_of_birth', 'join_date', 'confirmation_date', 'termination_date'];
    const idFields = ['designation_id', 'reporting_manager_id', 'department_id'];

    const sanitize = (k: string, v: unknown): unknown => {
      if (dateFields.includes(k)) {
        if (v === '' || v === undefined) return null;
        return v;
      }
      if (idFields.includes(k)) {
        if (v === '' || v === undefined) return null;
        const num = typeof v === 'string' ? parseInt(v, 10) : v;
        return (typeof num === 'number' && !isNaN(num)) ? num : null;
      }
      if (v === '') return null;
      return v;
    };

    const updateFields = [
      'first_name', 'last_name', 'date_of_birth', 'gender', 'marital_status',
      'nationality', 'address', 'city', 'state', 'postal_code', 'country',
      'phone', 'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship',
      'blood_group', 'cnic', 'passport_number', 'tax_id',
      'designation_id', 'reporting_manager_id', 'department_id',
      'employment_type', 'join_date', 'confirmation_date', 'termination_date',
      'probation_period_months', 'notice_period_days', 'work_location', 'shift_type',
      'bank_account_number', 'bank_name', 'skill_level', 'availability_status', 'hourly_rate',
    ] as const;
    const filtered = Object.fromEntries(
      updateFields
        .filter((k) => data[k] !== undefined)
        .map((k) => [k, sanitize(k, data[k])])
        .filter(([, v]) => v !== undefined)
    );
    try {
      await HRMApiService.updateEmployee(id, filtered);
      setIsFormOpen(false);
      setSelectedEmployee(null);
      loadEmployees();
    } catch (err) {
      throw err;
    }
  };

  const handleDeleteEmployee = (id: number) => {
    setEmployeeToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteEmployee = async () => {
    if (!employeeToDelete) return;

    try {
      await HRMApiService.deleteEmployee(employeeToDelete);
      setIsDeleteDialogOpen(false);
      setEmployeeToDelete(null);
      loadEmployees();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete employee');
      setIsDeleteDialogOpen(false);
      setEmployeeToDelete(null);
    }
  };

  const handleViewEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsViewDialogOpen(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsFormOpen(true);
  };

  const handleExportEmployees = async () => {
    try {
      const blob = await HRMApiService.exportEmployees({
        search: debouncedSearchTerm || undefined,
        department_id: filters.department_id ? parseInt(filters.department_id) : undefined,
        designation_id: filters.designation_id ? parseInt(filters.designation_id) : undefined,
        employment_type: filters.employment_type && filters.employment_type !== 'all' ? filters.employment_type : undefined,
        is_active: filters.is_active && filters.is_active !== 'all' ? filters.is_active === 'true' : undefined
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'employees.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to export employees');
    }
  };

  const getStatusBadge = (employee: Employee) => {
    if (!employee.is_active) {
      return <Badge variant="destructive">Inactive</Badge>;
    }

    switch (employee.availability_status) {
      case 'available':
        return <Badge variant="default">Available</Badge>;
      case 'busy':
        return <Badge variant="secondary">Busy</Badge>;
      case 'off_duty':
        return <Badge variant="outline">Off Duty</Badge>;
      case 'on_leave':
        return <Badge variant="destructive">On Leave</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getEmploymentTypeBadge = (type: string) => {
    switch (type) {
      case 'permanent':
        return <Badge variant="default">Permanent</Badge>;
      case 'contract':
        return <Badge variant="secondary">Contract</Badge>;
      case 'intern':
        return <Badge variant="outline">Intern</Badge>;
      case 'consultant':
        return <Badge variant="destructive">Consultant</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  if (loading && employees.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between" data-testid="employee-management-header">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employee Management</h1>
          <p className="text-muted-foreground">
            Manage employee records, departments, and organizational structure
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportEmployees} data-testid="export-button">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            onClick={() => {
              setSelectedEmployee(null);
              setIsFormOpen(true);
            }}
            data-testid="add-employee-button"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Employee
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
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="employee-search-input"
                />
              </div>
            </div>
            <Select 
              value={filters.department_id || "all"} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, department_id: value === "all" ? "" : value }))}
            >
              <SelectTrigger className="w-[180px]" data-testid="department-filter-select">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id.toString()}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.employment_type || "all"} onValueChange={(value) => setFilters(prev => ({ ...prev, employment_type: value === "all" ? "" : value }))}>
              <SelectTrigger className="w-[150px]" data-testid="employment-type-filter-select">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="permanent">Permanent</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="intern">Intern</SelectItem>
                <SelectItem value="consultant">Consultant</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.is_active || "all"} onValueChange={(value) => setFilters(prev => ({ ...prev, is_active: value === "all" ? "" : value }))}>
              <SelectTrigger className="w-[120px]" data-testid="status-filter-select">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm('');
                setFilters({
                  department_id: '',
                  designation_id: '',
                  employment_type: '',
                  is_active: ''
                });
              }}
            >
              Reset Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Employee List */}
      <Card>
        <CardHeader>
          <CardTitle>Employees ({pagination.total})</CardTitle>
          <CardDescription>
            A list of all employees in your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table data-testid="employee-list">
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Employment Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Join Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => (
                <TableRow key={employee.id} data-testid={`employee-row-${employee.employee_id}`}>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {employee.first_name} {employee.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {employee.employee_id}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{employee.department?.name || 'No Department'}</TableCell>
                  <TableCell>{employee.designation?.title || 'No Designation'}</TableCell>
                  <TableCell>
                    {getEmploymentTypeBadge(employee.employment_type)}
                  </TableCell>
                  <TableCell>{getStatusBadge(employee)}</TableCell>
                  <TableCell>
                    {employee.join_date ?
                      HRMApiService.formatDate(employee.join_date) :
                      'No Date'
                    }
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleViewEmployee(employee)} data-testid={`view-employee-${employee.employee_id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditEmployee(employee)} data-testid={`edit-employee-${employee.employee_id}`}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeleteEmployee(employee.id)}
                          className="text-destructive"
                          data-testid={`delete-employee-${employee.employee_id}`}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
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

      {/* Employee Form Dialog */}
      <Dialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setSelectedEmployee(null);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="employee-form-dialog">
          <DialogHeader>
            <DialogTitle data-testid="employee-form-title">
              {selectedEmployee ? 'Edit Employee' : 'Add New Employee'}
            </DialogTitle>
            <DialogDescription>
              {selectedEmployee
                ? 'Update employee information and settings'
                : 'Create a new employee record with personal and employment details'
              }
            </DialogDescription>
          </DialogHeader>
          <EmployeeForm
            employee={selectedEmployee || undefined}
            onSubmit={selectedEmployee ?
              (data) => handleUpdateEmployee(selectedEmployee.id, data) :
              handleCreateEmployee
            }
            onCancel={() => {
              setIsFormOpen(false);
              setSelectedEmployee(null);
            }}
            loading={loading}
          />
        </DialogContent>
      </Dialog>

      {/* Employee Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Employee Details</DialogTitle>
            <DialogDescription>
              Complete information about {selectedEmployee?.first_name} {selectedEmployee?.last_name}
            </DialogDescription>
          </DialogHeader>
          {selectedEmployee && (
            <Tabs defaultValue="personal" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="personal">Personal</TabsTrigger>
                <TabsTrigger value="employment">Employment</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>

              <TabsContent value="personal" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Employee ID</label>
                    <p className="text-sm text-muted-foreground">{selectedEmployee.employee_id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Full Name</label>
                    <p className="text-sm text-muted-foreground">
                      {selectedEmployee.first_name} {selectedEmployee.last_name}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Date of Birth</label>
                    <p className="text-sm text-muted-foreground">
                      {selectedEmployee.date_of_birth ?
                        HRMApiService.formatDate(selectedEmployee.date_of_birth) :
                        'Not provided'
                      }
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Gender</label>
                    <p className="text-sm text-muted-foreground">
                      {selectedEmployee.gender || 'Not provided'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">CNIC</label>
                    <p className="text-sm text-muted-foreground">
                      {selectedEmployee.cnic || 'Not provided'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Phone</label>
                    <p className="text-sm text-muted-foreground">
                      {selectedEmployee.phone || 'Not provided'}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium">Address</label>
                    <p className="text-sm text-muted-foreground">
                      {selectedEmployee.address || 'Not provided'}
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="employment" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Department</label>
                    <p className="text-sm text-muted-foreground">
                      {selectedEmployee.department?.name || 'Not assigned'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Designation</label>
                    <p className="text-sm text-muted-foreground">
                      {selectedEmployee.designation?.title || 'Not assigned'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Employment Type</label>
                    <p className="text-sm text-muted-foreground">
                      {getEmploymentTypeBadge(selectedEmployee.employment_type)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Join Date</label>
                    <p className="text-sm text-muted-foreground">
                      {selectedEmployee.join_date ?
                        HRMApiService.formatDate(selectedEmployee.join_date) :
                        'Not provided'
                      }
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <p className="text-sm text-muted-foreground">
                      {getStatusBadge(selectedEmployee)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Hourly Rate</label>
                    <p className="text-sm text-muted-foreground">
                      {selectedEmployee.hourly_rate ?
                        HRMApiService.formatCurrency(selectedEmployee.hourly_rate) :
                        'Not set'
                      }
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="documents" className="space-y-4">
                <div className="text-center text-muted-foreground py-8">
                  Document management feature coming soon
                </div>
              </TabsContent>

              <TabsContent value="history" className="space-y-4">
                <div className="text-center text-muted-foreground py-8">
                  Employment history feature coming soon
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent data-testid="delete-confirmation-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this employee? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="cancel-delete-button">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteEmployee}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="confirm-delete-button"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Error Display */}
      {error && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded" data-testid="error-message">
          <p>{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setError(null)}
            className="mt-2"
            data-testid="dismiss-error-button"
          >
            Dismiss
          </Button>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagement;


