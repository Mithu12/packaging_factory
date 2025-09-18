import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/sonner';
import { useFormatting } from '@/hooks/useFormatting';
import { ApiService, Expense, ExpenseCategory, ApiError } from '@/services/api';
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Check,
  X,
  DollarSign,
  Calendar,
  User,
  Building,
  FileText,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Upload,
  Image,
  X as XIcon
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ExpenseFormData {
  title: string;
  description: string;
  category_id: string;
  amount: string;
  currency: string;
  expense_date: string;
  payment_method: string;
  vendor_name: string;
  vendor_contact: string;
  receipt_number: string;
  department: string;
  project: string;
  notes: string;
  receipt_file?: File;
}

const paymentMethods = [
  { value: 'cash', label: 'Cash' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'debit_card', label: 'Debit Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'check', label: 'Check' },
  { value: 'other', label: 'Other' }
];

const currencies = [
  { value: 'BDT', label: 'BDT' },
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
];

export default function Expenses() {
  const navigate = useNavigate();
  const { formatCurrency, formatDate } = useFormatting();
  
  // State
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all-categories');
  const [selectedStatus, setSelectedStatus] = useState<string>('all-status');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all-payment-methods');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<string>('desc');
  
  // Form data
  const [formData, setFormData] = useState<ExpenseFormData>({
    title: '',
    description: '',
    category_id: '',
    amount: '',
    currency: 'BDT',
    expense_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    vendor_name: '',
    vendor_contact: '',
    receipt_number: '',
    department: '',
    project: '',
    notes: '',
    receipt_file: undefined
  });

  // Load data
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params: any = {
        page: currentPage,
        limit: pageSize,
        sortBy,
        sortOrder
      };

      if (searchTerm) params.search = searchTerm;
      if (selectedCategory !== 'all-categories') params.category_id = selectedCategory;
      if (selectedStatus !== 'all-status') params.status = selectedStatus;
      if (selectedPaymentMethod !== 'all-payment-methods') params.payment_method = selectedPaymentMethod;

      const response = await ApiService.getExpenses(params);
      setExpenses(response.expenses);
      setTotalPages(response.total_pages);
      setTotalExpenses(response.total);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load expenses');
      }
    } finally {
      setLoading(false);
    }
  };

  // Load expense categories
  const loadExpenseCategories = async () => {
    try {
      const categories = await ApiService.getActiveExpenseCategories();
      setExpenseCategories(categories);
    } catch (err) {
      console.error('Failed to load expense categories:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentPage, pageSize, sortBy, sortOrder, searchTerm, selectedCategory, selectedStatus, selectedPaymentMethod]);

  useEffect(() => {
    loadExpenseCategories();
  }, []);

  // Form handlers
  const handleInputChange = (field: keyof ExpenseFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category_id: '',
      amount: '',
      currency: 'BDT',
      expense_date: new Date().toISOString().split('T')[0],
      payment_method: 'cash',
      vendor_name: '',
      vendor_contact: '',
      receipt_number: '',
      department: '',
      project: '',
      notes: '',
      receipt_file: undefined
    });
  };

  const handleFileChange = (file: File | null) => {
    setFormData(prev => ({ ...prev, receipt_file: file || undefined }));
  };

  // Cleanup object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (formData.receipt_file) {
        URL.revokeObjectURL(URL.createObjectURL(formData.receipt_file));
      }
    };
  }, [formData.receipt_file]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const expenseData = {
        ...formData,
        category_id: parseInt(formData.category_id),
        amount: parseFloat(formData.amount)
      };

      // Remove receipt_file from the data object as it's handled separately
      delete expenseData.receipt_file;

      if (editingExpense) {
        await ApiService.updateExpense(editingExpense.id, expenseData);
        
        // If there's a new receipt file, upload it separately
        if (formData.receipt_file) {
          await ApiService.updateExpenseReceipt(editingExpense.id, formData.receipt_file);
        }
        
        toast.success('Expense updated successfully');
        setIsEditDialogOpen(false);
        setEditingExpense(null);
      } else {
        // Use the new API method that supports file upload
        await ApiService.createExpenseWithReceipt(expenseData, formData.receipt_file);
        toast.success('Expense created successfully');
        setIsAddDialogOpen(false);
      }
      
      resetForm();
      loadData();
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error('Failed to save expense');
      }
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      title: expense.title,
      description: expense.description || '',
      category_id: expense.category_id.toString(),
      amount: expense.amount.toString(),
      currency: expense.currency,
      expense_date: expense.expense_date,
      payment_method: expense.payment_method,
      vendor_name: expense.vendor_name || '',
      vendor_contact: expense.vendor_contact || '',
      receipt_number: expense.receipt_number || '',
      department: expense.department || '',
      project: expense.project || '',
      notes: expense.notes || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    
    try {
      await ApiService.deleteExpense(id);
      toast.success('Expense deleted successfully');
      loadData();
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error('Failed to delete expense');
      }
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await ApiService.approveExpense(id);
      toast.success('Expense approved successfully');
      loadData();
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error('Failed to approve expense');
      }
    }
  };

  const handleReject = async (id: number) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;
    
    try {
      await ApiService.rejectExpense(id, reason);
      toast.success('Expense rejected successfully');
      loadData();
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error('Failed to reject expense');
      }
    }
  };

  const handlePay = async (id: number) => {
    try {
      await ApiService.payExpense(id);
      toast.success('Expense marked as paid successfully');
      loadData();
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error('Failed to mark expense as paid');
      }
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary',
      approved: 'default',
      rejected: 'destructive',
      paid: 'outline'
    } as const;
    
    return <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>{status}</Badge>;
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all-categories');
    setSelectedStatus('all-status');
    setSelectedPaymentMethod('all-payment-methods');
    setCurrentPage(1);
  };

  if (loading && expenses.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span>Loading expenses...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Expenses</h1>
          <p className="text-muted-foreground">Manage and track business expenses</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="w-4 h-4 mr-2" />
                Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Expense</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      placeholder="Enter expense title"
                      required
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Enter expense description"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <Select value={formData.category_id} onValueChange={(value) => handleInputChange('category_id', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {expenseCategories.map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="amount">Amount *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.amount}
                      onChange={(e) => handleInputChange('amount', e.target.value)}
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="currency">Currency</Label>
                    <Select value={formData.currency} onValueChange={(value) => handleInputChange('currency', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((currency) => (
                          <SelectItem key={currency.value} value={currency.value}>
                            {currency.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="expense_date">Expense Date *</Label>
                    <Input
                      id="expense_date"
                      type="date"
                      value={formData.expense_date}
                      onChange={(e) => handleInputChange('expense_date', e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="payment_method">Payment Method</Label>
                    <Select value={formData.payment_method} onValueChange={(value) => handleInputChange('payment_method', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentMethods.map((method) => (
                          <SelectItem key={method.value} value={method.value}>
                            {method.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="vendor_name">Vendor Name</Label>
                    <Input
                      id="vendor_name"
                      value={formData.vendor_name}
                      onChange={(e) => handleInputChange('vendor_name', e.target.value)}
                      placeholder="Enter vendor name"
                    />
                  </div>

                  <div>
                    <Label htmlFor="vendor_contact">Vendor Contact</Label>
                    <Input
                      id="vendor_contact"
                      value={formData.vendor_contact}
                      onChange={(e) => handleInputChange('vendor_contact', e.target.value)}
                      placeholder="Enter vendor contact"
                    />
                  </div>

                  <div>
                    <Label htmlFor="receipt_number">Receipt Number</Label>
                    <Input
                      id="receipt_number"
                      value={formData.receipt_number}
                      onChange={(e) => handleInputChange('receipt_number', e.target.value)}
                      placeholder="Enter receipt number"
                    />
                  </div>

                  <div>
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      value={formData.department}
                      onChange={(e) => handleInputChange('department', e.target.value)}
                      placeholder="Enter department"
                    />
                  </div>

                  <div>
                    <Label htmlFor="project">Project</Label>
                    <Input
                      id="project"
                      value={formData.project}
                      onChange={(e) => handleInputChange('project', e.target.value)}
                      placeholder="Enter project"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      placeholder="Enter additional notes"
                      rows={3}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="receipt">Receipt Image (Optional)</Label>
                    <div className="mt-2">
                      {formData.receipt_file ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 p-3 border rounded-lg bg-accent/30">
                            <Image className="w-5 h-5 text-primary" />
                            <div className="flex-1">
                              <p className="text-sm font-medium">{formData.receipt_file.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {(formData.receipt_file.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleFileChange(null)}
                            >
                              <XIcon className="w-4 h-4" />
                            </Button>
                          </div>
                          {/* Preview the selected file */}
                          <div className="border rounded-lg p-3 bg-accent/30">
                            <p className="text-sm font-medium mb-2">Preview:</p>
                            <img
                              src={URL.createObjectURL(formData.receipt_file)}
                              alt="Receipt preview"
                              className="w-full h-32 object-cover rounded border"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors">
                          <input
                            type="file"
                            id="receipt"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              handleFileChange(file);
                            }}
                            className="hidden"
                          />
                          <label htmlFor="receipt" className="cursor-pointer">
                            <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                              Click to upload receipt image
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              PNG, JPG, GIF up to 5MB
                            </p>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create Expense</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="search"
                  placeholder="Search expenses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="category-filter">Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-categories">All Categories</SelectItem>
                  {expenseCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status-filter">Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-status">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="payment-method-filter">Payment Method</Label>
              <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="All Payment Methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-payment-methods">All Payment Methods</SelectItem>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-between items-center mt-4">
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
            <div className="text-sm text-muted-foreground">
              Showing {expenses.length} of {totalExpenses} expenses
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center py-8">
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={loadData}>Retry</Button>
            </div>
          ) : expenses.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No expenses found</p>
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add First Expense
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Expense #</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium">{expense.expense_number}</TableCell>
                      <TableCell>{expense.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{expense.category_name}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(expense.amount)} {expense.currency}
                      </TableCell>
                      <TableCell>{formatDate(expense.expense_date)}</TableCell>
                      <TableCell>{getStatusBadge(expense.status)}</TableCell>
                      <TableCell>{expense.vendor_name || '-'}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => navigate(`/expenses/${expense.id}`)}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {!['paid', 'approved'].includes(expense.status) && (
                              <DropdownMenuItem onClick={() => navigate(`/expenses/${expense.id}/edit`)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {expense.status === 'pending' && (
                              <>
                                <DropdownMenuItem onClick={() => handleApprove(expense.id)}>
                                  <Check className="w-4 h-4 mr-2" />
                                  Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleReject(expense.id)}>
                                  <X className="w-4 h-4 mr-2" />
                                  Reject
                                </DropdownMenuItem>
                              </>
                            )}
                            {expense.status === 'approved' && (
                              <DropdownMenuItem onClick={() => handlePay(expense.id)}>
                                <DollarSign className="w-4 h-4 mr-2" />
                                Mark as Paid
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {!['paid', 'approved'].includes(expense.status) && (
                              <DropdownMenuItem 
                                onClick={() => handleDelete(expense.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label htmlFor="page-size">Rows per page:</Label>
                  <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(parseInt(value))}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="edit-title">Title *</Label>
                <Input
                  id="edit-title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter expense title"
                  required
                />
              </div>
              
              <div className="md:col-span-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Enter expense description"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="edit-category">Category *</Label>
                <Select value={formData.category_id} onValueChange={(value) => handleInputChange('category_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-amount">Amount *</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit-currency">Currency</Label>
                <Select value={formData.currency} onValueChange={(value) => handleInputChange('currency', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency.value} value={currency.value}>
                        {currency.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-expense_date">Expense Date *</Label>
                <Input
                  id="edit-expense_date"
                  type="date"
                  value={formData.expense_date}
                  onChange={(e) => handleInputChange('expense_date', e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="edit-payment_method">Payment Method</Label>
                <Select value={formData.payment_method} onValueChange={(value) => handleInputChange('payment_method', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-vendor_name">Vendor Name</Label>
                <Input
                  id="edit-vendor_name"
                  value={formData.vendor_name}
                  onChange={(e) => handleInputChange('vendor_name', e.target.value)}
                  placeholder="Enter vendor name"
                />
              </div>

              <div>
                <Label htmlFor="edit-vendor_contact">Vendor Contact</Label>
                <Input
                  id="edit-vendor_contact"
                  value={formData.vendor_contact}
                  onChange={(e) => handleInputChange('vendor_contact', e.target.value)}
                  placeholder="Enter vendor contact"
                />
              </div>

              <div>
                <Label htmlFor="edit-receipt_number">Receipt Number</Label>
                <Input
                  id="edit-receipt_number"
                  value={formData.receipt_number}
                  onChange={(e) => handleInputChange('receipt_number', e.target.value)}
                  placeholder="Enter receipt number"
                />
              </div>

              <div>
                <Label htmlFor="edit-department">Department</Label>
                <Input
                  id="edit-department"
                  value={formData.department}
                  onChange={(e) => handleInputChange('department', e.target.value)}
                  placeholder="Enter department"
                />
              </div>

              <div>
                <Label htmlFor="edit-project">Project</Label>
                <Input
                  id="edit-project"
                  value={formData.project}
                  onChange={(e) => handleInputChange('project', e.target.value)}
                  placeholder="Enter project"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea
                  id="edit-notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Enter additional notes"
                  rows={3}
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="edit-receipt">Receipt Image (Optional)</Label>
                <div className="mt-2 space-y-3">
                  {/* Show existing receipt image if available */}
                  {editingExpense?.receipt_url && !formData.receipt_file && (
                    <div className="border rounded-lg p-3 bg-accent/30">
                      <div className="flex items-center gap-3 mb-3">
                        <Image className="w-5 h-5 text-primary" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">Current Receipt</p>
                          <p className="text-xs text-muted-foreground">
                            Click to view full size
                          </p>
                        </div>
                      </div>
                      <div className="relative group">
                        <img
                          src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${editingExpense.receipt_url}`}
                          alt="Current receipt"
                          className="w-full h-32 object-cover rounded border cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => {
                            // Open image in new tab
                            window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${editingExpense.receipt_url}`, '_blank');
                          }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full p-2">
                            <Image className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Show new file selection */}
                  {formData.receipt_file ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 border rounded-lg bg-accent/30">
                        <Image className="w-5 h-5 text-primary" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{formData.receipt_file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(formData.receipt_file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFileChange(null)}
                        >
                          <XIcon className="w-4 h-4" />
                        </Button>
                      </div>
                      {/* Preview the selected file */}
                      <div className="border rounded-lg p-3 bg-accent/30">
                        <p className="text-sm font-medium mb-2">Preview:</p>
                        <img
                          src={URL.createObjectURL(formData.receipt_file)}
                          alt="Receipt preview"
                          className="w-full h-32 object-cover rounded border"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors">
                      <input
                        type="file"
                        id="edit-receipt"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          handleFileChange(file);
                        }}
                        className="hidden"
                      />
                      <label htmlFor="edit-receipt" className="cursor-pointer">
                        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          {editingExpense?.receipt_url ? 'Replace receipt image' : 'Click to upload receipt image'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          PNG, JPG, GIF up to 5MB
                        </p>
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Update Expense</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
