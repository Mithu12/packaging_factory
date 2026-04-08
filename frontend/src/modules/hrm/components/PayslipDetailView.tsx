"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle,
  Clock,
  AlertCircle,
  Calendar,
  TrendingUp,
  TrendingDown,
  User,
  Building,
} from "lucide-react";
import type { Employee, EmployeePayrollRecord, PaymentRecord } from "../types";

const formatCurrency = (amount: number, currency: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);

function employeeDisplayName(emp: Employee) {
  const n = (emp.full_name || `${emp.first_name || ""} ${emp.last_name || ""}`).trim();
  return n || `Employee #${emp.id}`;
}

export interface PayslipDetailViewProps {
  employee: Employee;
  payrollRecord: EmployeePayrollRecord;
  paymentRecord?: PaymentRecord | null;
  currency: string;
  /** Optional period title (shown under header when provided) */
  periodLabel?: string;
  /** Checkbox or spacer rendered left of the name row */
  leading?: React.ReactNode;
  /** Bottom row (e.g. View / Download on list cards). Omit in modal. */
  footerActions?: React.ReactNode;
  className?: string;
}

/**
 * Shared payslip layout: matches EmployeePayrollCard body (earnings / deductions / net / payment).
 * Used on payslip cards, details modal, and print.
 */
