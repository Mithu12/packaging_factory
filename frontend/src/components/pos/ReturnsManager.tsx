import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ReturnsAPI, SalesReturn, ReturnStats, CreateReturnRequest } from '@/services/returns-api';
import { SalesOrder, SalesOrderLineItem } from '@/services/types';
import { SalesOrderApi } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { useFormatting } from '@/hooks/useFormatting';
import { Loader2, RotateCcw, CheckCircle, XCircle, Clock, AlertCircle, Package } from 'lucide-react';

interface ReturnsManagerProps {
  salesOrders: SalesOrder[];
  onRefresh?: () => void;
}

export const ReturnsManager: React.FC<ReturnsManagerProps> = ({ salesOrders, onRefresh }) => {
  const [returns, setReturns] = useState<SalesReturn[]>([]);
  const [returnStats, setReturnStats] = useState<ReturnStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [paginationLoading, setPaginationLoading] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 0
  });
  const [processing, setProcessing] = useState<number | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedReturnForView, setSelectedReturnForView] = useState<any>(null);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [orderLineItems, setOrderLineItems] = useState<SalesOrderLineItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<{[key: number]: {selected: boolean, quantity: number, condition: string}}>({});
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

  const loadReturnsData = async (page: number = pagination.currentPage, pageSize: number = pagination.pageSize) => {
    try {
      if (page === 1 && pageSize === pagination.pageSize) {
        setLoading(true);
      } else {
        setPaginationLoading(true);
      }
      const [returnsResponse, statsResponse] = await Promise.all([
        ReturnsAPI.getReturns({ 
          page, 
          limit: pageSize, 
          sortBy: 'return_date', 
          sortOrder: 'desc' 
        }),
        ReturnsAPI.getReturnStats()
      ]);
      
      console.log({returnsResponse});
      
      // Handle the response structure
      if (returnsResponse?.data) {
        setReturns(returnsResponse.data);
        setPagination({
          currentPage: page,
          pageSize: pageSize,
          totalItems: returnsResponse.totalItems || 0,
          totalPages: returnsResponse.totalPages || Math.ceil((returnsResponse.total || 0) / pageSize)
        });
      } else {
        // Fallback for different response structure
        setReturns(Array.isArray(returnsResponse) ? returnsResponse : []);
        setPagination(prev => ({ ...prev, currentPage: page, pageSize }));
      }
      
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
      setPaginationLoading(false);
    }
  };

  const loadOrderLineItems = async (orderId: number) => {
    try {
      // Fetch the order details with line items from the API
      const orderWithDetails = await SalesOrderApi.getSalesOrder(orderId);
      
      if (orderWithDetails && orderWithDetails.line_items) {
        setOrderLineItems(orderWithDetails.line_items);
        // Initialize selection state
        const initialSelection: {[key: number]: {selected: boolean, quantity: number, condition: string}} = {};
        orderWithDetails.line_items.forEach(item => {
          initialSelection[item.id] = {
            selected: false,
            quantity: item.quantity,
            condition: 'good'
          };
        });
        setSelectedItems(initialSelection);
      } else {
        setOrderLineItems([]);
        setSelectedItems({});
      }
    } catch (error) {
      console.error('Error loading order line items:', error);
      toast({
        title: "Error",
        description: "Failed to load order items",
        variant: "destructive",
      });
    }
  };

  const handleOrderSelection = async (orderId: string) => {
    const order = salesOrders.find(o => o.id === parseInt(orderId));
    setSelectedOrder(order || null);
    if (order) {
      await loadOrderLineItems(order.id);
    } else {
      setOrderLineItems([]);
      setSelectedItems({});
    }
  };

  const handleItemSelection = (itemId: number, checked: boolean) => {
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        selected: checked
      }
    }));
  };

  const handleQuantityChange = (itemId: number, quantity: number) => {
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        quantity: Math.max(0, quantity)
      }
    }));
  };

  const handleConditionChange = (itemId: number, condition: string) => {
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        condition
      }
    }));
  };

  const handleCreateReturn = async () => {
    if (!selectedOrder) {
      toast({
        title: "Error",
        description: "Please select an order",
        variant: "destructive",
      });
      return;
    }

    // Build items array from selected items
    const selectedItemsArray = Object.entries(selectedItems)
      .filter(([_, itemData]) => itemData.selected && itemData.quantity > 0)
      .map(([itemId, itemData]) => {
        const lineItem = orderLineItems.find(item => item.id === parseInt(itemId));
        if (!lineItem) return null;
        
        return {
          original_line_item_id: lineItem.id,
          product_id: lineItem.product_id,
          returned_quantity: itemData.quantity,
          item_condition: itemData.condition as 'good' | 'damaged' | 'defective' | 'expired' | 'other',
          restockable: itemData.condition === 'good',
          notes: ''
        };
      })
      .filter(Boolean);

    if (selectedItemsArray.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one item to return",
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
        items: selectedItemsArray as any[]
      };

      await ReturnsAPI.createReturn(returnRequest);
      
      toast({
        title: "Success",
        description: "Return created successfully",
      });
      
      setCreateDialogOpen(false);
      setSelectedOrder(null);
      setOrderLineItems([]);
      setSelectedItems({});
      setCreateReturnData({ return_type: 'full', reason: 'defective_product', items: [] });
      loadReturnsData(pagination.currentPage, pagination.pageSize);
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
      
      loadReturnsData(pagination.currentPage, pagination.pageSize);
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
      
      loadReturnsData(pagination.currentPage, pagination.pageSize);
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

  const handleViewReturn = async (returnId: number) => {
    try {
      const returnDetails = await ReturnsAPI.getReturnById(returnId);
      setSelectedReturnForView(returnDetails);
      setViewDialogOpen(true);
    } catch (error: any) {
      console.error('Error fetching return details:', error);
      toast({
        title: "Error",
        description: "Failed to load return details",
        variant: "destructive",
      });
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      loadReturnsData(newPage, pagination.pageSize);
    }
  };

  const handlePageSizeChange = (newPageSize: number) => {
    loadReturnsData(1, newPageSize);
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
                  onValueChange={handleOrderSelection}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an order to return" />
                  </SelectTrigger>
                  <SelectContent>
                    {(() => {
                      const availableOrders = salesOrders.filter(order => order.status === 'completed');
                      
                      if (availableOrders.length === 0) {
                        return (
                          <SelectItem value="no-orders" disabled>
                            No completed orders available
                          </SelectItem>
                        );
                      }
                      
                      return availableOrders.map((order) => {
                        const hasExistingReturn = returns?.some(returnItem => 
                          returnItem.original_order_id === order.id
                        );
                        
                        return (
                          <SelectItem key={order.id} value={order.id.toString()}>
                            {order.order_number} - {order.customer_name || 'Walk-in'} - {formatCurrency(order.total_amount)}
                            {hasExistingReturn && <span className="text-orange-600 ml-2">(Has Returns)</span>}
                          </SelectItem>
                        );
                      });
                    })()}
                  </SelectContent>
                </Select>
              </div>

              {selectedOrder && (
                <>
                  {/* Order Items Selection */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Select Items to Return
                    </Label>
                    {orderLineItems.length > 0 ? (
                      <div className="border rounded-lg max-h-60 overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">Select</TableHead>
                              <TableHead>Product</TableHead>
                              <TableHead>Original Qty</TableHead>
                              <TableHead>Return Qty</TableHead>
                              <TableHead>Condition</TableHead>
                              <TableHead>Price</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {orderLineItems.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell>
                                  <Checkbox
                                    checked={selectedItems[item.id]?.selected || false}
                                    onCheckedChange={(checked) => handleItemSelection(item.id, checked as boolean)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <div className="font-medium">{item.product_name}</div>
                                    <div className="text-xs text-gray-500">SKU: {item.product_sku}</div>
                                  </div>
                                </TableCell>
                                <TableCell>{item.quantity}</TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    min="0"
                                    max={item.quantity}
                                    value={selectedItems[item.id]?.quantity || 0}
                                    onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 0)}
                                    disabled={!selectedItems[item.id]?.selected}
                                    className="w-20"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Select
                                    value={selectedItems[item.id]?.condition || 'good'}
                                    onValueChange={(value) => handleConditionChange(item.id, value)}
                                    disabled={!selectedItems[item.id]?.selected}
                                  >
                                    <SelectTrigger className="w-32">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="good">Good</SelectItem>
                                      <SelectItem value="damaged">Damaged</SelectItem>
                                      <SelectItem value="defective">Defective</SelectItem>
                                      <SelectItem value="expired">Expired</SelectItem>
                                      <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-gray-500">
                        No items found for this order
                      </div>
                    )}
                  </div>

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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Returns</CardTitle>
              <CardDescription>Latest return requests and their status</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadReturnsData(pagination.currentPage, pagination.pageSize)}
              disabled={loading || paginationLoading}
            >
              {(loading || paginationLoading) ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {returns?.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No returns found</p>
              </div>
            ) : (
              returns?.map((returnItem) => (
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
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewReturn(returnItem.id)}
                      >
                        View
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* Pagination Controls */}
          {pagination.totalItems > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t relative">
              {paginationLoading && (
                <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>
                  Showing {((pagination.currentPage - 1) * pagination.pageSize) + 1} to{' '}
                  {Math.min(pagination.currentPage * pagination.pageSize, pagination.totalItems)} of{' '}
                  {pagination.totalItems} returns
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Page Size Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Show:</span>
                  <Select
                    value={pagination.pageSize.toString()}
                    onValueChange={(value) => handlePageSizeChange(parseInt(value))}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Page Navigation */}
                {pagination.totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(1)}
                    disabled={pagination.currentPage === 1 || paginationLoading}
                  >
                    First
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={pagination.currentPage === 1 || paginationLoading}
                  >
                    Previous
                  </Button>
                  
                  {/* Page Numbers */}
                  <div className="flex items-center gap-1">
                    {(() => {
                      const pages = [];
                      const start = Math.max(1, pagination.currentPage - 2);
                      const end = Math.min(pagination.totalPages, pagination.currentPage + 2);
                      
                      for (let i = start; i <= end; i++) {
                        pages.push(
                          <Button
                            key={i}
                            variant={i === pagination.currentPage ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(i)}
                            disabled={paginationLoading}
                            className="w-8 h-8 p-0"
                          >
                            {i}
                          </Button>
                        );
                      }
                      return pages;
                    })()}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={pagination.currentPage === pagination.totalPages || paginationLoading}
                  >
                    Next
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.totalPages)}
                    disabled={pagination.currentPage === pagination.totalPages || paginationLoading}
                  >
                    Last
                  </Button>
                </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Return Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Return Details</DialogTitle>
            <DialogDescription>
              Complete information about this return request
            </DialogDescription>
          </DialogHeader>
          
          {selectedReturnForView && (
            <div className="space-y-6">
              {/* Return Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Return Information</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Return Number:</span> {selectedReturnForView.return_number}</p>
                    <p><span className="font-medium">Original Order:</span> {selectedReturnForView.original_order_number}</p>
                    <p><span className="font-medium">Customer:</span> {selectedReturnForView.customer_name || 'Walk-in'}</p>
                    <p><span className="font-medium">Return Date:</span> {new Date(selectedReturnForView.return_date).toLocaleDateString()}</p>
                    <p><span className="font-medium">Status:</span> 
                      <Badge variant={getStatusBadgeVariant(selectedReturnForView.return_status)} className="ml-2 capitalize">
                        {selectedReturnForView.return_status}
                      </Badge>
                    </p>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Financial Summary</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">Subtotal Returned:</span> {formatCurrency(selectedReturnForView.subtotal_returned)}</p>
                    <p><span className="font-medium">Tax Returned:</span> {formatCurrency(selectedReturnForView.tax_returned)}</p>
                    <p><span className="font-medium">Processing Fee:</span> {formatCurrency(selectedReturnForView.processing_fee || 0)}</p>
                    <p><span className="font-medium text-lg">Final Refund:</span> 
                      <span className="text-lg font-bold ml-2">{formatCurrency(selectedReturnForView.final_refund_amount)}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Return Reason */}
              <div>
                <h3 className="font-semibold mb-2">Return Reason</h3>
                <p className="text-sm bg-gray-50 p-3 rounded">
                  {selectedReturnForView.reason?.replace(/_/g, ' ') || 'No reason provided'}
                </p>
                {selectedReturnForView.notes && (
                  <div className="mt-2">
                    <h4 className="font-medium text-sm">Additional Notes:</h4>
                    <p className="text-sm bg-gray-50 p-3 rounded mt-1">{selectedReturnForView.notes}</p>
                  </div>
                )}
              </div>

              {/* Return Items */}
              {selectedReturnForView.items && selectedReturnForView.items.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Returned Items</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead>Original Qty</TableHead>
                          <TableHead>Returned Qty</TableHead>
                          <TableHead>Condition</TableHead>
                          <TableHead>Unit Price</TableHead>
                          <TableHead>Refund Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedReturnForView.items.map((item: any) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.product_name}</TableCell>
                            <TableCell>{item.product_sku}</TableCell>
                            <TableCell>{item.original_quantity}</TableCell>
                            <TableCell>{item.returned_quantity}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {item.item_condition}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatCurrency(item.original_unit_price)}</TableCell>
                            <TableCell>{formatCurrency(item.line_refund_amount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Processing Information */}
              <div>
                <h3 className="font-semibold mb-2">Processing Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    {selectedReturnForView.approved_by && (
                      <p><span className="font-medium">Approved By:</span> User ID {selectedReturnForView.approved_by}</p>
                    )}
                    {selectedReturnForView.rejected_by && (
                      <p><span className="font-medium">Rejected By:</span> User ID {selectedReturnForView.rejected_by}</p>
                    )}
                    {selectedReturnForView.processed_by && (
                      <p><span className="font-medium">Processed By:</span> User ID {selectedReturnForView.processed_by}</p>
                    )}
                  </div>
                  <div>
                    {selectedReturnForView.completed_at && (
                      <p><span className="font-medium">Completed At:</span> {new Date(selectedReturnForView.completed_at).toLocaleString()}</p>
                    )}
                    <p><span className="font-medium">Last Updated:</span> {new Date(selectedReturnForView.updated_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
