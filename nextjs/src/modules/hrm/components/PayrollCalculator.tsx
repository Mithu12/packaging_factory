"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calculator, Users, CheckCircle, Clock, AlertCircle, DollarSign } from 'lucide-react';
import { PayrollCalculatorProps, Employee, PayrollCalculationForm } from '../types';

const PayrollCalculator: React.FC<PayrollCalculatorProps> = ({
  employees,
  selectedEmployeeIds,
  onCalculate,
  onSelectAll,
  loading = false
}) => {
  const [calculationData, setCalculationData] = useState<PayrollCalculationForm>({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    employee_ids: [],
    recalculate_all: false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedEmployees = employees.filter(emp => selectedEmployeeIds.includes(emp.id));
  const allSelected = selectedEmployeeIds.length === employees.length;
  const someSelected = selectedEmployeeIds.length > 0 && selectedEmployeeIds.length < employees.length;

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (calculationData.month < 1 || calculationData.month > 12) {
      newErrors.month = 'Month must be between 1 and 12';
    }

    if (calculationData.year < 2020 || calculationData.year > 2030) {
      newErrors.year = 'Year must be between 2020 and 2030';
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
      await onCalculate({
        ...calculationData,
        employee_ids: selectedEmployeeIds.length > 0 ? selectedEmployeeIds : undefined,
        recalculate_all: selectedEmployeeIds.length === 0
      });
    } catch (error) {
      // Error handling is done in parent component
    }
  };

  const handleInputChange = (field: keyof PayrollCalculationForm, value: any) => {
    setCalculationData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const monthOptions = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => ({
    value: (currentYear - 5 + i).toString(),
    label: (currentYear - 5 + i).toString(),
  }));

  const getEmployeeStatusBadge = (employee: Employee) => {
    // In a real app, this would check actual payroll status
    const hasPayrollRecord = Math.random() > 0.3; // Mock data
    if (hasPayrollRecord) {
      return <Badge variant="secondary">Calculated</Badge>;
    }
    return <Badge variant="outline">Pending</Badge>;
  };

  const calculateEstimatedTotal = () => {
    if (selectedEmployees.length === 0) return 0;

    // Mock calculation - in real app this would use actual salary data
    const avgSalary = 80000; // Mock average salary
    return selectedEmployees.length * avgSalary;
  };

  return (
    <div className="space-y-6">
      {/* Calculation Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Payroll Calculation Parameters
          </CardTitle>
          <CardDescription>
            Configure payroll calculation settings for the selected period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="month">Month *</Label>
                <Select value={calculationData.month.toString()} onValueChange={(value) => handleInputChange('month', parseInt(value))}>
                  <SelectTrigger className={errors.month ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Select month" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.month && (
                  <p className="text-sm text-destructive">{errors.month}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="year">Year *</Label>
                <Select value={calculationData.year.toString()} onValueChange={(value) => handleInputChange('year', parseInt(value))}>
                  <SelectTrigger className={errors.year ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.year && (
                  <p className="text-sm text-destructive">{errors.year}</p>
                )}
              </div>

              <div className="flex items-end">
                <Button type="submit" disabled={loading} className="w-full">
                  <Calculator className="h-4 w-4 mr-2" />
                  {loading ? 'Calculating...' : 'Calculate Payroll'}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Employee Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Employee Selection
          </CardTitle>
          <CardDescription>
            Select employees to include in payroll calculation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Bulk Selection Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all"
                checked={someSelected ? "indeterminate" : allSelected}
                onCheckedChange={onSelectAll}
              />
              <Label htmlFor="select-all" className="text-sm font-medium">
                Select All Employees ({employees.length})
              </Label>
            </div>

            {selectedEmployeeIds.length > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {selectedEmployeeIds.length} selected
                </Badge>
                <Button variant="outline" size="sm" onClick={() => onSelectAll(false)}>
                  Clear Selection
                </Button>
              </div>
            )}
          </div>

          <Separator />

          {/* Employee List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
            {employees.map((employee) => (
              <Card key={employee.id} className={`cursor-pointer transition-colors ${
                selectedEmployeeIds.includes(employee.id)
                  ? 'ring-2 ring-primary bg-primary/5'
                  : 'hover:bg-muted/50'
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      checked={selectedEmployeeIds.includes(employee.id)}
                      onCheckedChange={(checked) => {
                        const newSelected = checked
                          ? [...selectedEmployeeIds, employee.id]
                          : selectedEmployeeIds.filter(id => id !== employee.id);
                        // Update parent component
                        if (checked) {
                          onSelectAll(false); // Clear select all when individual selection changes
                        }
                      }}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm truncate">
                          {employee.full_name}
                        </h4>
                        {getEmployeeStatusBadge(employee)}
                      </div>

                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p className="truncate">ID: {employee.employee_id}</p>
                        <p className="truncate">{employee.designation?.title}</p>
                        <p className="truncate">{employee.department?.name}</p>
                      </div>

                      {/* Mock salary preview */}
                      <div className="mt-2 pt-2 border-t">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Est. Salary:</span>
                          <span className="font-medium">
                            PKR {(employee.designation?.min_salary || 50000).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Calculation Preview */}
      {selectedEmployeeIds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Calculation Preview</CardTitle>
            <CardDescription>
              Preview of payroll calculation for selected employees
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{selectedEmployeeIds.length}</div>
                <div className="text-sm text-muted-foreground">Employees</div>
              </div>

              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  PKR {calculateEstimatedTotal().toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Est. Total Salary</div>
              </div>

              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {monthOptions.find(m => m.value === calculationData.month.toString())?.label} {calculationData.year}
                </div>
                <div className="text-sm text-muted-foreground">Payroll Period</div>
              </div>

              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  PKR {(calculateEstimatedTotal() / selectedEmployeeIds.length).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Avg. per Employee</div>
              </div>
            </div>

            {/* Selected Employees Summary */}
            <div className="space-y-2">
              <Label className="text-base font-medium">Selected Employees:</Label>
              <div className="flex flex-wrap gap-2">
                {selectedEmployees.map(employee => (
                  <Badge key={employee.id} variant="secondary" className="text-xs">
                    {employee.full_name} ({employee.employee_id})
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-2 pt-4">
        <Button
          variant="outline"
          onClick={() => onSelectAll(false)}
          disabled={loading || selectedEmployeeIds.length === 0}
        >
          Clear Selection
        </Button>
        <Button
          onClick={() => {
            // Generate payslips for selected employees
            console.log('Generate payslips for:', selectedEmployeeIds);
          }}
          disabled={loading || selectedEmployeeIds.length === 0}
        >
          Generate Payslips
        </Button>
      </div>
    </div>
  );
};

export default PayrollCalculator;
