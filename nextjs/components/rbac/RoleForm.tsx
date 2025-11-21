'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Role, CreateRoleRequest, UpdateRoleRequest } from '@/services/rbac-types';
import { RBACApi } from '@/services/rbac-api';

interface RoleFormProps {
  initialData?: Role;
  onSubmit: (data: CreateRoleRequest | UpdateRoleRequest) => void;
  onCancel: () => void;
}

export const RoleForm: React.FC<RoleFormProps> = ({ initialData, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    display_name: initialData?.display_name || '',
    description: initialData?.description || '',
    level: initialData?.level || 5,
    department: initialData?.department || '',
    is_active: initialData?.is_active ?? true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const departments = [
    'IT',
    'Management',
    'Finance',
    'HR',
    'Sales',
    'Purchase',
    'Inventory',
    'Operations',
    'Customer Service',
    'Marketing',
    'Compliance',
    'General'
  ];

  const levelDescriptions = {
    1: 'System Administrator - Full system access',
    2: 'Executive/Management - Strategic oversight',
    3: 'Department Manager - Full departmental control',
    4: 'Staff/Supervisor - Operational management',
    5: 'Operator - Day-to-day operations',
    6: 'Employee - Self-service access'
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Role name is required';
    } else if (!/^[a-z][a-z0-9_]*$/.test(formData.name)) {
      newErrors.name = 'Role name must be in snake_case format (lowercase letters, numbers, and underscores only)';
    }

    if (!formData.display_name.trim()) {
      newErrors.display_name = 'Display name is required';
    } else if (formData.display_name.length < 2) {
      newErrors.display_name = 'Display name must be at least 2 characters';
    }

    if (formData.level < 1 || formData.level > 6) {
      newErrors.level = 'Level must be between 1 and 6';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const submitData = initialData
        ? {
            display_name: formData.display_name,
            description: formData.description || undefined,
            level: formData.level,
            department: formData.department || undefined,
            is_active: formData.is_active
          }
        : {
            name: formData.name,
            display_name: formData.display_name,
            description: formData.description || undefined,
            level: formData.level,
            department: formData.department || undefined
          };

      await onSubmit(submitData);
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const generateRoleName = (displayName: string) => {
    return displayName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .replace(/^_+|_+$/g, '');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="display_name">Display Name *</Label>
            <Input
              id="display_name"
              value={formData.display_name}
              onChange={(e) => {
                const value = e.target.value;
                handleInputChange('display_name', value);

                // Auto-generate role name for new roles
                if (!initialData && value) {
                  handleInputChange('name', generateRoleName(value));
                }
              }}
              placeholder="e.g., Sales Manager"
              className={errors.display_name ? 'border-red-500' : ''}
            />
            {errors.display_name && (
              <p className="text-sm text-red-500 mt-1">{errors.display_name}</p>
            )}
          </div>

          {!initialData && (
            <div>
              <Label htmlFor="name">Role Name (System) *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., sales_manager"
                className={errors.name ? 'border-red-500' : ''}
              />
              <p className="text-xs text-gray-500 mt-1">
                Snake_case format. Auto-generated from display name.
              </p>
              {errors.name && (
                <p className="text-sm text-red-500 mt-1">{errors.name}</p>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="department">Department</Label>
            <Select value={formData.department} onValueChange={(value) => handleInputChange('department', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="level">Access Level *</Label>
            <Select value={formData.level.toString()} onValueChange={(value) => handleInputChange('level', parseInt(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(levelDescriptions).map(([level, description]) => (
                  <SelectItem key={level} value={level}>
                    Level {level} - {description.split(' - ')[1]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.level && (
              <p className="text-sm text-red-500 mt-1">{errors.level}</p>
            )}
          </div>

          {initialData && (
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => handleInputChange('is_active', checked)}
              />
              <Label htmlFor="is_active">Active Role</Label>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Brief description of the role's responsibilities..."
              rows={4}
            />
          </div>

          {/* Level Information Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Level {formData.level} Information</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm">
                {levelDescriptions[formData.level as keyof typeof levelDescriptions]}
              </CardDescription>
            </CardContent>
          </Card>

          {/* Role Guidelines */}
          <Alert>
            <AlertDescription>
              <strong>Guidelines:</strong>
              <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                <li>Role names should be descriptive and follow snake_case format</li>
                <li>Lower levels (1-3) have more permissions than higher levels (4-6)</li>
                <li>Department assignment helps organize roles logically</li>
                <li>Descriptions help users understand role purposes</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : (initialData ? 'Update Role' : 'Create Role')}
        </Button>
      </div>
    </form>
  );
};