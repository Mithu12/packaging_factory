"use client";

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
    Loader2,
    History,
    Truck,
} from "lucide-react";
import {
    FactoryCustomerOrder,
    CustomerOrdersApiService,
    FactoryCustomerPayment,
    type QuotedOrderSnapshot,
    type Delivery,
} from "../services/customer-orders-api";
import { QuotedSnapshotDialog } from "./QuotedSnapshotDialog";
import { useFormatting } from "@/hooks/useFormatting";
import { Progress } from "@/components/ui/progress";

interface OrderDetailsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    order: FactoryCustomerOrder | null;
    onEdit?: (order: FactoryCustomerOrder) => void;
}

export default function OrderDetailsDialog({
                                               open,
                                               onOpenChange,
                                               order,
                                               onEdit,
                                           }: OrderDetailsDialogProps) {
    const { formatCurrency, formatDate } = useFormatting();
    const [paymentHistory, setPaymentHistory] = useState<FactoryCustomerPayment[]>([]);
    const [loadingPayments, setLoadingPayments] = useState(false);
    const [quotationPrintLoading, setQuotationPrintLoading] = useState(false);
    const [quotationDownloadLoading, setQuotationDownloadLoading] = useState(false);
    const [quotedSnapshotOpen, setQuotedSnapshotOpen] = useState(false);
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);
    const [loadingDeliveries, setLoadingDeliveries] = useState(false);

    // Load payment history + deliveries when order changes
    useEffect(() => {
        if (order && open) {
            loadPaymentHistory();
            loadDeliveries();
        }
    }, [order?.id, open]);

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

    const loadDeliveries = async () => {
        if (!order) return;
        try {
            setLoadingDeliveries(true);
            const list = await CustomerOrdersApiService.listDeliveries(order.id.toString());
            setDeliveries(Array.isArray(list) ? list : []);
        } catch (error) {
            console.error('Failed to load deliveries:', error);
            setDeliveries([]);
        } finally {
            setLoadingDeliveries(false);
        }
    };

    const handleDownloadDeliveryChallan = async (deliveryId: number) => {
        try {
            await CustomerOrdersApiService.downloadDeliveryChallan(deliveryId);
        } catch (error) {
            console.error('Failed to download challan:', error);
        }
    };

    const handleDownloadDeliveryInvoice = async (deliveryId: number) => {
        try {
            await CustomerOrdersApiService.downloadDeliveryInvoice(deliveryId);
        } catch (error) {
            console.error('Failed to download invoice:', error);
        }
    };

    if (!order) return null;

    const parsedQuotedSnapshot: QuotedOrderSnapshot | null = (() => {
        const raw = order.quoted_snapshot;
        if (!raw) return null;
        if (typeof raw === "string") {
            try {
                return JSON.parse(raw) as QuotedOrderSnapshot;
            } catch {
                return null;
            }
        }
        if (typeof raw === "object" && Array.isArray((raw as QuotedOrderSnapshot).line_items)) {
            return raw as QuotedOrderSnapshot;
        }
        return null;
    })();

    const paymentProgress = order.total_value > 0
        ? (order.paid_amount / order.total_value) * 100
        : 0;

    const getStatusColor = (status: string) => {
        const colors = {
            pending: "bg-yellow-100 text-yellow-800",
            quoted: "bg-blue-100 text-blue-800",
            approved: "bg-green-100 text-green-800",
            rejected: "bg-red-100 text-red-800",
            in_production: "bg-purple-100 text-purple-800",
            completed: "bg-emerald-100 text-emerald-800",
            partially_shipped: "bg-amber-100 text-amber-800",
            shipped: "bg-indigo-100 text-indigo-800",
            cancelled: "bg-gray-100 text-gray-800",
        };
        return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
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

    const handlePrintQuotation = async () => {
        if (!order || order.status !== "quoted") return;
        setQuotationPrintLoading(true);
        try {
            await CustomerOrdersApiService.printQuotationPdf(order.id);
        } catch (error) {
            console.error("Failed to print quotation:", error);
        } finally {
            setQuotationPrintLoading(false);
        }
    };

    const handleDownloadQuotation = async () => {
        if (!order || order.status !== "quoted") return;
        setQuotationDownloadLoading(true);
        try {
            await CustomerOrdersApiService.downloadQuotationPdf(order.id);
        } catch (error) {
            console.error("Failed to download quotation:", error);
        } finally {
            setQuotationDownloadLoading(false);
        }
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
Phone: ${order.factory_customer_phone || "N/A"}
Order Date: ${formatDate(order.order_date)}
Required Date: ${formatDate(order.required_date)}
Status: ${order.status.replace("_", " ").toUpperCase()}
Priority: ${order.priority.toUpperCase()}
Sales Person: ${order.sales_person}

Line Items:
-----------
${order.line_items
    .map(
        (item, index) => `
${index + 1}. ${item.product_name} (${item.product_sku})
   Quantity: ${item.quantity}
   Unit Price: ${formatCurrency(item.unit_price)}
   Total: ${formatCurrency(calculateLineTotal(item.quantity, item.unit_price))}
   ${item.notes ? `Notes: ${item.notes}` : ""}
`
    )
    .join("")}

Total Order Value: ${formatCurrency(order.total_value)} ${order.currency}

${order.notes ? `Notes: ${order.notes}` : ""}
    `.trim();

        const blob = new Blob([orderText], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `order-${order.order_number}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <>
        <QuotedSnapshotDialog
            open={quotedSnapshotOpen}
            onOpenChange={setQuotedSnapshotOpen}
            orderNumber={order.order_number}
            snapshot={parsedQuotedSnapshot}
        />
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="max-w-4xl max-h-[90vh] overflow-y-auto print:max-h-none print:max-w-none print:w-full print:overflow-visible print:border-0 print:shadow-none sm:max-w-4xl"
                data-testid="order-details-dialog"
            >
                <DialogHeader className="print:hidden">
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle className="text-2xl" data-testid="order-details-title">Order Details</DialogTitle>
                            <DialogDescription data-testid="order-details-description">
                                Order #{order.order_number} - {order.factory_customer_name}
                            </DialogDescription>
                        </div>
                        <div className="flex space-x-2" data-testid="order-details-actions">
                            {order.status === "quoted" ? (
                                <>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handlePrintQuotation}
                                        disabled={quotationPrintLoading}
                                    >
                                        {quotationPrintLoading ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <Printer className="h-4 w-4 mr-2" />
                                        )}
                                        Print Quotation
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleDownloadQuotation}
                                        disabled={quotationDownloadLoading}
                                    >
                                        {quotationDownloadLoading ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <Download className="h-4 w-4 mr-2" />
                                        )}
                                        Download Quotation
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button variant="outline" size="sm" onClick={handlePrint}>
                                        <Printer className="h-4 w-4 mr-2" />
                                        Print
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={handleDownload}>
                                        <Download className="h-4 w-4 mr-2" />
                                        Download
                                    </Button>
                                </>
                            )}
                            {parsedQuotedSnapshot && order.status !== "quoted" && (
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setQuotedSnapshotOpen(true)}
                                >
                                    <History className="h-4 w-4 mr-2" />
                                    Show quotation
                                </Button>
                            )}
                            {onEdit && (
                                <Button size="sm" onClick={() => onEdit(order)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                </Button>
                            )}
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-6 print:hidden">
                    {/* Order Status and Priority */}
                    <div className="flex items-center space-x-4">
                        <Badge className={getStatusColor(order.status)}>
                            {order.status.replace("_", " ").toUpperCase()}
                        </Badge>
                        <Badge className={getPriorityColor(order.priority)}>
                            {order.priority.toUpperCase()} PRIORITY
                        </Badge>
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

                    {/* Deliveries (challans) */}
                    {(deliveries.length > 0 || loadingDeliveries) && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <Truck className="h-5 w-5 mr-2" />
                                    Deliveries ({deliveries.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {loadingDeliveries ? (
                                    <div className="text-sm text-muted-foreground text-center py-4">
                                        Loading deliveries...
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Delivery</TableHead>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Items</TableHead>
                                                <TableHead className="text-right">Subtotal</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Invoice</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {deliveries.map(d => (
                                                <TableRow key={d.id}>
                                                    <TableCell className="font-medium">{d.delivery_number}</TableCell>
                                                    <TableCell>{formatDate(d.delivery_date)}</TableCell>
                                                    <TableCell className="text-sm">
                                                        {d.items.map(it => `${it.product_name ?? '#' + it.order_line_item_id} × ${it.quantity}`).join(', ')}
                                                    </TableCell>
                                                    <TableCell className="text-right">{formatCurrency(d.subtotal)}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="capitalize">{d.delivery_status}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-sm">{d.invoice_number ?? '—'}</TableCell>
                                                    <TableCell className="text-right space-x-1">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleDownloadDeliveryChallan(d.id)}
                                                        >
                                                            <Download className="h-4 w-4 mr-1" /> Challan
                                                        </Button>
                                                        {d.invoice_id && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => handleDownloadDeliveryInvoice(d.id)}
                                                            >
                                                                <Download className="h-4 w-4 mr-1" /> Invoice
                                                            </Button>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    )}

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
                <div className="flex justify-end space-x-4 pt-6 print:hidden">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
        </>
    );
}