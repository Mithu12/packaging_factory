import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Designation, CreateDesignationForm, DesignationFormProps, Department } from '../types';

// Dummy data for departments and designations (for reporting hierarchy)
const DUMMY_DEPARTMENTS: Department[] = [
  { id: 1, name: 'Human Resources', code: 'HR001', is_active: true, created_at: '2023-01-15T00:00:00Z', updated_at: '2023-01-15T00:00:00Z' },
  { id: 2, name: 'Information Technology', code: 'IT002', is_active: true, created_at: '2023-01-15T00:00:00Z', updated_at: '2023-01-15T00:00:00Z' },
  { id: 3, name: 'Finance & Accounting', code: 'FIN003', is_active: true, created_at: '2023-01-15T00:00:00Z', updated_at: '2023-01-15T00:00:00Z' },
  { id: 4, name: 'Marketing', code: 'MKT004', is_active: true, created_at: '2023-01-15T00:00:00Z', updated_at: '2023-01-15T00:00:00Z' },
  { id: 5, name: 'Operations', code: 'OPS005', is_active: true, created_at: '2023-01-15T00:00:00Z', updated_at: '2023-01-15T00:00:00Z' },
  { id: 6, name: 'Quality Assurance', code: 'QA006', is_active: true, created_at: '2023-01-15T00:00:00Z', updated_at: '2023-01-15T00:00:00Z' },
];

const DUMMY_DESIGNATIONS: Designation[] = [
  { id: 1, title: 'Chief Executive Officer', code: 'CEO001', department_id: 1, grade_level: 'Executive', is_active: true, created_at: '2023-01-15T00:00:00Z', updated_at: '2023-01-15T00:00:00Z' },
  { id: 2, title: 'Chief Technology Officer', code: 'CTO002', department_id: 2, grade_level: 'Executive', is_active: true, created_at: '2023-01-15T00:00:00Z', updated_at: '2023-01-15T00:00:00Z' },
  { id: 3, title: 'HR Manager', code: 'HRM003', department_id: 1, grade_level: 'Manager', reports_to_id: 1, is_active: true, created_at: '2023-01-15T00:00:00Z', updated_at: '2023-01-15T00:00:00Z' },
  { id: 4, title: 'Software Engineer', code: 'SWE004', department_id: 2, grade_level: 'Senior', reports_to_id: 2, is_active: true, created_at: '2023-01-15T00:00:00Z', updated_at: '2023-01-15T00:00:00Z' },
  { id: 5, title: 'Junior Software Engineer', code: 'JSWE005', department_id: 2, grade_level: 'Junior', reports_to_id: 4, is_active: true, created_at: '2023-01-15T00:00:00Z', updated_at: '2023-01-15T00:00:00Z' },
  { id: 6, title: 'Accountant', code: 'ACC006', department_id: 3, grade_level: 'Senior', reports_to_id: 1, is_active: true, created_at: '2023-01-15T00:00:00Z', updated_at: '2023-01-15T00:00:00Z' },
];

