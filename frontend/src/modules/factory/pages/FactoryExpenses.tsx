"use client";

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
  RefreshCw,
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
import { ExpenseApi } from "@/services/expense-api";
import { ExpenseCategoryApi } from "@/services/expense-category-api";
import { Expense, ExpenseCategory, ExpenseStats } from "@/services/types";

// Map expense categories to display names for factory context
const getCategoryDisplayName = (categoryId: number): string => {
  const categoryMap: Record<number, string> = {
    1: "Rent",
    2: "Utilities",
    3: "Handling",
    4: "Maintenance",
    5: "Consumables",
    6: "Other"
  };
  return categoryMap[categoryId] || "Other";
};

// Map status for factory context
const getStatusDisplayName = (status: string): string => {
  return status.charAt(0).toUpperCase() + status.slice(1);
};

export default function FactoryExpenses() {
  const { formatCurrency, formatDate } = useFormatting();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [stats, setStats] = useState<ExpenseStats>({
    total_expenses: 0,
    pending_expenses: 0,
    approved_expenses: 0,
    rejected_expenses: 0,
    paid_expenses: 0,
    total_amount: 0,
    pending_amount: 0,
    approved_amount: 0,
    paid_amount: 0,
    expenses_this_month: 0,
    expenses_this_year: 0,
    average_expense_amount: 0,
    top_categories: [],
    monthly_trends: []
  });
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showExpenseDialog, setShowExpenseDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newExpense, setNewExpense] = useState({
    title: "",
    description: "",
    amount: 0,
    category_id: 1, // Default to first category
    expense_date: new Date().toISOString().split('T')[0],
    notes: "",
    department: "Factory",
    project: "",
  });

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Load expenses
      const expensesResponse = await ExpenseApi.getExpenses({
        search: searchTerm || undefined,
        status: statusFilter === "all" ? undefined : statusFilter as any,
        department: "Factory",
      });
      setExpenses(expensesResponse.expenses);

      // Load categories
      const categoriesResponse = await ExpenseCategoryApi.getActiveExpenseCategories();
      setCategories(categoriesResponse);

      // Load stats
      const statsResponse = await ExpenseApi.getExpenseStats({
        department: "Factory",
      });
      setStats(statsResponse);

    } catch (err) {
      console.error('Error loading factory expenses data:', err);
      setError('Failed to load factory expenses data');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadAllData();
  };

  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch =
      expense.expense_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (expense.description && expense.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      expense.category_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
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

  const getCategoryColor = (categoryId: number) => {
    // Use category ID for consistent coloring
    switch (categoryId) {
      case 1:
        return "bg-blue-100 text-blue-800"; // Rent
      case 2:
        return "bg-orange-100 text-orange-800"; // Utilities
      case 3:
        return "bg-purple-100 text-purple-800"; // Handling
      case 4:
        return "bg-red-100 text-red-800"; // Maintenance
      case 5:
        return "bg-green-100 text-green-800"; // Consumables
      case 6:
        return "bg-gray-100 text-gray-800"; // Other
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleViewExpense = (expense: Expense) => {
    setSelectedExpense(expense);
    setShowDetailsDialog(true);
  };

  const handleApproveExpense = async (expenseId: number) => {
    try {
      await ExpenseApi.approveExpense(expenseId);
      // Reload data after successful approval
      loadAllData();
    } catch (error) {
      console.error('Error approving expense:', error);
      // You could show an error toast here
    }
  };

  const handleRejectExpense = async (expenseId: number) => {
    try {
      await ExpenseApi.rejectExpense(expenseId, "Rejected by factory manager");
      // Reload data after successful rejection
      loadAllData();
    } catch (error) {
      console.error('Error rejecting expense:', error);
      // You could show an error toast here
    }
  };

  const handleCreateExpense = async () => {
    try {
      await ExpenseApi.createExpense({
        title: newExpense.title,
        description: newExpense.description,
        amount: newExpense.amount,
        category_id: newExpense.category_id,
        expense_date: newExpense.expense_date,
        notes: newExpense.notes,
        department: newExpense.department,
        project: newExpense.project || undefined,
      });

      // Reload data after successful creation
      loadAllData();

      // Reset form
      setShowExpenseDialog(false);
      setNewExpense({
        title: "",
        description: "",
        amount: 0,
        category_id: 1,
        expense_date: new Date().toISOString().split('T')[0],
        notes: "",
        department: "Factory",
        project: "",
      });
    } catch (error) {
      console.error('Error creating expense:', error);
      // You could show an error toast here
    }
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
            <div className="text-2xl font-bold">{stats.total_expenses}</div>
            <p className="text-xs text-muted-foreground">All time</p>
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
            <div className="text-2xl font-bold">{stats.pending_expenses}</div>
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
              {formatCurrency(stats.total_amount)}
            </div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.expenses_this_month}
            </div>
            <p className="text-xs text-muted-foreground">expenses recorded</p>
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
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
                    <p className="text-muted-foreground">Loading expenses...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center text-red-600">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                    <p>{error}</p>
                    <Button
                      variant="outline"
                      className="mt-2"
                      onClick={loadAllData}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry
                    </Button>
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Expense ID</TableHead>
                      <TableHead>Title</TableHead>
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
                          {expense.expense_number}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {expense.title}
                            </div>
                            {expense.description && (
                              <div className="text-sm text-muted-foreground">
                                {expense.description}
                              </div>
                            )}
                            {expense.project && (
                              <div className="text-sm text-muted-foreground">
                                Project: {expense.project}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(expense.amount)} {expense.currency}
                        </TableCell>
                        <TableCell>
                          <Badge className={getCategoryColor(expense.category_id)}>
                            {getCategoryDisplayName(expense.category_id)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(expense.status)}>
                            {getStatusDisplayName(expense.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {expense.created_by_name || `User ${expense.created_by}`}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {formatDate(expense.created_at)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(expense.expense_date)}</TableCell>
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
              )}
              {filteredExpenses.length === 0 && !loading && !error && (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No expenses found</p>
                </div>
              )}
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
                                  {expense.title}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  {expense.expense_number} • {getCategoryDisplayName(expense.category_id)} •{" "}
                                  {formatCurrency(expense.amount)} {expense.currency}
                                </p>
                              </div>
                              <Badge className={getCategoryColor(expense.category_id)}>
                                {getCategoryDisplayName(expense.category_id)}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                              <div>
                                <Label className="text-sm font-medium">
                                  Amount
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                  {formatCurrency(expense.amount)} {expense.currency}
                                </p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">
                                  Submitted By
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                  {expense.created_by_name || `User ${expense.created_by}`}
                                </p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">Date</Label>
                                <p className="text-sm text-muted-foreground">
                                  {formatDate(expense.expense_date)}
                                </p>
                              </div>
                              <div>
                                <Label className="text-sm font-medium">
                                  Receipt
                                </Label>
                                <p className="text-sm text-muted-foreground">
                                  {expense.receipt_url ? "Available" : "None"}
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
                  {stats.top_categories && stats.top_categories.length > 0 ? (
                    stats.top_categories.map((cat) => {
                      const pct = stats.total_amount > 0
                        ? Math.round((cat.total_amount / stats.total_amount) * 100)
                        : 0;
                      return (
                        <div key={cat.category_id} className="flex items-center justify-between">
                          <span className="text-sm">{cat.category_name}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">{pct}%</span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground">No category data available</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  {(() => {
                    const trends = stats.monthly_trends || [];
                    const thisMonth = trends[trends.length - 1]?.total_amount ?? 0;
                    const lastMonth = trends.length >= 2 ? trends[trends.length - 2]?.total_amount ?? 0 : 0;
                    const trendPct = lastMonth > 0
                      ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100)
                      : (thisMonth > 0 ? 100 : 0);
                    return (
                      <>
                        <div className={`text-3xl font-bold ${trendPct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {trendPct >= 0 ? '+' : ''}{trendPct}%
                        </div>
                        <p className="text-sm text-muted-foreground">vs last month</p>
                        <div className="mt-4">
                          <Progress value={Math.min(100, Math.max(0, trendPct + 50))} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-2">
                            This month: {formatCurrency(thisMonth)}
                          </p>
                        </div>
                      </>
                    );
                  })()}
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
                  step="0.01"
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
                  value={newExpense.category_id.toString()}
                  onValueChange={(value) =>
                    setNewExpense((prev) => ({ ...prev, category_id: Number(value) }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem
                        key={category.id}
                        value={category.id.toString()}
                      >
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expense_date">Expense Date</Label>
              <Input
                id="expense_date"
                type="date"
                value={newExpense.expense_date}
                onChange={(e) =>
                  setNewExpense((prev) => ({
                    ...prev,
                    expense_date: e.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project">Project (Optional)</Label>
              <Input
                id="project"
                placeholder="Project name or code"
                value={newExpense.project}
                onChange={(e) =>
                  setNewExpense((prev) => ({
                    ...prev,
                    project: e.target.value,
                  }))
                }
              />
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
                  <Label className="text-sm font-medium">Title</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedExpense.title}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Amount</Label>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(selectedExpense.amount)} {selectedExpense.currency}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Category</Label>
                  <Badge className={getCategoryColor(selectedExpense.category_id)}>
                    {getCategoryDisplayName(selectedExpense.category_id)}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <Badge className={getStatusColor(selectedExpense.status)}>
                    {getStatusDisplayName(selectedExpense.status)}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium">Expense Date</Label>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(selectedExpense.expense_date)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Created By</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedExpense.created_by_name || `User ${selectedExpense.created_by}`}
                  </p>
                </div>
              </div>

              {selectedExpense.description && (
                <div>
                  <Label className="text-sm font-medium">Description</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedExpense.description}
                  </p>
                </div>
              )}

              {selectedExpense.project && (
                <div>
                  <Label className="text-sm font-medium">Project</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedExpense.project}
                  </p>
                </div>
              )}

              {selectedExpense.department && (
                <div>
                  <Label className="text-sm font-medium">Department</Label>
                  <p className="text-sm text-muted-foreground">
                    {selectedExpense.department}
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

              {selectedExpense.receipt_url && (
                <div>
                  <Label className="text-sm font-medium">Receipt</Label>
                  <div className="mt-2">
                    <Badge variant="outline" className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      Receipt Available
                    </Badge>
                  </div>
                </div>
              )}

              {selectedExpense.approved_by && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Approved By</Label>
                    <p className="text-sm text-muted-foreground">
                      {selectedExpense.approved_by_name || `User ${selectedExpense.approved_by}`}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Approved Date</Label>
                    <p className="text-sm text-muted-foreground">
                      {selectedExpense.approved_at
                        ? formatDate(selectedExpense.approved_at)
                        : "N/A"}
                    </p>
                  </div>
                </div>
              )}

              {selectedExpense.paid_by && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Paid By</Label>
                    <p className="text-sm text-muted-foreground">
                      {selectedExpense.paid_by_name || `User ${selectedExpense.paid_by}`}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Paid Date</Label>
                    <p className="text-sm text-muted-foreground">
                      {selectedExpense.paid_at
                        ? formatDate(selectedExpense.paid_at)
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
