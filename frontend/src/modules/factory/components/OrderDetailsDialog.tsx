import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  User,
  MapPin,
  DollarSign,
  Calendar,
  Clock,
  Package,
  FileText,
  CheckCircle,
  AlertTriangle,
  Edit,
  Download,
  Send,
} from "lucide-react";
import { useFormatting } from "@/hooks/useFormatting";
import type { CustomerOrder } from "../types/customer-orders";

interface OrderDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: CustomerOrder | null;
}

export function OrderDetailsDialog({
  open,
  onOpenChange,
  order,
}: OrderDetailsDialogProps) {
  const { formatCurrency, formatDate } = useFormatting();
  const [activeTab, setActiveTab] = useState("overview");

  if (!order) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "quoted":
        return "bg-blue-100 text-blue-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "in_production":
        return "bg-purple-100 text-purple-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "shipped":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const calculateLineTotal = (item: any) => {
    const discountAmount = item.discountPercentage
      ? (item.unitPrice * item.quantity * item.discountPercentage) / 100
      : 0;
    return item.unitPrice * item.quantity - discountAmount;
  };

  const calculateOrderTotal = () => {
    return order.lineItems.reduce(
      (total, item) => total + calculateLineTotal(item),
      0
    );
  };

  const handleApproveOrder = () => {
    // In real app, this would call an API
    console.log("Approving order:", order.id);
  };

  const handleRejectOrder = () => {
    // In real app, this would call an API
    console.log("Rejecting order:", order.id);
  };

  const handleSendQuote = () => {
    // In real app, this would call an API
    console.log("Sending quote for order:", order.id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Order Details - {order.orderNumber}</span>
            <div className="flex gap-2">
              <Badge className={getStatusColor(order.status)}>
                {order.status.replace("_", " ").toUpperCase()}
              </Badge>
              <Badge className={getPriorityColor(order.priority)}>
                {order.priority.toUpperCase()}
              </Badge>
            </div>
          </DialogTitle>
          <DialogDescription>
            View and manage order details, line items, and customer information
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4"
        >
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="line-items">Line Items</TabsTrigger>
            <TabsTrigger value="customer">Customer Info</TabsTrigger>
            <TabsTrigger value="shipping">Shipping & Billing</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Order Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Order Number:</span>
                    <span className="text-sm">{order.orderNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Order Date:</span>
                    <span className="text-sm">
                      {formatDate(order.orderDate)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Required Date:</span>
                    <span className="text-sm">
                      {formatDate(order.requiredDate)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Sales Person:</span>
                    <span className="text-sm">{order.salesPerson}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Payment Terms:</span>
                    <span className="text-sm">
                      {order.paymentTerms.replace("_", " ").toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Total Value:</span>
                    <span className="text-sm font-bold">
                      {formatCurrency(order.totalValue)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Customer Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <span className="text-sm font-medium">Customer Name:</span>
                    <p className="text-sm">{order.customerName}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Email:</span>
                    <p className="text-sm">{order.customerEmail}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Phone:</span>
                    <p className="text-sm">{order.customerPhone}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {order.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{order.notes}</p>
                </CardContent>
              </Card>
            )}

            {order.terms && (
              <Card>
                <CardHeader>
                  <CardTitle>Terms & Conditions</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{order.terms}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="line-items" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Line Items ({order.lineItems.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Delivery Date</TableHead>
                      <TableHead>Optional</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.lineItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {item.productName}
                            </div>
                            {item.description && (
                              <div className="text-sm text-muted-foreground">
                                {item.description}
                              </div>
                            )}
                            {item.specifications && (
                              <div className="text-sm text-muted-foreground mt-1">
                                <strong>Specs:</strong> {item.specifications}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{item.productSku}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span>{item.quantity}</span>
                            <span className="text-sm text-muted-foreground">
                              {item.unitOfMeasure}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell>
                          {item.discountPercentage
                            ? `${item.discountPercentage}%`
                            : "0%"}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(calculateLineTotal(item))}
                        </TableCell>
                        <TableCell>
                          {item.deliveryDate
                            ? formatDate(item.deliveryDate)
                            : "N/A"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={item.isOptional ? "outline" : "default"}
                          >
                            {item.isOptional ? "Optional" : "Required"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Order Total:</span>
                  <span>{formatCurrency(calculateOrderTotal())}</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customer" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium">Customer ID:</span>
                    <p className="text-sm">{order.customerId}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Customer Name:</span>
                    <p className="text-sm">{order.customerName}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Email:</span>
                    <p className="text-sm">{order.customerEmail}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Phone:</span>
                    <p className="text-sm">{order.customerPhone}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="shipping" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Shipping Address
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm">{order.shippingAddress.street}</p>
                  <p className="text-sm">
                    {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
                    {order.shippingAddress.postalCode}
                  </p>
                  <p className="text-sm">{order.shippingAddress.country}</p>
                  {order.shippingAddress.contactName && (
                    <div className="mt-2 pt-2 border-t">
                      <p className="text-sm font-medium">
                        Contact: {order.shippingAddress.contactName}
                      </p>
                      {order.shippingAddress.contactPhone && (
                        <p className="text-sm">
                          Phone: {order.shippingAddress.contactPhone}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Billing Address
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm">{order.billingAddress.street}</p>
                  <p className="text-sm">
                    {order.billingAddress.city}, {order.billingAddress.state}{" "}
                    {order.billingAddress.postalCode}
                  </p>
                  <p className="text-sm">{order.billingAddress.country}</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="actions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Order Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Status Actions</h4>
                    <div className="flex gap-2">
                      {order.status === "pending" && (
                        <>
                          <Button
                            onClick={handleApproveOrder}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve Order
                          </Button>
                          <Button
                            onClick={handleRejectOrder}
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                          >
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            Reject Order
                          </Button>
                        </>
                      )}
                      {order.status === "quoted" && (
                        <Button
                          onClick={handleSendQuote}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Send className="h-4 w-4 mr-2" />
                          Send Quote
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Document Actions</h4>
                    <div className="flex gap-2">
                      <Button variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Download PDF
                      </Button>
                      <Button variant="outline">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Order
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">Order History</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Created:</span>
                      <span>
                        {formatDate(order.createdDate)} by {order.createdBy}
                      </span>
                    </div>
                    {order.updatedDate && (
                      <div className="flex justify-between text-sm">
                        <span>Last Updated:</span>
                        <span>
                          {formatDate(order.updatedDate)} by {order.updatedBy}
                        </span>
                      </div>
                    )}
                    {order.approvedDate && (
                      <div className="flex justify-between text-sm">
                        <span>Approved:</span>
                        <span>
                          {formatDate(order.approvedDate)} by {order.approvedBy}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
