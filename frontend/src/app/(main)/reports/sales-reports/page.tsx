"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  BarChart3,
  Download,
  Users,
  DollarSign,
  ShoppingCart,
  RefreshCw,
  AlertCircle,
  Printer,
  Package,
  CreditCard,
  RotateCcw,
  FileText,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { DateRange } from "react-day-picker";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { QuickDateFilter, DatePreset } from "@/components/ui/quick-date-filter";
import {
  SalesReportsApi,
  SalesSummary,
  CustomerPerformance,
  PaymentAnalysis,
  OrderFulfillment,
  ReturnsAnalysis,
} from "@/modules/sales/services/sales-reports-api";
import { SalesOrderApi } from "@/modules/sales/services/sales-order-api";
import { SalesOrder } from "@/services/types";
import { DistributionApi, DistributionCenter } from "@/modules/inventory/services/distribution-api";
import { useFormatting } from "@/hooks/useFormatting";
import { cn } from "@/lib/utils";
import { pdf } from "@react-pdf/renderer";
import { SalesReportPDF } from "@/modules/sales/components/reports/SalesReportPDF";
import { SettingsApi } from "@/services/settings-api";
import { CompanySettings } from "@/services/settings-types";
import { useAuth } from "@/contexts/AuthContext";


export default function SalesReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [activePreset, setActivePreset] = useState<DatePreset>("today");
  const [selectedBranch, setSelectedBranch] = useState<number | undefined>();
  const [branches, setBranches] = useState<DistributionCenter[]>([]);
  const [activeTab, setActiveTab] = useState("sales");
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);
  
  // Report data states
  const [salesSummary, setSalesSummary] = useState<SalesSummary | null>(null);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [salesOrdersTotal, setSalesOrdersTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [customerPerformance, setCustomerPerformance] = useState<CustomerPerformance[]>([]);
  const [paymentAnalysis, setPaymentAnalysis] = useState<PaymentAnalysis | null>(null);
  const [orderFulfillment, setOrderFulfillment] = useState<OrderFulfillment | null>(null);
  const [returnsAnalysis, setReturnsAnalysis] = useState<ReturnsAnalysis | null>(null);
  
  // PDF export states
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const { user } = useAuth();
  
  const { formatCurrency } = useFormatting();
  const { toast } = useToast();
  const pageSize = 15;

  const fetchReports = useCallback(async () => {
    if (!dateRange?.from) return;
    
    setLoading(true);
    try {
      const params = {
        dateRange,
        distributionCenterId: selectedBranch,
      };

      const [summaryRes, customerRes, paymentRes, fulfillmentRes, returnsRes] = await Promise.all([
        SalesReportsApi.getSalesSummary(params),
        SalesReportsApi.getCustomerPerformance({ ...params, limit: 20 }),
        SalesReportsApi.getPaymentAnalysis(params),
        SalesReportsApi.getOrderFulfillment(params),
        SalesReportsApi.getReturnsAnalysis(params),
      ]);

      setSalesSummary(summaryRes);
      setCustomerPerformance(customerRes);
      setPaymentAnalysis(paymentRes);
      setOrderFulfillment(fulfillmentRes);
      setReturnsAnalysis(returnsRes);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load sales reports data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [dateRange, selectedBranch, toast]);

  const fetchSalesOrders = useCallback(async () => {
    if (!dateRange?.from) return;
    
    try {
      const result = await SalesOrderApi.getSalesOrders({
        start_date: format(dateRange.from, "yyyy-MM-dd"),
        end_date: dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : format(dateRange.from, "yyyy-MM-dd"),
        distribution_center_id: selectedBranch,
        page: currentPage,
        limit: pageSize,
      });
      setSalesOrders(result.sales_orders || []);
      setSalesOrdersTotal(result.total || 0);
    } catch (error) {
      console.error("Error fetching sales orders:", error);
    }
  }, [dateRange, selectedBranch, currentPage]);

  const handleDateChange = (range: DateRange | undefined, preset: DatePreset) => {
    setDateRange(range);
    setActivePreset(preset);
    setCurrentPage(1);
  };

  // Format currency for PDF (avoiding special characters)
  const formatCurrencyForPDF = (val: number) => {
    return formatCurrency(val).replace(/৳/g, 'TK');
  };

  const handlePrint = async () => {
    let reportType: 'sales-summary' | 'sales-details' | 'customer-performance' | 'payment-analysis' | 'order-fulfillment' | 'returns-analysis' = 'sales-summary';
    
    // Choose report type based on active tab
    if (activeTab === 'sales') reportType = 'sales-details';
    else if (activeTab === 'customers') reportType = 'customer-performance';
    else if (activeTab === 'payments') reportType = 'payment-analysis';
    else if (activeTab === 'fulfillment') reportType = 'order-fulfillment';
    else if (activeTab === 'returns') reportType = 'returns-analysis';

    // Verify data availability
    const hasData = salesSummary || customerPerformance.length > 0 || paymentAnalysis || orderFulfillment || salesOrders.length > 0 || returnsAnalysis;
    if (!hasData) {
      toast({ title: "No Data", description: "Please select a date range to load data before printing.", variant: "destructive" });
      return;
    }

    setPrinting(true);
    try {
      const blob = await pdf(
        <SalesReportPDF
          reportType={reportType}
          dateRange={{
            from: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
            to: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
          }}
          companySettings={companySettings}
          logoBase64={logoBase64}
          salesSummary={salesSummary}
          salesOrders={salesOrders.map(order => ({
            id: order.id,
            order_number: order.order_number,
            order_date: order.order_date,
            customer_name: order.customer_name || 'Walk-in Customer',
            product_count: order.product_count || 0,
            subtotal: Number(order.subtotal) || 0,
            discount_amount: Number(order.discount_amount) || 0,
            total_amount: Number(order.total_amount) || 0,
            cash_received: Number(order.cash_received) || 0,
          }))}
          salesOrdersTotal={salesOrdersTotal}
          customerPerformance={customerPerformance}
          paymentAnalysis={paymentAnalysis}
          orderFulfillment={orderFulfillment}
          returnsAnalysis={returnsAnalysis}
          formatCurrency={formatCurrencyForPDF}
        />
      ).toBlob();

      const url = window.URL.createObjectURL(blob);
      const printWindow = window.open(url);
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      } else {
        // Fallback if popup blocked
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.click();
      }
    } catch (error) {
      console.error('Print error:', error);
      toast({ title: "Error", description: "Failed to generate print document.", variant: "destructive" });
    } finally {
      setPrinting(false);
    }
  };

  // Load logo as base64 for PDF
  const loadLogoAsBase64 = (logoUrl: string): Promise<string | null> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const base64 = canvas.toDataURL('image/png');
            resolve(base64);
          } else resolve(null);
        } catch (e) { resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = logoUrl + (logoUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
    });
  };


  const handleExport = async (reportType: 'sales-summary' | 'sales-details' | 'customer-performance' | 'payment-analysis' | 'order-fulfillment' | 'returns-analysis') => {
    // Check if data is available
    if (!salesSummary && !customerPerformance.length && !paymentAnalysis && !orderFulfillment && !salesOrders.length && !returnsAnalysis) {
      toast({
        title: "No Data",
        description: "Please select a date range to load data before exporting.",
        variant: "destructive",
      });
      return;
    }

    setExportLoading(reportType);
    try {
      const blob = await pdf(
        <SalesReportPDF
          reportType={reportType}
          dateRange={{
            from: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
            to: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
          }}
          companySettings={companySettings}
          logoBase64={logoBase64}
          salesSummary={salesSummary}
          salesOrders={salesOrders.map(order => ({
            id: order.id,
            order_number: order.order_number,
            order_date: order.order_date,
            customer_name: order.customer_name || 'Walk-in Customer',
            product_count: order.product_count || 0,
            subtotal: Number(order.subtotal) || 0,
            discount_amount: Number(order.discount_amount) || 0,
            total_amount: Number(order.total_amount) || 0,
            cash_received: Number(order.cash_received) || 0,
          }))}
          salesOrdersTotal={salesOrdersTotal}
          customerPerformance={customerPerformance}
          paymentAnalysis={paymentAnalysis}
          orderFulfillment={orderFulfillment}
          returnsAnalysis={returnsAnalysis}
          formatCurrency={formatCurrencyForPDF}
        />
      ).toBlob();

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${reportType}-report.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Report exported successfully",
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({
        title: "Error",
        description: "Failed to export report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExportLoading(null);
    }
  };
  
  // Set initial branch if user is restricted
  useEffect(() => {
    if (user?.distribution_center_id && !selectedBranch) {
      setSelectedBranch(user.distribution_center_id);
    }
  }, [user, selectedBranch]);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [branchesData, settings] = await Promise.all([
          DistributionApi.getDistributionCenters({ status: "active", limit: 100 }),
          SettingsApi.getCompanySettings(),
        ]);
        setBranches(branchesData.centers || []);
        setCompanySettings(settings);
        
        // Load logo if available
        if (settings.invoice_logo) {
          const baseUrl = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9000';
          const logoUrl = settings.invoice_logo.startsWith('http') 
            ? settings.invoice_logo 
            : `${baseUrl}${settings.invoice_logo}`;
          const base64 = await loadLogoAsBase64(logoUrl);
          if (base64) setLogoBase64(base64);
        }
      } catch (error) {
        console.error("Error loading initial data:", error);
      }
    };
    loadInitialData();
  }, []);

  useEffect(() => {
    fetchReports();
    fetchSalesOrders();
  }, [fetchReports, fetchSalesOrders]);

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;
  const totalPages = Math.ceil(salesOrdersTotal / pageSize);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      processing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  // Calculate totals from sales orders for the current page
  const calculateTotals = () => {
    return salesOrders.reduce(
      (acc, order) => {
        const subtotal = Number(order.subtotal) || 0;
        const discount = Number(order.discount_amount) || 0;
        const total = Number(order.total_amount) || 0;
        const paid = Number(order.cash_received) || 0;
        const due = total - paid;
        
        return {
          subtotal: acc.subtotal + subtotal,
          discount: acc.discount + discount,
          total: acc.total + total,
          paid: acc.paid + paid,
          due: acc.due + due,
          items: acc.items + (order.product_count || 0),
        };
      },
      { subtotal: 0, discount: 0, total: 0, paid: 0, due: 0, items: 0 }
    );
  };

  const totals = calculateTotals();

  return (
    <div className=" space-y-6 print:p-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between space-y-2 md:space-y-0 print:hidden">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Sales Reports</h2>
          <p className="text-muted-foreground">Comprehensive sales analytics and performance insights</p>
        </div>
        <div className="flex items-center space-x-2">
          <Select
            value={selectedBranch?.toString() || "all"}
            onValueChange={(value) => setSelectedBranch(value === "all" ? undefined : parseInt(value))}
            disabled={!!user?.distribution_center_id}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id.toString()}>
                  {branch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => { fetchReports(); fetchSalesOrders(); }} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handlePrint} disabled={loading || printing}>
            {printing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Printer className="h-4 w-4 mr-2" />}
            Print
          </Button>
        </div>
      </div>

      {/* Date Filter Card */}
      <Card className="border-none shadow-md bg-white/50 backdrop-blur-sm dark:bg-slate-950/50 print:hidden">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block text-muted-foreground">Date Range</label>
              <QuickDateFilter onDateChange={handleDateChange} defaultPreset="today" className="w-full" />
            </div>
          </div>
        </CardContent>
      </Card>


      {/* Print Header */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold">Sales Report</h1>
        <p className="text-sm text-gray-600">
          Period: {dateRange?.from ? format(dateRange.from, "MMM d, yyyy") : ""} 
          {dateRange?.to && dateRange.from?.getTime() !== dateRange.to.getTime() 
            ? ` - ${format(dateRange.to, "MMM d, yyyy")}` 
            : ""}
        </p>
        <p className="text-sm text-gray-600">Generated: {format(new Date(), "MMM d, yyyy 'at' h:mm a")}</p>
      </div>

      {/* Summary Cards */}
      {salesSummary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="relative overflow-hidden group border-none shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-700 opacity-90 transition-transform group-hover:scale-105 duration-500" />
            <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-50">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-100" />
            </CardHeader>
            <CardContent className="relative">
              <div className="text-2xl font-bold text-white">{formatCurrency(salesSummary.total_revenue)}</div>
              <p className="text-xs text-blue-100 mt-1">{salesSummary.total_orders} orders</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden group border-none shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 opacity-90 transition-transform group-hover:scale-105 duration-500" />
            <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-emerald-50">Avg Order Value</CardTitle>
              <ShoppingCart className="h-4 w-4 text-emerald-100" />
            </CardHeader>
            <CardContent className="relative">
              <div className="text-2xl font-bold text-white">{formatCurrency(salesSummary.avg_order_value)}</div>
              <p className="text-xs text-emerald-100 mt-1">{salesSummary.unique_customers} customers</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden group border-none shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-violet-600 opacity-90 transition-transform group-hover:scale-105 duration-500" />
            <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-50">Payment Rate</CardTitle>
              <CreditCard className="h-4 w-4 text-purple-100" />
            </CardHeader>
            <CardContent className="relative">
              <div className="text-2xl font-bold text-white">{formatPercentage(salesSummary.payment_rate)}</div>
              <p className="text-xs text-purple-100 mt-1">{salesSummary.paid_orders} paid orders</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden group border-none shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600 opacity-90 transition-transform group-hover:scale-105 duration-500" />
            <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-amber-50">Completion Rate</CardTitle>
              <Package className="h-4 w-4 text-amber-100" />
            </CardHeader>
            <CardContent className="relative">
              <div className="text-2xl font-bold text-white">{formatPercentage(salesSummary.completion_rate)}</div>
              <p className="text-xs text-amber-100 mt-1">{salesSummary.completed_orders} completed</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Report Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="print:hidden bg-white/50 backdrop-blur-sm dark:bg-slate-950/50 p-1">
          <TabsTrigger value="sales" className="gap-2">
            <FileText className="w-4 h-4" />
            Sales Details
          </TabsTrigger>
          <TabsTrigger value="customers" className="gap-2">
            <Users className="w-4 h-4" />
            Customers
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2">
            <CreditCard className="w-4 h-4" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="fulfillment" className="gap-2">
            <Package className="w-4 h-4" />
            Fulfillment
          </TabsTrigger>
          <TabsTrigger value="returns" className="gap-2">
            <RotateCcw className="w-4 h-4" />
            Returns
          </TabsTrigger>
        </TabsList>


        {/* Sales Details Tab */}
        <TabsContent value="sales">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between print:pb-2">
              <div>
                <CardTitle>Sales Details</CardTitle>
                <CardDescription>Detailed list of all sales orders</CardDescription>
              </div>
              <div className="flex gap-2 print:hidden">
                <Button variant="outline" size="sm" onClick={() => handleExport("sales-details")} disabled={exportLoading !== null}>
                  {exportLoading === 'sales-details' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                  {exportLoading === 'sales-details' ? 'Generating...' : 'Export'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {salesOrders.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="font-semibold">Invoice No</TableHead>
                          <TableHead className="font-semibold">Date</TableHead>
                          <TableHead className="font-semibold">Customer</TableHead>
                          <TableHead className="font-semibold text-center">Items</TableHead>
                          <TableHead className="font-semibold text-right">Subtotal</TableHead>
                          <TableHead className="font-semibold text-right">Discount</TableHead>
                          <TableHead className="font-semibold text-right">Total</TableHead>
                          <TableHead className="font-semibold text-right">Paid</TableHead>
                          <TableHead className="font-semibold text-right">Due</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {salesOrders.map((order) => {
                          const subtotal = Number(order.subtotal) || 0;
                          const discount = Number(order.discount_amount) || 0;
                          const total = Number(order.total_amount) || 0;
                          const paid = Number(order.cash_received) || 0;
                          const due = total - paid;
                          const itemCount = order.product_count || 0;

                          return (
                            <TableRow key={order.id} className="hover:bg-muted/30 transition-colors">
                              <TableCell>
                                <span className="text-primary font-medium hover:underline cursor-pointer">
                                  {order.order_number}
                                </span>
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {order.order_date ? format(new Date(order.order_date), "yyyy-MM-dd") : "-"}
                              </TableCell>
                              <TableCell>
                                <span className="font-medium">{order.customer_name || "Walk-in Customer"}</span>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="secondary">{itemCount}</Badge>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(subtotal)}
                              </TableCell>
                              <TableCell className={cn("text-right", discount > 0 && "text-orange-600 dark:text-orange-400")}>
                                {formatCurrency(discount)}
                              </TableCell>
                              <TableCell className="text-right font-semibold text-primary">
                                {formatCurrency(total)}
                              </TableCell>
                              <TableCell className={cn("text-right font-medium", paid > 0 && "text-green-600 dark:text-green-400")}>
                                {formatCurrency(paid)}
                              </TableCell>
                              <TableCell className={cn(
                                "text-right font-semibold",
                                due > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
                              )}>
                                {due < 0 ? `-${formatCurrency(Math.abs(due))}` : formatCurrency(due)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Totals Row */}
                  <div className="border-t bg-muted/30 p-4">
                    <div className="flex flex-wrap gap-4 justify-end text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Page Subtotal:</span>
                        <span className="font-semibold">{formatCurrency(totals.subtotal)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Discount:</span>
                        <span className="font-semibold text-orange-600">{formatCurrency(totals.discount)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Total:</span>
                        <span className="font-bold text-primary">{formatCurrency(totals.total)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Paid:</span>
                        <span className="font-semibold text-green-600">{formatCurrency(totals.paid)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Due:</span>
                        <span className={cn("font-bold", totals.due > 0 ? "text-red-600" : "text-green-600")}>
                          {formatCurrency(totals.due)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between border-t p-4 print:hidden">
                      <div className="text-sm text-muted-foreground">
                        Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, salesOrdersTotal)} of {salesOrdersTotal} orders
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="w-4 h-4 mr-1" />
                          Previous
                        </Button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum = i + 1;
                            if (totalPages > 5) {
                              if (currentPage <= 3) {
                                pageNum = i + 1;
                              } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                              } else {
                                pageNum = currentPage - 2 + i;
                              }
                            }
                            return (
                              <Button
                                key={pageNum}
                                variant={currentPage === pageNum ? "default" : "outline"}
                                size="sm"
                                className="w-8 h-8 p-0"
                                onClick={() => setCurrentPage(pageNum)}
                              >
                                {pageNum}
                              </Button>
                            );
                          })}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          Next
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No sales orders found for the selected period</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customers Tab */}
        <TabsContent value="customers">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Customer Performance</CardTitle>
                <CardDescription>Top customers by revenue</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleExport("customer-performance")} disabled={exportLoading !== null} className="print:hidden">
                {exportLoading === 'customer-performance' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                {exportLoading === 'customer-performance' ? 'Generating...' : 'Export'}
              </Button>
            </CardHeader>
            <CardContent>
              {customerPerformance.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead className="text-right">Orders</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Avg Order</TableHead>
                        <TableHead>Last Order</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customerPerformance.map((customer) => (
                        <TableRow key={customer.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{customer.name}</div>
                              <div className="text-xs text-muted-foreground">{customer.email}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{customer.customer_code}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">{customer.total_orders}</TableCell>
                          <TableCell className="text-right font-medium text-green-600 dark:text-green-400">
                            {formatCurrency(customer.total_revenue)}
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(customer.avg_order_value)}</TableCell>
                          <TableCell>
                            {customer.last_order_date
                              ? format(new Date(customer.last_order_date), "MMM d, yyyy")
                              : "Never"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No customer data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Payment Methods</CardTitle>
                  <CardDescription>Revenue by payment method</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleExport("payment-analysis")} disabled={exportLoading !== null} className="print:hidden">
                  {exportLoading === 'payment-analysis' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                  {exportLoading === 'payment-analysis' ? 'Generating...' : 'Export'}
                </Button>
              </CardHeader>
              <CardContent>
                {paymentAnalysis?.payment_methods && paymentAnalysis.payment_methods.length > 0 ? (
                  <div className="space-y-4">
                    {paymentAnalysis.payment_methods.map((method) => (
                      <div key={method.method} className="flex items-center justify-between p-4 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                            <CreditCard className="w-5 h-5 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <div className="font-medium capitalize">{method.method}</div>
                            <div className="text-sm text-muted-foreground">{method.order_count} orders</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-green-600 dark:text-green-400">
                            {formatCurrency(method.total_amount)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No payment data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Outstanding Payments</CardTitle>
                <CardDescription>Unpaid orders summary</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-6 rounded-lg border bg-orange-50 dark:bg-orange-900/20 text-center">
                    <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                      {formatCurrency(paymentAnalysis?.outstanding_payments.total_outstanding || 0)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-2">Total Outstanding</div>
                  </div>
                  <div className="p-6 rounded-lg border bg-orange-50 dark:bg-orange-900/20 text-center">
                    <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                      {paymentAnalysis?.outstanding_payments.outstanding_orders || 0}
                    </div>
                    <div className="text-sm text-muted-foreground mt-2">Pending Orders</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Fulfillment Tab */}
        <TabsContent value="fulfillment">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Order Status</CardTitle>
                  <CardDescription>Distribution by order status</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleExport("order-fulfillment")} disabled={exportLoading !== null} className="print:hidden">
                  {exportLoading === 'order-fulfillment' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                  {exportLoading === 'order-fulfillment' ? 'Generating...' : 'Export'}
                </Button>
              </CardHeader>
              <CardContent>
                {orderFulfillment?.status_distribution && orderFulfillment.status_distribution.length > 0 ? (
                  <div className="space-y-4">
                    {orderFulfillment.status_distribution.map((status) => (
                      <div key={status.status} className="flex items-center justify-between p-4 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                            <Package className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <Badge className={getStatusColor(status.status)}>
                              {status.status}
                            </Badge>
                            <div className="text-sm text-muted-foreground mt-1">{status.order_count} orders</div>
                          </div>
                        </div>
                        <div className="font-bold">{formatCurrency(status.total_amount)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No fulfillment data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fulfillment Metrics</CardTitle>
                <CardDescription>Performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border text-center">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {orderFulfillment?.fulfillment_metrics.avg_fulfillment_days.toFixed(1) || "0"} days
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Avg Fulfillment</div>
                  </div>
                  <div className="p-4 rounded-lg border text-center">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {orderFulfillment?.fulfillment_metrics.total_orders || 0}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Total Orders</div>
                  </div>
                  <div className="p-4 rounded-lg border text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {orderFulfillment?.fulfillment_metrics.completed_orders || 0}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Completed</div>
                  </div>
                  <div className="p-4 rounded-lg border text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {formatPercentage(orderFulfillment?.fulfillment_metrics.fulfillment_rate || 0)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Fulfillment Rate</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Returns Tab */}
        <TabsContent value="returns">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Returns Summary</CardTitle>
                  <CardDescription>Overview of product returns</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleExport("returns-analysis")} disabled={exportLoading !== null} className="print:hidden">
                  {exportLoading === 'returns-analysis' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                  {exportLoading === 'returns-analysis' ? 'Generating...' : 'Export'}
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border text-center">
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {returnsAnalysis?.summary.total_returns || 0}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Total Returns</div>
                  </div>
                  <div className="p-4 rounded-lg border text-center">
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {formatCurrency(returnsAnalysis?.summary.total_refund_amount || 0)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Total Refunded</div>
                  </div>
                  <div className="p-4 rounded-lg border text-center">
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {formatCurrency(returnsAnalysis?.summary.avg_refund_amount || 0)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Avg Refund</div>
                  </div>
                  <div className="p-4 rounded-lg border text-center">
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {formatPercentage(returnsAnalysis?.summary.return_rate || 0)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Return Rate</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Return Reasons</CardTitle>
                <CardDescription>Breakdown by reason</CardDescription>
              </CardHeader>
              <CardContent>
                {returnsAnalysis?.reasons_distribution && returnsAnalysis.reasons_distribution.length > 0 ? (
                  <div className="space-y-4">
                    {returnsAnalysis.reasons_distribution.map((reason) => (
                      <div key={reason.reason} className="flex items-center justify-between p-4 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                            <RotateCcw className="w-5 h-5 text-red-600 dark:text-red-400" />
                          </div>
                          <div>
                            <div className="font-medium capitalize">{reason.reason || "Unspecified"}</div>
                            <div className="text-sm text-muted-foreground">{reason.return_count} returns</div>
                          </div>
                        </div>
                        <div className="text-right font-bold text-red-600 dark:text-red-400">
                          {formatCurrency(reason.total_amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <RotateCcw className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No return data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}
