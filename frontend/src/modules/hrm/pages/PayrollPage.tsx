"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calculator,
  CreditCard,
  Eye,
  DollarSign,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Receipt,
  Plus,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  Employee,
  EmployeePayrollRecord,
  PaymentRecord,
  PayrollPickerRow,
} from "../types";
import PayrollCalculator from "../components/PayrollCalculator";
import PayrollEmployeePicker from "../components/PayrollEmployeePicker";
import PaymentForm from "../components/PaymentForm";
import PayrollHistory from "../components/PayrollHistory";
import PayslipPreviewDialog from "../components/PayslipPreviewDialog";
import { HRMApiService } from "../services/hrm-api";
import { SettingsApi } from "@/services/settings-api";
import { useToast } from "@/components/ui/use-toast";

const formatCurrencyWith = (currency: string) => (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);

function employeeDisplayName(emp: { full_name?: string; first_name?: string; last_name?: string; id: number }) {
  const n = (emp.full_name || `${emp.first_name || ""} ${emp.last_name || ""}`).trim();
  return n || `Employee #${emp.id}`;
}

const PayrollPage: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("payroll");
  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);
  const [paymentSelectedEmployeeIds, setPaymentSelectedEmployeeIds] = useState<number[]>([]);
  const [payslipSelectedEmployeeIds, setPayslipSelectedEmployeeIds] = useState<number[]>([]);
  const [payslipPreviewOpen, setPayslipPreviewOpen] = useState(false);
  const [payslipPreviewEmployee, setPayslipPreviewEmployee] = useState<Employee | null>(null);
  const [payslipPreviewRecord, setPayslipPreviewRecord] = useState<EmployeePayrollRecord | null>(null);
  const [payslipPreviewPaymentRecord, setPayslipPreviewPaymentRecord] = useState<PaymentRecord | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currency, setCurrency] = useState("USD");
  const [payrollPeriods, setPayrollPeriods] = useState<any[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [showCreatePeriodDialog, setShowCreatePeriodDialog] = useState(false);
  const [newPeriod, setNewPeriod] = useState({
    name: "",
    start_date: "",
    end_date: "",
    period_type: "monthly" as const,
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [periodsRes, empsRes, deptsRes, systemSettings] = await Promise.all([
        HRMApiService.getPayrollPeriods(),
        HRMApiService.getEmployees({ limit: 500 }),
        HRMApiService.getDepartments(),
        SettingsApi.getSystemSettings().catch(() => ({ default_currency: "usd" })),
      ]);
      const periods = periodsRes.periods || [];
      setPayrollPeriods(periods);
      setEmployees(empsRes.employees || []);
      setDepartments(deptsRes.departments || []);
      setCurrency(((systemSettings?.default_currency as string) || "USD").toUpperCase());
      if (periods.length > 0 && !selectedPeriodId) {
        setSelectedPeriodId(periods[0].id.toString());
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to load payroll data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPayrollRecords = useCallback(async (periodId: string) => {
    if (!periodId) return;
    try {
      const res = await HRMApiService.getPayrollRuns({ payroll_period_id: parseInt(periodId) });
      setPayrollRecords(res.runs || []);
    } catch (err) {
      // Period may not have runs yet
      setPayrollRecords([]);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { if (selectedPeriodId) loadPayrollRecords(selectedPeriodId); }, [selectedPeriodId, loadPayrollRecords]);

  useEffect(() => {
    setPaymentSelectedEmployeeIds([]);
    setPayslipSelectedEmployeeIds([]);
    setPayslipPreviewOpen(false);
    setPayslipPreviewEmployee(null);
    setPayslipPreviewRecord(null);
    setPayslipPreviewPaymentRecord(null);
    setShowPaymentForm(false);
  }, [selectedPeriodId]);

  const payrollByEmployee = useMemo(() => {
    const m = new Map<number, { status: string; net_salary: number }>();
    for (const r of payrollRecords) {
      m.set(r.employee_id, {
        status: String(r.status || ""),
        net_salary: parseFloat(String(r.net_salary)) || 0,
      });
    }
    return m;
  }, [payrollRecords]);

  const calculatorPickerRows: PayrollPickerRow[] = useMemo(() => {
    return employees.map((emp) => {
      const pr = payrollByEmployee.get(emp.id);
      return {
        employeeId: emp.id,
        displayName: employeeDisplayName(emp),
        employeeCode: String(emp.employee_id ?? emp.id),
        departmentLabel: emp.department?.name || "—",
        designationLabel: emp.designation?.title || "—",
        netSalary: pr?.net_salary,
        payrollStatus: pr?.status,
      };
    });
  }, [employees, payrollByEmployee]);

  const paymentPickerRows: PayrollPickerRow[] = useMemo(() => {
    const out: PayrollPickerRow[] = [];
    for (const r of payrollRecords) {
      if (r.status === "paid" || r.status === "cancelled") continue;
      const emp = employees.find((e) => e.id === r.employee_id);
      if (!emp) continue;
      out.push({
        employeeId: emp.id,
        displayName: employeeDisplayName(emp),
        employeeCode: String(emp.employee_id ?? emp.id),
        departmentLabel: emp.department?.name || "—",
        designationLabel: emp.designation?.title || "—",
        netSalary: parseFloat(String(r.net_salary)) || 0,
        payrollStatus: String(r.status || ""),
      });
    }
    return out;
  }, [payrollRecords, employees]);

  const payslipPickerRows: PayrollPickerRow[] = useMemo(() => {
    const out: PayrollPickerRow[] = [];
    for (const r of payrollRecords) {
      const emp = employees.find((e) => e.id === r.employee_id);
      if (!emp) continue;
      out.push({
        employeeId: emp.id,
        displayName: employeeDisplayName(emp),
        employeeCode: String(emp.employee_id ?? emp.id),
        departmentLabel: emp.department?.name || "—",
        designationLabel: emp.designation?.title || "—",
        netSalary: parseFloat(String(r.net_salary)) || 0,
        payrollStatus: String(r.status || ""),
      });
    }
    return out;
  }, [payrollRecords, employees]);

  const currentPeriod = payrollPeriods.find(
    (p) => p.id.toString() === selectedPeriodId
  );
  const currentPayrollRecords = payrollRecords;

  // Derive payment records from payroll_details (no separate payroll payments table)
  const currentPaymentRecords: PaymentRecord[] = currentPayrollRecords.map((pr: any) => ({
    id: pr.id,
    employee_id: pr.employee_id,
    payroll_period_id: pr.payroll_period_id || parseInt(selectedPeriodId || "0"),
    amount: parseFloat(pr.net_salary || 0),
    payment_method: "other",
    payment_date: pr.payment_date || pr.approved_at || pr.created_at || new Date().toISOString(),
    status: pr.status === "paid" ? "completed" : pr.status === "cancelled" ? "cancelled" : "pending",
    transaction_reference: pr.payment_reference || "",
    check_number: "",
    payroll_record_id: pr.id,
    created_by: 0,
    created_at: pr.created_at || new Date().toISOString(),
    updated_at: pr.updated_at || new Date().toISOString(),
  }));

  const handleCalculatePayroll = async (data: any) => {
    const periodId = parseInt(selectedPeriodId, 10);
    if (!selectedPeriodId || isNaN(periodId)) {
      toast({
        title: "Error",
        description: "Select a payroll period first",
        variant: "destructive",
      });
      return;
    }
    try {
      setLoading(true);
      await HRMApiService.calculatePayroll({
        payroll_period_id: periodId,
        employee_ids: data.employee_ids || [],
      });
      toast({ title: "Success", description: "Payroll calculated" });
      await loadPayrollRecords(selectedPeriodId);
    } catch (err) {
      toast({ title: "Error", description: "Failed to calculate payroll", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayments = async (data: any) => {
    const runId = currentPayrollRecords[0]?.payroll_run_id as number | undefined;
    if (!runId) {
      toast({
        title: "Error",
        description: "Calculate payroll for this period first (no payroll run found).",
        variant: "destructive",
      });
      return;
    }
    const employeeIds: number[] = Array.isArray(data.employee_ids) ? data.employee_ids : [];
    if (employeeIds.length === 0) {
      toast({
        title: "Error",
        description: "Select at least one employee to pay.",
        variant: "destructive",
      });
      return;
    }
    try {
      setLoading(true);
      const payRes = await HRMApiService.processPayrollPayments(runId, {
        employee_ids: employeeIds,
        payment_method: data.payment_method,
        payment_date: data.payment_date,
        bank_account_number: data.bank_account_number,
        bank_name: data.bank_name,
        check_number: data.check_number,
        notes: data.notes,
      });
      let payDesc = "Payments recorded.";
      if (payRes.voucher_no) {
        payDesc += ` Accounts voucher ${payRes.voucher_no}.`;
      }
      if (payRes.voucher_warning) {
        payDesc += ` ${payRes.voucher_warning}`;
      }
      toast({ title: "Success", description: payDesc });
      setShowPaymentForm(false);
      await loadPayrollRecords(selectedPeriodId);
    } catch (err: any) {
      const msg =
        err?.message ||
        (typeof err === "object" && err !== null && "error" in err && String((err as { error?: string }).error)) ||
        "Failed to process payments";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async (format: "excel" | "pdf", filters?: any) => {
    try {
      setLoading(true);
      const blob = await HRMApiService.exportPayroll(parseInt(selectedPeriodId), format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const periodName = (currentPeriod?.name || `period-${selectedPeriodId}`).replace(/[^a-zA-Z0-9-_]/g, "_");
      const dateStr = new Date().toISOString().slice(0, 10);
      a.download = `salary-sheet-${periodName}-${dateStr}.${format === "excel" ? "xlsx" : "pdf"}`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast({ title: "Success", description: "Salary sheet exported successfully" });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Export failed. Calculate payroll for this period first.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePayslips = (_employeeIds: number[]) => {
    if (!selectedPeriodId) {
      toast({ title: "Error", description: "Select a payroll period first", variant: "destructive" });
      return;
    }
    handleExportData("excel");
  };

  const openPayslipForEmployee = (employeeId: number) => {
    const emp = employees.find((e) => e.id === employeeId) as Employee | undefined;
    const rec = currentPayrollRecords.find(
      (r: EmployeePayrollRecord) => r.employee_id === employeeId
    ) as EmployeePayrollRecord | undefined;
    if (!emp || !rec) {
      toast({
        title: "Payslip unavailable",
        description: "No payroll record for this employee in the selected period.",
        variant: "destructive",
      });
      return;
    }
    const pay = currentPaymentRecords.find((p) => p.employee_id === employeeId) ?? null;
    setPayslipPreviewEmployee(emp);
    setPayslipPreviewRecord(rec);
    setPayslipPreviewPaymentRecord(pay);
    setPayslipPreviewOpen(true);
  };

  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPeriod.name || !newPeriod.start_date || !newPeriod.end_date) {
      toast({ title: "Error", description: "Fill in all required fields", variant: "destructive" });
      return;
    }
    if (newPeriod.start_date > newPeriod.end_date) {
      toast({ title: "Error", description: "End date must be after start date", variant: "destructive" });
      return;
    }
    try {
      setLoading(true);
      await HRMApiService.createPayrollPeriod({
        name: newPeriod.name,
        start_date: newPeriod.start_date,
        end_date: newPeriod.end_date,
        period_type: newPeriod.period_type,
      });
      toast({ title: "Success", description: "Payroll period created" });
      setShowCreatePeriodDialog(false);
      setNewPeriod({ name: "", start_date: "", end_date: "", period_type: "monthly" });
      await loadData();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to create period",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const suggestPeriodFromMonth = (month: number, year: number) => {
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    setNewPeriod((prev) => ({
      ...prev,
      name: `${monthNames[month - 1]} ${year}`,
      start_date: start.toISOString().slice(0, 10),
      end_date: end.toISOString().slice(0, 10),
    }));
  };

  // Calculate summary statistics
  const summaryStats = {
    totalEmployees: currentPayrollRecords.length || employees.length,
    totalGrossSalary: currentPayrollRecords.reduce(
      (sum: number, record: any) => sum + parseFloat(record.total_earnings || 0),
      0
    ),
    totalDeductions: currentPayrollRecords.reduce(
      (sum: number, record: any) => sum + parseFloat(record.total_deductions || 0),
      0
    ),
    totalNetSalary: currentPayrollRecords.reduce(
      (sum: number, record: any) => sum + parseFloat(record.net_salary || 0),
      0
    ),
    paidEmployees: currentPaymentRecords.filter((p: any) => p.status === "completed").length,
    pendingPayments: currentPaymentRecords.filter((p: any) => p.status === "pending").length,
    failedPayments: currentPaymentRecords.filter((p: any) => p.status === "failed" || p.status === "cancelled").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Payroll & Payments</h1>
        <p className="text-muted-foreground mt-1 max-w-2xl">
          Choose a period, then work through the tabs: calculate salaries, mark payments, print payslips, or review
          history.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 shrink-0 text-muted-foreground" />
                Period & overview
              </CardTitle>
              <CardDescription className="mt-1">
                Figures update for the payroll period you select. Create a new period with the + button if needed.
              </CardDescription>
            </div>
            {currentPeriod && (
              <Badge variant="secondary" className="w-fit shrink-0">
                {currentPeriod.name}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-8">
            <div className="space-y-2 shrink-0">
              <label htmlFor="payroll-period-select" className="text-sm font-medium text-muted-foreground">
                Active period
              </label>
              <div className="flex gap-2">
                <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
                  <SelectTrigger id="payroll-period-select" className="w-[min(100vw-8rem,280px)]">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    {payrollPeriods.map((period) => (
                      <SelectItem key={period.id} value={period.id.toString()}>
                        {period.name} — {period.status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="quickAdd"
                  size="icon"
                  onClick={() => {
                    const now = new Date();
                    suggestPeriodFromMonth(now.getMonth() + 1, now.getFullYear());
                    setShowCreatePeriodDialog(true);
                  }}
                  title="Add new payroll period"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {payrollPeriods.length === 0 && (
                <p className="text-sm text-muted-foreground">No periods yet. Click + to create one.</p>
              )}
            </div>

            {currentPeriod && (
              <div className="min-w-0 flex-1 space-y-2 border-t lg:border-t-0 lg:border-l lg:pl-8 pt-4 lg:pt-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Totals & payment status
                </p>
                <div className="flex flex-wrap gap-x-8 gap-y-4 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">Employees</div>
                    <div className="font-semibold tabular-nums">{summaryStats.totalEmployees}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Gross</div>
                    <div className="font-semibold tabular-nums text-green-600 dark:text-green-500">
                      {formatCurrencyWith(currency)(summaryStats.totalGrossSalary)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Deductions</div>
                    <div className="font-semibold tabular-nums text-red-600 dark:text-red-500">
                      {formatCurrencyWith(currency)(summaryStats.totalDeductions)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Net</div>
                    <div className="font-semibold tabular-nums text-blue-600 dark:text-blue-500">
                      {formatCurrencyWith(currency)(summaryStats.totalNetSalary)}
                    </div>
                  </div>
                  <div className="hidden sm:block w-px bg-border self-stretch min-h-[2.25rem]" aria-hidden />
                  <div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                      Paid
                    </div>
                    <div className="font-semibold tabular-nums text-green-600 dark:text-green-500">
                      {summaryStats.paidEmployees}
                      <span className="text-muted-foreground font-normal text-xs">
                        {" "}
                        / {summaryStats.totalEmployees}
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3 text-orange-600" />
                      Pending
                    </div>
                    <div className="font-semibold tabular-nums text-orange-600 dark:text-orange-500">
                      {summaryStats.pendingPayments}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 text-red-600" />
                      Issues
                    </div>
                    <div className="font-semibold tabular-nums text-red-600 dark:text-red-500">
                      {summaryStats.failedPayments}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      Paid %
                    </div>
                    <div className="font-semibold tabular-nums">
                      {summaryStats.totalEmployees > 0
                        ? Math.round(
                            (summaryStats.paidEmployees / summaryStats.totalEmployees) * 100
                          )
                        : 0}
                      %
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 p-1 sm:grid-cols-4">
          <TabsTrigger value="payroll" className="gap-1.5 px-2 py-2 text-xs sm:text-sm">
            <Calculator className="h-4 w-4 shrink-0" />
            <span className="truncate">Calculate</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-1.5 px-2 py-2 text-xs sm:text-sm">
            <CreditCard className="h-4 w-4 shrink-0" />
            <span className="truncate">Pay</span>
          </TabsTrigger>
          <TabsTrigger value="payslips" className="gap-1.5 px-2 py-2 text-xs sm:text-sm">
            <FileText className="h-4 w-4 shrink-0" />
            <span className="truncate">Payslips</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5 px-2 py-2 text-xs sm:text-sm">
            <Receipt className="h-4 w-4 shrink-0" />
            <span className="truncate">History</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payroll" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Run payroll</CardTitle>
              <CardDescription className="mt-1">
                Uses the period selected above. Export the salary sheet from the History tab after you calculate.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <PayrollCalculator
                employees={employees as any}
                selectedEmployeeIds={selectedEmployeeIds}
                onCalculate={handleCalculatePayroll}
                onSelectionChange={setSelectedEmployeeIds}
                onGeneratePayslips={handleGeneratePayslips}
                loading={loading}
                canCalculate={!!selectedPeriodId}
                currency={currency}
                pickerRows={calculatorPickerRows}
                selectedPeriod={currentPeriod ?? null}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Record payments</CardTitle>
              <CardDescription>
                Only employees with an unpaid line for this period appear here. Select them, then continue to enter
                how you paid.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {showPaymentForm ? (
                <PaymentForm
                  selectedEmployees={employees.filter((emp) =>
                    paymentSelectedEmployeeIds.includes(emp.id)
                  )}
                  selectedPayrollRecords={currentPayrollRecords.filter((record) =>
                    paymentSelectedEmployeeIds.includes(record.employee_id)
                  )}
                  onSubmit={handleProcessPayments}
                  onCancel={() => setShowPaymentForm(false)}
                  loading={loading}
                  currency={currency}
                />
              ) : (
                <>
                  {paymentPickerRows.length === 0 ? (
                    <div className="text-center py-10 rounded-lg border border-dashed">
                      <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-medium mb-2">No unpaid payroll lines</h3>
                      <p className="text-muted-foreground text-sm max-w-md mx-auto">
                        Calculate payroll for this period first. Employees already marked paid are hidden here.
                      </p>
                    </div>
                  ) : (
                    <>
                      <PayrollEmployeePicker
                        rows={paymentPickerRows}
                        selectedIds={paymentSelectedEmployeeIds}
                        onSelectionChange={setPaymentSelectedEmployeeIds}
                        currency={currency}
                        contextLabel="to pay"
                        emptyMessage="No unpaid employees in this run."
                        showNetColumn
                        showStatusColumn
                      />
                      <div className="flex flex-wrap justify-end gap-2 pt-2">
                        <Button
                          type="button"
                          onClick={() => setShowPaymentForm(true)}
                          disabled={paymentSelectedEmployeeIds.length === 0 || loading}
                        >
                          Continue to payment details
                          {paymentSelectedEmployeeIds.length > 0
                            ? ` (${paymentSelectedEmployeeIds.length})`
                            : ""}
                        </Button>
                      </div>
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payslips" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Payslips</CardTitle>
              <CardDescription>
                Use the row action for quick open, or select one employee and click below. Print from the details
                dialog to save PDF.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {payslipPickerRows.length === 0 ? (
                <div className="text-center py-10 rounded-lg border border-dashed">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No payroll data for this period</h3>
                  <p className="text-muted-foreground text-sm max-w-md mx-auto">
                    Calculate payroll for the selected period first.
                  </p>
                </div>
              ) : (
                <>
                  <PayrollEmployeePicker
                    rows={payslipPickerRows}
                    selectedIds={payslipSelectedEmployeeIds}
                    onSelectionChange={setPayslipSelectedEmployeeIds}
                    currency={currency}
                    contextLabel="listed for payslips"
                    emptyMessage="No payroll lines for this period."
                    showNetColumn
                    showStatusColumn
                    onViewEmployee={openPayslipForEmployee}
                    viewButtonLabel="Details"
                  />
                  <div className="flex flex-wrap justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={payslipSelectedEmployeeIds.length !== 1 || loading}
                      onClick={() => openPayslipForEmployee(payslipSelectedEmployeeIds[0])}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Open payslip (selected)
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">History & audit</CardTitle>
              <CardDescription>
                Payment activity and salary sheet export (Excel / PDF) for the selected period.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PayrollHistory
                payrollRecords={currentPayrollRecords}
                paymentRecords={currentPaymentRecords}
                employees={employees as any}
                departments={departments as any}
                onExport={handleExportData}
                exportDisabled={!selectedPeriodId}
                loading={loading}
                currency={currency}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Period Dialog */}
      <Dialog open={showCreatePeriodDialog} onOpenChange={setShowCreatePeriodDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Payroll Period</DialogTitle>
            <DialogDescription>
              Create a new payroll period (e.g., a month) for salary calculations.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreatePeriod} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="period-name">Period Name *</Label>
              <Input
                id="period-name"
                placeholder="e.g., March 2026"
                value={newPeriod.name}
                onChange={(e) => setNewPeriod((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date *</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={newPeriod.start_date}
                  onChange={(e) => setNewPeriod((p) => ({ ...p, start_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date *</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={newPeriod.end_date}
                  onChange={(e) => setNewPeriod((p) => ({ ...p, end_date: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreatePeriodDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Period"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <PayslipPreviewDialog
        open={payslipPreviewOpen}
        onOpenChange={(open) => {
          setPayslipPreviewOpen(open);
          if (!open) {
            setPayslipPreviewEmployee(null);
            setPayslipPreviewRecord(null);
            setPayslipPreviewPaymentRecord(null);
          }
        }}
        employee={payslipPreviewEmployee}
        payrollRecord={payslipPreviewRecord}
        paymentRecord={payslipPreviewPaymentRecord}
        periodDisplayName={currentPeriod?.name || "Selected period"}
        currency={currency}
      />
    </div>
  );
};

export default PayrollPage;
