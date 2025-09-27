import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Receipt,
  Clock,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Upload,
  FileText,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { useFormatting } from "@/hooks/useFormatting";
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
import { Progress } from "@/components/ui/progress";

interface FactoryExpense {
  id: string;
  description: string;
  amount: number;
  category:
    | "rent"
    | "utilities"
    | "handling"
    | "maintenance"
    | "consumables"
    | "other";
  workOrderId?: string;
  productionLine?: string;
  status: "pending" | "approved" | "rejected" | "paid";
  submittedBy: string;
  submittedDate: string;
  approvedBy?: string;
  approvedDate?: string;
  paidDate?: string;
  attachments: string[];
  notes?: string;
}

interface ExpenseCategory {
  id: string;
  name: string;
  description: string;
  requiresApproval: boolean;
}

interface ExpenseStats {
  totalExpenses: number;
  pendingApprovals: number;
  totalAmount: number;
  averageExpense: number;
  monthlyTrend: number;
  topCategory: string;
}

export default function FactoryExpenses() {
  const { formatCurrency, formatDate } = useFormatting();
  const [expenses, setExpenses] = useState<FactoryExpense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [stats, setStats] = useState<ExpenseStats>({
    totalExpenses: 0,
    pendingApprovals: 0,
    totalAmount: 0,
    averageExpense: 0,
    monthlyTrend: 0,
    topCategory: "",
  });
  const [selectedExpense, setSelectedExpense] = useState<FactoryExpense | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [newExpense, setNewExpense] = useState({
    description: "",
    amount: 0,
    category: "rent",
    workOrderId: "",
    productionLine: "",
    notes: "",
    attachments: [] as string[],
  });

  useEffect(() => {
    // Mock data - in real app, fetch from API
    setExpenses([
      {
        id: "EXP-001",
        description: "Factory rent for March 2024",
        amount: 5000,
        category: "rent",
        status: "approved",
        submittedBy: "John Doe",
        submittedDate: "2024-03-01T09:00:00Z",
        approvedBy: "Mike Johnson",
        approvedDate: "2024-03-02T14:30:00Z",
        attachments: ["rent_invoice.pdf"],
        notes: "Monthly factory rent payment",
      },
      {
        id: "EXP-002",
        description: "Electricity bill - Production Line 1",
        amount: 1200,
        category: "utilities",
        productionLine: "Line 1",
        status: "pending",
        submittedBy: "Jane Smith",
        submittedDate: "2024-03-10T11:15:00Z",
        attachments: ["electricity_bill.pdf"],
        notes: "High electricity usage due to increased production",
      },
      {
        id: "EXP-003",
        description: "Machine maintenance - CNC Machine A",
        amount: 800,
        category: "maintenance",
        workOrderId: "WO-001",
        status: "approved",
        submittedBy: "Mike Johnson",
        submittedDate: "2024-03-08T16:45:00Z",
        approvedBy: "Sarah Wilson",
        approvedDate: "2024-03-09T10:20:00Z",
        attachments: ["maintenance_invoice.pdf", "work_order.pdf"],
        notes: "Routine maintenance for CNC Machine A",
      },
      {
        id: "EXP-004",
        description: "Raw materials for production",
        amount: 2500,
        category: "consumables",
        workOrderId: "WO-002",
        status: "rejected",
        submittedBy: "Tom Brown",
        submittedDate: "2024-03-05T13:30:00Z",
        notes: "Additional raw materials for urgent order",
      },
    ]);

    setCategories([
      {
        id: "1",
        name: "Rent",
        description: "Factory and facility rent",
        requiresApproval: true,
      },
      {
        id: "2",
        name: "Utilities",
        description: "Electricity, water, gas bills",
        requiresApproval: true,
      },
      {
        id: "3",
        name: "Handling",
        description: "Material handling costs",
        requiresApproval: false,
      },
      {
        id: "4",
        name: "Maintenance",
        description: "Equipment maintenance and repairs",
        requiresApproval: true,
      },
      {
        id: "5",
        name: "Consumables",
        description: "Production consumables and supplies",
        requiresApproval: false,
      },
      {
        id: "6",
        name: "Other",
        description: "Other factory expenses",
        requiresApproval: true,
      },
    ]);

    setStats({
      totalExpenses: 15,
      pendingApprovals: 3,
      totalAmount: 12500,
      averageExpense: 833,
      monthlyTrend: 12,
      topCategory: "Rent",
    });
  }, []);

  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch =
      expense.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || expense.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "paid":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "rent":
        return "bg-blue-100 text-blue-800";
      case "utilities":
        return "bg-orange-100 text-orange-800";
      case "handling":
        return "bg-purple-100 text-purple-800";
      case "maintenance":
        return "bg-red-100 text-red-800";
      case "consumables":
        return "bg-green-100 text-green-800";
      case "other":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleViewExpense = (expense: FactoryExpense) => {
    setSelectedExpense(expense);
    setShowDetailsDialog(true);
  };

  const handleApproveExpense = (expenseId: string) => {
    setExpenses((prev) =>
      prev.map((expense) =>
        expense.id === expenseId
          ? {
              ...expense,
              status: "approved" as const,
              approvedBy: "Current User",
              approvedDate: new Date().toISOString(),
            }
          : expense
      )
    );
  };

  const handleRejectExpense = (expenseId: string) => {
    setExpenses((prev) =>
      prev.map((expense) =>
        expense.id === expenseId
          ? {
              ...expense,
              status: "rejected" as const,
              approvedBy: "Current User",
              approvedDate: new Date().toISOString(),
            }
          : expense
      )
    );
  };

  const handleCreateExpense = () => {
    const newExpenseRecord: FactoryExpense = {
      id: `EXP-${Date.now()}`,
      description: newExpense.description,
      amount: newExpense.amount,
      category: newExpense.category as any,
      workOrderId: newExpense.workOrderId || undefined,
      productionLine: newExpense.productionLine || undefined,
      status: "pending",
      submittedBy: "Current User",
      submittedDate: new Date().toISOString(),
      attachments: newExpense.attachments,
      notes: newExpense.notes,
    };

    setExpenses((prev) => [newExpenseRecord, ...prev]);
    setShowExpenseDialog(false);
    setNewExpense({
      description: "",
      amount: 0,
      category: "rent",
      workOrderId: "",
      productionLine: "",
      notes: "",
      attachments: [],
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Factory Expenses</h1>
          <p className="text-muted-foreground">
            Track and manage factory-related expenses
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button onClick={() => setShowExpenseDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Record Expense
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Expenses
            </CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalExpenses}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Approvals
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingApprovals}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.totalAmount)}
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Trend</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              +{stats.monthlyTrend}%
            </div>
            <p className="text-xs text-muted-foreground">vs last month</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="all-expenses" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all-expenses">All Expenses</TabsTrigger>
          <TabsTrigger value="pending-approvals">Pending Approvals</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="all-expenses" className="space-y-4">
          {/* Search and Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search expenses..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Tabs value={statusFilter} onValueChange={setStatusFilter}>
                  <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="pending">Pending</TabsTrigger>
                    <TabsTrigger value="approved">Approved</TabsTrigger>
                    <TabsTrigger value="rejected">Rejected</TabsTrigger>
                    <TabsTrigger value="paid">Paid</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardContent>
          </Card>

          {/* Expenses Table */}
          <Card>
            <CardHeader>
              <CardTitle>Factory Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Expense ID</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium">
                        {expense.id}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {expense.description}
                          </div>
                          {expense.workOrderId && (
                            <div className="text-sm text-muted-foreground">
                              Work Order: {expense.workOrderId}
                            </div>
                          )}
                          {expense.productionLine && (
                            <div className="text-sm text-muted-foreground">
                              Line: {expense.productionLine}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(expense.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge className={getCategoryColor(expense.category)}>
                          {expense.category.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(expense.status)}>
                          {expense.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {expense.submittedBy}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatDate(expense.submittedDate)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(expense.submittedDate)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewExpense(expense)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {expense.status === "pending" && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleApproveExpense(expense.id)}
                                className="text-green-600 hover:text-green-700"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRejectExpense(expense.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <AlertTriangle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending-approvals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {expenses
                  .filter((expense) => expense.status === "pending")
                  .map((expense) => (
                    <Card key={expense.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="font-medium">
                              {expense.description}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {expense.id} • {expense.category} •{" "}
                              {formatCurrency(expense.amount)}
                            </p>
                          </div>
                          <Badge className={getCategoryColor(expense.category)}>
                            {expense.category.toUpperCase()}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <Label className="text-sm font-medium">
                              Amount
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              {formatCurrency(expense.amount)}
                            </p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">
                              Submitted By
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              {expense.submittedBy}
                            </p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Date</Label>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(expense.submittedDate)}
                            </p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">
                              Attachments
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              {expense.attachments.length} files
                            </p>
                          </div>
                        </div>

                        {expense.notes && (
                          <div className="mb-4">
                            <Label className="text-sm font-medium">Notes</Label>
                            <p className="text-sm text-muted-foreground">
                              {expense.notes}
                            </p>
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewExpense(expense)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleApproveExpense(expense.id)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRejectExpense(expense.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Expenses by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Rent</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: "40%" }}
                        />
                      </div>
                      <span className="text-sm font-medium">40%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Utilities</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-orange-600 h-2 rounded-full"
                          style={{ width: "25%" }}
                        />
                      </div>
                      <span className="text-sm font-medium">25%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Maintenance</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-red-600 h-2 rounded-full"
                          style={{ width: "20%" }}
                        />
                      </div>
                      <span className="text-sm font-medium">20%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Consumables</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: "15%" }}
                        />
                      </div>
                      <span className="text-sm font-medium">15%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    +{stats.monthlyTrend}%
                  </div>
                  <p className="text-sm text-muted-foreground">vs last month</p>
                  <div className="mt-4">
                    <Progress value={75} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-2">
                      Budget utilization: 75%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Record Expense Dialog */}
      <Dialog open={showExpenseDialog} onOpenChange={setShowExpenseDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Record Factory Expense</DialogTitle>
            <DialogDescription>
              Record a new factory expense for tracking and approval
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Enter expense description"
                value={newExpense.description}
                onChange={(e) =>
                  setNewExpense((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={newExpense.amount}
                  onChange={(e) =>
                    setNewExpense((prev) => ({
                      ...prev,
                      amount: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={newExpense.category}
                  onValueChange={(value) =>
                    setNewExpense((prev) => ({ ...prev, category: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem
                        key={category.id}
                        value={category.name.toLowerCase()}
                      >
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="work-order">Work Order ID (Optional)</Label>
                <Input
                  id="work-order"
                  placeholder="WO-001"
                  value={newExpense.workOrderId}
                  onChange={(e) =>
                    setNewExpense((prev) => ({
                      ...prev,
                      workOrderId: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="production-line">
                  Production Line (Optional)
                </Label>
                <Input
                  id="production-line"
                  placeholder="Line 1"
                  value={newExpense.productionLine}
                  onChange={(e) =>
                    setNewExpense((prev) => ({
                      ...prev,
                      productionLine: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes about the expense..."
                value={newExpense.notes}
                onChange={(e) =>
                  setNewExpense((prev) => ({ ...prev, notes: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Attachments</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-500">
                  PDF, JPG, PNG up to 10MB
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowExpenseDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateExpense}>Record Expense</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Expense Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Expense Details - {selectedExpense?.id}</DialogTitle>
            <DialogDescription>
              View detailed information about the expense
            </DialogDescription>
          </DialogHeader>

          {selectedExpense && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Description</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedExpense.description}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Amount</Label>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(selectedExpense.amount)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Category</Label>
                  <Badge className={getCategoryColor(selectedExpense.category)}>
                    {selectedExpense.category.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <Badge className={getStatusColor(selectedExpense.status)}>
                    {selectedExpense.status.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Submitted By</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedExpense.submittedBy}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Submitted Date</Label>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(selectedExpense.submittedDate)}
                  </p>
                </div>
              </div>

              {selectedExpense.workOrderId && (
                <div>
                  <Label className="text-sm font-medium">Work Order</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedExpense.workOrderId}
                  </p>
                </div>
              )}

              {selectedExpense.productionLine && (
                <div>
                  <Label className="text-sm font-medium">Production Line</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedExpense.productionLine}
                  </p>
                </div>
              )}

              {selectedExpense.notes && (
                <div>
                  <Label className="text-sm font-medium">Notes</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedExpense.notes}
                  </p>
                </div>
              )}

              {selectedExpense.attachments.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Attachments</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedExpense.attachments.map((attachment, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="flex items-center gap-1"
                      >
                        <FileText className="h-3 w-3" />
                        {attachment}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedExpense.approvedBy && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Approved By</Label>
                    <p className="text-sm text-muted-foreground">
                      {selectedExpense.approvedBy}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Approved Date</Label>
                    <p className="text-sm text-muted-foreground">
                      {selectedExpense.approvedDate
                        ? formatDate(selectedExpense.approvedDate)
                        : "N/A"}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
