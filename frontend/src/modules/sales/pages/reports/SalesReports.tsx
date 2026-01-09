"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Download,
  Calendar,
  TrendingUp,
  Users,
  DollarSign,
  ShoppingCart,
  RefreshCw,
  AlertCircle,
  Loader2
} from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { apiClient } from "@/services/apiClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { DistributionApi, DistributionCenter } from "@/modules/inventory/services/distribution-api";
import { pdf } from "@react-pdf/renderer";
import { SalesReportPDF } from "@/modules/sales/components/reports/SalesReportPDF";
import { SettingsApi } from "@/services/settings-api";
import { CompanySettings } from "@/services/settings-types";
import { useFormatting } from "@/hooks/useFormatting";

interface SalesSummary {
  total_orders: number;
  total_revenue: number;
  avg_order_value: number;
  unique_customers: number;
  paid_orders: number;
  completed_orders: number;
  payment_rate: number;
  completion_rate: number;
}

interface CustomerPerformance {
  id: number;
  customer_code: string;
  name: string;
  email: string;
  phone: string;
  total_orders: number;
  total_revenue: number;
  avg_order_value: number;
  last_order_date: string;
}

interface PaymentAnalysis {
  payment_methods: Array<{
    method: string;
    order_count: number;
    total_amount: number;
  }>;
  outstanding_payments: {
    total_outstanding: number;
    outstanding_orders: number;
  };
}

interface OrderFulfillment {
  status_distribution: Array<{
    status: string;
    order_count: number;
    total_amount: number;
  }>;
  fulfillment_metrics: {
    avg_fulfillment_days: number;
    total_orders: number;
    completed_orders: number;
    fulfillment_rate: number;
  };
}

