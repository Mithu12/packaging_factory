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
  Archive,
  ArchiveRestore,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronRight,
  Building,
  DollarSign,
  TrendingUp
} from 'lucide-react';
import { Designation, DesignationListResponse, CreateDesignationForm, Department, DesignationHierarchyNode } from '../types';
import DesignationForm from '../components/DesignationForm';

// Dummy data for designations
const DUMMY_DESIGNATIONS: Designation[] = [
  {
    id: 1,
    title: 'Chief Executive Officer',
    code: 'CEO001',
    department_id: 1,
    grade_level: 'Executive',
    description: 'Overall company leadership and strategic direction',
    min_salary: 200000,
    max_salary: 300000,
    is_active: true,
    created_at: '2023-01-15T00:00:00Z',
    updated_at: '2023-01-15T00:00:00Z'
  },
  {
    id: 2,
    title: 'Chief Technology Officer',
    code: 'CTO002',
    department_id: 2,
    grade_level: 'Executive',
    description: 'Technology strategy and product development leadership',
    min_salary: 180000,
    max_salary: 250000,
    reports_to_id: 1,
    is_active: true,
    created_at: '2023-01-15T00:00:00Z',
    updated_at: '2023-01-15T00:00:00Z'
  },
  {
    id: 3,
    title: 'HR Manager',
    code: 'HRM003',
    department_id: 1,
    grade_level: 'Manager',
    description: 'Human resources management and employee relations',
    min_salary: 80000,
    max_salary: 120000,
    reports_to_id: 1,
    is_active: true,
    created_at: '2023-01-15T00:00:00Z',
    updated_at: '2023-01-15T00:00:00Z'
  },
  {
    id: 4,
    title: 'Software Engineer',
    code: 'SWE004',
    department_id: 2,
    grade_level: 'Senior',
    description: 'Senior software development and architecture',
    min_salary: 100000,
    max_salary: 150000,
    reports_to_id: 2,
    is_active: true,
    created_at: '2023-01-15T00:00:00Z',
    updated_at: '2023-01-15T00:00:00Z'
  },
  {
    id: 5,
    title: 'Junior Software Engineer',
    code: 'JSWE005',
    department_id: 2,
    grade_level: 'Junior',
    description: 'Entry-level software development',
    min_salary: 60000,
    max_salary: 80000,
    reports_to_id: 4,
    is_active: true,
    created_at: '2023-01-15T00:00:00Z',
    updated_at: '2023-01-15T00:00:00Z'
  },
  {
    id: 6,
    title: 'Accountant',
    code: 'ACC006',
    department_id: 3,
    grade_level: 'Senior',
    description: 'Financial accounting and reporting',
    min_salary: 70000,
    max_salary: 90000,
    reports_to_id: 1,
    is_active: true,
    created_at: '2023-01-15T00:00:00Z',
    updated_at: '2023-01-15T00:00:00Z'
  },
  {
    id: 7,
    title: 'Marketing Manager',
    code: 'MKM007',
    department_id: 4,
    grade_level: 'Manager',
    description: 'Marketing strategy and campaign management',
    min_salary: 85000,
    max_salary: 110000,
    reports_to_id: 1,
    is_active: false,
    created_at: '2023-01-15T00:00:00Z',
    updated_at: '2023-01-15T00:00:00Z'
  }
];

// Dummy data for departments
const DUMMY_DEPARTMENTS: Department[] = [
  { id: 1, name: 'Human Resources', code: 'HR001', is_active: true, created_at: '2023-01-15T00:00:00Z', updated_at: '2023-01-15T00:00:00Z' },
  { id: 2, name: 'Information Technology', code: 'IT002', is_active: true, created_at: '2023-01-15T00:00:00Z', updated_at: '2023-01-15T00:00:00Z' },
  { id: 3, name: 'Finance & Accounting', code: 'FIN003', is_active: true, created_at: '2023-01-15T00:00:00Z', updated_at: '2023-01-15T00:00:00Z' },
  { id: 4, name: 'Marketing', code: 'MKT004', is_active: true, created_at: '2023-01-15T00:00:00Z', updated_at: '2023-01-15T00:00:00Z' },
];

// Generate employee counts for each designation (dummy data)
const generateEmployeeCounts = (designations: Designation[]) => {
  return designations.map(desg => {
    const count = Math.floor(Math.random() * 10) + 1; // 1-10 employees per designation
    return { ...desg, employee_count: count };
  });
};

