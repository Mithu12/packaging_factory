"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useFormatting } from '@/hooks/useFormatting';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileText, 
  DollarSign, 
  Receipt,
  User,
  Calendar,
  AlertCircle
} from 'lucide-react';

// Types for approval system
interface ApprovalItem {
  id: number;
  entity_type: 'purchase_order' | 'payment' | 'expense';
  entity_number?: string;
  title?: string;
  amount: number;
  submitted_at: string;
  submitted_by: number;
  submitted_by_name?: string;
  approval_status: 'draft' | 'submitted' | 'approved' | 'rejected';
  approval_notes?: string;
  supplier_name?: string;
  category_name?: string;
}

interface ApprovalHistory {
  id: number;
  action: 'submitted' | 'approved' | 'rejected' | 'revised';
  performed_by: number;
  performer_name?: string;
  performed_at: string;
  notes?: string;
  previous_status?: string;
  new_status?: string;
}

const Approvals = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { formatCurrency, formatDate } = useFormatting();
  
  const [pendingPurchaseOrders, setPendingPurchaseOrders] = useState<ApprovalItem[]>([]);
  const [pendingPayments, setPendingPayments] = useState<ApprovalItem[]>([]);
  const [pendingExpenses, setPendingExpenses] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Approval dialog state
  const [approvalDialog, setApprovalDialog] = useState<{
    open: boolean;
    item: ApprovalItem | null;
    action: 'approve' | 'reject' | null;
  }>({
    open: false,
    item: null,
    action: null
  });
  const [approvalNotes, setApprovalNotes] = useState('');
  
  // History dialog state
  const [historyDialog, setHistoryDialog] = useState<{
    open: boolean;
    item: ApprovalItem | null;
    history: ApprovalHistory[];
  }>({
    open: false,
    item: null,
    history: []
  });

  // Check if user can approve
  const canApprove = user?.role === 'admin' || user?.role === 'accounts';

  // Mock data fetching functions (replace with actual API calls)
  const fetchPendingApprovals = async () => {
    setLoading(true);
    try {
      // Mock data - replace with actual API calls
      setPendingPurchaseOrders([
        {
          id: 1,
          entity_type: 'purchase_order',
          entity_number: 'PO-2024-001',
          amount: 15000,
          submitted_at: '2024-01-15T10:00:00Z',
          submitted_by: 2,
          submitted_by_name: 'John Manager',
          approval_status: 'submitted',
          supplier_name: 'ABC Supplies Ltd'
        }
      ]);
      
      setPendingPayments([
        {
          id: 1,
          entity_type: 'payment',
          entity_number: 'PAY-2024-001',
          amount: 5000,
          submitted_at: '2024-01-15T14:00:00Z',
          submitted_by: 3,
          submitted_by_name: 'Jane Employee',
          approval_status: 'submitted',
          supplier_name: 'XYZ Corporation'
        }
      ]);
      
      setPendingExpenses([
        {
          id: 1,
          entity_type: 'expense',
          entity_number: 'EXP-2024-001',
          title: 'Office Supplies',
          amount: 500,
          submitted_at: '2024-01-15T16:00:00Z',
          submitted_by: 4,
          submitted_by_name: 'Bob Employee',
          approval_status: 'submitted',
          category_name: 'Office Expenses'
        }
      ]);
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch pending approvals',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Process approval action
  const processApproval = async () => {
    if (!approvalDialog.item || !approvalDialog.action) return;
    
    setActionLoading(true);
    try {
      // Mock API call - replace with actual implementation
      console.log(`${approvalDialog.action}ing ${approvalDialog.item.entity_type} ${approvalDialog.item.id}`, {
        notes: approvalNotes
      });
      
      // Update the item status locally
      const newStatus = approvalDialog.action === 'approve' ? 'approved' : 'rejected';
      const updateItems = (items: ApprovalItem[]) => 
        items.filter(item => !(item.id === approvalDialog.item!.id && item.entity_type === approvalDialog.item!.entity_type));
      
      switch (approvalDialog.item.entity_type) {
        case 'purchase_order':
          setPendingPurchaseOrders(updateItems);
          break;
        case 'payment':
          setPendingPayments(updateItems);
          break;
        case 'expense':
          setPendingExpenses(updateItems);
          break;
      }
      
      toast({
        title: `${approvalDialog.action === 'approve' ? 'Approved' : 'Rejected'}`,
        description: `${approvalDialog.item.entity_type.replace('_', ' ')} has been ${approvalDialog.action === 'approve' ? 'approved' : 'rejected'} successfully`,
      });
      
      // Close dialog
      setApprovalDialog({ open: false, item: null, action: null });
      setApprovalNotes('');
      
    } catch (error) {
      console.error('Error processing approval:', error);
      toast({
        title: 'Error',
        description: `Failed to ${approvalDialog.action} the item`,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // View approval history
  const viewHistory = async (item: ApprovalItem) => {
    try {
      // Mock history data - replace with actual API call
      const mockHistory: ApprovalHistory[] = [
        {
          id: 1,
          action: 'submitted',
          performed_by: item.submitted_by,
          performer_name: item.submitted_by_name,
          performed_at: item.submitted_at,
          notes: 'Submitted for approval',
          previous_status: 'draft',
          new_status: 'submitted'
        }
      ];
      
      setHistoryDialog({
        open: true,
        item,
        history: mockHistory
      });
    } catch (error) {
      console.error('Error fetching approval history:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch approval history',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (canApprove) {
      fetchPendingApprovals();
    }
  }, [canApprove]);

  // If user cannot approve, show access denied
  if (!canApprove) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground text-center">
              You don't have permission to view approvals. Only Admin and Accounts users can access this page.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render approval item card
  const renderApprovalItem = (item: ApprovalItem) => {
    const getIcon = () => {
      switch (item.entity_type) {
        case 'purchase_order':
          return <FileText className="h-4 w-4" />;
        case 'payment':
          return <DollarSign className="h-4 w-4" />;
        case 'expense':
          return <Receipt className="h-4 w-4" />;
      }
    };

    const getTitle = () => {
      switch (item.entity_type) {
        case 'purchase_order':
          return item.entity_number || `Purchase Order #${item.id}`;
        case 'payment':
          return item.entity_number || `Payment #${item.id}`;
        case 'expense':
          return item.title || item.entity_number || `Expense #${item.id}`;
      }
    };

    const getSubtitle = () => {
      switch (item.entity_type) {
        case 'purchase_order':
          return item.supplier_name || 'Unknown Supplier';
        case 'payment':
          return item.supplier_name || 'Unknown Supplier';
        case 'expense':
          return item.category_name || 'Unknown Category';
      }
    };

    return (
      <Card key={`${item.entity_type}-${item.id}`} className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <div className="p-2 bg-primary/10 rounded-lg">
                {getIcon()}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm">{getTitle()}</h4>
                <p className="text-sm text-muted-foreground">{getSubtitle()}</p>
                <div className="flex items-center space-x-4 mt-2">
                  <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>{item.submitted_by_name}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(item.submitted_at)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-end space-y-2">
              <div className="text-right">
                <div className="font-medium">{formatCurrency(item.amount)}</div>
                <Badge variant="outline" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  Pending
                </Badge>
              </div>
              
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => viewHistory(item)}
                >
                  History
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setApprovalDialog({ open: true, item, action: 'reject' })}
                >
                  <XCircle className="h-3 w-3 mr-1" />
                  Reject
                </Button>
                <Button
                  size="sm"
                  onClick={() => setApprovalDialog({ open: true, item, action: 'approve' })}
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Approve
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Approvals</h1>
        <p className="text-muted-foreground">Review and approve pending purchase orders, payments, and expenses</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Purchase Orders</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingPurchaseOrders.length}</div>
            <p className="text-xs text-muted-foreground">Pending approval</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payments</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingPayments.length}</div>
            <p className="text-xs text-muted-foreground">Pending approval</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expenses</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingExpenses.length}</div>
            <p className="text-xs text-muted-foreground">Pending approval</p>
          </CardContent>
        </Card>
      </div>

      {/* Approval Items */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Approvals</CardTitle>
          <CardDescription>Items waiting for your approval</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="purchase_orders" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="purchase_orders">
                Purchase Orders ({pendingPurchaseOrders.length})
              </TabsTrigger>
              <TabsTrigger value="payme">
                Payments ({pendingPayments.length})
              </TabsTrigger>
              <TabsTrigger value="expenses">
                Expenses ({pendingExpenses.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="purchase_orders" className="mt-4">
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : pendingPurchaseOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No pending purchase orders
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingPurchaseOrders.map(renderApprovalItem)}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="payme" className="mt-4">
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : pendingPayments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No pending payments
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingPayments.map(renderApprovalItem)}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="expenses" className="mt-4">
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : pendingExpenses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No pending expenses
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingExpenses.map(renderApprovalItem)}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Approval Dialog */}
      <Dialog open={approvalDialog.open} onOpenChange={(open) => !open && setApprovalDialog({ open: false, item: null, action: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalDialog.action === 'approve' ? 'Approve' : 'Reject'} {approvalDialog.item?.entity_type?.replace('_', ' ')}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to {approvalDialog.action} this {approvalDialog.item?.entity_type?.replace('_', ' ')}?
            </DialogDescription>
          </DialogHeader>
          
          {approvalDialog.item && (
            <div className="py-4">
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="font-medium">Amount:</span>
                  <span>{formatCurrency(approvalDialog.item.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Submitted by:</span>
                  <span>{approvalDialog.item.submitted_by_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Submitted at:</span>
                  <span>{formatDate(approvalDialog.item.submitted_at)}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="approval-notes">Notes (optional)</Label>
                <Textarea
                  id="approval-notes"
                  placeholder={`Add notes for this ${approvalDialog.action}...`}
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setApprovalDialog({ open: false, item: null, action: null })}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button 
              onClick={processApproval}
              disabled={actionLoading}
              variant={approvalDialog.action === 'reject' ? 'destructive' : 'default'}
            >
              {actionLoading ? 'Processing...' : approvalDialog.action === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyDialog.open} onOpenChange={(open) => !open && setHistoryDialog({ open: false, item: null, history: [] })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Approval History</DialogTitle>
            <DialogDescription>
              History of actions performed on this {historyDialog.item?.entity_type?.replace('_', ' ')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 max-h-96 overflow-y-auto">
            {historyDialog.history.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No history available
              </div>
            ) : (
              <div className="space-y-4">
                {historyDialog.history.map((entry, index) => (
                  <div key={entry.id} className="flex space-x-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        {entry.action === 'approved' ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : entry.action === 'rejected' ? (
                          <XCircle className="h-4 w-4 text-red-600" />
                        ) : (
                          <Clock className="h-4 w-4 text-blue-600" />
                        )}
                      </div>
                      {index < historyDialog.history.length - 1 && (
                        <div className="w-px h-8 bg-border mt-2" />
                      )}
                    </div>
                    
                    <div className="flex-1 pb-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium capitalize">{entry.action}</h4>
                        <time className="text-xs text-muted-foreground">
                          {formatDate(entry.performed_at)}
                        </time>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        by {entry.performer_name}
                      </p>
                      {entry.notes && (
                        <p className="text-sm mt-1">{entry.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setHistoryDialog({ open: false, item: null, history: [] })}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Approvals;
