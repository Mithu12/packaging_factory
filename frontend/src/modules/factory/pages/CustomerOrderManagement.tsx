"use client";

import {useState, useEffect, useCallback} from "react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {Input} from "@/components/ui/input";
import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import {
    Plus,
    Search,
    Filter,
    Eye,
    Edit,
    FileText,
    Clock,
    CheckCircle,
    AlertTriangle,
    Package,
    Users,
    DollarSign,
    Calendar,
    TrendingUp,
    Download,
    RefreshCw,
    Wallet,
    Trash2,
    XCircle,
    Printer,
    MoreHorizontal,
} from "lucide-react";
import {useFormatting} from "@/hooks/useFormatting";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {Label} from "@/components/ui/label";
import {Textarea} from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {Progress} from "@/components/ui/progress";
import {
    CustomerOrdersApiService,
    FactoryCustomerOrder,
    FactoryCustomerOrderStatus,
    OrderStats as ApiOrderStats,
    QuotationStats,
    OrderQueryParams,
    CreateCustomerOrderRequest
} from "../services/customer-orders-api";
import OrderEntryForm from "../components/OrderEntryForm";
import OrderDetailsDialog from "../components/OrderDetailsDialog";
import {toast} from "sonner";

export default function CustomerOrderManagement() {
    const {formatCurrency, formatDate} = useFormatting();
    const [orders, setOrders] = useState<FactoryCustomerOrder[]>([]);
    const [stats, setStats] = useState<ApiOrderStats>({
        total_orders: 0,
        pending_orders: 0,
        quoted_orders: 0,
        approved_orders: 0,
        in_production_orders: 0,
        completed_orders: 0,
        total_value: 0,
        average_order_value: 0,
        on_time_delivery: 0,
    });
    const [quotationStats, setQuotationStats] = useState<QuotationStats>({
        total_quotations: 0,
        approved_value: 0,
        conversion_rate: 0,
        total_value: 0
    });
    const [search, setSearch] = useState<OrderQueryParams>({
        search: "",
        sort_by: "order_date",
        sort_order: "desc",
        page: 1,
        limit: 20,
    });
    const [selectedOrder, setSelectedOrder] = useState<FactoryCustomerOrder | null>(
        null
    );
    const [showOrderEntry, setShowOrderEntry] = useState(false);
    const [showOrderDetails, setShowOrderDetails] = useState(false);
    const [showShippingDialog, setShowShippingDialog] = useState(false);
    const [showPaymentDialog, setShowPaymentDialog] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [orderToDelete, setOrderToDelete] = useState<FactoryCustomerOrder | null>(null);
    const [mainTab, setMainTab] = useState<string>("orders");
    const [initialStatus, setInitialStatus] = useState<FactoryCustomerOrderStatus>('draft');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [shippingData, setShippingData] = useState({
        notes: "",
        tracking_number: "",
        carrier: "",
        estimated_delivery_date: ""
    });
    const [paymentData, setPaymentData] = useState({
        payment_amount: 0,
        payment_method: "cash",
        payment_reference: "",
        payment_date: new Date().toISOString().split('T')[0],
        notes: ""
    });
    const [totalPages, setTotalPages] = useState(1);
    const [totalOrders, setTotalOrders] = useState(0);

    // Load orders from API
    const loadOrders = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const queryParams: OrderQueryParams = {
                ...search,
                status: statusFilter !== "all" ? (statusFilter as FactoryCustomerOrderStatus) : undefined,
            };

            const response = await CustomerOrdersApiService.getCustomerOrders(queryParams);
            setOrders(response.orders);
            setTotalPages(response.totalPages);
            setTotalOrders(response.total);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load orders');
            console.error('Error loading orders:', err);
        } finally {
            setLoading(false);
        }
    }, [search, statusFilter]);

    // Load stats from API
    const loadStats = async () => {
        try {
            const [statsData, qStatsData] = await Promise.all([
                CustomerOrdersApiService.getOrderStats(),
                CustomerOrdersApiService.getQuotationStats()
            ]);
            setStats(statsData);
            setQuotationStats({
                total_quotations: qStatsData.total_quotations || 0,
                approved_value: qStatsData.approved_value || 0,
                conversion_rate: qStatsData.conversion_rate || 0,
                total_value: qStatsData.total_quoted_value || 0,
                draft_count: 0,
                sent_count: 0,
                approved_count: 0,
                rejected_count: 0,
                converted_count: 0
            });
        } catch (err) {
            console.error('Error loading stats:', err);
        }
    };

    useEffect(() => {
        loadOrders();
    }, [loadOrders]);

    useEffect(() => {
        loadStats();
    }, []);

    // Note: Using real API data instead of mock data

    // Handle search
    const handleSearch = (searchTerm: string) => {
        setSearch(prev => ({
            ...prev,
            search: searchTerm || '',
            page: 1, // Reset to first page
        }));
    };

    // Handle status filter
    const handleStatusFilter = (status: string) => {
        setStatusFilter(status);
        setSearch(prev => ({
            ...prev,
            page: 1, // Reset to first page
        }));
    };

    // Handle pagination
    const handlePageChange = (page: number) => {
        setSearch(prev => ({
            ...prev,
            page,
        }));
    };

    // Handle order approval
    const handleApproveOrder = async (orderId: string, approved: boolean, notes?: string) => {
        try {
            await CustomerOrdersApiService.approveCustomerOrder(orderId, approved, notes);
            await loadOrders(); // Reload orders
            await loadStats(); // Reload stats
        } catch (error) {
            console.error("Failed to approve order:", error);
            setError(error instanceof Error ? error.message : 'Failed to approve order');
        }
    };

    // Handle order shipping
    const handleShipOrder = (order: FactoryCustomerOrder) => {
        setSelectedOrder(order);
        setShippingData({
            notes: "",
            tracking_number: "",
            carrier: "",
            estimated_delivery_date: ""
        });
        setShowShippingDialog(true);
    };

    // Handle order shipping submission
    const handleShipOrderSubmit = async () => {
        if (!selectedOrder) return;

        try {
            await CustomerOrdersApiService.shipCustomerOrder(selectedOrder.id.toString(), shippingData);
            setShowShippingDialog(false);
            setSelectedOrder(null);
            await loadOrders(); // Reload orders
            await loadStats(); // Reload stats
        } catch (error) {
            console.error("Failed to ship order:", error);
            setError(error instanceof Error ? error.message : 'Failed to ship order');
        }
    };

    // Handle record payment
    const handleRecordPayment = (order: FactoryCustomerOrder) => {
        setSelectedOrder(order);
        setPaymentData({
            payment_amount: order.outstanding_amount,
            payment_method: "cash",
            payment_reference: "",
            payment_date: new Date().toISOString().split('T')[0],
            notes: ""
        });
        setShowPaymentDialog(true);
    };

    // Handle payment submission
    const handlePaymentSubmit = async () => {
        if (!selectedOrder) return;

        try {
            await CustomerOrdersApiService.recordPayment(selectedOrder.id.toString(), paymentData);
            setShowPaymentDialog(false);
            setSelectedOrder(null);
            await loadOrders(); // Reload orders
            await loadStats(); // Reload stats
        } catch (error) {
            console.error("Failed to record payment:", error);
            setError(error instanceof Error ? error.message : 'Failed to record payment');
        }
    };

    // Handle order status update
    const handleStatusUpdate = async (orderId: string, status: string, notes?: string) => {
        try {
            await CustomerOrdersApiService.updateOrderStatus(orderId, status as FactoryCustomerOrderStatus, notes);
            await loadOrders(); // Reload orders
            await loadStats(); // Reload stats
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update order status');
        }
    };

    const handleDownloadPdf = async (order: FactoryCustomerOrder) => {
        try {
            toast.info(`Generating ${order.status === 'quoted' ? 'quotation' : 'order'} PDF...`);
            await CustomerOrdersApiService.downloadQuotationPdf(order.id);
        } catch (err: any) {
            toast.error(err.message || "Failed to download PDF");
        }
    };

    const handleDownloadInvoice = async (order: FactoryCustomerOrder) => {
        try {
            toast.info(`Generating Invoice PDF...`);
            await CustomerOrdersApiService.downloadInvoicePdf(order.id);
        } catch (err: any) {
            toast.error(err.message || "Failed to download Invoice");
        }
    };

    const handleDownloadChallan = async (order: FactoryCustomerOrder) => {
        try {
            toast.info(`Generating Challan PDF...`);
            await CustomerOrdersApiService.downloadChallanPdf(order.id);
        } catch (err: any) {
            toast.error(err.message || "Failed to download Challan");
        }
    };

    const handleDeleteOrder = async () => {
        if (!orderToDelete) return;

        try {
            await CustomerOrdersApiService.deleteCustomerOrder(orderToDelete.id.toString());
            setShowDeleteDialog(false);
            setOrderToDelete(null);
            await loadOrders();
            await loadStats();
        } catch (error) {
            console.error("Failed to delete order:", error);
            setError(error instanceof Error ? error.message : 'Failed to delete order');
        }
    };

    // Since we're using API filtering, we don't need client-side filtering
    // The orders are already filtered by the API based on search and status
    const filteredOrders = orders;

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

    const handleViewOrder = (order: FactoryCustomerOrder) => {
        setSelectedOrder(order);
        setShowOrderDetails(true);
    };

    const handleEditOrder = (order: FactoryCustomerOrder) => {
        setSelectedOrder(order);
        setError(null);
        setShowOrderEntry(true);
    };

    const handleCreateOrder = () => {
        setSelectedOrder(null);
        setError(null);
        setInitialStatus("pending");
        setShowOrderEntry(true);
    };

    const handleCreateQuotation = () => {
        setSelectedOrder(null);
        setError(null);
        setInitialStatus("quoted");
        setShowOrderEntry(true);
    };

    const handleOrderSubmit = async (orderData: CreateCustomerOrderRequest) => {
        try {
            if (selectedOrder) {
                // Update existing order
                await CustomerOrdersApiService.updateCustomerOrder(selectedOrder.id.toString(), orderData);
            } else {
                // Create new order
                await CustomerOrdersApiService.createCustomerOrder(orderData);
            }

            // Reload orders and stats
            await loadOrders();
            await loadStats();

            // Close dialog and reset selected order
            setShowOrderEntry(false);
            setSelectedOrder(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save order');
            throw err; // Re-throw to prevent child component from closing dialog
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Order & Quotation Management</h1>
                    <p className="text-muted-foreground">
                        Create, manage, and track customer quotations and orders
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">
                        <Download className="h-4 w-4 mr-2"/>
                        Export
                    </Button>
                    <Button variant="outline" onClick={() => {
                        loadOrders();
                        loadStats();
                    }}>
                        <RefreshCw className="h-4 w-4 mr-2"/>
                        Refresh
                    </Button>
                    {mainTab === 'quotations' ? (
                        <Button onClick={handleCreateQuotation}>
                            <Plus className="h-4 w-4 mr-2"/>
                            New Quotation
                        </Button>
                    ) : (
                        <Button onClick={handleCreateOrder}>
                            <Plus className="h-4 w-4 mr-2"/>
                            New Order
                        </Button>
                    )}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {mainTab === 'orders' ? 'Total Orders' : 'Total Quotations'}
                        </CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground"/>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {mainTab === 'orders' ? stats.total_orders : quotationStats.total_quotations}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {mainTab === 'orders' ? 'All time orders' : 'Active and drafted results'}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {mainTab === 'orders' ? 'Pending Orders' : 'Conversion Rate'}
                        </CardTitle>
                        {mainTab === 'orders' ? <Clock className="h-4 w-4 text-muted-foreground"/> : <TrendingUp className="h-4 w-4 text-muted-foreground"/>}
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {mainTab === 'orders' ? stats.pending_orders : `${quotationStats.conversion_rate}%`}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {mainTab === 'orders' ? 'Awaiting approval' : 'Quotations to Orders'}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {mainTab === 'orders' ? 'Total Order Value' : 'Total Quoted Value'}
                        </CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground"/>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatCurrency(mainTab === 'orders' ? stats.total_value : quotationStats.total_value)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {mainTab === 'orders' ? 'All orders value' : 'Potential revenue'}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {mainTab === 'orders' ? 'On-Time Delivery' : 'Approved Value'}
                        </CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground"/>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {mainTab === 'orders' ? `${stats.on_time_delivery}%` : formatCurrency(quotationStats.approved_value)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {mainTab === 'orders' ? 'Delivery performance' : 'Ready for conversion'}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs value={mainTab} onValueChange={(val) => {
                setMainTab(val);
                if (val === 'quotations') {
                    setStatusFilter('quoted');
                } else {
                    setStatusFilter('all');
                }
            }} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="orders">Customer Orders</TabsTrigger>
                    <TabsTrigger value="quotations">Quotations</TabsTrigger>
                </TabsList>

                <TabsContent value={mainTab} className="space-y-4">
                    {/* Search and Filters */}
                    <Card>
                        <CardContent className="pt-6">
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <div className="relative">
                                        <Search
                                            className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                                        <Input
                                            placeholder="Search orders..."
                                            value={search.search || ""}
                                            onChange={(e) => handleSearch(e.target.value)}
                                            className="pl-10"
                                        />
                                    </div>
                                </div>
                                <Tabs value={statusFilter} onValueChange={handleStatusFilter}>
                                    <TabsList>
                                        <TabsTrigger value="all">All</TabsTrigger>
                                        <TabsTrigger value="pending">Pending</TabsTrigger>
                                        <TabsTrigger value="quoted">Quoted</TabsTrigger>
                                        <TabsTrigger value="approved">Approved</TabsTrigger>
                                        <TabsTrigger value="in_production">
                                            In Production
                                        </TabsTrigger>
                                    </TabsList>
                                </Tabs>
                                <Button variant="outline">
                                    <Filter className="h-4 w-4 mr-2"/>
                                    Filters
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Error Display */}
                    {error && (
                        <Card className="border-red-200 bg-red-50">
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-2 text-red-800">
                                    <AlertTriangle className="h-4 w-4"/>
                                    <span>{error}</span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setError(null);
                                            loadOrders();
                                        }}
                                        className="ml-auto"
                                    >
                                        Retry
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Orders Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Customer Orders {loading && "(Loading...)"}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Order #</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Factory</TableHead>
                                        <TableHead>Order Date</TableHead>
                                        <TableHead>Required Date</TableHead>
                                        <TableHead>Value</TableHead>
                                        <TableHead>Outstanding</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Priority</TableHead>
                                        <TableHead>Sales Person</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredOrders.map((order) => (
                                        <TableRow key={order.id}>
                                            <TableCell className="font-medium">
                                                {order.order_number}
                                            </TableCell>
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium">
                                                        {order.factory_customer_name}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {order.factory_customer_email}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {order.factory_name}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="h-4 w-4 text-muted-foreground"/>
                                                    {formatDate(order.order_date)}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <Clock className="h-4 w-4 text-muted-foreground"/>
                                                    {formatDate(order.required_date)}
                                                </div>
                                            </TableCell>
                                            <TableCell>{formatCurrency(order.total_value)}</TableCell>
                                            <TableCell>
                                                <div
                                                    className={`font-semibold ${order.outstanding_amount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                                    {formatCurrency(order.outstanding_amount)}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={getStatusColor(order.status)}>
                                                    {order.status.replace("_", " ").toUpperCase()}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={getPriorityColor(order.priority)}>
                                                    {order.priority.toUpperCase()}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{order.sales_person}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleViewOrder(order)}
                                                        className="h-8 w-8 p-0"
                                                        title="View Details"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>

                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                                <span className="sr-only">Open menu</span>
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-56">
                                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                            <DropdownMenuSeparator />
                                                            
                                                            <DropdownMenuItem onClick={() => handleEditOrder(order)} disabled={['approved', 'completed', 'shipped'].includes(order.status)}>
                                                                <Edit className="mr-2 h-4 w-4" />
                                                                <span>Edit Order</span>
                                                            </DropdownMenuItem>
                                                            
                                                            <DropdownMenuItem onClick={() => handleDownloadPdf(order)}>
                                                                <Printer className="mr-2 h-4 w-4" />
                                                                <span>{order.status === 'quoted' ? "Download Quotation" : "Download Order"}</span>
                                                            </DropdownMenuItem>

                                                            {(order.status === 'completed' || order.status === 'shipped') && (
                                                                <>
                                                                    <DropdownMenuItem onClick={() => handleDownloadInvoice(order)} className="text-indigo-600">
                                                                        <FileText className="mr-2 h-4 w-4" />
                                                                        <span>Download Invoice</span>
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => handleDownloadChallan(order)} className="text-teal-600">
                                                                        <FileText className="mr-2 h-4 w-4" />
                                                                        <span>Download Challan</span>
                                                                    </DropdownMenuItem>
                                                                </>
                                                            )}

                                                            <DropdownMenuSeparator />

                                                            {(order.status === 'quoted' || order.status === 'pending') && (
                                                                <>
                                                                    <DropdownMenuItem onClick={() => handleApproveOrder(order.id.toString(), true)} className="text-green-600">
                                                                        <CheckCircle className="mr-2 h-4 w-4" />
                                                                        <span>{order.status === 'quoted' ? 'Convert to Order' : 'Approve Order'}</span>
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => handleApproveOrder(order.id.toString(), false)} className="text-red-600">
                                                                        <XCircle className="mr-2 h-4 w-4" />
                                                                        <span>{order.status === 'quoted' ? 'Reject Quotation' : 'Reject Order'}</span>
                                                                    </DropdownMenuItem>
                                                                </>
                                                            )}

                                                            {order.outstanding_amount > 0 && ['completed', 'shipped'].includes(order.status) && (
                                                                <DropdownMenuItem onClick={() => handleRecordPayment(order)} className="text-green-600">
                                                                    <Wallet className="mr-2 h-4 w-4" />
                                                                    <span>Record Payment</span>
                                                                </DropdownMenuItem>
                                                            )}

                                                            {order.status === 'completed' && (
                                                                <DropdownMenuItem onClick={() => handleShipOrder(order)} className="text-blue-600">
                                                                    <Package className="mr-2 h-4 w-4" />
                                                                    <span>Ship Order</span>
                                                                </DropdownMenuItem>
                                                            )}

                                                            <DropdownMenuSeparator />
                                                            
                                                            <DropdownMenuItem 
                                                                onClick={() => {
                                                                    setOrderToDelete(order);
                                                                    setShowDeleteDialog(true);
                                                                }}
                                                                className="text-red-600 focus:text-red-600"
                                                            >
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                <span>Delete</span>
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Order Entry Dialog */}
            <OrderEntryForm
                open={showOrderEntry}
                onOpenChange={setShowOrderEntry}
                order={selectedOrder}
                initialStatus={initialStatus}
                onSubmit={handleOrderSubmit}
            />

            {/* Order Details Dialog */}
            <OrderDetailsDialog
                open={showOrderDetails}
                onOpenChange={setShowOrderDetails}
                order={selectedOrder}
                onEdit={handleEditOrder}
            />

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the 
                            {orderToDelete?.status === 'quoted' ? ' quotation' : ' order'} #{orderToDelete?.order_number}.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteOrder} className="bg-red-600 hover:bg-red-700">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Shipping Dialog */}
            <Dialog open={showShippingDialog} onOpenChange={setShowShippingDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Ship Order</DialogTitle>
                        <DialogDescription>
                            Record shipping information for order #{selectedOrder?.order_number}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="tracking-number">Tracking Number</Label>
                                <Input
                                    id="tracking-number"
                                    placeholder="Enter tracking number"
                                    onChange={(e) => setShippingData(prev => ({
                                        ...prev,
                                        tracking_number: e.target.value
                                    }))}
                                />
                            </div>
                            <div>
                                <Label htmlFor="carrier">Carrier</Label>
                                <Select onValueChange={(value) => setShippingData(prev => ({...prev, carrier: value}))}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select carrier"/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ups">UPS</SelectItem>
                                        <SelectItem value="fedex">FedEx</SelectItem>
                                        <SelectItem value="dhl">DHL</SelectItem>
                                        <SelectItem value="usps">USPS</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="delivery-date">Estimated Delivery Date</Label>
                            <Input
                                id="delivery-date"
                                type="date"
                                onChange={(e) => setShippingData(prev => ({
                                    ...prev,
                                    estimated_delivery_date: e.target.value
                                }))}
                            />
                        </div>

                        <div>
                            <Label htmlFor="shipping-notes">Shipping Notes</Label>
                            <Textarea
                                id="shipping-notes"
                                placeholder="Additional shipping notes..."
                                rows={3}
                                onChange={(e) => setShippingData(prev => ({...prev, notes: e.target.value}))}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowShippingDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleShipOrderSubmit}>
                            Ship Order
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Payment Recording Dialog */}
            <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Record Payment</DialogTitle>
                        <DialogDescription>
                            Record payment for order #{selectedOrder?.order_number}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Order Summary */}
                        {selectedOrder && (
                            <Card className="bg-muted">
                                <CardContent className="pt-4">
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Total Value:</span>
                                            <span
                                                className="font-semibold">{formatCurrency(selectedOrder.total_value)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Paid Amount:</span>
                                            <span
                                                className="font-semibold text-green-600">{formatCurrency(selectedOrder.paid_amount)}</span>
                                        </div>
                                        <div className="flex justify-between border-t pt-2">
                                            <span className="text-muted-foreground font-semibold">Outstanding:</span>
                                            <span
                                                className="font-bold text-orange-600">{formatCurrency(selectedOrder.outstanding_amount)}</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        <div>
                            <Label htmlFor="payment-amount">Payment Amount *</Label>
                            <Input
                                id="payment-amount"
                                type="number"
                                step="0.01"
                                min="0"
                                max={selectedOrder?.outstanding_amount}
                                placeholder="Enter payment amount"
                                value={paymentData.payment_amount}
                                onChange={(e) => setPaymentData(prev => ({
                                    ...prev,
                                    payment_amount: parseFloat(e.target.value) || 0
                                }))}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Maximum: {formatCurrency(selectedOrder?.outstanding_amount || 0)}
                            </p>
                        </div>

                        <div>
                            <Label htmlFor="payment-method">Payment Method *</Label>
                            <Select
                                value={paymentData.payment_method}
                                onValueChange={(value) => setPaymentData(prev => ({...prev, payment_method: value}))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select payment method"/>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="cash">Cash</SelectItem>
                                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                    <SelectItem value="card">Card</SelectItem>
                                    <SelectItem value="cheque">Cheque</SelectItem>
                                    <SelectItem value="mobile_payment">Mobile Payment</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="payment-date">Payment Date</Label>
                            <Input
                                id="payment-date"
                                type="date"
                                value={paymentData.payment_date}
                                onChange={(e) => setPaymentData(prev => ({...prev, payment_date: e.target.value}))}
                            />
                        </div>

                        <div>
                            <Label htmlFor="payment-reference">Payment Reference</Label>
                            <Input
                                id="payment-reference"
                                placeholder="Transaction ID, Cheque #, etc."
                                value={paymentData.payment_reference}
                                onChange={(e) => setPaymentData(prev => ({...prev, payment_reference: e.target.value}))}
                            />
                        </div>

                        <div>
                            <Label htmlFor="payment-notes">Notes</Label>
                            <Textarea
                                id="payment-notes"
                                placeholder="Additional notes..."
                                rows={3}
                                value={paymentData.notes}
                                onChange={(e) => setPaymentData(prev => ({...prev, notes: e.target.value}))}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handlePaymentSubmit}
                            disabled={!paymentData.payment_amount || paymentData.payment_amount <= 0}
                        >
                            Record Payment
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