// Build hierarchy tree
  const buildHierarchyTree = (designations: Designation[]): DesignationHierarchyNode[] => {
  const designationMap = new Map<number, DesignationHierarchyNode>();
  const roots: DesignationHierarchyNode[] = [];

  // First pass: create nodes for all designations
  designations.forEach(designation => {
    const employeeCount = (designation as Designation & { employee_count?: number }).employee_count || 0;
    designationMap.set(designation.id, {
      designation,
      children: [],
      employee_count: employeeCount
    });
  });

  // Second pass: build the tree structure
  designations.forEach(designation => {
    const node = designationMap.get(designation.id)!;

    if (designation.reports_to_id) {
      const parent = designationMap.get(designation.reports_to_id);
      if (parent) {
        parent.children.push(node);
      }
    } else {
      roots.push(node);
    }
  });

  return roots;
};

const DesignationManagement: React.FC = () => {
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDesignation, setSelectedDesignation] = useState<Designation | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedDesignations, setSelectedDesignations] = useState<number[]>([]);
  const [bulkAction, setBulkAction] = useState<string>('');
  const [viewMode, setViewMode] = useState<'table' | 'hierarchy'>('table');

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  const [filters, setFilters] = useState({
    department: '',
    grade_level: '',
    status: ''
  });

  useEffect(() => {
    loadDesignations();
  }, [pagination.page, searchTerm, filters]);

  const loadDesignations = async () => {
    try {
      setLoading(true);

      // Simulate API call with dummy data
      await new Promise(resolve => setTimeout(resolve, 500));

      let filteredDesignations = generateEmployeeCounts(DUMMY_DESIGNATIONS);

      // Apply search filter
      if (searchTerm) {
        filteredDesignations = filteredDesignations.filter(desg =>
          desg.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          desg.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          desg.grade_level?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      // Apply department filter
      if (filters.department !== '') {
        filteredDesignations = filteredDesignations.filter(desg =>
          filters.department === 'none' ? !desg.department_id : desg.department_id?.toString() === filters.department
        );
      }

      // Apply grade level filter
      if (filters.grade_level !== '') {
        filteredDesignations = filteredDesignations.filter(desg =>
          desg.grade_level === filters.grade_level
        );
      }

      // Apply status filter
      if (filters.status !== '') {
        filteredDesignations = filteredDesignations.filter(desg =>
          filters.status === 'active' ? desg.is_active : !desg.is_active
        );
      }

      // Apply pagination
      const startIndex = (pagination.page - 1) * pagination.limit;
      const endIndex = startIndex + pagination.limit;
      const paginatedDesignations = filteredDesignations.slice(startIndex, endIndex);

      setDesignations(paginatedDesignations);
      setPagination(prev => ({
        ...prev,
        total: filteredDesignations.length,
        totalPages: Math.ceil(filteredDesignations.length / pagination.limit)
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load designations');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDesignation = async (data: CreateDesignationForm) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      const newDesignation: Designation = {
        id: Math.max(...DUMMY_DESIGNATIONS.map(d => d.id)) + 1,
        title: data.title,
        code: data.code,
        department_id: data.department_id,
        grade_level: data.grade_level,
        description: data.description,
        min_salary: data.min_salary,
        max_salary: data.max_salary,
        reports_to_id: data.reports_to_id,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Add to dummy data
      DUMMY_DESIGNATIONS.push(newDesignation);

      setIsFormOpen(false);
      loadDesignations();
    } catch (err) {
      throw err;
    }
  };

  const handleUpdateDesignation = async (id: number, data: Partial<CreateDesignationForm>) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      const index = DUMMY_DESIGNATIONS.findIndex(d => d.id === id);
      if (index !== -1) {
        DUMMY_DESIGNATIONS[index] = {
          ...DUMMY_DESIGNATIONS[index],
          ...data,
          updated_at: new Date().toISOString()
        };
      }

      setIsFormOpen(false);
      setSelectedDesignation(null);
      loadDesignations();
    } catch (err) {
      throw err;
    }
  };

  const handleDeleteDesignation = async (id: number) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      const index = DUMMY_DESIGNATIONS.findIndex(d => d.id === id);
      if (index !== -1) {
        DUMMY_DESIGNATIONS.splice(index, 1);
      }

      loadDesignations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete designation');
    }
  };

  const handleToggleStatus = async (id: number) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      const index = DUMMY_DESIGNATIONS.findIndex(d => d.id === id);
      if (index !== -1) {
        DUMMY_DESIGNATIONS[index].is_active = !DUMMY_DESIGNATIONS[index].is_active;
        DUMMY_DESIGNATIONS[index].updated_at = new Date().toISOString();
      }

      loadDesignations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update designation status');
    }
  };

  const handleViewDesignation = (designation: Designation) => {
    setSelectedDesignation(designation);
    setIsViewDialogOpen(true);
  };

  const handleEditDesignation = (designation: Designation) => {
    setSelectedDesignation(designation);
    setIsFormOpen(true);
  };

  const handleExportDesignations = async () => {
    try {
      // Simulate API call for export
      await new Promise(resolve => setTimeout(resolve, 1000));

      // In a real implementation, this would trigger a file download
      console.log('Exporting designations...');
    } catch (err) {
      setError('Failed to export designations');
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedDesignations.length === 0) return;

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      switch (action) {
        case 'activate':
          selectedDesignations.forEach(id => {
            const index = DUMMY_DESIGNATIONS.findIndex(d => d.id === id);
            if (index !== -1) {
              DUMMY_DESIGNATIONS[index].is_active = true;
              DUMMY_DESIGNATIONS[index].updated_at = new Date().toISOString();
            }
          });
          break;
        case 'deactivate':
          selectedDesignations.forEach(id => {
            const index = DUMMY_DESIGNATIONS.findIndex(d => d.id === id);
            if (index !== -1) {
              DUMMY_DESIGNATIONS[index].is_active = false;
              DUMMY_DESIGNATIONS[index].updated_at = new Date().toISOString();
            }
          });
          break;
        case 'delete':
          selectedDesignations.forEach(id => {
            const index = DUMMY_DESIGNATIONS.findIndex(d => d.id === id);
            if (index !== -1) {
              DUMMY_DESIGNATIONS.splice(index, 1);
            }
          });
          break;
      }

      setSelectedDesignations([]);
      setBulkAction('');
      loadDesignations();
    } catch (err) {
      setError('Bulk action failed');
    }
  };

  const getStatusBadge = (designation: Designation) => {
    return designation.is_active ? (
      <Badge variant="default">Active</Badge>
    ) : (
      <Badge variant="secondary">Inactive</Badge>
    );
  };

  const getEmployeeCountBadge = (designation: Designation) => {
    const count = (designation as Designation & { employee_count?: number }).employee_count || 0;
    return (
      <div className="flex items-center gap-1">
        <Users className="h-3 w-3" />
        <span>{count}</span>
      </div>
    );
  };

  const getDepartmentName = (departmentId?: number) => {
    const department = DUMMY_DEPARTMENTS.find(d => d.id === departmentId);
    return department ? department.name : 'No Department';
  };

  const getSalaryRange = (designation: Designation) => {
    if (designation.min_salary && designation.max_salary) {
      return `$${designation.min_salary.toLocaleString()} - $${designation.max_salary.toLocaleString()}`;
    } else if (designation.min_salary) {
      return `$${designation.min_salary.toLocaleString()}+`;
    } else if (designation.max_salary) {
      return `Up to $${designation.max_salary.toLocaleString()}`;
    }
    return 'Not specified';
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedDesignations(designations.map(d => d.id));
    } else {
      setSelectedDesignations([]);
    }
  };

  const handleSelectDesignation = (designationId: number, checked: boolean) => {
    if (checked) {
      setSelectedDesignations(prev => [...prev, designationId]);
    } else {
      setSelectedDesignations(prev => prev.filter(id => id !== designationId));
    }
  };

  const HierarchyNode: React.FC<{ node: DesignationHierarchyNode; level: number }> = ({ node, level }) => {
    const [isExpanded, setIsExpanded] = useState(level === 0);

    return (
      <div className="ml-4">
        <div className="flex items-center gap-2 py-2 px-3 rounded-lg border bg-card hover:bg-accent/50">
          {node.children.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          )}
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{node.designation.title}</p>
                <p className="text-sm text-muted-foreground">{node.designation.code} • {node.designation.grade_level}</p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-muted-foreground">{getDepartmentName(node.designation.department_id)}</span>
                {getEmployeeCountBadge(node.designation)}
                {getStatusBadge(node.designation)}
              </div>
            </div>
          </div>
        </div>
        {isExpanded && node.children.length > 0 && (
          <div>
            {node.children.map(child => (
              <HierarchyNode key={child.designation.id} node={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading && designations.length === 0) {
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
          <h1 className="text-3xl font-bold tracking-tight">Designation Management</h1>
          <p className="text-muted-foreground">
            Manage job titles, positions, and organizational hierarchy
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex border rounded-lg">
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
            >
              Table
            </Button>
            <Button
              variant={viewMode === 'hierarchy' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('hierarchy')}
            >
              Hierarchy
            </Button>
          </div>
          {selectedDesignations.length > 0 && (
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
                Apply ({selectedDesignations.length})
              </Button>
            </>
          )}
          <Button variant="outline" onClick={handleExportDesignations}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Designation
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search designations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filters.department} onValueChange={(value) => setFilters(prev => ({ ...prev, department: value }))}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="none">No Department</SelectItem>
                {DUMMY_DEPARTMENTS.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id.toString()}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.grade_level} onValueChange={(value) => setFilters(prev => ({ ...prev, grade_level: value }))}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Grade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grades</SelectItem>
                <SelectItem value="Junior">Junior</SelectItem>
                <SelectItem value="Senior">Senior</SelectItem>
                <SelectItem value="Lead">Lead</SelectItem>
                <SelectItem value="Manager">Manager</SelectItem>
                <SelectItem value="Senior Manager">Senior Manager</SelectItem>
                <SelectItem value="Director">Director</SelectItem>
                <SelectItem value="Executive">Executive</SelectItem>
              </SelectContent>
            </Select>
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

      {/* Designation List */}
      <Card>
        <CardHeader>
          <CardTitle>Designations ({pagination.total})</CardTitle>
          <CardDescription>
            A list of all job designations in your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {viewMode === 'table' ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedDesignations.length === designations.length && designations.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Grade/Level</TableHead>
                  <TableHead>Salary Range</TableHead>
                  <TableHead>Employees</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {designations.map((designation) => (
                  <TableRow key={designation.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedDesignations.includes(designation.id)}
                        onCheckedChange={(checked) => handleSelectDesignation(designation.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{designation.title}</p>
                        <p className="text-sm text-muted-foreground">{designation.code}</p>
                        {designation.description && (
                          <p className="text-sm text-muted-foreground mt-1">{designation.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getDepartmentName(designation.department_id)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{designation.grade_level}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{getSalaryRange(designation)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getEmployeeCountBadge(designation)}
                    </TableCell>
                    <TableCell>{getStatusBadge(designation)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleViewDesignation(designation)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditDesignation(designation)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleToggleStatus(designation.id)}>
                            {designation.is_active ? (
                              <>
                                <Archive className="h-4 w-4 mr-2" />
                                Archive
                              </>
                            ) : (
                              <>
                                <ArchiveRestore className="h-4 w-4 mr-2" />
                                Restore
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
                                <AlertDialogTitle>Delete Designation</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{designation.title}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteDesignation(designation.id)}
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
          ) : (
            <div className="space-y-2">
              {buildHierarchyTree(designations).map(node => (
                <HierarchyNode key={node.designation.id} node={node} level={0} />
              ))}
            </div>
          )}

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

      {/* Designation Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedDesignation ? 'Edit Designation' : 'Add New Designation'}
            </DialogTitle>
            <DialogDescription>
              {selectedDesignation
                ? 'Update designation information and settings'
                : 'Create a new job designation with organizational details'
              }
            </DialogDescription>
          </DialogHeader>
          <DesignationForm
            designation={selectedDesignation || undefined}
            onSubmit={selectedDesignation ?
              (data) => handleUpdateDesignation(selectedDesignation.id, data) :
              handleCreateDesignation
            }
            onCancel={() => {
              setIsFormOpen(false);
              setSelectedDesignation(null);
            }}
            loading={loading}
          />
        </DialogContent>
      </Dialog>

      {/* Designation Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Designation Details</DialogTitle>
            <DialogDescription>
              Complete information about {selectedDesignation?.title}
            </DialogDescription>
          </DialogHeader>
          {selectedDesignation && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="hierarchy">Hierarchy</TabsTrigger>
                <TabsTrigger value="employees">Employees</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Designation Title</label>
                    <p className="text-sm text-muted-foreground">{selectedDesignation.title}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Designation Code</label>
                    <p className="text-sm text-muted-foreground">{selectedDesignation.code}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Department</label>
                    <p className="text-sm text-muted-foreground">{getDepartmentName(selectedDesignation.department_id)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Grade/Level</label>
                    <p className="text-sm text-muted-foreground">{selectedDesignation.grade_level}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Salary Range</label>
                    <p className="text-sm text-muted-foreground">{getSalaryRange(selectedDesignation)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Status</label>
                    <p className="text-sm text-muted-foreground">
                      {getStatusBadge(selectedDesignation)}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium">Description</label>
                    <p className="text-sm text-muted-foreground">
                      {selectedDesignation.description || 'No description provided'}
                    </p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="hierarchy" className="space-y-4">
                <div className="text-center text-muted-foreground py-8">
                  Hierarchy view for this designation would be displayed here
                </div>
              </TabsContent>

              <TabsContent value="employees" className="space-y-4">
                <div className="text-center text-muted-foreground py-8">
                  Employee list for this designation would be displayed here
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

export default DesignationManagement;
