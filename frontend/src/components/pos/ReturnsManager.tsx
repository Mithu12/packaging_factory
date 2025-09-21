import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ReturnsAPI, SalesReturn, ReturnStats, CreateReturnRequest } from '@/services/returns-api';
import { SalesOrder } from '@/services/types';
import { useToast } from '@/hooks/use-toast';
import { useFormatting } from '@/hooks/useFormatting';
import { Loader2, RotateCcw, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

interface ReturnsManagerProps {
  salesOrders: SalesOrder[];
  onRefresh?: () => void;
}

export const ReturnsManager: React.FC<ReturnsManagerProps> = ({ salesOrders, onRefresh }) => {
  const [returns, setReturns] = useState<SalesReturn[]>([]);
  const [returnStats, setReturnStats] = useState<ReturnStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<number | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [createReturnData, setCreateReturnData] = useState<Partial<CreateReturnRequest>>({
    return_type: 'full',
    reason: 'defective_product',
    items: []
  });

  const { toast } = useToast();
  const { formatCurrency } = useFormatting();

  useEffect(() => {
    loadReturnsData();
  }, []);

  const loadReturnsData = async () => {
    try {
      setLoading(true);
      const [returnsResponse, statsResponse] = await Promise.all([
        ReturnsAPI.getReturns({ page: 1, limit: 10, sortBy: 'return_date', sortOrder: 'desc' }),
        ReturnsAPI.getReturnStats()
      ]);
      
      setReturns(returnsResponse.returns);
      setReturnStats(statsResponse);
    } catch (error) {
      console.error('Error loading returns data:', error);
      toast({
        title: "Error",
        description: "Failed to load returns data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReturn = async () => {
    if (!selectedOrder || !createReturnData.items?.length) {
      toast({
        title: "Error",
        description: "Please select an order and add items to return",
        variant: "destructive",
      });
      return;
    }

    try {
      setProcessing(-1); // Use -1 for create operation
      
      const returnRequest: CreateReturnRequest = {
        original_order_id: selectedOrder.id,
        return_type: createReturnData.return_type as 'full' | 'partial',
        reason: createReturnData.reason!,
        refund_method: createReturnData.refund_method,
        processing_fee: createReturnData.processing_fee || 0,
        notes: createReturnData.notes,
        return_location: createReturnData.return_location,
        items: createReturnData.items!
      };

      await ReturnsAPI.createReturn(returnRequest);
      
      toast({
        title: "Success",
        description: "Return created successfully",
      });
      
      setCreateDialogOpen(false);
      setSelectedOrder(null);
      setCreateReturnData({ return_type: 'full', reason: 'defective_product', items: [] });
      loadReturnsData();
      onRefresh?.();
    } catch (error: any) {
      console.error('Error creating return:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create return",
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleProcessReturn = async (returnId: number, action: 'approved' | 'rejected') => {
    try {
      setProcessing(returnId);
      
      await ReturnsAPI.processReturn(returnId, {
        return_status: action,
        authorization_notes: `Return ${action} by manager`
      });
      
      toast({
        title: "Success",
        description: `Return ${action} successfully`,
      });
      
      loadReturnsData();
    } catch (error: any) {
      console.error('Error processing return:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || `Failed to ${action} return`,
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleCompleteReturn = async (returnId: number) => {
    try {
      setProcessing(returnId);
      
      await ReturnsAPI.completeReturn(returnId);
      
      toast({
        title: "Success",
        description: "Return completed and inventory updated",
      });
      
      loadReturnsData();
      onRefresh?.();
    } catch (error: any) {
      console.error('Error completing return:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to complete return",
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-gray-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'approved':
        return 'default';
      case 'completed':
        return 'default';
      case 'rejected':
        return 'destructive';
      case 'cancelled':
        return 'outline';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Returns Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Returns & Refunds</h2>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4" />
              Process Return
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Return</DialogTitle>
              <DialogDescription>
                Select an order and specify the items to be returned
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Order Selection */}
              <div className="space-y-2">
                <Label htmlFor="order-select">Select Order</Label>
                <Select 
                  value={selectedOrder?.id.toString() || ""} 
                  onValueChange={(value) => {
                    const order = salesOrders.find(o => o.id === parseInt(value));
                    setSelectedOrder(order || null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an order to return" />
                  </SelectTrigger>
                  <SelectContent>
                    {salesOrders.filter(order => order.status === 'completed').map((order) => (
                      <SelectItem key={order.id} value={order.id.toString()}>
                        {order.order_number} - {order.customer_name || 'Walk-in'} - {formatCurrency(order.total_amount)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedOrder && (
                <>
                  {/* Return Type */}
                  <div className="space-y-2">
                    <Label htmlFor="return-type">Return Type</Label>
                    <Select 
                      value={createReturnData.return_type} 
                      onValueChange={(value) => setCreateReturnData(prev => ({ ...prev, return_type: value as 'full' | 'partial' }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full">Full Return</SelectItem>
                        <SelectItem value="partial">Partial Return</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Return Reason */}
                  <div className="space-y-2">
                    <Label htmlFor="reason">Reason for Return</Label>
                    <Select 
                      value={createReturnData.reason} 
                      onValueChange={(value) => setCreateReturnData(prev => ({ ...prev, reason: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="defective_product">Defective Product</SelectItem>
                        <SelectItem value="wrong_product">Wrong Product</SelectItem>
                        <SelectItem value="customer_change_mind">Customer Changed Mind</SelectItem>
                        <SelectItem value="damaged_in_transit">Damaged in Transit</SelectItem>
                        <SelectItem value="not_as_described">Not as Described</SelectItem>
                        <SelectItem value="quality_issue">Quality Issue</SelectItem>
                        <SelectItem value="expired_product">Expired Product</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Additional notes about the return..."
                      value={createReturnData.notes || ''}
                      onChange={(e) => setCreateReturnData(prev => ({ ...prev, notes: e.target.value }))}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleCreateReturn}
                      disabled={processing === -1}
                    >
                      {processing === -1 && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Create Return
                    </Button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Returns Stats */}
      {returnStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Returns</CardTitle>
              <RotateCcw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{returnStats.total_returns}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Returns</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{returnStats.pending_returns}</div>
              <p className="text-xs text-muted-foreground">Awaiting approval</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Refund Amount</CardTitle>
              <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(returnStats.total_refund_amount)}</div>
              <p className="text-xs text-muted-foreground">Total refunded</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Return Rate</CardTitle>
              <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{returnStats.return_rate_percentage.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">Of total sales</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Returns */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Returns</CardTitle>
          <CardDescription>Latest return requests and their status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {returns.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No returns found</p>
              </div>
            ) : (
              returns.map((returnItem) => (
                <div key={returnItem.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{returnItem.return_number}</Badge>
                      <span className="text-sm font-medium">Order #{returnItem.original_order_number}</span>
                      {getStatusIcon(returnItem.return_status)}
                    </div>
                    <p className="text-sm text-gray-500">
                      Customer: {returnItem.customer_name || 'Walk-in'} • Reason: {returnItem.reason.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-gray-400">
                      Refund: {formatCurrency(returnItem.final_refund_amount)} • 
                      {new Date(returnItem.return_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusBadgeVariant(returnItem.return_status)} className="capitalize">
                      {returnItem.return_status}
                    </Badge>
                    {returnItem.return_status === 'pending' && (
                      <div className="flex gap-1">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleProcessReturn(returnItem.id, 'approved')}
                          disabled={processing === returnItem.id}
                        >
                          {processing === returnItem.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Approve'}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleProcessReturn(returnItem.id, 'rejected')}
                          disabled={processing === returnItem.id}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                    {returnItem.return_status === 'approved' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleCompleteReturn(returnItem.id)}
                        disabled={processing === returnItem.id}
                      >
                        {processing === returnItem.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Complete'}
                      </Button>
                    )}
                    {(returnItem.return_status === 'completed' || returnItem.return_status === 'rejected') && (
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
