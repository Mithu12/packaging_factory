import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Calculator, Save, X, DollarSign, Percent } from 'lucide-react';
import { SalaryIncrementFormProps, Employee } from '../types';
import { calculateIncrement, getEmployeeOptions } from '../data/salary-update-data';

const SalaryIncrementForm: React.FC<SalaryIncrementFormProps> = ({
  employees,
  onSubmit,
  onCancel,
  loading = false
}) => {
  const [formData, setFormData] = useState({
    employee_id: '',
    current_salary: 0,
    new_salary: 0,
    increment_amount: 0,
    increment_percentage: 0,
    effective_date: '',
    reason: '',
    notes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const employeeOptions = getEmployeeOptions();

  useEffect(() => {
    if (formData.employee_id && employees.length > 0) {
      const employee = employees.find(emp => emp.id.toString() === formData.employee_id);
      if (employee) {
        setSelectedEmployee(employee);
        // In a real app, this would come from the employee's current salary record
        // For demo purposes, we'll use a calculated value based on designation
        const baseSalary = employee.designation?.min_salary || 50000;
        setFormData(prev => ({
          ...prev,
          current_salary: baseSalary
        }));
      }
    }
  }, [formData.employee_id, employees]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.employee_id) {
      newErrors.employee_id = 'Employee selection is required';
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

    if (formData.increment_percentage <= 0) {
      newErrors.increment_percentage = 'Increment percentage must be greater than 0';
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
        current_salary: 0,
        new_salary: 0,
        increment_amount: 0,
        increment_percentage: 0,
        effective_date: '',
        reason: '',
        notes: ''
      });
      setSelectedEmployee(null);
    } catch (error) {
      // Error handling is done in parent component
    }
  };

  const handleEmployeeChange = (employeeId: string) => {
    setFormData(prev => ({ ...prev, employee_id: employeeId }));
    if (errors.employee_id) {
      setErrors(prev => ({ ...prev, employee_id: '' }));
    }
  };

  const handleSalaryChange = (field: 'new_salary' | 'increment_amount' | 'increment_percentage', value: string) => {
    const numValue = parseFloat(value) || 0;

    setFormData(prev => {
      const updated = { ...prev, [field]: numValue };

      // Auto-calculate other fields based on the changed field
      if (field === 'increment_amount' && prev.current_salary > 0) {
        updated.new_salary = prev.current_salary + numValue;
        updated.increment_percentage = (numValue / prev.current_salary) * 100;
      } else if (field === 'increment_percentage' && prev.current_salary > 0) {
        const incrementAmount = (prev.current_salary * numValue) / 100;
        updated.new_salary = prev.current_salary + incrementAmount;
        updated.increment_amount = incrementAmount;
      } else if (field === 'new_salary' && prev.current_salary > 0) {
        const incrementAmount = numValue - prev.current_salary;
        updated.increment_amount = incrementAmount;
        updated.increment_percentage = (incrementAmount / prev.current_salary) * 100;
      }

      return updated;
    });

    // Clear errors for related fields
    setErrors(prev => ({
      ...prev,
      new_salary: '',
      increment_amount: '',
      increment_percentage: ''
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
              <Select value={formData.employee_id} onValueChange={handleEmployeeChange}>
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
                  <Badge variant="outline">{selectedEmployee.designation?.title}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Department:</span>
                  <Badge variant="outline">{selectedEmployee.department?.name}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Employment Type:</span>
                  <Badge variant="outline">{selectedEmployee.employment_type}</Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Current Salary Display */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Current Salary Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current_salary">Current Monthly Salary</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="current_salary"
                  type="number"
                  value={formData.current_salary || ''}
                  readOnly
                  className="pl-10 bg-muted"
                  placeholder="0"
                />
              </div>
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
          </CardContent>
        </Card>
      </div>

      {/* Salary Increment Calculator */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Increment Calculator
          </CardTitle>
          <CardDescription>
            Calculate new salary based on increment amount or percentage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="increment_amount">Increment Amount (PKR)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="increment_amount"
                  type="number"
                  step="0.01"
                  value={formData.increment_amount || ''}
                  onChange={(e) => handleSalaryChange('increment_amount', e.target.value)}
                  className={`pl-10 ${errors.increment_amount ? 'border-destructive' : ''}`}
                  placeholder="5000"
                />
              </div>
              {errors.increment_amount && (
                <p className="text-sm text-destructive">{errors.increment_amount}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="increment_percentage">Increment Percentage (%)</Label>
              <div className="relative">
                <Percent className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="increment_percentage"
                  type="number"
                  step="0.01"
                  value={formData.increment_percentage || ''}
                  onChange={(e) => handleSalaryChange('increment_percentage', e.target.value)}
                  className={`pl-10 ${errors.increment_percentage ? 'border-destructive' : ''}`}
                  placeholder="10"
                />
              </div>
              {errors.increment_percentage && (
                <p className="text-sm text-destructive">{errors.increment_percentage}</p>
              )}
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

          {/* Increment Summary */}
          {formData.increment_amount > 0 && (
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Increment Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Current Salary:</span>
                  <p className="font-medium">PKR {formData.current_salary.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Increment Amount:</span>
                  <p className="font-medium text-green-600">+PKR {formData.increment_amount.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">New Salary:</span>
                  <p className="font-medium">PKR {formData.new_salary.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Percentage:</span>
                  <p className="font-medium">{formData.increment_percentage.toFixed(2)}%</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reason and Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Additional Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Increment *</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => handleInputChange('reason', e.target.value)}
              placeholder="Performance review, annual increment, skill development, etc."
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
              placeholder="Any additional information or comments..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

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

export default SalaryIncrementForm;
