import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CalendarIcon, Users, Save, X, DollarSign, Percent, Calculator } from 'lucide-react';
import { BulkSalaryUpdateFormProps, Employee, Department, Designation } from '../types';
import { getEmployeeOptions, getDepartmentOptions, getDesignationOptions } from '../data/salary-update-data';

const BulkSalaryUpdateForm: React.FC<BulkSalaryUpdateFormProps> = ({
  employees,
  departments,
  designations,
  onSubmit,
  onCancel,
  loading = false
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    increment_type: 'percentage' as 'fixed_amount' | 'percentage' | 'custom',
    increment_value: 0,
    effective_date: '',
    department_ids: [] as number[],
    designation_ids: [] as number[],
    employee_ids: [] as number[],
    min_salary: 0,
    max_salary: 0,
    employment_types: [] as string[]
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [previewEmployees, setPreviewEmployees] = useState<Employee[]>([]);

  const employeeOptions = getEmployeeOptions();
  const departmentOptions = getDepartmentOptions();
  const designationOptions = getDesignationOptions();

  const employmentTypeOptions = [
    { value: 'permanent', label: 'Permanent' },
    { value: 'contract', label: 'Contract' },
    { value: 'intern', label: 'Intern' },
    { value: 'consultant', label: 'Consultant' },
  ];

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Update name is required';
    }

    if (!formData.effective_date) {
      newErrors.effective_date = 'Effective date is required';
    }

    if (formData.increment_value <= 0) {
      newErrors.increment_value = 'Increment value must be greater than 0';
    }

    // Check if at least one criteria is selected
    if (
      formData.department_ids.length === 0 &&
      formData.designation_ids.length === 0 &&
      formData.employee_ids.length === 0 &&
      !formData.min_salary &&
      !formData.max_salary &&
      formData.employment_types.length === 0
    ) {
      newErrors.criteria = 'At least one criteria must be selected';
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
      // Reset form after successful submission
      setFormData({
        name: '',
        description: '',
        increment_type: 'percentage',
        increment_value: 0,
        effective_date: '',
        department_ids: [],
        designation_ids: [],
        employee_ids: [],
        min_salary: 0,
        max_salary: 0,
        employment_types: []
      });
      setPreviewEmployees([]);
    } catch (error) {
      // Error handling is done in parent component
    }
  };

  const handleCriteriaChange = (type: 'department' | 'designation' | 'employee' | 'employment_type', value: string, checked?: boolean) => {
    setFormData(prev => {
      const updated = { ...prev };

      switch (type) {
        case 'department':
          if (checked) {
            updated.department_ids = [...updated.department_ids, parseInt(value)];
          } else {
            updated.department_ids = updated.department_ids.filter(id => id !== parseInt(value));
          }
          break;
        case 'designation':
          if (checked) {
            updated.designation_ids = [...updated.designation_ids, parseInt(value)];
          } else {
            updated.designation_ids = updated.designation_ids.filter(id => id !== parseInt(value));
          }
          break;
        case 'employee':
          if (checked) {
            updated.employee_ids = [...updated.employee_ids, parseInt(value)];
          } else {
            updated.employee_ids = updated.employee_ids.filter(id => id !== parseInt(value));
          }
          break;
        case 'employment_type':
          if (checked) {
            updated.employment_types = [...updated.employment_types, value];
          } else {
            updated.employment_types = updated.employment_types.filter(type => type !== value);
          }
          break;
      }

      return updated;
    });

    // Clear criteria error when user makes a selection
    if (errors.criteria) {
      setErrors(prev => ({ ...prev, criteria: '' }));
    }
  };

  const handlePreview = () => {
    // Filter employees based on criteria
    let filtered = employees;

    if (formData.department_ids.length > 0) {
      filtered = filtered.filter(emp => emp.department_id && formData.department_ids.includes(emp.department_id));
    }

    if (formData.designation_ids.length > 0) {
      filtered = filtered.filter(emp => emp.designation_id && formData.designation_ids.includes(emp.designation_id));
    }

    if (formData.employee_ids.length > 0) {
      filtered = filtered.filter(emp => formData.employee_ids.includes(emp.id));
    }

    if (formData.min_salary > 0) {
      filtered = filtered.filter(emp => {
        const salary = emp.designation?.min_salary || 0;
        return salary >= formData.min_salary;
      });
    }

    if (formData.max_salary > 0) {
      filtered = filtered.filter(emp => {
        const salary = emp.designation?.min_salary || 0;
        return salary <= formData.max_salary;
      });
    }

    if (formData.employment_types.length > 0) {
      filtered = filtered.filter(emp => formData.employment_types.includes(emp.employment_type));
    }

    setPreviewEmployees(filtered);
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const calculateTotalImpact = () => {
    if (previewEmployees.length === 0) return 0;

    return previewEmployees.reduce((total, employee) => {
      const currentSalary = employee.designation?.min_salary || 0;

      if (formData.increment_type === 'fixed_amount') {
        return total + formData.increment_value;
      } else if (formData.increment_type === 'percentage') {
        return total + (currentSalary * formData.increment_value / 100);
      }

      return total;
    }, 0);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Bulk Update Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Update Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Annual Increment 2024"
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="effective_date">Effective Date *</Label>
              <Input
                id="effective_date"
                type="date"
                value={formData.effective_date}
                onChange={(e) => handleInputChange('effective_date', e.target.value)}
                className={errors.effective_date ? 'border-destructive' : ''}
              />
              {errors.effective_date && (
                <p className="text-sm text-destructive">{errors.effective_date}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Brief description of this bulk update..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Increment Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Increment Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="increment_type">Increment Type</Label>
              <Select value={formData.increment_type} onValueChange={(value) => handleInputChange('increment_type', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select increment type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="custom">Custom (per employee)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="increment_value">
                Increment {formData.increment_type === 'percentage' ? 'Percentage (%)' : 'Amount (PKR)'} *
              </Label>
              <div className="relative">
                {formData.increment_type === 'percentage' ? (
                  <Percent className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                ) : (
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                )}
                <Input
                  id="increment_value"
                  type="number"
                  step={formData.increment_type === 'percentage' ? '0.01' : '0.01'}
                  value={formData.increment_value || ''}
                  onChange={(e) => handleInputChange('increment_value', e.target.value)}
                  className={`pl-10 ${errors.increment_value ? 'border-destructive' : ''}`}
                  placeholder={formData.increment_type === 'percentage' ? '10' : '5000'}
                />
              </div>
              {errors.increment_value && (
                <p className="text-sm text-destructive">{errors.increment_value}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selection Criteria */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Employee Selection Criteria</CardTitle>
          <CardDescription>
            Select which employees should receive this increment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Departments */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Departments</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {departments.map(dept => (
                <div key={dept.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`dept-${dept.id}`}
                    checked={formData.department_ids.includes(dept.id)}
                    onCheckedChange={(checked) => handleCriteriaChange('department', dept.id.toString(), checked as boolean)}
                  />
                  <Label htmlFor={`dept-${dept.id}`} className="text-sm">
                    {dept.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Designations */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Designations</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {designations.map(desg => (
                <div key={desg.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`desg-${desg.id}`}
                    checked={formData.designation_ids.includes(desg.id)}
                    onCheckedChange={(checked) => handleCriteriaChange('designation', desg.id.toString(), checked as boolean)}
                  />
                  <Label htmlFor={`desg-${desg.id}`} className="text-sm">
                    {desg.title}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Employment Types */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Employment Types</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {employmentTypeOptions.map(type => (
                <div key={type.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`emp-type-${type.value}`}
                    checked={formData.employment_types.includes(type.value)}
                    onCheckedChange={(checked) => handleCriteriaChange('employment_type', type.value, checked as boolean)}
                  />
                  <Label htmlFor={`emp-type-${type.value}`} className="text-sm">
                    {type.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Salary Range */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Salary Range (Optional)</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min_salary">Minimum Salary</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="min_salary"
                    type="number"
                    value={formData.min_salary || ''}
                    onChange={(e) => handleInputChange('min_salary', e.target.value)}
                    className="pl-10"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_salary">Maximum Salary</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="max_salary"
                    type="number"
                    value={formData.max_salary || ''}
                    onChange={(e) => handleInputChange('max_salary', e.target.value)}
                    className="pl-10"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          </div>

          {errors.criteria && (
            <p className="text-sm text-destructive">{errors.criteria}</p>
          )}

          {/* Preview Button */}
          <div className="flex justify-center">
            <Button type="button" variant="outline" onClick={handlePreview}>
              <Users className="h-4 w-4 mr-2" />
              Preview Affected Employees ({previewEmployees.length})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview Results */}
      {previewEmployees.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Preview Results</CardTitle>
            <CardDescription>
              {previewEmployees.length} employees will be affected by this update
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{previewEmployees.length}</div>
                <div className="text-muted-foreground">Employees</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  PKR {calculateTotalImpact().toLocaleString()}
                </div>
                <div className="text-muted-foreground">Total Impact</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  PKR {formData.increment_type === 'percentage'
                    ? `${formData.increment_value}%`
                    : `PKR ${formData.increment_value.toLocaleString()}`
                  }
                </div>
                <div className="text-muted-foreground">Increment</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  PKR {(calculateTotalImpact() / previewEmployees.length).toLocaleString()}
                </div>
                <div className="text-muted-foreground">Avg Impact</div>
              </div>
            </div>

            {/* Employee List Preview */}
            <div className="space-y-2">
              <Label className="text-base font-medium">Affected Employees:</Label>
              <div className="max-h-40 overflow-y-auto border rounded-lg p-3 space-y-2">
                {previewEmployees.slice(0, 10).map(employee => (
                  <div key={employee.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <div>
                      <span className="font-medium">{employee.full_name}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        ({employee.employee_id})
                      </span>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">{employee.designation?.title}</Badge>
                      <div className="text-sm text-muted-foreground mt-1">
                        Current: PKR {(employee.designation?.min_salary || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
                {previewEmployees.length > 10 && (
                  <div className="text-center text-sm text-muted-foreground py-2">
                    ... and {previewEmployees.length - 10} more employees
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Processing...' : 'Submit for Approval'}
        </Button>
      </div>
    </form>
  );
};

export default BulkSalaryUpdateForm;
