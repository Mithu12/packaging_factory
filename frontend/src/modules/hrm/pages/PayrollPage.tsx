"use client";

import React, { useState, useEffect, useCallback } from "react";
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
import { Separator } from "@/components/ui/separator";
import {
  Calculator,
  CreditCard,
  Download,
  Eye,
  Filter,
  Users,
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
import { PayrollPageProps, PaymentRecord } from "../types";
import PayrollCalculator from "../components/PayrollCalculator";
import PaymentForm from "../components/PaymentForm";
import PayrollHistory from "../components/PayrollHistory";
import EmployeePayrollCard from "../components/EmployeePayrollCard";
import { HRMApiService } from "../services/hrm-api";
import { SettingsApi } from "@/services/settings-api";
import { useToast } from "@/components/ui/use-toast";

const formatCurrencyWith = (currency: string) => (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);

const PayrollPage: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("payroll");
  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);
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
    try {
      setLoading(true);
      await HRMApiService.approvePayrollRun(parseInt(selectedPeriodId));
      toast({ title: "Success", description: "Payments processed" });
      setShowPaymentForm(false);
      await loadPayrollRecords(selectedPeriodId);
    } catch (err) {
      toast({ title: "Error", description: "Failed to process payments", variant: "destructive" });
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

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedEmployeeIds(employees.map((emp) => emp.id));
    } else {
      setSelectedEmployeeIds([]);
    }
  };

  const handleSelectEmployee = (employeeId: number, selected: boolean) => {
    if (selected) {
      setSelectedEmployeeIds((prev) => [...prev, employeeId]);
    } else {
      setSelectedEmployeeIds((prev) => prev.filter((id) => id !== employeeId));
    }
  };

  const handleGeneratePayslips = (_employeeIds: number[]) => {
    if (!selectedPeriodId) {
      toast({ title: "Error", description: "Select a payroll period first", variant: "destructive" });
      return;
    }
    handleExportData("excel");
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payroll & Payments</h1>
          <p className="text-muted-foreground mt-1">
            Process monthly payroll and track employee payments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm">
            {currentPeriod?.name || "No Period Selected"}
          </Badge>
        </div>
      </div>

      {/* Period Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Payroll Period Selection
          </CardTitle>
          <CardDescription>
            Select the payroll period to view and process payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="space-y-2">
              <label className="text-sm font-medium">Payroll Period</label>
              <div className="flex gap-2">
                <Select
                  value={selectedPeriodId}
                  onValueChange={setSelectedPeriodId}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    {payrollPeriods.map((period) => (
                      <SelectItem key={period.id} value={period.id.toString()}>
                        {period.name} - {period.status}
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
                <p className="text-sm text-muted-foreground">
                  No periods yet. Click + to create one.
                </p>
              )}
            </div>

            {currentPeriod && (
              <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">
                    {summaryStats.totalEmployees}
                  </div>
                  <div className="text-sm text-muted-foreground">Employees</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrencyWith(currency)(summaryStats.totalGrossSalary)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Gross Salary
                  </div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrencyWith(currency)(summaryStats.totalDeductions)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Deductions
                  </div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {formatCurrencyWith(currency)(summaryStats.totalNetSalary)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Net Salary
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment Status Overview */}
      {currentPeriod && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Paid Employees
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {summaryStats.paidEmployees}
              </div>
              <p className="text-xs text-muted-foreground">
                {summaryStats.totalEmployees} total employees
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Pending Payments
              </CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {summaryStats.pendingPayments}
              </div>
              <p className="text-xs text-muted-foreground">
                Awaiting processing
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Failed Payments
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {summaryStats.failedPayments}
              </div>
              <p className="text-xs text-muted-foreground">Require attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Payment Rate
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {summaryStats.totalEmployees > 0
                  ? Math.round(
                      (summaryStats.paidEmployees /
                        summaryStats.totalEmployees) *
                        100
                    )
                  : 0}
                %
              </div>
              <p className="text-xs text-muted-foreground">Completion rate</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="payroll" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Payroll Processing
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Payment Processing
          </TabsTrigger>
          <TabsTrigger value="payslips" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Payslips
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Payment History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="payroll" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1.5">
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Payroll Processing
                </CardTitle>
                <CardDescription>
                  Calculate payroll, then export the salary sheet (Excel or PDF) for the selected period
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!selectedPeriodId || loading}
                  onClick={() => handleExportData("excel")}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Excel
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!selectedPeriodId || loading}
                  onClick={() => handleExportData("pdf")}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <PayrollCalculator
                employees={employees as any}
                selectedEmployeeIds={selectedEmployeeIds}
                onCalculate={handleCalculatePayroll}
                onSelectAll={handleSelectAll}
                onGeneratePayslips={handleGeneratePayslips}
                loading={loading}
                canCalculate={!!selectedPeriodId}
                currency={currency}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Processing
              </CardTitle>
              <CardDescription>
                Process payments for selected employees
              </CardDescription>
            </CardHeader>
            <CardContent>
              {showPaymentForm ? (
                <PaymentForm
                  selectedEmployees={employees.filter((emp) =>
                    selectedEmployeeIds.includes(emp.id)
                  )}
                  selectedPayrollRecords={currentPayrollRecords.filter(
                    (record) => selectedEmployeeIds.includes(record.employee_id)
                  )}
                  onSubmit={handleProcessPayments}
                  onCancel={() => setShowPaymentForm(false)}
                  loading={loading}
                  currency={currency}
                />
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">
                    Process Employee Payments
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Select employees from the payroll list and process their
                    payments
                  </p>
                  {selectedEmployeeIds.length > 0 && (
                    <Button onClick={() => setShowPaymentForm(true)}>
                      Process Payment for {selectedEmployeeIds.length} Employee
                      {selectedEmployeeIds.length > 1 ? "s" : ""}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payslips" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Employee Payslips
              </CardTitle>
              <CardDescription>
                View and generate payslips for employees
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentPayrollRecords.map((record) => {
                  const employee = employees.find(
                    (emp) => emp.id === record.employee_id
                  );
                  if (!employee) return null;

                  return (
                    <EmployeePayrollCard
                      key={record.id}
                      employee={employee as any}
                      payrollRecord={record}
                      paymentRecord={currentPaymentRecords.find(
                        (p) => p.employee_id === employee.id
                      )}
                      isSelected={selectedEmployeeIds.includes(employee.id)}
                      onSelect={(selected) =>
                        handleSelectEmployee(employee.id, selected)
                      }
                      onViewPayslip={() =>
                        console.log("View payslip for", employee.id)
                      }
                      loading={loading}
                      currency={currency}
                    />
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Payment History & Audit Trail
              </CardTitle>
              <CardDescription>
                View payment history and audit trail for all payroll periods
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PayrollHistory
                payrollRecords={currentPayrollRecords}
                paymentRecords={currentPaymentRecords}
                employees={employees as any}
                departments={departments as any}
                onExport={handleExportData}
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
    </div>
  );
};

export default PayrollPage;
