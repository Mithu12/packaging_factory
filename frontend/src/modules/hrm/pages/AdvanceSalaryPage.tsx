"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DollarSign,
  Search,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  TrendingDown,
  Users,
  Banknote,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { useFormatting } from "@/hooks/useFormatting";
import {
  AdvanceSalaryApi,
  AdvanceSalary,
  AdvanceSalaryStats,
  UpcomingDeduction,
} from "@/services/advance-salary-api";
import { makeRequest } from "@/services/api-utils";

export default function AdvanceSalaryPage() {
  const { formatCurrency, formatDate } = useFormatting();
  const [advances, setAdvances] = useState<AdvanceSalary[]>([]);
  const [stats, setStats] = useState<AdvanceSalaryStats | null>(null);
  const [deductions, setDeductions] = useState<UpcomingDeduction[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showDeductionsPanel, setShowDeductionsPanel] = useState(false);
  const [selectedAdvance, setSelectedAdvance] = useState<AdvanceSalary | null>(null);

  // Create form
  const [createForm, setCreateForm] = useState({
    employee_id: "",
    amount: "",
    monthly_installment: "",
    total_installments: "",
    start_date: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const [approveNotes, setApproveNotes] = useState("");

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [advResult, statsResult, deductionsResult] = await Promise.all([
        AdvanceSalaryApi.getAdvanceSalaries({
          page,
          limit: 20,
          search: searchTerm || undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
        }),
        AdvanceSalaryApi.getStats(),
        AdvanceSalaryApi.getUpcomingDeductions(),
      ]);
      setAdvances(advResult.advances);
      setTotalPages(advResult.totalPages);
      setStats(statsResult);
      setDeductions(deductionsResult);
    } catch (error) {
      console.error("Failed to fetch data", error);
      toast.error("Failed to load advance salary data");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const result = await makeRequest<any>("/hrm/employees?limit=500&is_active=true");
      setEmployees(result.employees || []);
    } catch (error) {
      console.error("Failed to fetch employees", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, searchTerm, statusFilter]);

  useEffect(() => {
    fetchEmployees();
  }, []);

  // Auto-calculate installments or monthly amount
  useEffect(() => {
    const amount = parseFloat(createForm.amount);
    const installments = parseInt(createForm.total_installments);
    if (amount > 0 && installments > 0 && !createForm.monthly_installment) {
      setCreateForm((prev) => ({
        ...prev,
        monthly_installment: (amount / installments).toFixed(2),
      }));
    }
  }, [createForm.amount, createForm.total_installments]);

  const handleCreate = async () => {
    try {
      if (!createForm.employee_id || !createForm.amount || !createForm.monthly_installment || !createForm.total_installments) {
        toast.error("Please fill all required fields");
        return;
      }

      await AdvanceSalaryApi.createAdvanceSalary({
        employee_id: parseInt(createForm.employee_id),
        amount: parseFloat(createForm.amount),
        monthly_installment: parseFloat(createForm.monthly_installment),
        total_installments: parseInt(createForm.total_installments),
        start_date: createForm.start_date,
        notes: createForm.notes || undefined,
      });

      toast.success("Advance salary created successfully");
      setShowCreateDialog(false);
      setCreateForm({
        employee_id: "",
        amount: "",
        monthly_installment: "",
        total_installments: "",
        start_date: new Date().toISOString().split("T")[0],
        notes: "",
      });
      fetchData();
    } catch (error) {
      console.error("Failed to create advance salary", error);
      toast.error("Failed to create advance salary");
    }
  };

  const handleApprove = async (approved: boolean) => {
    if (!selectedAdvance) return;
    try {
      await AdvanceSalaryApi.approveAdvanceSalary(selectedAdvance.id, approved, approveNotes || undefined);
      toast.success(approved ? "Advance salary approved" : "Advance salary rejected");
      setShowApproveDialog(false);
      setSelectedAdvance(null);
      setApproveNotes("");
      fetchData();
    } catch (error) {
      toast.error("Failed to process approval");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-blue-100 text-blue-800">Active</Badge>;
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case "cancelled":
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Advance Salary</h1>
          <p className="text-muted-foreground">
            Manage employee salary advances and track payroll deductions
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Advance
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.total_outstanding)}</div>
              <p className="text-xs text-muted-foreground">
                across {stats.active_count} active advances
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Advances</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active_count}</div>
              <p className="text-xs text-muted-foreground">
                {stats.completed_count} completed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Disbursed</CardTitle>
              <Banknote className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.total_disbursed)}</div>
              <p className="text-xs text-muted-foreground">
                all active advances
              </p>
            </CardContent>
          </Card>

          <Card className="border-orange-200 bg-orange-50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Next Payroll Deduction</CardTitle>
              <TrendingDown className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-700">
                {formatCurrency(stats.next_payroll_deduction)}
              </div>
              <p className="text-xs text-muted-foreground">
                will be deducted from next salary
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upcoming Deductions Panel */}
      {deductions.length > 0 && (
        <Card>
          <CardHeader
            className="cursor-pointer"
            onClick={() => setShowDeductionsPanel(!showDeductionsPanel)}
          >
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Upcoming Salary Deductions ({deductions.length} employees)
              </CardTitle>
              {showDeductionsPanel ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </div>
          </CardHeader>
          {showDeductionsPanel && (
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Active Advances</TableHead>
                    <TableHead className="text-right">Total Deduction</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deductions.map((d) => (
                    <TableRow key={d.employee_id}>
                      <TableCell className="font-medium">{d.employee_name}</TableCell>
                      <TableCell>{d.employee_code}</TableCell>
                      <TableCell>{d.active_advances}</TableCell>
                      <TableCell className="text-right font-semibold text-orange-700">
                        {formatCurrency(d.total_deduction)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          )}
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or advance number..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Advances Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Advance #</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Monthly Installment</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead className="text-right">Next Deduction</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : advances.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                    No advance salary records found
                  </TableCell>
                </TableRow>
              ) : (
                advances.map((adv) => (
                  <TableRow key={adv.id}>
                    <TableCell className="font-mono text-sm">
                      {adv.advance_number || `#${adv.id}`}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{adv.employee_name}</div>
                        <div className="text-xs text-muted-foreground">{adv.employee_code}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(adv.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(adv.monthly_installment)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{
                              width: `${Math.min(
                                (adv.paid_installments / adv.total_installments) * 100,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {adv.paid_installments}/{adv.total_installments}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(adv.remaining_amount)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {adv.next_deduction > 0 ? (
                        <span className="text-orange-700">
                          {formatCurrency(adv.next_deduction)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(adv.status)}</TableCell>
                    <TableCell>{formatDate(adv.start_date)}</TableCell>
                    <TableCell>
                      {adv.status === "active" && !adv.approved_at && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedAdvance(adv);
                            setShowApproveDialog(true);
                          }}
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          Review
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="flex items-center px-4 text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Create Advance Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>New Advance Salary</DialogTitle>
            <DialogDescription>
              Create a salary advance for an employee. The amount will be auto-deducted from future salaries.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="employee">Employee *</Label>
              <Select
                value={createForm.employee_id}
                onValueChange={(v) => setCreateForm({ ...createForm, employee_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>
                      {emp.first_name} {emp.last_name} ({emp.employee_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="amount">Total Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="e.g. 50000"
                  value={createForm.amount}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      amount: e.target.value,
                      monthly_installment:
                        e.target.value && createForm.total_installments
                          ? (parseFloat(e.target.value) / parseInt(createForm.total_installments)).toFixed(2)
                          : createForm.monthly_installment,
                    })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="installments">Total Installments *</Label>
                <Input
                  id="installments"
                  type="number"
                  placeholder="e.g. 6"
                  value={createForm.total_installments}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      total_installments: e.target.value,
                      monthly_installment:
                        createForm.amount && e.target.value
                          ? (parseFloat(createForm.amount) / parseInt(e.target.value)).toFixed(2)
                          : createForm.monthly_installment,
                    })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="monthly">Monthly Deduction *</Label>
                <Input
                  id="monthly"
                  type="number"
                  placeholder="Auto-calculated"
                  value={createForm.monthly_installment}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, monthly_installment: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="start_date">Start Date *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={createForm.start_date}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, start_date: e.target.value })
                  }
                />
              </div>
            </div>
            {createForm.amount && createForm.monthly_installment && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm">
                <div className="font-medium text-orange-800 mb-1 flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" /> Salary Deduction Preview
                </div>
                <p className="text-orange-700">
                  <strong>{formatCurrency(parseFloat(createForm.monthly_installment))}</strong> will be
                  deducted from each salary for{" "}
                  <strong>{createForm.total_installments || "?"} months</strong>.
                </p>
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Optional notes..."
                value={createForm.notes}
                onChange={(e) =>
                  setCreateForm({ ...createForm, notes: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Create Advance</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve/Reject Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Review Advance Salary</DialogTitle>
            <DialogDescription>
              Approve or reject advance{" "}
              {selectedAdvance?.advance_number || `#${selectedAdvance?.id}`} for{" "}
              {selectedAdvance?.employee_name}
            </DialogDescription>
          </DialogHeader>
          {selectedAdvance && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Amount:</span>{" "}
                  <span className="font-medium">{formatCurrency(selectedAdvance.amount)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Per Month:</span>{" "}
                  <span className="font-medium">
                    {formatCurrency(selectedAdvance.monthly_installment)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Installments:</span>{" "}
                  <span className="font-medium">{selectedAdvance.total_installments}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Start Date:</span>{" "}
                  <span className="font-medium">{formatDate(selectedAdvance.start_date)}</span>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Add a note (optional)..."
                  value={approveNotes}
                  onChange={(e) => setApproveNotes(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="destructive"
              onClick={() => handleApprove(false)}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Reject
            </Button>
            <Button onClick={() => handleApprove(true)}>
              <CheckCircle className="h-4 w-4 mr-1" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
