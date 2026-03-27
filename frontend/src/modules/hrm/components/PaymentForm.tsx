"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  CreditCard,
  AlertCircle,
  Building,
  FileText,
  Save,
  X,
  Landmark,
  Loader2,
} from 'lucide-react';
import { PaymentFormProps, PayrollPaymentAccountPreview } from '../types';
import { getPaymentMethodOptions } from '../data/payroll-data';
import { HRMApiService } from '../services/hrm-api';

const formatCurrency = (amount: number, currency: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);

const PaymentForm: React.FC<PaymentFormProps> = ({
  selectedEmployees,
  selectedPayrollRecords,
  onSubmit,
  onCancel,
  loading = false,
  currency = "USD"
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
  const [accountPreview, setAccountPreview] = useState<PayrollPaymentAccountPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      payroll_period_id: selectedPayrollRecords[0]?.payroll_period_id ?? prev.payroll_period_id,
      employee_ids: selectedEmployees.map((e) => e.id),
    }));
  }, [selectedEmployees, selectedPayrollRecords]);

  useEffect(() => {
    let cancelled = false;
    const method = formData.payment_method;
    setPreviewLoading(true);
    setPreviewError(null);
    HRMApiService.getPayrollPaymentAccountPreview(method)
      .then((res) => {
        if (!cancelled) {
          setAccountPreview(res.preview);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setAccountPreview(null);
          setPreviewError(err instanceof Error ? err.message : 'Could not load account preview');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setPreviewLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [formData.payment_method]);

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
                {formatCurrency(totalAmount, currency)}
              </div>
              <div className="text-sm text-muted-foreground">Total Amount</div>
            </div>

            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(totalAmount / selectedEmployees.length, currency)}
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

          <div className="mt-4 space-y-2">
            <Label className="text-base font-medium">Employees in this batch</Label>
            <div className="rounded-md border max-h-[min(40vh,320px)] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead className="hidden sm:table-cell">ID</TableHead>
                    <TableHead className="text-right">Net pay</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedEmployees.map((employee) => {
                    const net =
                      selectedPayrollRecords.find((r) => r.employee_id === employee.id)?.net_salary ?? 0;
                    const name =
                      employee.full_name ||
                      `${employee.first_name || ""} ${employee.last_name || ""}`.trim() ||
                      `#${employee.id}`;
                    return (
                      <TableRow key={employee.id}>
                        <TableCell className="font-medium">{name}</TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                          {employee.employee_id}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(Number(net) || 0, currency)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
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

          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Landmark className="h-4 w-4 shrink-0" />
              Accounts posting (preview)
            </div>
            <p className="text-xs text-muted-foreground">
              When you submit, a payment voucher uses the total net pay for this batch. Debit and credit accounts are
              resolved from your chart of accounts (Salaries/Payroll expense; Cash for cash payments, Bank otherwise).
            </p>
            {previewLoading && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                Loading chart accounts…
              </p>
            )}
            {!previewLoading && previewError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{previewError}</AlertDescription>
              </Alert>
            )}
            {!previewLoading && !previewError && accountPreview && !accountPreview.accounts_module_available && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Accounts module is not available. Payments are saved in HR only; no accounting voucher is created.
                </AlertDescription>
              </Alert>
            )}
            {!previewLoading && !previewError && accountPreview?.accounts_module_available && !accountPreview.ready && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Chart of accounts needs setup</AlertTitle>
                <AlertDescription className="space-y-3">
                  {accountPreview.warning ? (
                    <p className="text-sm opacity-90">{accountPreview.warning}</p>
                  ) : null}
                  <ul className="text-sm space-y-1 rounded-md border bg-background/50 px-3 py-2">
                    <li>
                      <span className="text-muted-foreground">Debit (payroll expense): </span>
                      {accountPreview.missing_payroll_expense_account ? (
                        <span className="font-medium">missing</span>
                      ) : (
                        <span>
                          {accountPreview.debit?.name}{" "}
                          <span className="text-muted-foreground">({accountPreview.debit?.code})</span>
                        </span>
                      )}
                    </li>
                    <li>
                      <span className="text-muted-foreground">
                        Credit ({accountPreview.credit_side === "cash" ? "cash" : "bank"}):{" "}
                      </span>
                      {accountPreview.missing_payment_account ? (
                        <span className="font-medium">missing</span>
                      ) : (
                        <span>
                          {accountPreview.credit?.name}{" "}
                          <span className="text-muted-foreground">({accountPreview.credit?.code})</span>
                        </span>
                      )}
                    </li>
                  </ul>
                  {accountPreview.setup_steps && accountPreview.setup_steps.length > 0 ? (
                    <div>
                      <p className="text-sm font-medium">
                        How to fix — add accounts under Chart of accounts:
                      </p>
                      <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm leading-relaxed">
                        {accountPreview.setup_steps.map((step, idx) => (
                          <li key={idx}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  ) : null}
                </AlertDescription>
              </Alert>
            )}
            {!previewLoading && !previewError && accountPreview?.ready && accountPreview.debit && accountPreview.credit && (
              <div className="rounded-md border bg-background text-sm space-y-2 p-3">
                <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between">
                  <span className="text-muted-foreground shrink-0">Debit</span>
                  <span className="font-medium text-right">
                    {accountPreview.debit.name}{" "}
                    <span className="text-muted-foreground font-normal">({accountPreview.debit.code})</span>
                  </span>
                </div>
                <div className="text-xs text-muted-foreground pl-0 sm:pl-0">
                  Payroll expense — {formatCurrency(totalAmount, currency)} (Σ net pay)
                </div>
                <div className="border-t pt-2 flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between">
                  <span className="text-muted-foreground shrink-0">Credit</span>
                  <span className="font-medium text-right">
                    {accountPreview.credit.name}{" "}
                    <span className="text-muted-foreground font-normal">({accountPreview.credit.code})</span>
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {accountPreview.credit_side === "cash" ? "Cash" : "Bank"} — {formatCurrency(totalAmount, currency)}
                </div>
              </div>
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
          Back to selection
        </Button>
        <Button type="submit" disabled={loading}>
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Processing...' : 'Process Payments'}
        </Button>
      </div>
    </form>
  );
};

export default PaymentForm;
