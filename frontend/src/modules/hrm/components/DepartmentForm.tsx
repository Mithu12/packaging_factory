"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Department, CreateDepartmentForm, DepartmentFormProps } from '../types';
import { HRMApiService } from '../services/hrm-api';

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
    manager_id: department?.manager_id || undefined,
    parent_department_id: department?.parent_department_id || undefined
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [headOfDepartmentUsers, setHeadOfDepartmentUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingDepartments, setLoadingDepartments] = useState(false);

  useEffect(() => {
    if (department) {
      setFormData({
        name: department.name,
        code: department.code,
        description: department.description || '',
        manager_id: department.manager_id,
        parent_department_id: department.parent_department_id
      });
    } else {
      setFormData({
        name: '',
        code: '',
        description: '',
        manager_id: undefined,
        parent_department_id: undefined
      });
    }

    // Load Head of Department users and departments
    loadHeadOfDepartmentUsers();
    loadDepartments();
  }, [department]);

  const loadHeadOfDepartmentUsers = async () => {
    console.log('Loading Head of Department users');
    setLoadingUsers(true);
    try {
      // For now, we'll use a hardcoded role ID for "Head Of Department"
      // In the future, we should fetch this dynamically
      const headOfDepartmentRoleId = 58; // Fixed ID for head_of_department role
      const response = await HRMApiService.getEmployeesByUserRole(headOfDepartmentRoleId);
      setHeadOfDepartmentUsers(response?.employees || []);
    } catch (error) {
      console.error('Error loading Head of Department users:', error);
      // Fallback to empty list - users can still create departments without managers
      setHeadOfDepartmentUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadDepartments = async () => {
    console.log('Loading departments');
    setLoadingDepartments(true);
    try {
      // Load all departments for parent department selection
      const response = await HRMApiService.getDepartments({ limit: 1000 });
      setDepartments(response?.departments || []);
    } catch (error) {
      console.error('Error loading departments:', error);
      // Fallback to empty list - users can still create departments without parent
      setDepartments([]);
    } finally {
      setLoadingDepartments(false);
    }
  };

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
            onValueChange={(value) =>
              handleInputChange(
                'manager_id',
                value && value !== 'none' ? parseInt(value, 10) : undefined
              )
            }
            disabled={loadingUsers}
          >
            <SelectTrigger>
              <SelectValue placeholder={loadingUsers ? "Loading..." : "Select a manager (optional)"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No manager assigned</SelectItem>
              {headOfDepartmentUsers?.map((employee) => (
                <SelectItem key={employee.employee_id} value={employee.id.toString()}>
                  {employee.full_name} ({employee.employee_id})
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
            onValueChange={(value) =>
              handleInputChange(
                'parent_department_id',
                value && value !== 'none' ? parseInt(value, 10) : undefined
              )
            }
            disabled={loadingDepartments}
          >
            <SelectTrigger>
              <SelectValue placeholder={loadingDepartments ? "Loading departments..." : "Select parent department (optional)"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No parent department</SelectItem>
              {departments
                ?.filter(dep => department ? dep.id !== department.id : true)
                .map((dep) => (
                  <SelectItem key={dep.id} value={dep.id.toString()}>
                    {dep.name} ({dep.code})
                  </SelectItem>
                ))}
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
