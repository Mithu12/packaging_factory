import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/sonner';
import { useFormatting } from '@/hooks/useFormatting';
import { ApiService, Expense, ApiError } from '@/services/api';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Check,
  X,
  DollarSign,
  Calendar,
  User,
  Building,
  FileText,
  CreditCard,
  MapPin,
  Tag,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  DollarSign as DollarIcon
} from 'lucide-react';

export default function ExpenseDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { formatCurrency, formatDate, formatDateTime } = useFormatting();
  
  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExpense = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);
      const expenseData = await ApiService.getExpense(parseInt(id));
      setExpense(expenseData);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to load expense details");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpense();
  }, [id]);

  const handleApprove = async () => {
    if (!expense) return;
    
    try {
      await ApiService.approveExpense(expense.id);
      toast.success('Expense approved successfully');
      fetchExpense();
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error('Failed to approve expense');
      }
    }
  };

  const handleReject = async () => {
    if (!expense) return;
    
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;
    
    try {
      await ApiService.rejectExpense(expense.id, reason);
      toast.success('Expense rejected successfully');
      fetchExpense();
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error('Failed to reject expense');
      }
    }
  };

  const handlePay = async () => {
    if (!expense) return;
    
    try {
      await ApiService.payExpense(expense.id);
      toast.success('Expense marked as paid successfully');
      fetchExpense();
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error('Failed to mark expense as paid');
      }
    }
  };

  const handleDelete = async () => {
    if (!expense) return;
    
    if (!confirm('Are you sure you want to delete this expense?')) return;
    
    try {
      await ApiService.deleteExpense(expense.id);
      toast.success('Expense deleted successfully');
      navigate('/expenses');
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error('Failed to delete expense');
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'paid':
        return <DollarIcon className="w-5 h-5 text-blue-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span>Loading expense details...</span>
        </div>
      </div>
    );
  }

  if (error || !expense) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-destructive mb-4">{error || "Expense not found"}</p>
          <Button onClick={() => navigate("/expenses")}>
            Back to Expenses
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate("/expenses")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{expense.title}</h1>
            <p className="text-muted-foreground">Expense #{expense.expense_number}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {expense.status === 'pending' && (
            <>
              <Button onClick={handleApprove} size="sm">
                <Check className="w-4 h-4 mr-2" />
                Approve
              </Button>
              <Button onClick={handleReject} variant="destructive" size="sm">
                <X className="w-4 h-4 mr-2" />
                Reject
              </Button>
            </>
          )}
          {expense.status === 'approved' && (
            <Button onClick={handlePay} size="sm">
              <DollarSign className="w-4 h-4 mr-2" />
              Mark as Paid
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => navigate(`/expenses/${expense.id}/edit`)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Expense Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Expense Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Title</label>
                  <p className="font-medium">{expense.title}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(expense.status)}
                    {getStatusBadge(expense.status)}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Amount</label>
                  <p className="font-medium text-lg">{formatCurrency(expense.amount)} {expense.currency}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Category</label>
                  <p className="font-medium">{expense.category_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Expense Date</label>
                  <p className="font-medium">{formatDate(expense.expense_date)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Payment Method</label>
                  <p className="font-medium capitalize">{expense.payment_method.replace('_', ' ')}</p>
                </div>
                {expense.vendor_name && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Vendor</label>
                    <p className="font-medium">{expense.vendor_name}</p>
                  </div>
                )}
                {expense.vendor_contact && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Vendor Contact</label>
                    <p className="font-medium">{expense.vendor_contact}</p>
                  </div>
                )}
                {expense.receipt_number && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Receipt Number</label>
                    <p className="font-medium">{expense.receipt_number}</p>
                  </div>
                )}
                {expense.department && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Department</label>
                    <p className="font-medium">{expense.department}</p>
                  </div>
                )}
                {expense.project && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Project</label>
                    <p className="font-medium">{expense.project}</p>
                  </div>
                )}
              </div>
              
              {expense.description && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Description</label>
                  <p className="mt-1">{expense.description}</p>
                </div>
              )}

              {expense.notes && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Notes</label>
                  <p className="mt-1 whitespace-pre-wrap">{expense.notes}</p>
                </div>
              )}

              {expense.tags && expense.tags.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Tags</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {expense.tags.map((tag, index) => (
                      <Badge key={index} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Receipt */}
          {expense.receipt_url && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Receipt
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg p-4">
                  <img 
                    src={expense.receipt_url} 
                    alt="Receipt" 
                    className="max-w-full h-auto rounded"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling!.style.display = 'block';
                    }}
                  />
                  <div style={{ display: 'none' }} className="text-center text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-2" />
                    <p>Receipt image not available</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Status Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Created</p>
                  <p className="text-sm text-muted-foreground">
                    by {expense.created_by_name} on {formatDateTime(expense.created_at)}
                  </p>
                </div>
              </div>

              {expense.approved_by && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {expense.status === 'rejected' ? 'Rejected' : 'Approved'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      by {expense.approved_by_name} on {formatDateTime(expense.approved_at!)}
                    </p>
                  </div>
                </div>
              )}

              {expense.paid_by && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium">Paid</p>
                    <p className="text-sm text-muted-foreground">
                      by {expense.paid_by_name} on {formatDateTime(expense.paid_at!)}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate(`/expenses/${expense.id}/edit`)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Expense
              </Button>
              
              {expense.status === 'pending' && (
                <>
                  <Button 
                    className="w-full justify-start"
                    onClick={handleApprove}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                  <Button 
                    variant="destructive" 
                    className="w-full justify-start"
                    onClick={handleReject}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                </>
              )}
              
              {expense.status === 'approved' && (
                <Button 
                  className="w-full justify-start"
                  onClick={handlePay}
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Mark as Paid
                </Button>
              )}
              
              <Separator />
              
              <Button 
                variant="destructive" 
                className="w-full justify-start"
                onClick={handleDelete}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Expense
              </Button>
            </CardContent>
          </Card>

          {/* Expense Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Expense Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-medium">{formatCurrency(expense.amount)} {expense.currency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category:</span>
                <span className="font-medium">{expense.category_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment Method:</span>
                <span className="font-medium capitalize">{expense.payment_method.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <div className="flex items-center gap-2">
                  {getStatusIcon(expense.status)}
                  {getStatusBadge(expense.status)}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
