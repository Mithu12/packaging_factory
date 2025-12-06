import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Save, X, Palette, Users, FileText, Calendar } from 'lucide-react';
import { LeaveTypeFormProps } from '../types';
import {
  getAccrualMethodOptions,
  getGenderRestrictionOptions,
  getEmploymentTypeOptions,
  getDocumentTypeOptions,
  getColorOptions
} from '../data/leave-configuration-data';

const LeaveTypeForm: React.FC<LeaveTypeFormProps> = ({
  leaveType,
  departments,
  designations,
  onSubmit,
  onCancel,
  loading = false
}) => {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    color_code: '#22c55e',

    // Entitlement Rules
    annual_allocation_days: 25,
    accrual_method: 'beginning_of_year' as 'beginning_of_year' | 'monthly_accrual' | 'anniversary_based' | 'custom',
    prorated_for_new_joiners: true,
    max_accumulation_days: 50,
    max_carry_forward_days: 10,
    encashment_eligible: true,
    min_days_per_request: 1,
    max_days_per_request: 15,

    // Applicability
    applicable_department_ids: [] as number[],
    applicable_designation_ids: [] as number[],
    gender_restriction: 'both' as 'male' | 'female' | 'both',
    employment_type_restrictions: [] as string[],

    // Documentation
    requires_documentation: false,
    mandatory_document_types: [] as string[],
    optional_document_types: [] as string[],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState('basic');

  const accrualMethodOptions = getAccrualMethodOptions();
  const genderRestrictionOptions = getGenderRestrictionOptions();
  const employmentTypeOptions = getEmploymentTypeOptions();
  const documentTypeOptions = getDocumentTypeOptions();
  const colorOptions = getColorOptions();

  useEffect(() => {
    if (leaveType) {
      setFormData({
        name: leaveType.name,
        code: leaveType.code,
        description: leaveType.description || '',
        color_code: leaveType.color_code,

        annual_allocation_days: leaveType.annual_allocation_days,
        accrual_method: leaveType.accrual_method,
        prorated_for_new_joiners: leaveType.prorated_for_new_joiners,
        max_accumulation_days: leaveType.max_accumulation_days || 50,
        max_carry_forward_days: leaveType.max_carry_forward_days || 10,
        encashment_eligible: leaveType.encashment_eligible,
        min_days_per_request: leaveType.min_days_per_request || 1,
        max_days_per_request: leaveType.max_days_per_request || 15,

        applicable_department_ids: leaveType.applicable_department_ids || [],
        applicable_designation_ids: leaveType.applicable_designation_ids || [],
        gender_restriction: leaveType.gender_restriction || 'both',
        employment_type_restrictions: leaveType.employment_type_restrictions || [],

        requires_documentation: leaveType.requires_documentation,
        mandatory_document_types: leaveType.mandatory_document_types || [],
        optional_document_types: leaveType.optional_document_types || [],
      });
    }
  }, [leaveType]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Leave type name is required';
    }

    if (!formData.code.trim()) {
      newErrors.code = 'Leave code is required';
    } else if (formData.code.length > 10) {
      newErrors.code = 'Leave code must be 10 characters or less';
    }

    if (formData.annual_allocation_days <= 0) {
      newErrors.annual_allocation_days = 'Annual allocation must be greater than 0';
    }

    if (formData.min_days_per_request && formData.max_days_per_request &&
        formData.min_days_per_request > formData.max_days_per_request) {
      newErrors.max_days_per_request = 'Maximum days cannot be less than minimum days';
    }

    if (formData.max_accumulation_days && formData.max_carry_forward_days &&
        formData.max_carry_forward_days > formData.max_accumulation_days) {
      newErrors.max_carry_forward_days = 'Carry forward limit cannot exceed accumulation limit';
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
      // Error handling is done in parent component
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleArrayFieldChange = (field: string, value: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: checked
        ? [...(prev[field as keyof typeof prev] as string[]), value]
        : (prev[field as keyof typeof prev] as string[]).filter(item => item !== value)
    }));
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="entitlement">Entitlement Rules</TabsTrigger>
          <TabsTrigger value="applicability">Applicability</TabsTrigger>
          <TabsTrigger value="documentation">Documentation</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Leave Type Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Annual Leave"
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Leave Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                placeholder="AL"
                className={errors.code ? 'border-destructive' : ''}
                maxLength={10}
              />
              {errors.code && (
                <p className="text-sm text-destructive">{errors.code}</p>
              )}
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Description of this leave type..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="color_code">Display Color</Label>
              <div className="flex items-center gap-2">
                <Select value={formData.color_code} onValueChange={(value) => handleInputChange('color_code', value)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select color" />
                  </SelectTrigger>
                  <SelectContent>
                    {colorOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full border"
                            style={{ backgroundColor: option.value }}
                          />
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div
                  className="w-8 h-8 rounded-full border-2 border-gray-300"
                  style={{ backgroundColor: formData.color_code }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Annual Allocation (Days)</Label>
              <Input
                type="number"
                value={formData.annual_allocation_days}
                onChange={(e) => handleInputChange('annual_allocation_days', parseInt(e.target.value) || 0)}
                min={0}
                max={365}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="entitlement" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Entitlement Rules
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="accrual_method">Accrual Method</Label>
                  <Select value={formData.accrual_method} onValueChange={(value) => handleInputChange('accrual_method', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select accrual method" />
                    </SelectTrigger>
                    <SelectContent>
                      {accrualMethodOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="prorated_for_new_joiners"
                    checked={formData.prorated_for_new_joiners}
                    onCheckedChange={(checked) => handleInputChange('prorated_for_new_joiners', checked)}
                  />
                  <Label htmlFor="prorated_for_new_joiners">Prorate for New Joiners</Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_accumulation_days">Max Accumulation (Days)</Label>
                  <Input
                    id="max_accumulation_days"
                    type="number"
                    value={formData.max_accumulation_days || ''}
                    onChange={(e) => handleInputChange('max_accumulation_days', parseInt(e.target.value) || undefined)}
                    min={0}
                    max={1000}
                    placeholder="Unlimited"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_carry_forward_days">Max Carry Forward (Days)</Label>
                  <Input
                    id="max_carry_forward_days"
                    type="number"
                    value={formData.max_carry_forward_days || ''}
                    onChange={(e) => handleInputChange('max_carry_forward_days', parseInt(e.target.value) || undefined)}
                    min={0}
                    max={365}
                    placeholder="No limit"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="encashment_eligible"
                    checked={formData.encashment_eligible}
                    onCheckedChange={(checked) => handleInputChange('encashment_eligible', checked)}
                  />
                  <Label htmlFor="encashment_eligible">Encashment Eligible</Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="min_days_per_request">Min Days per Request</Label>
                  <Input
                    id="min_days_per_request"
                    type="number"
                    value={formData.min_days_per_request || ''}
                    onChange={(e) => handleInputChange('min_days_per_request', parseInt(e.target.value) || undefined)}
                    min={1}
                    max={30}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_days_per_request">Max Days per Request</Label>
                  <Input
                    id="max_days_per_request"
                    type="number"
                    value={formData.max_days_per_request || ''}
                    onChange={(e) => handleInputChange('max_days_per_request', parseInt(e.target.value) || undefined)}
                    min={1}
                    max={90}
                    className={errors.max_days_per_request ? 'border-destructive' : ''}
                  />
                  {errors.max_days_per_request && (
                    <p className="text-sm text-destructive">{errors.max_days_per_request}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="applicability" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Leave Applicability
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Gender Restriction</Label>
                <Select value={formData.gender_restriction} onValueChange={(value) => handleInputChange('gender_restriction', value)}>
                  <SelectTrigger>
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

              <div className="space-y-2">
                <Label>Employment Type Restrictions</Label>
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

              <div className="space-y-3">
                <Label className="text-base font-medium">Applicable Departments</Label>
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

              <div className="space-y-3">
                <Label className="text-base font-medium">Applicable Designations</Label>
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
        </TabsContent>

        <TabsContent value="documentation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documentation Requirements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="requires_documentation"
                  checked={formData.requires_documentation}
                  onCheckedChange={(checked) => handleInputChange('requires_documentation', checked)}
                />
                <Label htmlFor="requires_documentation">Requires Documentation</Label>
              </div>

              {formData.requires_documentation && (
                <>
                  <div className="space-y-3">
                    <Label className="text-base font-medium">Mandatory Document Types</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {documentTypeOptions.map(docType => (
                        <div key={docType} className="flex items-center space-x-2">
                          <Checkbox
                            id={`mandatory-${docType}`}
                            checked={formData.mandatory_document_types.includes(docType)}
                            onCheckedChange={(checked) => {
                              const updated = checked
                                ? [...formData.mandatory_document_types, docType]
                                : formData.mandatory_document_types.filter(d => d !== docType);
                              handleInputChange('mandatory_document_types', updated);
                            }}
                          />
                          <Label htmlFor={`mandatory-${docType}`} className="text-sm">
                            {docType}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base font-medium">Optional Document Types</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {documentTypeOptions.map(docType => (
                        <div key={docType} className="flex items-center space-x-2">
                          <Checkbox
                            id={`optional-${docType}`}
                            checked={formData.optional_document_types.includes(docType)}
                            onCheckedChange={(checked) => {
                              const updated = checked
                                ? [...formData.optional_document_types, docType]
                                : formData.optional_document_types.filter(d => d !== docType);
                              handleInputChange('optional_document_types', updated);
                            }}
                          />
                          <Label htmlFor={`optional-${docType}`} className="text-sm">
                            {docType}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Saving...' : (leaveType ? 'Update Leave Type' : 'Create Leave Type')}
        </Button>
      </div>
    </form>
  );
};

export default LeaveTypeForm;