const DesignationForm: React.FC<DesignationFormProps> = ({
  designation,
  onSubmit,
  onCancel,
  loading = false
}) => {
  const [formData, setFormData] = useState<CreateDesignationForm>({
    title: '',
    code: '',
    department_id: undefined,
    grade_level: '',
    description: '',
    min_salary: undefined,
    max_salary: undefined,
    reports_to_id: undefined
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [departments, setDepartments] = useState<Department[]>([]);
  const [availableDesignations, setAvailableDesignations] = useState<Designation[]>([]);

  useEffect(() => {
    if (designation) {
      setFormData({
        title: designation.title,
        code: designation.code,
        department_id: designation.department_id,
        grade_level: designation.grade_level || '',
        description: designation.description || '',
        min_salary: designation.min_salary,
        max_salary: designation.max_salary,
        reports_to_id: designation.reports_to_id
      });
    }

    // Load departments and designations (simulated)
    setDepartments(DUMMY_DEPARTMENTS.filter(dept => dept.is_active));
    setAvailableDesignations(DUMMY_DESIGNATIONS.filter(desg => desg.is_active));
  }, [designation]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Designation title is required';
    }

    if (!formData.code.trim()) {
      newErrors.code = 'Designation code is required';
    } else if (formData.code.length < 2) {
      newErrors.code = 'Designation code must be at least 2 characters';
    }

    if (formData.code && !/^[A-Z0-9]+$/.test(formData.code)) {
      newErrors.code = 'Designation code must contain only uppercase letters and numbers';
    }

    if (!formData.grade_level.trim()) {
      newErrors.grade_level = 'Grade/Level is required';
    }

    if (formData.min_salary && formData.max_salary && formData.min_salary >= formData.max_salary) {
      newErrors.max_salary = 'Maximum salary must be greater than minimum salary';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const handleInputChange = (field: keyof CreateDesignationForm, value: string | number | undefined) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const getFilteredDesignations = () => {
    if (!formData.department_id) return availableDesignations;
    return availableDesignations.filter(desg => desg.department_id === formData.department_id);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="title">Designation Title *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder="e.g., Software Engineer"
            className={errors.title ? 'border-destructive' : ''}
          />
          {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="code">Designation Code *</Label>
          <Input
            id="code"
            value={formData.code}
            onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
            placeholder="e.g., SWE001"
            className={errors.code ? 'border-destructive' : ''}
          />
          {errors.code && <p className="text-sm text-destructive">{errors.code}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="department">Department</Label>
          <Select
            value={formData.department_id?.toString() || ''}
            onValueChange={(value) => handleInputChange('department_id', value ? parseInt(value) : undefined)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Department" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((dept) => (
                <SelectItem key={dept.id} value={dept.id.toString()}>
                  {dept.name} ({dept.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="grade_level">Grade/Level *</Label>
          <Select
            value={formData.grade_level}
            onValueChange={(value) => handleInputChange('grade_level', value)}
          >
            <SelectTrigger className={errors.grade_level ? 'border-destructive' : ''}>
              <SelectValue placeholder="Select Grade/Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Junior">Junior</SelectItem>
              <SelectItem value="Senior">Senior</SelectItem>
              <SelectItem value="Lead">Lead</SelectItem>
              <SelectItem value="Manager">Manager</SelectItem>
              <SelectItem value="Senior Manager">Senior Manager</SelectItem>
              <SelectItem value="Director">Director</SelectItem>
              <SelectItem value="Executive">Executive</SelectItem>
            </SelectContent>
          </Select>
          {errors.grade_level && <p className="text-sm text-destructive">{errors.grade_level}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="min_salary">Minimum Salary</Label>
          <Input
            id="min_salary"
            type="number"
            value={formData.min_salary || ''}
            onChange={(e) => handleInputChange('min_salary', e.target.value ? parseFloat(e.target.value) : undefined)}
            placeholder="0.00"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="max_salary">Maximum Salary</Label>
          <Input
            id="max_salary"
            type="number"
            value={formData.max_salary || ''}
            onChange={(e) => handleInputChange('max_salary', e.target.value ? parseFloat(e.target.value) : undefined)}
            placeholder="0.00"
            className={errors.max_salary ? 'border-destructive' : ''}
          />
          {errors.max_salary && <p className="text-sm text-destructive">{errors.max_salary}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="reports_to">Reports To</Label>
          <Select
            value={formData.reports_to_id?.toString() || 'none'}
            onValueChange={(value) => handleInputChange('reports_to_id', value === 'none' ? undefined : parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Reporting Manager" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Reporting Manager</SelectItem>
              {getFilteredDesignations().map((desg) => (
                <SelectItem key={desg.id} value={desg.id.toString()}>
                  {desg.title} ({desg.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description || ''}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="Brief description of the designation responsibilities and requirements..."
          rows={3}
        />
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : (designation ? 'Update Designation' : 'Create Designation')}
        </Button>
      </div>
    </form>
  );
};

export default DesignationForm;
