"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Calendar,
  Calculator,
  TrendingUp,
  Save,
  RotateCcw,
  Info
} from 'lucide-react';
import { LeaveEntitlementRulesProps } from '../types';
import { getAccrualMethodOptions } from '../data/leave-configuration-data';

const LeaveEntitlementRules: React.FC<LeaveEntitlementRulesProps> = ({
  leaveType,
  onUpdate,
  loading = false
}) => {
  const [formData, setFormData] = useState({
    annual_allocation_days: leaveType.annual_allocation_days,
    accrual_method: leaveType.accrual_method,
    prorated_for_new_joiners: leaveType.prorated_for_new_joiners,
    max_accumulation_days: leaveType.max_accumulation_days || 50,
    max_carry_forward_days: leaveType.max_carry_forward_days || 10,
    encashment_eligible: leaveType.encashment_eligible,
    min_days_per_request: leaveType.min_days_per_request || 1,
    max_days_per_request: leaveType.max_days_per_request || 15,
  });

  const [hasChanges, setHasChanges] = useState(false);
  const accrualMethodOptions = getAccrualMethodOptions();

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
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
      annual_allocation_days: leaveType.annual_allocation_days,
      accrual_method: leaveType.accrual_method,
      prorated_for_new_joiners: leaveType.prorated_for_new_joiners,
      max_accumulation_days: leaveType.max_accumulation_days || 50,
      max_carry_forward_days: leaveType.max_carry_forward_days || 10,
      encashment_eligible: leaveType.encashment_eligible,
      min_days_per_request: leaveType.min_days_per_request || 1,
      max_days_per_request: leaveType.max_days_per_request || 15,
    });
    setHasChanges(false);
  };

  const getAccrualMethodDescription = (method: string) => {
    const descriptions = {
      beginning_of_year: 'Full allocation granted at the start of each calendar year',
      monthly_accrual: 'Leave days accrue monthly throughout the year',
      anniversary_based: 'Leave days granted on employee\'s join anniversary',
      custom: 'Custom accrual logic defined separately'
    };
    return descriptions[method as keyof typeof descriptions] || 'Custom accrual method';
  };

  return (
    <div className="space-y-6">
      {/* Current Configuration Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current Configuration Summary</CardTitle>
          <CardDescription>
            Overview of current entitlement rules for {leaveType.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{formData.annual_allocation_days}</div>
              <div className="text-sm text-muted-foreground">Annual Days</div>
            </div>

            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-lg font-bold text-green-600">
                {accrualMethodOptions.find(opt => opt.value === formData.accrual_method)?.label}
              </div>
              <div className="text-sm text-muted-foreground">Accrual Method</div>
            </div>

            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {formData.max_accumulation_days || '∞'}
              </div>
              <div className="text-sm text-muted-foreground">Max Accumulation</div>
            </div>

            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {formData.encashment_eligible ? 'Yes' : 'No'}
              </div>
              <div className="text-sm text-muted-foreground">Encashment</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Entitlement Rules Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Entitlement Rules Configuration
          </CardTitle>
          <CardDescription>
            Configure how leave days are allocated and managed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Annual Allocation */}
            <div className="space-y-2">
              <Label htmlFor="annual_allocation_days">Annual Allocation (Days) *</Label>
              <Input
                id="annual_allocation_days"
                type="number"
                value={formData.annual_allocation_days}
                onChange={(e) => handleInputChange('annual_allocation_days', parseInt(e.target.value) || 0)}
                min={1}
                max={365}
              />
              <p className="text-sm text-muted-foreground">
                Number of days allocated per year
              </p>
            </div>

            {/* Accrual Method */}
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
              <p className="text-sm text-muted-foreground">
                {getAccrualMethodDescription(formData.accrual_method)}
              </p>
            </div>

            {/* Proration for New Joiners */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="prorated_for_new_joiners">Prorate for New Joiners</Label>
                  <p className="text-sm text-muted-foreground">
                    Calculate leave based on join date
                  </p>
                </div>
                <Switch
                  id="prorated_for_new_joiners"
                  checked={formData.prorated_for_new_joiners}
                  onCheckedChange={(checked) => handleInputChange('prorated_for_new_joiners', checked)}
                />
              </div>
            </div>

            {/* Encashment Eligible */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="encashment_eligible">Encashment Eligible</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow unused leave to be paid out
                  </p>
                </div>
                <Switch
                  id="encashment_eligible"
                  checked={formData.encashment_eligible}
                  onCheckedChange={(checked) => handleInputChange('encashment_eligible', checked)}
                />
              </div>
            </div>

            {/* Max Accumulation */}
            <div className="space-y-2">
              <Label htmlFor="max_accumulation_days">Maximum Accumulation (Days)</Label>
              <Input
                id="max_accumulation_days"
                type="number"
                value={formData.max_accumulation_days || ''}
                onChange={(e) => handleInputChange('max_accumulation_days', parseInt(e.target.value) || undefined)}
                min={1}
                max={1000}
                placeholder="No limit"
              />
              <p className="text-sm text-muted-foreground">
                Maximum days an employee can accumulate
              </p>
            </div>

            {/* Max Carry Forward */}
            <div className="space-y-2">
              <Label htmlFor="max_carry_forward_days">Maximum Carry Forward (Days)</Label>
              <Input
                id="max_carry_forward_days"
                type="number"
                value={formData.max_carry_forward_days || ''}
                onChange={(e) => handleInputChange('max_carry_forward_days', parseInt(e.target.value) || undefined)}
                min={0}
                max={365}
                placeholder="No limit"
              />
              <p className="text-sm text-muted-foreground">
                Maximum days that can be carried to next year
              </p>
            </div>

            {/* Min Days per Request */}
            <div className="space-y-2">
              <Label htmlFor="min_days_per_request">Minimum Days per Request</Label>
              <Input
                id="min_days_per_request"
                type="number"
                value={formData.min_days_per_request || ''}
                onChange={(e) => handleInputChange('min_days_per_request', parseInt(e.target.value) || undefined)}
                min={1}
                max={30}
              />
              <p className="text-sm text-muted-foreground">
                Minimum leave days required for a single request
              </p>
            </div>

            {/* Max Days per Request */}
            <div className="space-y-2">
              <Label htmlFor="max_days_per_request">Maximum Days per Request</Label>
              <Input
                id="max_days_per_request"
                type="number"
                value={formData.max_days_per_request || ''}
                onChange={(e) => handleInputChange('max_days_per_request', parseInt(e.target.value) || undefined)}
                min={1}
                max={90}
              />
              <p className="text-sm text-muted-foreground">
                Maximum leave days allowed for a single request
              </p>
            </div>
          </div>

          {/* Validation Warning */}
          {formData.min_days_per_request && formData.max_days_per_request &&
           formData.min_days_per_request > formData.max_days_per_request && (
            <Alert>
              <AlertDescription>
                Warning: Minimum days per request ({formData.min_days_per_request}) cannot be greater than maximum days per request ({formData.max_days_per_request}).
              </AlertDescription>
            </Alert>
          )}

          {formData.max_accumulation_days && formData.max_carry_forward_days &&
           formData.max_carry_forward_days > formData.max_accumulation_days && (
            <Alert>
              <AlertDescription>
                Warning: Carry forward limit ({formData.max_carry_forward_days}) cannot exceed accumulation limit ({formData.max_accumulation_days}).
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Accrual Method Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Accrual Method Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <h4 className="font-medium">Beginning of Year</h4>
                <p className="text-sm text-muted-foreground">
                  Full allocation granted on January 1st or employee's join date (if prorated)
                </p>
              </div>

              <div>
                <h4 className="font-medium">Monthly Accrual</h4>
                <p className="text-sm text-muted-foreground">
                  Leave days accrue monthly (e.g., 2 days per month for 24 annual days)
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="font-medium">Anniversary Based</h4>
                <p className="text-sm text-muted-foreground">
                  Leave days granted on employee's join anniversary date each year
                </p>
              </div>

              <div>
                <h4 className="font-medium">Custom</h4>
                <p className="text-sm text-muted-foreground">
                  Custom accrual logic that needs to be implemented separately
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

export default LeaveEntitlementRules;
