"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Users,
  Building,
  UserCheck,
  Save,
  RotateCcw,
  Info
} from 'lucide-react';
import { LeaveApplicabilityProps } from '../types';
import { getGenderRestrictionOptions, getEmploymentTypeOptions } from '../data/leave-configuration-data';

const LeaveApplicability: React.FC<LeaveApplicabilityProps> = ({
  leaveType,
  departments,
  designations,
  onUpdate,
  loading = false
}) => {
  const [formData, setFormData] = useState({
    applicable_department_ids: leaveType.applicable_department_ids || [],
    applicable_designation_ids: leaveType.applicable_designation_ids || [],
    gender_restriction: leaveType.gender_restriction || 'both',
    employment_type_restrictions: leaveType.employment_type_restrictions || [],
  });

  const [hasChanges, setHasChanges] = useState(false);

  const genderRestrictionOptions = getGenderRestrictionOptions();
  const employmentTypeOptions = getEmploymentTypeOptions();

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleArrayFieldChange = (field: string, value: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: checked
        ? [...(prev[field as keyof typeof prev] as string[]), value]
        : (prev[field as keyof typeof prev] as string[]).filter(item => item !== value)
    }));
    setHasChanges(true);
  };

  const handleDepartmentChange = (departmentId: number, checked: boolean) => {
    const updated = checked
      ? [...formData.applicable_department_ids, departmentId]
      : formData.applicable_department_ids.filter(id => id !== departmentId);
    handleInputChange('applicable_department_ids', updated);
  };

  const handleDesignationChange = (designationId: number, checked: boolean) => {
    const updated = checked
      ? [...formData.applicable_designation_ids, designationId]
      : formData.applicable_designation_ids.filter(id => id !== designationId);
    handleInputChange('applicable_designation_ids', updated);
  };

  const handleSave = async () => {
    try {
      await onUpdate(formData);
      setHasChanges(false);
    } catch (error) {
      // Error handling is done in parent component
    }
  };

  const handleReset = () => {
    setFormData({
      applicable_department_ids: leaveType.applicable_department_ids || [],
      applicable_designation_ids: leaveType.applicable_designation_ids || [],
      gender_restriction: leaveType.gender_restriction || 'both',
      employment_type_restrictions: leaveType.employment_type_restrictions || [],
    });
    setHasChanges(false);
  };

  const getSelectedDepartments = () => {
    if (!formData.applicable_department_ids || formData.applicable_department_ids.length === 0) {
      return 'All Departmentsnts';
    }
    return `${formData.applicable_department_ids.length} Selected`;
  };

  const getSelectedDesignations = () => {
    if (!formData.applicable_designation_ids || formData.applicable_designation_ids.length === 0) {
      return 'All Designations';
    }
    return `${formData.applicable_designation_ids.length} Selected`;
  };

  return (
    <div className="space-y-6">
      {/* Current Configuration Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current Applicability Settings</CardTitle>
          <CardDescription>
            Overview of current applicability rules for {leaveType.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-lg font-bold text-blue-600">
                {genderRestrictionOptions.find(opt => opt.value === formData.gender_restriction)?.label}
              </div>
              <div className="text-sm text-muted-foreground">Gender Restriction</div>
            </div>

            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-lg font-bold text-green-600">
                {formData.employment_type_restrictions.length || 'All'}
              </div>
              <div className="text-sm text-muted-foreground">Employment Types</div>
            </div>

            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-lg font-bold text-purple-600">
                {getSelectedDepartments()}
              </div>
              <div className="text-sm text-muted-foreground">Departments</div>
            </div>

            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-lg font-bold text-orange-600">
                {getSelectedDesignations()}
              </div>
              <div className="text-sm text-muted-foreground">Designations</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Applicability Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Leave Applicability Settings
          </CardTitle>
          <CardDescription>
            Configure which employees are eligible for this leave type
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Gender Restriction */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Gender Restriction</Label>
            <Select value={formData.gender_restriction} onValueChange={(value) => handleInputChange('gender_restriction', value)}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select gender restriction" />
              </SelectTrigger>
              <SelectContent>
                {genderRestrictionOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Employment Type Restrictions */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Employment Type Restrictions</Label>
            <div className="grid grid-cols-2 gap-3">
              {employmentTypeOptions.map(type => (
                <div key={type.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`emp-type-${type.value}`}
                    checked={formData.employment_type_restrictions.includes(type.value)}
                    onCheckedChange={(checked) => {
                      const updated = checked
                        ? [...formData.employment_type_restrictions, type.value]
                        : formData.employment_type_restrictions.filter(t => t !== type.value);
                      handleInputChange('employment_type_restrictions', updated);
                    }}
                  />
                  <Label htmlFor={`emp-type-${type.value}`} className="text-sm">
                    {type.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Department Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Applicable Departments</Label>
            <p className="text-sm text-muted-foreground">
              Leave empty to apply to all departments, or select specific departments
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {departments.map(dept => (
                <div key={dept.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`dept-${dept.id}`}
                    checked={formData.applicable_department_ids.includes(dept.id)}
                    onCheckedChange={(checked) => handleDepartmentChange(dept.id, checked as boolean)}
                  />
                  <Label htmlFor={`dept-${dept.id}`} className="text-sm">
                    {dept.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Designation Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Applicable Designations</Label>
            <p className="text-sm text-muted-foreground">
              Leave empty to apply to all designations, or select specific designations
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {designations.map(desg => (
                <div key={desg.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`desg-${desg.id}`}
                    checked={formData.applicable_designation_ids.includes(desg.id)}
                    onCheckedChange={(checked) => handleDesignationChange(desg.id, checked as boolean)}
                  />
                  <Label htmlFor={`desg-${desg.id}`} className="text-sm">
                    {desg.title}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Information Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Applicability Rules Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-3">
              <div>
                <h4 className="font-medium">Gender Restrictions</h4>
                <ul className="text-sm text-muted-foreground space-y-1 mt-1">
                  <li>• <strong>Both:</strong> Available to all employees regardless of gender</li>
                  <li>• <strong>Male Only:</strong> Restricted to male employees only</li>
                  <li>• <strong>Female Only:</strong> Restricted to female employees only</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium">Employment Types</h4>
                <ul className="text-sm text-muted-foreground space-y-1 mt-1">
                  <li>• <strong>Permanent:</strong> Full-time permanent employees</li>
                  <li>• <strong>Contract:</strong> Contract-based employees</li>
                  <li>• <strong>Intern:</strong> Internship positions</li>
                  <li>• <strong>Consultant:</strong> External consultants</li>
                </ul>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="font-medium">Department Selection</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  When no departments are selected, the leave type applies to all departments.
                  Select specific departments to restrict availability.
                </p>
              </div>

              <div>
                <h4 className="font-medium">Designation Selection</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  When no designations are selected, the leave type applies to all designations.
                  Select specific designations to restrict availability to certain roles.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {hasChanges && (
        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={handleReset} disabled={loading}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset Changes
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default LeaveApplicability;
