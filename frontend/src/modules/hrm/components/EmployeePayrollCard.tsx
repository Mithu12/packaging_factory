"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  Eye,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  DollarSign,
  TrendingUp,
  TrendingDown,
  User,
  Building,
  Calendar
} from 'lucide-react';
import { EmployeePayrollCardProps } from '../types';

const formatCurrency = (amount: number, currency: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);

const EmployeePayrollCard: React.FC<EmployeePayrollCardProps> = ({
  employee,
  payrollRecord,
  paymentRecord,
  isSelected = false,
  onSelect,
  onViewPayslip,
  loading = false,
  currency = "USD"
}) => {
  const getStatusBadge = () => {
    if (paymentRecord?.status === 'completed') {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          Paid
        </Badge>
      );
    } else if (paymentRecord?.status === 'pending') {
      return (
        <Badge variant="secondary">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      );
    } else if (paymentRecord?.status === 'failed') {
      return (
        <Badge variant="destructive">
          <AlertCircle className="h-3 w-3 mr-1" />
          Failed
        </Badge>
      );
    } else if (payrollRecord?.status === 'calculated') {
      return (
        <Badge variant="outline">
          <Calendar className="h-3 w-3 mr-1" />
          Calculated
        </Badge>
      );
    }
    return (
      <Badge variant="outline">
        <Clock className="h-3 w-3 mr-1" />
        Draft
      </Badge>
    );
  };

  const getPaymentMethodBadge = () => {
    if (!paymentRecord?.payment_method) return null;

    const methodLabels = {
      bank_transfer: 'Bank Transfer',
      check: 'Check',
      cash: 'Cash',
      other: 'Other'
    };

    return (
      <Badge variant="outline" className="text-xs">
        {methodLabels[paymentRecord.payment_method as keyof typeof methodLabels]}
      </Badge>
    );
  };

  return (
    <Card className={`transition-all ${isSelected ? 'ring-2 ring-primary' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            {onSelect && (
              <Checkbox
                checked={isSelected}
                onCheckedChange={onSelect}
                className="mt-1"
              />
            )}

            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg">{employee.full_name}</CardTitle>
              <CardDescription className="flex items-center gap-2">
                <span>{employee.employee_id}</span>
                <span>•</span>
                <span>{employee.designation?.title}</span>
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {getStatusBadge()}
            {getPaymentMethodBadge()}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Employee Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Department:</span>
            <span className="font-medium">{employee.department?.name}</span>
          </div>

          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Type:</span>
            <Badge variant="outline" className="text-xs">
              {employee.employment_type}
            </Badge>
          </div>
        </div>

        {/* Salary Breakdown */}
        {payrollRecord && (
          <>
            <Separator />

            <div className="space-y-3">
              <h4 className="font-medium text-sm">Salary Breakdown</h4>

              {/* Earnings */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-green-600">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm font-medium">Earnings</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Basic Salary:</span>
                    <span className="font-medium">{formatCurrency(payrollRecord.basic_salary ?? 0, currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">HRA:</span>
                    <span className="font-medium">{formatCurrency(payrollRecord.house_rent_allowance ?? 0, currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Transport:</span>
                    <span className="font-medium">{formatCurrency(payrollRecord.transport_allowance ?? 0, currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Medical:</span>
                    <span className="font-medium">{formatCurrency(payrollRecord.medical_allowance ?? 0, currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bonus:</span>
                    <span className="font-medium">{formatCurrency(payrollRecord.bonus ?? 0, currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Overtime:</span>
                    <span className="font-medium">{formatCurrency(payrollRecord.overtime_pay ?? 0, currency)}</span>
                  </div>
                </div>

                <div className="flex justify-between pt-2 border-t">
                  <span className="font-medium">Total Earnings:</span>
                  <span className="font-bold text-green-600">
                    {formatCurrency(payrollRecord.total_earnings ?? 0, currency)}
                  </span>
                </div>
              </div>

              {/* Deductions */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-red-600">
                  <TrendingDown className="h-4 w-4" />
                  <span className="text-sm font-medium">Deductions</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Income Tax:</span>
                    <span className="font-medium">{formatCurrency(payrollRecord.income_tax ?? 0, currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Provident Fund:</span>
                    <span className="font-medium">{formatCurrency(payrollRecord.provident_fund ?? 0, currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Insurance:</span>
                    <span className="font-medium">{formatCurrency(payrollRecord.insurance ?? 0, currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Advance Salary / Loan:</span>
                    <span className="font-medium">{formatCurrency(payrollRecord.loan_deduction ?? 0, currency)}</span>
                  </div>
                </div>

                <div className="flex justify-between pt-2 border-t">
                  <span className="font-medium">Total Deductions:</span>
                  <span className="font-bold text-red-600">
                    {formatCurrency(payrollRecord.total_deductions ?? 0, currency)}
                  </span>
                </div>
              </div>

              {/* Net Salary */}
              <div className="flex justify-between items-center pt-3 border-t-2 border-primary">
                <span className="text-lg font-bold">Net Salary:</span>
                <span className="text-xl font-bold text-primary">
                  {formatCurrency(payrollRecord.net_salary ?? 0, currency)}
                </span>
              </div>
            </div>
          </>
        )}

        {/* Payment Information */}
        {paymentRecord && (
          <>
            <Separator />

            <div className="space-y-2">
              <h4 className="font-medium text-sm">Payment Information</h4>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Date:</span>
                  <span className="font-medium">
                    {new Date(paymentRecord.payment_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-medium">
                    {formatCurrency(paymentRecord.amount ?? 0, currency)}
                  </span>
                </div>

                {paymentRecord.transaction_reference && (
                  <div className="flex justify-between col-span-2">
                    <span className="text-muted-foreground">Transaction Ref:</span>
                    <span className="font-mono text-xs">
                      {paymentRecord.transaction_reference}
                    </span>
                  </div>
                )}

                {paymentRecord.bank_name && (
                  <div className="flex justify-between col-span-2">
                    <span className="text-muted-foreground">Bank:</span>
                    <span className="font-medium">{paymentRecord.bank_name}</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between pt-2">
          <Button variant="outline" size="sm" onClick={onViewPayslip}>
            <Eye className="h-4 w-4 mr-2" />
            View Payslip
          </Button>

          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmployeePayrollCard;
