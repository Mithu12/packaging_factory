"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from "next/navigation";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';
import { useFormatting } from '@/hooks/useFormatting';
import { ApiService, Expense, ExpenseCategory, ApiError } from '@/services/api';
import { CostCentersApiService, CostCenter } from '@/services/accounts-api';
import {
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle,
  Upload,
  Image,
  X as XIcon
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getImagePath } from '@/utils/image.utils';

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
  cost_center_id: string;
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
  { value: 'GBP', label: 'GBP' },
  { value: 'CAD', label: 'CAD' },
  { value: 'AUD', label: 'AUD' }
];

export default function EditExpensePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { formatCurrency, formatDate } = useFormatting();
  
  // State
  const [expense, setExpense] = useState<Expense | null>(null);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [accountPreview, setAccountPreview] = useState<{ id: number; name: string; code: string } | null>(null);
  const [accountPreviewLoading, setAccountPreviewLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
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
    cost_center_id: '',
    receipt_file: undefined
  });

  // Check if expense can be edited
  const canEdit = expense && !['paid', 'approved'].includes(expense.status);

  // Load expense data
  const loadExpense = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const expenseData = await ApiService.getExpense(parseInt(id));
      setExpense(expenseData);
      
      // Populate form with expense data
      setFormData({
        title: expenseData.title,
        description: expenseData.description || '',
        category_id: expenseData.category_id.toString(),
        amount: expenseData.amount.toString(),
        currency: expenseData.currency,
        expense_date: expenseData.expense_date,
        payment_method: expenseData.payment_method,
        vendor_name: expenseData.vendor_name || '',
        vendor_contact: expenseData.vendor_contact || '',
        receipt_number: expenseData.receipt_number || '',
        department: expenseData.department || '',
        project: expenseData.project || '',
        notes: expenseData.notes || '',
        cost_center_id: expenseData.cost_center_id?.toString() || ''
      });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load expense');
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
    loadExpense();
    loadExpenseCategories();
  }, [id]);

  // Load cost centers
  useEffect(() => {
    const loadCostCenters = async () => {
      try {
        const response = await CostCentersApiService.getCostCenters({ limit: 500, status: 'Active' });
        setCostCenters(response.data || []);
      } catch (err) {
        console.error('Failed to load cost centers:', err);
        setCostCenters([]);
      }
    };
    loadCostCenters();
  }, []);

  // Fetch account preview when category or cost center changes
  useEffect(() => {
    if (!formData.category_id) {
      setAccountPreview(null);
      return;
    }
    const categoryId = parseInt(formData.category_id);
    if (isNaN(categoryId)) {
      setAccountPreview(null);
      return;
    }
    const costCenterId = formData.cost_center_id ? parseInt(formData.cost_center_id) : undefined;
    setAccountPreviewLoading(true);
    ApiService.getExpenseAccountPreview(categoryId, costCenterId)
      .then((res) => setAccountPreview(res.account))
      .catch(() => setAccountPreview(null))
      .finally(() => setAccountPreviewLoading(false));
  }, [formData.category_id, formData.cost_center_id]);

  // Form handlers
  const handleInputChange = (field: keyof ExpenseFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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
    
    if (!canEdit) {
      toast.error('This expense cannot be edited');
      return;
    }
    
    try {
      setSaving(true);
      
      const expenseData: Record<string, unknown> = {
        ...formData,
        category_id: parseInt(formData.category_id),
        amount: parseFloat(formData.amount),
        cost_center_id: formData.cost_center_id ? parseInt(formData.cost_center_id) : null
      };

      // Remove receipt_file from the data object as it's handled separately
      delete (expenseData as any).receipt_file;

      await ApiService.updateExpense(parseInt(id!), expenseData);
      
      // If there's a new receipt file, upload it separately
      if (formData.receipt_file) {
        await ApiService.updateExpenseReceipt(parseInt(id!), formData.receipt_file);
      }
      
      toast.success('Expense updated successfully');
      router.push(`/expenses/${id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error('Failed to update expense');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading expense...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push('/expenses')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Expenses
          </Button>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={loadExpense}>Retry</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.push('/expenses')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Expenses
          </Button>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground">Expense not found</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.push('/expenses')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Expenses
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit Expense</h1>
          <p className="text-muted-foreground">
            Expense #{expense.expense_number} - {expense.title}
          </p>
        </div>
      </div>

      {/* Edit Restriction Alert */}
      {!canEdit && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This expense cannot be edited because it has been {expense.status}. 
            Only pending and rejected expenses can be modified.
          </AlertDescription>
        </Alert>
      )}

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Expense Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter expense title"
                  required
                  disabled={!canEdit}
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
                  disabled={!canEdit}
                />
              </div>

              <div>
                <Label htmlFor="category">Category *</Label>
                <Select 
                  value={formData.category_id} 
                  onValueChange={(value) => handleInputChange('category_id', value)}
                  disabled={!canEdit}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCategories?.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="cost_center">Cost Center</Label>
                <Select 
                  value={formData.cost_center_id || 'none'} 
                  onValueChange={(value) => handleInputChange('cost_center_id', value === 'none' ? '' : value)}
                  disabled={!canEdit}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select cost center" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {costCenters.map((cc) => (
                      <SelectItem key={cc.id} value={cc.id.toString()}>
                        {cc.name} ({cc.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.category_id && (
                <div className="md:col-span-2 space-y-2">
                  {accountPreviewLoading ? (
                    <p className="text-sm text-muted-foreground">Loading expense account...</p>
                  ) : accountPreview ? (
                    <p className="text-sm text-muted-foreground">
                      Expense account: <span className="font-medium">{accountPreview.code} - {accountPreview.name}</span>
                    </p>
                  ) : (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        No expense account configured for this category and cost center. Accounting integration may fail when the expense is approved.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

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
                  disabled={!canEdit}
                />
              </div>

              <div>
                <Label htmlFor="currency">Currency</Label>
                <Select 
                  value={formData.currency} 
                  onValueChange={(value) => handleInputChange('currency', value)}
                  disabled={!canEdit}
                >
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
                  disabled={!canEdit}
                />
              </div>

              <div>
                <Label htmlFor="payment_method">Payment Method</Label>
                <Select 
                  value={formData.payment_method} 
                  onValueChange={(value) => handleInputChange('payment_method', value)}
                  disabled={!canEdit}
                >
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
                  disabled={!canEdit}
                />
              </div>

              <div>
                <Label htmlFor="vendor_contact">Vendor Contact</Label>
                <Input
                  id="vendor_contact"
                  value={formData.vendor_contact}
                  onChange={(e) => handleInputChange('vendor_contact', e.target.value)}
                  placeholder="Enter vendor contact"
                  disabled={!canEdit}
                />
              </div>

              <div>
                <Label htmlFor="receipt_number">Receipt Number</Label>
                <Input
                  id="receipt_number"
                  value={formData.receipt_number}
                  onChange={(e) => handleInputChange('receipt_number', e.target.value)}
                  placeholder="Enter receipt number"
                  disabled={!canEdit}
                />
              </div>

              <div>
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => handleInputChange('department', e.target.value)}
                  placeholder="Enter department"
                  disabled={!canEdit}
                />
              </div>

              <div>
                <Label htmlFor="project">Project</Label>
                <Input
                  id="project"
                  value={formData.project}
                  onChange={(e) => handleInputChange('project', e.target.value)}
                  placeholder="Enter project"
                  disabled={!canEdit}
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
                  disabled={!canEdit}
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="receipt">Receipt Image (Optional)</Label>
                <div className="mt-2 space-y-3">
                  {/* Show existing receipt image if available */}
                  {expense?.receipt_url && !formData.receipt_file && (
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
                          src={getImagePath(expense.receipt_url)}
                          alt="Current receipt"
                          className="w-full h-32 object-cover rounded border cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => {
                            window.open(getImagePath(expense.receipt_url), '_blank');
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
                        disabled={!canEdit}
                      >
                        <XIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className={`border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center transition-colors ${
                      canEdit ? 'hover:border-muted-foreground/50 cursor-pointer' : 'opacity-50'
                    }`}>
                      <input
                        type="file"
                        id="receipt"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          handleFileChange(file);
                        }}
                        className="hidden"
                        disabled={!canEdit}
                      />
                      <label htmlFor="receipt" className={canEdit ? "cursor-pointer" : "cursor-not-allowed"}>
                        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          {expense?.receipt_url ? 'Replace receipt image' : 'Click to upload receipt image'}
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
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => router.push(`/expenses/${id}`)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={!canEdit || saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