export default function SalesReports() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedBranch, setSelectedBranch] = useState<number | undefined>();
  const [branches, setBranches] = useState<DistributionCenter[]>([]);
  const [salesSummary, setSalesSummary] = useState<SalesSummary | null>(null);
  const [customerPerformance, setCustomerPerformance] = useState<CustomerPerformance[]>([]);
  const [paymentAnalysis, setPaymentAnalysis] = useState<PaymentAnalysis | null>(null);
  const [orderFulfillment, setOrderFulfillment] = useState<OrderFulfillment | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("summary");
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const { toast } = useToast();
  const { formatCurrency } = useFormatting();

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = {
        start_date: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
        end_date: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
        distribution_center_id: selectedBranch,
      };

      const [summaryRes, customerRes, paymentRes, fulfillmentRes] = await Promise.all([
        apiClient.get('/sales/reports/sales-summary', { params }),
        apiClient.get('/sales/reports/customer-performance', { params: { ...params, limit: 20 } }),
        apiClient.get('/sales/reports/payment-analysis', { params }),
        apiClient.get('/sales/reports/order-fulfillment', { params }),
      ]);

      setSalesSummary(summaryRes.data.data);
      setCustomerPerformance(customerRes.data.data);
      setPaymentAnalysis(paymentRes.data.data);
      setOrderFulfillment(fulfillmentRes.data.data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load sales reports data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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

  // Format currency for PDF (avoiding special characters)
  const formatCurrencyForPDF = (val: number) => {
    return formatCurrency(val).replace(/৳/g, 'TK');
  };

  const handleExport = async (reportType: 'sales-summary' | 'customer-performance' | 'payment-analysis' | 'order-fulfillment') => {
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
          customerPerformance={customerPerformance}
          paymentAnalysis={paymentAnalysis}
          orderFulfillment={orderFulfillment}
          formatCurrency={formatCurrencyForPDF}
        />
      ).toBlob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportType}-report.pdf`);
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
        description: "Failed to export report",
        variant: "destructive",
      });
    } finally {
      setExportLoading(null);
    }
  };

  useEffect(() => {
    // Load branches and company settings on mount
    const loadInitialData = async () => {
      try {
        const [branchesData, settings] = await Promise.all([
          DistributionApi.getDistributionCenters({ status: 'active', limit: 100 }),
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
        console.error('Error loading initial data:', error);
      }
    };
    loadInitialData();
  }, []);

  useEffect(() => {
    fetchReports();
  }, [dateRange, selectedBranch]);

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sales Reports</h1>
          <p className="text-muted-foreground">Comprehensive sales analytics and performance insights</p>
        </div>
        <div className="flex gap-2">
          <DateRangePicker
            date={dateRange}
            onDateChange={setDateRange}
            placeholder="Select date range"
          />
          <Select 
            value={selectedBranch?.toString() || "all"} 
            onValueChange={(value) => setSelectedBranch(value === "all" ? undefined : parseInt(value))}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Branches" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              {branches.map((branch) => (
                <SelectItem key={branch.id} value={branch.id.toString()}>
                  {branch.name} {branch.is_primary && "(Primary)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={fetchReports}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      {salesSummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-card to-accent/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(salesSummary.total_revenue)}</div>
              <div className="text-xs text-muted-foreground">
                {salesSummary.total_orders} orders
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-card to-accent/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Order Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(salesSummary.avg_order_value)}</div>
              <div className="text-xs text-muted-foreground">
                {salesSummary.unique_customers} customers
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-card to-accent/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Payment Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPercentage(salesSummary.payment_rate)}</div>
              <div className="text-xs text-muted-foreground">
                {salesSummary.paid_orders} paid orders
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-card to-accent/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completion Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPercentage(salesSummary.completion_rate)}</div>
              <div className="text-xs text-muted-foreground">
                {salesSummary.completed_orders} completed
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="customers">Customer Performance</TabsTrigger>
          <TabsTrigger value="payme">Payment Analysis</TabsTrigger>
          <TabsTrigger value="fulfillment">Order Fulfillment</TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Sales Summary</CardTitle>
              <Button onClick={() => handleExport('sales-summary')} disabled={exportLoading !== null}>
                {exportLoading === 'sales-summary' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                {exportLoading === 'sales-summary' ? 'Generating...' : 'Export PDF'}
              </Button>
            </CardHeader>
            <CardContent>
              {salesSummary ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-primary">{salesSummary.total_orders}</div>
                    <div className="text-sm text-muted-foreground">Total Orders</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-primary">{formatCurrency(salesSummary.total_revenue)}</div>
                    <div className="text-sm text-muted-foreground">Total Revenue</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-primary">{salesSummary.unique_customers}</div>
                    <div className="text-sm text-muted-foreground">Unique Customers</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-primary">{formatCurrency(salesSummary.avg_order_value)}</div>
                    <div className="text-sm text-muted-foreground">Avg Order Value</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Customer Performance</CardTitle>
              <Button onClick={() => handleExport('customer-performance')} disabled={exportLoading !== null}>
                {exportLoading === 'customer-performance' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                {exportLoading === 'customer-performance' ? 'Generating...' : 'Export PDF'}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {customerPerformance.map((customer) => (
                  <div key={customer.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {customer.customer_code} • {customer.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="font-medium">{customer.total_orders} orders</div>
                        <div className="text-sm text-muted-foreground">{formatCurrency(customer.total_revenue)}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(customer.avg_order_value)}</div>
                        <div className="text-sm text-muted-foreground">
                          Last: {customer.last_order_date ? format(new Date(customer.last_order_date), 'MMM dd') : 'Never'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {customerPerformance.length === 0 && (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No customer data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payme">
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Payment Methods</CardTitle>
                <Button onClick={() => handleExport('payment-analysis')} disabled={exportLoading !== null}>
                  {exportLoading === 'payment-analysis' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                  {exportLoading === 'payment-analysis' ? 'Generating...' : 'Export PDF'}
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {paymentAnalysis?.payment_methods.map((method) => (
                    <div key={method.method} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <DollarSign className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <div className="font-medium capitalize">{method.method}</div>
                          <div className="text-sm text-muted-foreground">{method.order_count} orders</div>
                        </div>
                      </div>
                      <div className="font-medium">{formatCurrency(method.total_amount)}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Outstanding Payments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {formatCurrency(paymentAnalysis?.outstanding_payments.total_outstanding || 0)}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Outstanding</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {paymentAnalysis?.outstanding_payments.outstanding_orders || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Outstanding Orders</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="fulfillment">
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Order Status Distribution</CardTitle>
                <Button onClick={() => handleExport('order-fulfillment')} disabled={exportLoading !== null}>
                  {exportLoading === 'order-fulfillment' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                  {exportLoading === 'order-fulfillment' ? 'Generating...' : 'Export PDF'}
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orderFulfillment?.status_distribution.map((status) => (
                    <div key={status.status} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <ShoppingCart className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium capitalize">{status.status}</div>
                          <div className="text-sm text-muted-foreground">{status.order_count} orders</div>
                        </div>
                      </div>
                      <div className="font-medium">{formatCurrency(status.total_amount)}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fulfillment Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {orderFulfillment?.fulfillment_metrics.avg_fulfillment_days.toFixed(1)} days
                    </div>
                    <div className="text-sm text-muted-foreground">Avg Fulfillment Time</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {orderFulfillment?.fulfillment_metrics.total_orders || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Orders</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {orderFulfillment?.fulfillment_metrics.completed_orders || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Completed Orders</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {formatPercentage(orderFulfillment?.fulfillment_metrics.fulfillment_rate || 0)}
                    </div>
                    <div className="text-sm text-muted-foreground">Fulfillment Rate</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}