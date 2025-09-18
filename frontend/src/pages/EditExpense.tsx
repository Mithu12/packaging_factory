import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/sonner';
import { useFormatting } from '@/hooks/useFormatting';
import { ApiService, Expense, ExpenseCategory, ApiError } from '@/services/api';
import {
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
  { value: 'GBP', label: 'GBP' },
  { value: 'CAD', label: 'CAD' },
  { value: 'AUD', label: 'AUD' }
];

export default function EditExpense() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { formatCurrency, formatDate } = useFormatting();
  
  // State
  const [expense, setExpense] = useState<Expense | null>(null);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form data
  const [formData, setFormData] = useState<ExpenseFormData>({
    title: '',
    description: '',
    category_id: '',
    amount: '',
    currency: 'USD',
    expense_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    vendor_name: '',
    vendor_contact: '',
    receipt_number: '',
    department: '',
    project: '',
    notes: ''
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
        notes: expenseData.notes || ''
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

  // Form handlers
  const handleInputChange = (field: keyof ExpenseFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canEdit) {
      toast.error('This expense cannot be edited');
      return;
    }
    
    try {
      setSaving(true);
      
      const expenseData = {
        ...formData,
        category_id: parseInt(formData.category_id),
        amount: parseFloat(formData.amount)
      };

      await ApiService.updateExpense(parseInt(id!), expenseData);
      toast.success('Expense updated successfully');
      navigate(`/expenses/${id}`);
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
          <Button variant="outline" onClick={() => navigate('/expenses')}>
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
          <Button variant="outline" onClick={() => navigate('/expenses')}>
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
        <Button variant="outline" onClick={() => navigate('/expenses')}>
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
            </div>

            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => navigate(`/expenses/${id}`)}
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
