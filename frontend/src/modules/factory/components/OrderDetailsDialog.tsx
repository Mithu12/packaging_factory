import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Calendar,
  Clock,
  DollarSign,
  Mail,
  Phone,
  User,
  Package,
  FileText,
  Edit,
  Printer,
  Download,
  Wallet,
  CreditCard,
  CheckCircle,
  XCircle,
  Route,
  UserCheck,
  AlertTriangle,
  History,
} from "lucide-react";
import { FactoryCustomerOrder, CustomerOrdersApiService, FactoryCustomerPayment } from "../services/customer-orders-api";
import { useFormatting } from "@/hooks/useFormatting";
import { Progress } from "@/components/ui/progress";
import { useRBAC } from "@/contexts/RBACContext";
import { PERMISSIONS } from "@/types/rbac";
import FactoryApiService, { Factory } from "@/services/factory-api";

interface OrderDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: FactoryCustomerOrder | null;
  onEdit?: (order: FactoryCustomerOrder) => void;
  onOrderUpdate?: () => void; // Callback to refresh order list
}

interface WorkflowHistoryItem {
  id: number;
  from_status: string;
  to_status: string;
  changed_by_name: string;
  changed_at: string;
  notes?: string;
}

export default function OrderDetailsDialog({
  open,
  onOpenChange,
  order,
  onEdit,
  onOrderUpdate,
}: OrderDetailsDialogProps) {
  const { formatCurrency, formatDate } = useFormatting();
  const { hasPermission } = useRBAC();
  const [paymentHistory, setPaymentHistory] = useState<FactoryCustomerPayment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [workflowHistory, setWorkflowHistory] = useState<WorkflowHistoryItem[]>([]);
  const [loadingWorkflow, setLoadingWorkflow] = useState(false);
  const [factories, setFactories] = useState<Factory[]>([]);
  const [loadingFactories, setLoadingFactories] = useState(false);
  
  // Approval/Rejection state
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [processingApproval, setProcessingApproval] = useState(false);
  
  // Factory routing state
  const [showRoutingDialog, setShowRoutingDialog] = useState(false);
  const [selectedFactoryId, setSelectedFactoryId] = useState<string>('');
  const [routingNotes, setRoutingNotes] = useState('');
  const [processingRouting, setProcessingRouting] = useState(false);

  // Check permissions
  const canApproveOrders = hasPermission(PERMISSIONS.FACTORY_ORDERS_APPROVE_WORKFLOW);
  const canRouteOrders = hasPermission(PERMISSIONS.FACTORY_ORDERS_ROUTE);

  // Load data when order changes
  useEffect(() => {
    if (order && open) {
      loadPaymentHistory();
      loadWorkflowHistory();
      if (canRouteOrders && order.status === 'approved') {
        loadFactories();
      }
    }
  }, [order?.id, open, canRouteOrders]);

  const loadPaymentHistory = async () => {
    if (!order) return;
    
    try {
      setLoadingPayments(true);
      const response = await CustomerOrdersApiService.getPaymentHistory(order.id.toString());
      setPaymentHistory(response.payments || []);
    } catch (error) {
      console.error('Failed to load payment history:', error);
      setPaymentHistory([]);
    } finally {
      setLoadingPayments(false);
    }
  };

  const loadWorkflowHistory = async () => {
    if (!order) return;
    
    try {
      setLoadingWorkflow(true);
      // This would be a new API endpoint to get workflow history
      // For now, we'll create mock data based on order status
      const mockHistory: WorkflowHistoryItem[] = [];
      
      if (order.status !== 'draft') {
        mockHistory.push({
          id: 1,
          from_status: 'draft',
          to_status: 'pending_approval',
          changed_by_name: order.sales_person || 'Sales Rep',
          changed_at: order.created_at,
          notes: 'Order submitted for approval'
        });
      }
      
      if (['approved', 'rejected', 'routed', 'in_production', 'completed', 'shipped'].includes(order.status)) {
        mockHistory.push({
          id: 2,
          from_status: 'pending_approval',
          to_status: order.status === 'rejected' ? 'rejected' : 'approved',
          changed_by_name: 'Admin User',
          changed_at: order.updated_at || order.created_at,
          notes: order.status === 'rejected' ? 'Order rejected' : 'Order approved'
        });
      }
      
      if (['routed', 'in_production', 'completed', 'shipped'].includes(order.status)) {
        mockHistory.push({
          id: 3,
          from_status: 'approved',
          to_status: 'routed',
          changed_by_name: 'Admin User',
          changed_at: order.updated_at || order.created_at,
          notes: `Order routed to ${order.factory_name || 'factory'}`
        });
      }
      
      setWorkflowHistory(mockHistory);
    } catch (error) {
      console.error('Failed to load workflow history:', error);
      setWorkflowHistory([]);
    } finally {
      setLoadingWorkflow(false);
    }
  };

  const loadFactories = async () => {
    try {
      setLoadingFactories(true);
      const response = await FactoryApiService.getFactories();
      setFactories(response);
    } catch (error) {
      console.error('Failed to load factories:', error);
      setFactories([]);
    } finally {
      setLoadingFactories(false);
    }
  };

  const handleApprovalAction = async () => {
    if (!order) return;
    
    try {
      setProcessingApproval(true);
      await CustomerOrdersApiService.approveCustomerOrder(
        order.id.toString(),
        approvalAction === 'approve',
        approvalNotes || undefined
      );
      
      setShowApprovalDialog(false);
      setApprovalNotes('');
      onOrderUpdate?.();
    } catch (error) {
      console.error('Failed to process approval:', error);
    } finally {
      setProcessingApproval(false);
    }
  };

  const handleFactoryRouting = async () => {
    if (!order || !selectedFactoryId) return;
    
    try {
      setProcessingRouting(true);
      // This would be a new API endpoint for factory routing
      await CustomerOrdersApiService.updateCustomerOrder(order.id.toString(), {
        factory_id: parseInt(selectedFactoryId),
        notes: routingNotes || undefined
      });
      
      setShowRoutingDialog(false);
      setSelectedFactoryId('');
      setRoutingNotes('');
      onOrderUpdate?.();
    } catch (error) {
      console.error('Failed to route order:', error);
    } finally {
      setProcessingRouting(false);
    }
  };

  if (!order) return null;

  const paymentProgress = order.total_value > 0 
    ? (order.paid_amount / order.total_value) * 100 
    : 0;

  const getStatusColor = (status: string) => {
    const colors = {
      draft: "bg-gray-100 text-gray-800",
      pending: "bg-yellow-100 text-yellow-800",
      pending_approval: "bg-orange-100 text-orange-800",
      quoted: "bg-blue-100 text-blue-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      routed: "bg-indigo-100 text-indigo-800",
      in_production: "bg-purple-100 text-purple-800",
      completed: "bg-emerald-100 text-emerald-800",
      shipped: "bg-indigo-100 text-indigo-800",
      cancelled: "bg-gray-100 text-gray-800",
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "draft":
        return <FileText className="h-3 w-3" />;
      case "pending":
        return <Clock className="h-3 w-3" />;
      case "pending_approval":
        return <UserCheck className="h-3 w-3" />;
      case "quoted":
        return <FileText className="h-3 w-3" />;
      case "approved":
        return <CheckCircle className="h-3 w-3" />;
      case "rejected":
        return <XCircle className="h-3 w-3" />;
      case "routed":
        return <Route className="h-3 w-3" />;
      case "in_production":
        return <Package className="h-3 w-3" />;
      case "completed":
        return <CheckCircle className="h-3 w-3" />;
      case "shipped":
        return <Package className="h-3 w-3" />;
      default:
        return <FileText className="h-3 w-3" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: "bg-green-100 text-green-800",
      medium: "bg-yellow-100 text-yellow-800",
      high: "bg-orange-100 text-orange-800",
      urgent: "bg-red-100 text-red-800",
    };
    return colors[priority as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const calculateLineTotal = (quantity: number, unitPrice: number) => {
    return quantity * unitPrice;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Create a simple text representation of the order
    const orderText = `
Order Details
=============

Order Number: ${order.order_number}
Customer: ${order.factory_customer_name}
Email: ${order.factory_customer_email}
Phone: ${order.factory_customer_phone || 'N/A'}
Order Date: ${formatDate(order.order_date)}
Required Date: ${formatDate(order.required_date)}
Status: ${order.status.replace('_', ' ').toUpperCase()}
Priority: ${order.priority.toUpperCase()}
Sales Person: ${order.sales_person}

Line Items:
-----------
${order.line_items.map((item, index) => `
${index + 1}. ${item.product_name} (${item.product_sku})
   Quantity: ${item.quantity}
   Unit Price: ${formatCurrency(item.unit_price)}
   Total: ${formatCurrency(calculateLineTotal(item.quantity, item.unit_price))}
   ${item.notes ? `Notes: ${item.notes}` : ''}
`).join('')}

Total Order Value: ${formatCurrency(order.total_value)} ${order.currency}

${order.notes ? `Notes: ${order.notes}` : ''}
    `.trim();

    const blob = new Blob([orderText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `order-${order.order_number}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="order-details-dialog">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl" data-testid="order-details-title">Order Details</DialogTitle>
              <DialogDescription data-testid="order-details-description">
                Order #{order.order_number} - {order.factory_customer_name}
              </DialogDescription>
            </div>
            <div className="flex space-x-2" data-testid="order-details-actions">
              {/* Approval Actions for Admin Users */}
              {canApproveOrders && order.status === 'pending_approval' && (
                <>
                  <Button 
                    size="sm" 
                    onClick={() => {
                      setApprovalAction('approve');
                      setShowApprovalDialog(true);
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => {
                      setApprovalAction('reject');
                      setShowApprovalDialog(true);
                    }}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </>
              )}
              
              {/* Factory Routing for Admin Users */}
              {canRouteOrders && order.status === 'approved' && (
                <Button 
                  size="sm" 
                  onClick={() => setShowRoutingDialog(true)}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  <Route className="h-4 w-4 mr-2" />
                  Route to Factory
                </Button>
              )}
              
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              {onEdit && (
                <Button size="sm" onClick={() => onEdit(order)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Status and Priority */}
          <div className="flex items-center space-x-4">
            <Badge className={`${getStatusColor(order.status)} flex items-center gap-1`}>
              {getStatusIcon(order.status)}
              {order.status.replace("_", " ").toUpperCase()}
            </Badge>
            <Badge className={getPriorityColor(order.priority)}>
              {order.priority.toUpperCase()} PRIORITY
            </Badge>
            {order.factory_name && (
              <Badge variant="outline">
                Factory: {order.factory_name}
              </Badge>
            )}
          </div>

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Name</div>
                  <div className="text-lg font-semibold">{order.factory_customer_name}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Customer ID</div>
                  <div>{order.factory_customer_id}</div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{order.factory_customer_email}</span>
                </div>
                {order.factory_customer_phone && (
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{order.factory_customer_phone}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Order Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Order Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Order Number</div>
                  <div className="text-lg font-semibold">{order.order_number}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Sales Person</div>
                  <div>{order.sales_person}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Currency</div>
                  <div>{order.currency}</div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Order Date</div>
                    <div>{formatDate(order.order_date)}</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Required Date</div>
                    <div>{formatDate(order.required_date)}</div>
                  </div>
                </div>
              </div>
              {order.notes && (
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">Notes</div>
                  <div className="bg-muted p-3 rounded-md text-sm">{order.notes}</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="h-5 w-5 mr-2" />
                Order Items ({order.line_items.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.line_items.map((item, index) => (
                    <TableRow key={item.id || index}>
                      <TableCell className="font-medium">
                        {item.product_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.product_sku}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(item.unit_price)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(calculateLineTotal(item.quantity, item.unit_price))}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {item.notes || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(order.total_value)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax:</span>
                  <span>-</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Shipping:</span>
                  <span>-</span>
                </div>
                <Separator />
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total:</span>
                  <span>{formatCurrency(order.total_value)} {order.currency}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Wallet className="h-5 w-5 mr-2" />
                Payment Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Value:</span>
                    <span className="font-semibold">{formatCurrency(order.total_value)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Paid Amount:</span>
                    <span className="font-semibold text-green-600">{formatCurrency(order.paid_amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t pt-2">
                    <span className="text-muted-foreground font-semibold">Outstanding Amount:</span>
                    <span className={`font-bold ${order.outstanding_amount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      {formatCurrency(order.outstanding_amount)}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Payment Progress</span>
                    <span>{paymentProgress.toFixed(1)}%</span>
                  </div>
                  <Progress value={paymentProgress} className="h-2" />
                </div>

                {paymentHistory.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold flex items-center">
                          <CreditCard className="h-4 w-4 mr-2" />
                          Payment History ({paymentHistory.length})
                        </h4>
                      </div>
                      <div className="space-y-2">
                        {paymentHistory.map((payment) => (
                          <div key={payment.id} className="flex justify-between items-start p-3 bg-muted rounded-md text-sm">
                            <div className="space-y-1">
                              <div className="font-semibold">{formatCurrency(payment.payment_amount)}</div>
                              <div className="text-xs text-muted-foreground">
                                {payment.payment_method.replace('_', ' ').toUpperCase()}
                                {payment.payment_reference && ` - ${payment.payment_reference}`}
                              </div>
                              {payment.voucher_no && (
                                <div className="text-xs text-blue-600 font-medium">
                                  Voucher: {payment.voucher_no}
                                </div>
                              )}
                              {payment.notes && (
                                <div className="text-xs text-muted-foreground italic">{payment.notes}</div>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground text-right">
                              <div>{formatDate(payment.payment_date)}</div>
                              {payment.recorded_by_username && (
                                <div className="text-xs">by {payment.recorded_by_username}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {loadingPayments && (
                  <div className="text-sm text-muted-foreground text-center py-2">
                    Loading payment history...
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Addresses */}
          {(order.billing_address || order.shipping_address) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {order.billing_address && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Billing Address</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm space-y-1">
                      <div>{order.billing_address.street}</div>
                      <div>
                        {order.billing_address.city}, {order.billing_address.state} {order.billing_address.postal_code}
                      </div>
                      <div>{order.billing_address.country}</div>
                    </div>
                  </CardContent>
                </Card>
              )}
              {order.shipping_address && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Shipping Address</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm space-y-1">
                      <div>{order.shipping_address.street}</div>
                      <div>
                        {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.postal_code}
                      </div>
                      <div>{order.shipping_address.country}</div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Workflow History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <History className="h-5 w-5 mr-2" />
                Workflow History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingWorkflow ? (
                <div className="text-sm text-muted-foreground text-center py-4">
                  Loading workflow history...
                </div>
              ) : workflowHistory.length > 0 ? (
                <div className="space-y-3">
                  {workflowHistory.map((item) => (
                    <div key={item.id} className="flex items-start space-x-3 p-3 bg-muted rounded-md">
                      <div className="flex-shrink-0 mt-1">
                        {getStatusIcon(item.to_status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">
                          {item.from_status.replace('_', ' ')} → {item.to_status.replace('_', ' ')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          by {item.changed_by_name} on {formatDate(item.changed_at)}
                        </div>
                        {item.notes && (
                          <div className="text-xs text-muted-foreground mt-1 italic">
                            {item.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground text-center py-4">
                  No workflow history available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timestamps */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Order History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Created</div>
                  <div>{formatDate(order.created_at)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Last Updated</div>
                  <div>{order.updated_at && formatDate(order.updated_at)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dialog Actions */}
        <div className="flex justify-end space-x-4 pt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              {approvalAction === 'approve' ? (
                <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 mr-2 text-red-600" />
              )}
              {approvalAction === 'approve' ? 'Approve Order' : 'Reject Order'}
            </DialogTitle>
            <DialogDescription>
              {approvalAction === 'approve' 
                ? `Approve order ${order?.order_number} for processing?`
                : `Reject order ${order?.order_number}? This action cannot be undone.`
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="approval-notes">
                {approvalAction === 'approve' ? 'Approval Notes (Optional)' : 'Rejection Reason (Required)'}
              </Label>
              <Textarea
                id="approval-notes"
                placeholder={
                  approvalAction === 'approve' 
                    ? "Add any notes about the approval..."
                    : "Please provide a reason for rejection..."
                }
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleApprovalAction}
              disabled={processingApproval || (approvalAction === 'reject' && !approvalNotes.trim())}
              className={approvalAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
              variant={approvalAction === 'reject' ? 'destructive' : 'default'}
            >
              {processingApproval ? 'Processing...' : (approvalAction === 'approve' ? 'Approve Order' : 'Reject Order')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Factory Routing Dialog */}
      <Dialog open={showRoutingDialog} onOpenChange={setShowRoutingDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Route className="h-5 w-5 mr-2 text-indigo-600" />
              Route Order to Factory
            </DialogTitle>
            <DialogDescription>
              Assign order {order?.order_number} to a specific factory for production.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="factory-select">Select Factory *</Label>
              <Select value={selectedFactoryId} onValueChange={setSelectedFactoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a factory..." />
                </SelectTrigger>
                <SelectContent>
                  {loadingFactories ? (
                    <SelectItem value="" disabled>Loading factories...</SelectItem>
                  ) : factories.length > 0 ? (
                    factories.map((factory) => (
                      <SelectItem key={factory.id} value={factory.id.toString()}>
                        {factory.name} - {factory.location}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="" disabled>No factories available</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="routing-notes">Routing Notes (Optional)</Label>
              <Textarea
                id="routing-notes"
                placeholder="Add any notes about the factory assignment..."
                value={routingNotes}
                onChange={(e) => setRoutingNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowRoutingDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleFactoryRouting}
              disabled={processingRouting || !selectedFactoryId}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {processingRouting ? 'Routing...' : 'Route to Factory'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}