"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, FileText, Save, X, DollarSign, Percent, TrendingUp } from 'lucide-react';
import { PromotionFormProps, Employee, Department, Designation } from '../types';
import { getEmployeeOptions, getDepartmentOptions, getDesignationOptions, generatePromotionLetterTemplate } from '../data/salary-update-data';

const PromotionForm: React.FC<PromotionFormProps> = ({
  employees,
  departments,
  designations,
  onSubmit,
  onCancel,
  loading = false
}) => {
  const [formData, setFormData] = useState({
    employee_id: '',
    current_designation_id: '',
    current_department_id: '',
    new_designation_id: '',
    new_department_id: '',
    current_salary: 0,
    new_salary: 0,
    salary_adjustment: 0,
    adjustment_percentage: 0,
    effective_date: '',
    reason: '',
    notes: '',
    promotion_letter_content: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [currentDesignation, setCurrentDesignation] = useState<Designation | null>(null);
  const [newDesignation, setNewDesignation] = useState<Designation | null>(null);

  const employeeOptions = getEmployeeOptions();
  const departmentOptions = getDepartmentOptions();
  const designationOptions = getDesignationOptions();

  useEffect(() => {
    if (formData.employee_id && employees.length > 0) {
      const employee = employees.find(emp => emp.id.toString() === formData.employee_id);
      if (employee) {
        setSelectedEmployee(employee);
        setFormData(prev => ({
          ...prev,
          current_designation_id: employee.designation_id?.toString() || '',
          current_department_id: employee.department_id?.toString() || '',
          current_salary: employee.designation?.min_salary || 50000
        }));

        // Set current designation
        if (employee.designation) {
          setCurrentDesignation(employee.designation);
        }
      }
    }
  }, [formData.employee_id, employees]);

  useEffect(() => {
    if (formData.new_designation_id && designations.length > 0) {
      const designation = designations.find(desg => desg.id.toString() === formData.new_designation_id);
      if (designation) {
        setNewDesignation(designation);
      }
    }
  }, [formData.new_designation_id, designations]);

  useEffect(() => {
    if (formData.new_department_id && departments.length > 0) {
      // Update current department if changed
      const department = departments.find(dept => dept.id.toString() === formData.new_department_id);
      if (department && selectedEmployee) {
        setSelectedEmployee(prev => prev ? { ...prev, department } : null);
      }
    }
  }, [formData.new_department_id, departments, selectedEmployee]);

  useEffect(() => {
    // Auto-generate promotion letter when key fields are filled
    if (selectedEmployee && currentDesignation && newDesignation && formData.effective_date) {
      const letter = generatePromotionLetterTemplate(
        selectedEmployee,
        currentDesignation,
        newDesignation,
        formData.new_salary,
        formData.effective_date
      );
      setFormData(prev => ({ ...prev, promotion_letter_content: letter }));
    }
  }, [selectedEmployee, currentDesignation, newDesignation, formData.new_salary, formData.effective_date]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.employee_id) {
      newErrors.employee_id = 'Employee selection is required';
    }

    if (!formData.new_designation_id) {
      newErrors.new_designation_id = 'New designation is required';
    }

    if (!formData.effective_date) {
      newErrors.effective_date = 'Effective date is required';
    }

    if (!formData.reason.trim()) {
      newErrors.reason = 'Reason is required';
    }

    if (formData.new_salary <= formData.current_salary) {
      newErrors.new_salary = 'New salary must be greater than current salary';
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
        employee_id: '',
        current_designation_id: '',
        current_department_id: '',
        new_designation_id: '',
        new_department_id: '',
        current_salary: 0,
        new_salary: 0,
        salary_adjustment: 0,
        adjustment_percentage: 0,
        effective_date: '',
        reason: '',
        notes: '',
        promotion_letter_content: ''
      });
      setSelectedEmployee(null);
      setCurrentDesignation(null);
      setNewDesignation(null);
    } catch (error) {
      // Error handling is done in parent component
    }
  };

  const handleSalaryChange = (field: 'new_salary' | 'salary_adjustment' | 'adjustment_percentage', value: string) => {
    const numValue = parseFloat(value) || 0;

    setFormData(prev => {
      const updated = { ...prev, [field]: numValue };

      // Auto-calculate other fields based on the changed field
      if (field === 'salary_adjustment' && prev.current_salary > 0) {
        updated.new_salary = prev.current_salary + numValue;
        updated.adjustment_percentage = (numValue / prev.current_salary) * 100;
      } else if (field === 'adjustment_percentage' && prev.current_salary > 0) {
        const adjustmentAmount = (prev.current_salary * numValue) / 100;
        updated.new_salary = prev.current_salary + adjustmentAmount;
        updated.salary_adjustment = adjustmentAmount;
      } else if (field === 'new_salary' && prev.current_salary > 0) {
        const adjustmentAmount = numValue - prev.current_salary;
        updated.salary_adjustment = adjustmentAmount;
        updated.adjustment_percentage = (adjustmentAmount / prev.current_salary) * 100;
      }

      return updated;
    });

    // Clear errors for related fields
    setErrors(prev => ({
      ...prev,
      new_salary: '',
      salary_adjustment: '',
      adjustment_percentage: ''
    }));
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Employee Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Employee Selection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="employee_id">Select Employee *</Label>
              <Select value={formData.employee_id} onValueChange={(value) => handleInputChange('employee_id', value)}>
                <SelectTrigger className={errors.employee_id ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Search and select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employeeOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.employee_id && (
                <p className="text-sm text-destructive">{errors.employee_id}</p>
              )}
            </div>

            {selectedEmployee && (
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Current Designation:</span>
                  <Badge variant="outline">{currentDesignation?.title}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Department:</span>
                  <Badge variant="outline">{selectedEmployee.department?.name}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Current Salary:</span>
                  <Badge variant="outline">PKR {formData.current_salary.toLocaleString()}</Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Position Changes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Position Changes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new_designation_id">New Designation *</Label>
                <Select value={formData.new_designation_id} onValueChange={(value) => handleInputChange('new_designation_id', value)}>
                  <SelectTrigger className={errors.new_designation_id ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Select new designation" />
                  </SelectTrigger>
                  <SelectContent>
                    {designationOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.new_designation_id && (
                  <p className="text-sm text-destructive">{errors.new_designation_id}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="new_department_id">New Department</Label>
                <Select value={formData.new_department_id} onValueChange={(value) => handleInputChange('new_department_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select new department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departmentOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {newDesignation && (
              <div className="p-3 bg-blue-50 rounded-lg space-y-2">
                <h4 className="font-medium text-blue-900">New Position Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700">Designation:</span>
                    <p className="font-medium">{newDesignation.title}</p>
                  </div>
                  <div>
                    <span className="text-blue-700">Grade Level:</span>
                    <p className="font-medium">{newDesignation.grade_level}</p>
                  </div>
                  <div>
                    <span className="text-blue-700">Salary Range:</span>
                    <p className="font-medium">
                      PKR {newDesignation.min_salary?.toLocaleString()} - {newDesignation.max_salary?.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Salary Adjustment */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Salary Adjustment
          </CardTitle>
          <CardDescription>
            Calculate salary changes for the promotion
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="salary_adjustment">Salary Adjustment (PKR)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="salary_adjustment"
                  type="number"
                  step="0.01"
                  value={formData.salary_adjustment || ''}
                  onChange={(e) => handleSalaryChange('salary_adjustment', e.target.value)}
                  className="pl-10"
                  placeholder="10000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adjustment_percentage">Adjustment Percentage (%)</Label>
              <div className="relative">
                <Percent className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="adjustment_percentage"
                  type="number"
                  step="0.01"
                  value={formData.adjustment_percentage || ''}
                  onChange={(e) => handleSalaryChange('adjustment_percentage', e.target.value)}
                  className="pl-10"
                  placeholder="20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new_salary">New Monthly Salary *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="new_salary"
                  type="number"
                  step="0.01"
                  value={formData.new_salary || ''}
                  onChange={(e) => handleSalaryChange('new_salary', e.target.value)}
                  className={`pl-10 ${errors.new_salary ? 'border-destructive' : ''}`}
                  placeholder="0"
                />
              </div>
              {errors.new_salary && (
                <p className="text-sm text-destructive">{errors.new_salary}</p>
              )}
            </div>
          </div>

          {/* Salary Summary */}
          {formData.salary_adjustment > 0 && (
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium mb-2 text-green-900">Promotion Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-green-700">Current Salary:</span>
                  <p className="font-medium">PKR {formData.current_salary.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-green-700">Adjustment:</span>
                  <p className="font-medium text-green-600">+PKR {formData.salary_adjustment.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-green-700">New Salary:</span>
                  <p className="font-medium">PKR {formData.new_salary.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-green-700">Percentage:</span>
                  <p className="font-medium">{formData.adjustment_percentage.toFixed(2)}%</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Effective Date and Reason */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Promotion Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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

            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Promotion *</Label>
              <Textarea
                id="reason"
                value={formData.reason}
                onChange={(e) => handleInputChange('reason', e.target.value)}
                placeholder="Outstanding performance, leadership skills, etc."
                className={errors.reason ? 'border-destructive' : ''}
                rows={3}
              />
              {errors.reason && (
                <p className="text-sm text-destructive">{errors.reason}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Any additional information..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Promotion Letter Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Promotion Letter Preview
            </CardTitle>
            <CardDescription>
              Auto-generated promotion letter template
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="promotion_letter_content">Letter Content</Label>
              <Textarea
                id="promotion_letter_content"
                value={formData.promotion_letter_content}
                onChange={(e) => handleInputChange('promotion_letter_content', e.target.value)}
                placeholder="Promotion letter will be generated automatically..."
                rows={8}
                className="font-mono text-sm"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Submitting...' : 'Submit for Approval'}
        </Button>
      </div>
    </form>
  );
};

export default PromotionForm;
