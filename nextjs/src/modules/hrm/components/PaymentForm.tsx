"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CreditCard,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Calendar,
  Building,
  FileText,
  Save,
  X
} from 'lucide-react';
import { PaymentFormProps } from '../types';
import { getPaymentMethodOptions } from '../data/payroll-data';

const PaymentForm: React.FC<PaymentFormProps> = ({
  selectedEmployees,
  selectedPayrollRecords,
  onSubmit,
  onCancel,
  loading = false
}) => {
  const [formData, setFormData] = useState({
    payroll_period_id: selectedPayrollRecords[0]?.payroll_period_id || 1,
    employee_ids: selectedEmployees.map(emp => emp.id),
    payment_method: 'bank_transfer' as 'bank_transfer' | 'check' | 'cash' | 'other',
    payment_date: new Date().toISOString().split('T')[0],
    bank_account_number: '',
    bank_name: '',
    check_number: '',
    notes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [bankVerificationStatus, setBankVerificationStatus] = useState<'idle' | 'verifying' | 'verified' | 'failed'>('idle');

  const paymentMethodOptions = getPaymentMethodOptions();

  const totalAmount = selectedPayrollRecords.reduce((sum, record) => sum + record.net_salary, 0);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.payment_method) {
      newErrors.payment_method = 'Payment method is required';
    }

    if (!formData.payment_date) {
      newErrors.payment_date = 'Payment date is required';
    }

    // Bank transfer specific validation
    if (formData.payment_method === 'bank_transfer') {
      if (!formData.bank_account_number.trim()) {
        newErrors.bank_account_number = 'Bank account number is required';
      } else if (formData.bank_account_number.length < 10) {
        newErrors.bank_account_number = 'Bank account number must be at least 10 digits';
      }

      if (!formData.bank_name.trim()) {
        newErrors.bank_name = 'Bank name is required';
      }
    }

    // Check specific validation
    if (formData.payment_method === 'check') {
      if (!formData.check_number.trim()) {
        newErrors.check_number = 'Check number is required';
      }
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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleBankVerification = async () => {
    if (!formData.bank_account_number || !formData.bank_name) {
      return;
    }

    setBankVerificationStatus('verifying');

    // Simulate bank verification API call
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock verification result (90% success rate)
    const isValid = Math.random() > 0.1;

    setBankVerificationStatus(isValid ? 'verified' : 'failed');
  };

  const getBankVerificationDisplay = () => {
    switch (bankVerificationStatus) {
      case 'verifying':
        return (
          <div className="flex items-center gap-2 text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm">Verifying bank details...</span>
          </div>
        );
      case 'verified':
        return (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm">Bank details verified</span>
          </div>
        );
      case 'failed':
        return (
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Bank verification failed</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Payment Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Summary
          </CardTitle>
          <CardDescription>
            Processing payments for {selectedEmployees.length} employees
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{selectedEmployees.length}</div>
              <div className="text-sm text-muted-foreground">Employees</div>
            </div>

            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                PKR {totalAmount.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Total Amount</div>
            </div>

            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                PKR {(totalAmount / selectedEmployees.length).toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Avg. per Employee</div>
            </div>

            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-lg font-bold text-orange-600">
                {formData.payment_method.replace('_', ' ').toUpperCase()}
              </div>
              <div className="text-sm text-muted-foreground">Payment Method</div>
            </div>
          </div>

          {/* Selected Employees List */}
          <div className="mt-4 space-y-2">
            <Label className="text-base font-medium">Selected Employees:</Label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {selectedEmployees.map(employee => (
                <Badge key={employee.id} variant="secondary" className="text-xs">
                  {employee.full_name} - PKR {selectedPayrollRecords.find(r => r.employee_id === employee.id)?.net_salary.toLocaleString()}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Method Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment Method</CardTitle>
          <CardDescription>
            Choose how to process these payments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="payment_method">Payment Method *</Label>
            <Select value={formData.payment_method} onValueChange={(value) => handleInputChange('payment_method', value)}>
              <SelectTrigger className={errors.payment_method ? 'border-destructive' : ''}>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                {paymentMethodOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.payment_method && (
              <p className="text-sm text-destructive">{errors.payment_method}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_date">Payment Date *</Label>
            <Input
              id="payment_date"
              type="date"
              value={formData.payment_date}
              onChange={(e) => handleInputChange('payment_date', e.target.value)}
              className={errors.payment_date ? 'border-destructive' : ''}
            />
            {errors.payment_date && (
              <p className="text-sm text-destructive">{errors.payment_date}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment Method Specific Fields */}
      {formData.payment_method === 'bank_transfer' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building className="h-5 w-5" />
              Bank Transfer Details
            </CardTitle>
            <CardDescription>
              Provide bank account information for processing transfers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bank_account_number">Bank Account Number *</Label>
                <Input
                  id="bank_account_number"
                  value={formData.bank_account_number}
                  onChange={(e) => handleInputChange('bank_account_number', e.target.value)}
                  placeholder="1234567890123456"
                  className={errors.bank_account_number ? 'border-destructive' : ''}
                />
                {errors.bank_account_number && (
                  <p className="text-sm text-destructive">{errors.bank_account_number}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bank_name">Bank Name *</Label>
                <Input
                  id="bank_name"
                  value={formData.bank_name}
                  onChange={(e) => handleInputChange('bank_name', e.target.value)}
                  placeholder="Habib Bank Limited"
                  className={errors.bank_name ? 'border-destructive' : ''}
                />
                {errors.bank_name && (
                  <p className="text-sm text-destructive">{errors.bank_name}</p>
                )}
              </div>
            </div>

            {/* Bank Verification */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Bank Account Verification</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleBankVerification}
                  disabled={bankVerificationStatus === 'verifying' || !formData.bank_account_number || !formData.bank_name}
                >
                  {bankVerificationStatus === 'verifying' ? 'Verifying...' : 'Verify Account'}
                </Button>
              </div>

              {getBankVerificationDisplay() && (
                <Alert>
                  <AlertDescription>
                    {getBankVerificationDisplay()}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {formData.payment_method === 'check' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Check Payment Details
            </CardTitle>
            <CardDescription>
              Provide check information for payment processing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="check_number">Check Number *</Label>
              <Input
                id="check_number"
                value={formData.check_number}
                onChange={(e) => handleInputChange('check_number', e.target.value)}
                placeholder="CHK-001234"
                className={errors.check_number ? 'border-destructive' : ''}
              />
              {errors.check_number && (
                <p className="text-sm text-destructive">{errors.check_number}</p>
              )}
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Checks will be issued with individual employee amounts. Please ensure sufficient check stock is available.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {formData.payment_method === 'cash' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cash Payment</CardTitle>
            <CardDescription>
              Cash payments require physical handover to employees
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Cash payments should be processed through authorized personnel only. Please ensure proper receipt and documentation.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Additional Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Additional Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notes">Payment Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Any additional notes or instructions for this payment batch..."
              rows={3}
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
        <Button type="submit" disabled={loading || bankVerificationStatus === 'failed'}>
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Processing...' : 'Process Payments'}
        </Button>
      </div>
    </form>
  );
};

export default PaymentForm;