const PayslipDetailView: React.FC<PayslipDetailViewProps> = ({
  employee,
  payrollRecord,
  paymentRecord,
  currency,
  periodLabel,
  leading,
  footerActions,
  className = "",
}) => {
  /** Backend payroll_details uses tax_deduction / loan_deductions / overtime_amount */
  const incomeTaxDisplay =
    Number(
      payrollRecord.income_tax ??
        payrollRecord.tax_deduction ??
        0
    ) || 0;
  const loanDeductionDisplay =
    Number(
      payrollRecord.loan_deduction ??
        payrollRecord.loan_deductions ??
        0
    ) || 0;
  const overtimeDisplay =
    Number(
      payrollRecord.overtime_pay ??
        payrollRecord.overtime_amount ??
        0
    ) || 0;
  const leaveDeductionDisplay = Number(payrollRecord.leave_deductions) || 0;

  const getStatusBadge = () => {
    if (paymentRecord?.status === "completed") {
      return (
        <Badge variant="default" className="bg-green-100 text-green-800">
          <CheckCircle className="h-3 w-3 mr-1" />
          Paid
        </Badge>
      );
    }
    if (paymentRecord?.status === "pending") {
      return (
        <Badge variant="secondary">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      );
    }
    if (paymentRecord?.status === "failed") {
      return (
        <Badge variant="destructive">
          <AlertCircle className="h-3 w-3 mr-1" />
          Failed
        </Badge>
      );
    }
    if (payrollRecord?.status === "calculated") {
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
      bank_transfer: "Bank Transfer",
      check: "Check",
      cash: "Cash",
      other: "Other",
    };
    return (
      <Badge variant="outline" className="text-xs">
        {methodLabels[paymentRecord.payment_method as keyof typeof methodLabels]}
      </Badge>
    );
  };

  return (
    <div
      className={`rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden payslip-detail-view ${className}`}
    >
      <div className="p-4 pb-3 border-b border-border">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 min-w-0">
            {leading != null ? <div className="shrink-0 pt-0.5">{leading}</div> : null}
            <div className="min-w-0">
              <h3 className="text-lg font-semibold leading-tight">{employeeDisplayName(employee)}</h3>
              <p className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                <span>{employee.employee_id ?? employee.id}</span>
                {employee.designation?.title ? (
                  <>
                    <span aria-hidden>•</span>
                    <span>{employee.designation.title}</span>
                  </>
                ) : null}
              </p>
              {periodLabel ? (
                <p className="text-xs text-muted-foreground mt-1">{periodLabel}</p>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
            {getStatusBadge()}
            {getPaymentMethodBadge()}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 min-w-0">
            <Building className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground shrink-0">Department:</span>
            <span className="font-medium truncate">{employee.department?.name ?? "—"}</span>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <User className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground shrink-0">Type:</span>
            <Badge variant="outline" className="text-xs capitalize">
              {employee.employment_type ?? "—"}
            </Badge>
          </div>
        </div>

        {payrollRecord && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Salary Breakdown</h4>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-green-600">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm font-medium">Earnings</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Basic Salary:</span>
                    <span className="font-medium tabular-nums">
                      {formatCurrency(Number(payrollRecord.basic_salary) || 0, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">HRA:</span>
                    <span className="font-medium tabular-nums">
                      {formatCurrency(Number(payrollRecord.house_rent_allowance) || 0, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Transport:</span>
                    <span className="font-medium tabular-nums">
                      {formatCurrency(Number(payrollRecord.transport_allowance) || 0, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Medical:</span>
                    <span className="font-medium tabular-nums">
                      {formatCurrency(Number(payrollRecord.medical_allowance) || 0, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Bonus:</span>
                    <span className="font-medium tabular-nums">
                      {formatCurrency(Number(payrollRecord.bonus) || 0, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Overtime:</span>
                    <span className="font-medium tabular-nums">
                      {formatCurrency(overtimeDisplay, currency)}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-medium">Total Earnings:</span>
                  <span className="font-bold text-green-600 tabular-nums">
                    {formatCurrency(Number(payrollRecord.total_earnings) || 0, currency)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-red-600">
                  <TrendingDown className="h-4 w-4" />
                  <span className="text-sm font-medium">Deductions</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Income Tax:</span>
                    <span className="font-medium tabular-nums">
                      {formatCurrency(incomeTaxDisplay, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Provident Fund:</span>
                    <span className="font-medium tabular-nums">
                      {formatCurrency(Number(payrollRecord.provident_fund) || 0, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Insurance:</span>
                    <span className="font-medium tabular-nums">
                      {formatCurrency(Number(payrollRecord.insurance) || 0, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Advance Salary / Loan:</span>
                    <span className="font-medium tabular-nums">
                      {formatCurrency(loanDeductionDisplay, currency)}
                    </span>
                  </div>
                  {leaveDeductionDisplay > 0 ? (
                    <div className="flex justify-between gap-2 col-span-2">
                      <span className="text-muted-foreground">Leave deduction:</span>
                      <span className="font-medium tabular-nums">
                        {formatCurrency(leaveDeductionDisplay, currency)}
                      </span>
                    </div>
                  ) : null}
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-medium">Total Deductions:</span>
                  <span className="font-bold text-red-600 tabular-nums">
                    {formatCurrency(Number(payrollRecord.total_deductions) || 0, currency)}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t-2 border-primary">
                <span className="text-lg font-bold">Net Salary:</span>
                <span className="text-xl font-bold text-primary tabular-nums">
                  {formatCurrency(Number(payrollRecord.net_salary) || 0, currency)}
                </span>
              </div>
            </div>
          </>
        )}

        {paymentRecord && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Payment Information</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Payment Date:</span>
                  <span className="font-medium">
                    {new Date(paymentRecord.payment_date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-medium tabular-nums">
                    {formatCurrency(Number(paymentRecord.amount) || 0, currency)}
                  </span>
                </div>
                {paymentRecord.transaction_reference ? (
                  <div className="flex justify-between col-span-2 gap-2">
                    <span className="text-muted-foreground">Transaction Ref:</span>
                    <span className="font-mono text-xs text-right break-all">
                      {paymentRecord.transaction_reference}
                    </span>
                  </div>
                ) : null}
                {paymentRecord.bank_name ? (
                  <div className="flex justify-between col-span-2 gap-2">
                    <span className="text-muted-foreground">Bank:</span>
                    <span className="font-medium">{paymentRecord.bank_name}</span>
                  </div>
                ) : null}
              </div>
            </div>
          </>
        )}

        {footerActions ? (
          <div className="flex justify-between pt-2 print:hidden">{footerActions}</div>
        ) : null}
      </div>
    </div>
  );
};

export default PayslipDetailView;
