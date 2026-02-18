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
} from "lucide-react";
import { PayrollPageProps } from "../types";
import PayrollCalculator from "../components/PayrollCalculator";
import PaymentForm from "../components/PaymentForm";
import PayrollHistory from "../components/PayrollHistory";
import EmployeePayrollCard from "../components/EmployeePayrollCard";
import { HRMApiService } from "../services/hrm-api";
import { useToast } from "@/components/ui/use-toast";

const PayrollPage: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("payroll");
  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [payrollPeriods, setPayrollPeriods] = useState<any[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [periodsRes, empsRes, deptsRes] = await Promise.all([
        HRMApiService.getPayrollPeriods(),
        HRMApiService.getEmployees({ limit: 500 }),
        HRMApiService.getDepartments(),
      ]);
      const periods = periodsRes.periods || [];
      setPayrollPeriods(periods);
      setEmployees(empsRes.employees || []);
      setDepartments(deptsRes.departments || []);
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
  const currentPaymentRecords: any[] = [];

  const handleCalculatePayroll = async (data: any) => {
    try {
      setLoading(true);
      await HRMApiService.calculatePayroll({
        payroll_period_id: parseInt(selectedPeriodId),
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
      a.download = `payroll-${selectedPeriodId}.${format === "excel" ? "xlsx" : "pdf"}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast({ title: "Error", description: "Export failed", variant: "destructive" });
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

  // Calculate summary statistics
  const summaryStats = {
    totalEmployees: employees.length,
    totalGrossSalary: currentPayrollRecords.reduce(
      (sum, record) => sum + (record.total_earnings || 0),
      0
    ),
    totalDeductions: currentPayrollRecords.reduce(
      (sum, record) => sum + (record.total_deductions || 0),
      0
    ),
    totalNetSalary: currentPayrollRecords.reduce(
      (sum, record) => sum + (record.net_salary || 0),
      0
    ),
    paidEmployees: 0,
    pendingPayments: 0,
    failedPayments: 0,
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
          <div className="flex items-center gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Payroll Period</label>
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
                    PKR {summaryStats.totalGrossSalary.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Gross Salary
                  </div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    PKR {summaryStats.totalDeductions.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Deductions
                  </div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    PKR {summaryStats.totalNetSalary.toLocaleString()}
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
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Payroll Processing
              </CardTitle>
              <CardDescription>
                Calculate and process payroll for the selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PayrollCalculator
                employees={employees as any}
                selectedEmployeeIds={selectedEmployeeIds}
                onCalculate={handleCalculatePayroll}
                onSelectAll={handleSelectAll}
                loading={loading}
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
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PayrollPage;
