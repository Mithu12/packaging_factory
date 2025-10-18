import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Department, CreateDepartmentForm, DepartmentFormProps } from '../types';
import { HRMApiService } from '../services/hrm-api';

// Dummy employee data for manager selection
const DUMMY_EMPLOYEES = [
  { id: 1, first_name: 'John', last_name: 'Doe', employee_id: 'EMP001', is_active: true },
  { id: 2, first_name: 'Sarah', last_name: 'Johnson', employee_id: 'EMP002', is_active: true },
  { id: 3, first_name: 'Michael', last_name: 'Chen', employee_id: 'EMP003', is_active: true },
  { id: 4, first_name: 'Emily', last_name: 'Davis', employee_id: 'EMP004', is_active: true },
  { id: 5, first_name: 'David', last_name: 'Wilson', employee_id: 'EMP005', is_active: true },
  { id: 6, first_name: 'Lisa', last_name: 'Anderson', employee_id: 'EMP006', is_active: true },
  { id: 7, first_name: 'Robert', last_name: 'Taylor', employee_id: 'EMP007', is_active: true },
];

const DepartmentForm: React.FC<DepartmentFormProps> = ({
  department,
  onSubmit,
  onCancel,
  loading = false
}) => {
  const [formData, setFormData] = useState<CreateDepartmentForm>({
    name: '',
    code: '',
    description: '',
    manager_id: undefined,
    parent_department_id: undefined
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    if (department) {
      setFormData({
        name: department.name,
        code: department.code,
        description: department.description || '',
        manager_id: department.manager_id,
        parent_department_id: department.parent_department_id
      });
    }

    // Load employees for manager selection (simulated)
    setEmployees(DUMMY_EMPLOYEES.filter(emp => emp.is_active));
  }, [department]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Department name is required';
    }

    if (!formData.code.trim()) {
      newErrors.code = 'Department code is required';
    } else if (formData.code.length < 2) {
      newErrors.code = 'Department code must be at least 2 characters';
    }

    if (formData.code && !/^[A-Z0-9]+$/.test(formData.code)) {
      newErrors.code = 'Department code must contain only uppercase letters and numbers';
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

  const handleInputChange = (field: keyof CreateDepartmentForm, value: any) => {
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Department Name */}
        <div className="space-y-2">
          <Label htmlFor="name">
            Department Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="e.g., Human Resources"
            className={errors.name ? 'border-destructive' : ''}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name}</p>
          )}
        </div>

        {/* Department Code */}
        <div className="space-y-2">
          <Label htmlFor="code">
            Department Code <span className="text-destructive">*</span>
          </Label>
          <Input
            id="code"
            value={formData.code}
            onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
            placeholder="e.g., HR001"
            maxLength={10}
            className={errors.code ? 'border-destructive' : ''}
          />
          {errors.code && (
            <p className="text-sm text-destructive">{errors.code}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Use uppercase letters and numbers only
          </p>
        </div>

        {/* Head of Department */}
        <div className="space-y-2">
          <Label htmlFor="manager_id">Head of Department</Label>
          <Select
            value={formData.manager_id?.toString() || ''}
            onValueChange={(value) => handleInputChange('manager_id', value ? parseInt(value) : undefined)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a manager (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No manager assigned</SelectItem>
              {employees.map((employee) => (
                <SelectItem key={employee.id} value={employee.id.toString()}>
                  {employee.first_name} {employee.last_name} ({employee.employee_id})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Parent Department */}
        <div className="space-y-2">
          <Label htmlFor="parent_department_id">Parent Department</Label>
          <Select
            value={formData.parent_department_id?.toString() || ''}
            onValueChange={(value) => handleInputChange('parent_department_id', value ? parseInt(value) : undefined)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select parent department (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No parent department</SelectItem>
              {/* Add parent department options here */}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="Describe the department's responsibilities and scope..."
          rows={3}
        />
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : (department ? 'Update Department' : 'Create Department')}
        </Button>
      </div>
    </form>
  );
};

export default DepartmentForm;
