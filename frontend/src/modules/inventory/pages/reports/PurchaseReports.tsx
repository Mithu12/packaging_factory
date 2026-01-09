"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Download,
  Package,
  Users,
  DollarSign,
  RefreshCw,
  AlertCircle,
  Loader2,
  TrendingUp,
  Clock,
  XCircle
} from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { pdf } from "@react-pdf/renderer";
import { PurchaseReportPDF, PurchaseSummaryData, SupplierPerformanceData, PurchasePaymentsData } from "@/modules/inventory/components/reports/PurchaseReportPDF";
import { PurchaseReportsApi } from "@/modules/inventory/services/purchase-reports-api";
import { SettingsApi } from "@/services/settings-api";
import { CompanySettings } from "@/services/settings-types";
import { useFormatting } from "@/hooks/useFormatting";

export default function PurchaseReports() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [purchaseSummary, setPurchaseSummary] = useState<PurchaseSummaryData | null>(null);
  const [supplierPerformance, setSupplierPerformance] = useState<SupplierPerformanceData[]>([]);
  const [purchasePayments, setPurchasePayments] = useState<PurchasePaymentsData | null>(null);
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
      };

      const [summaryData, supplierData, paymentsData] = await Promise.all([
        PurchaseReportsApi.getPurchaseSummary(params),
        PurchaseReportsApi.getSupplierPerformance({ ...params, limit: 20 }),
        PurchaseReportsApi.getPurchasePayments(params),
      ]);

      setPurchaseSummary(summaryData);
      setSupplierPerformance(supplierData);
      setPurchasePayments(paymentsData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load purchase reports data",
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

  const handleExport = async (reportType: 'purchase-summary' | 'supplier-performance' | 'purchase-payments') => {
    setExportLoading(reportType);
    try {
      const blob = await pdf(
        <PurchaseReportPDF
          reportType={reportType}
          dateRange={{
            from: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
            to: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
          }}
          companySettings={companySettings}
          logoBase64={logoBase64}
          purchaseSummary={purchaseSummary}
          supplierPerformance={supplierPerformance}
          purchasePayments={purchasePayments}
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
    // Load company settings on mount
    const loadInitialData = async () => {
      try {
        const settings = await SettingsApi.getCompanySettings();
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
        console.error('Error loading settings:', error);
      }
    };
    loadInitialData();
  }, []);

  useEffect(() => {
    fetchReports();
  }, [dateRange]);

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Purchase Reports</h1>
          <p className="text-muted-foreground">Comprehensive purchase analytics and supplier performance insights</p>
        </div>
        <div className="flex gap-2">
          <DateRangePicker
            date={dateRange}
            onDateChange={setDateRange}
            placeholder="Select date range"
          />
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
      {purchaseSummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-card to-accent/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Purchase Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(purchaseSummary.total_value)}</div>
              <div className="text-xs text-muted-foreground">
                {purchaseSummary.total_orders} orders
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-card to-accent/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Order Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(purchaseSummary.avg_order_value)}</div>
              <div className="text-xs text-muted-foreground">
                {purchaseSummary.unique_suppliers} suppliers
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-card to-accent/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Received Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{purchaseSummary.received_orders}</div>
              <div className="text-xs text-muted-foreground">
                {formatPercentage(purchaseSummary.received_rate)} received
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-card to-accent/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{purchaseSummary.pending_orders}</div>
              <div className="text-xs text-muted-foreground">
                {purchaseSummary.cancelled_orders} cancelled
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="suppliers">Supplier Performance</TabsTrigger>
          <TabsTrigger value="payments">Payment Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Purchase Summary</CardTitle>
              <Button onClick={() => handleExport('purchase-summary')} disabled={exportLoading !== null}>
                {exportLoading === 'purchase-summary' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                {exportLoading === 'purchase-summary' ? 'Generating...' : 'Export PDF'}
              </Button>
            </CardHeader>
            <CardContent>
              {purchaseSummary ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-primary">{purchaseSummary.total_orders}</div>
                    <div className="text-sm text-muted-foreground">Total Orders</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-primary">{formatCurrency(purchaseSummary.total_value)}</div>
                    <div className="text-sm text-muted-foreground">Total Value</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-primary">{purchaseSummary.unique_suppliers}</div>
                    <div className="text-sm text-muted-foreground">Unique Suppliers</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-primary">{formatCurrency(purchaseSummary.avg_order_value)}</div>
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

        <TabsContent value="suppliers">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Supplier Performance</CardTitle>
              <Button onClick={() => handleExport('supplier-performance')} disabled={exportLoading !== null}>
                {exportLoading === 'supplier-performance' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                {exportLoading === 'supplier-performance' ? 'Generating...' : 'Export PDF'}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {supplierPerformance.map((supplier) => (
                  <div key={supplier.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{supplier.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {supplier.supplier_code} • {supplier.contact_person}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="font-medium">{supplier.total_orders} orders</div>
                        <div className="text-sm text-muted-foreground">{formatCurrency(supplier.total_purchase_value)}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(supplier.avg_purchase_value)}</div>
                        <div className="text-sm text-muted-foreground">
                          Last: {supplier.last_purchase_date ? format(new Date(supplier.last_purchase_date), 'MMM dd') : 'Never'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {supplierPerformance.length === 0 && (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No supplier data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Payment Status</CardTitle>
                <Button onClick={() => handleExport('purchase-payments')} disabled={exportLoading !== null}>
                  {exportLoading === 'purchase-payments' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                  {exportLoading === 'purchase-payments' ? 'Generating...' : 'Export PDF'}
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {purchasePayments?.status_distribution.map((status) => (
                    <div key={status.status} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <DollarSign className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium capitalize">{status.status}</div>
                          <div className="text-sm text-muted-foreground">{status.count} invoices</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(status.total_amount)}</div>
                          <div className="text-sm text-muted-foreground">Total</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-green-600">{formatCurrency(status.paid_amount)}</div>
                          <div className="text-sm text-muted-foreground">Paid</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-orange-600">{formatCurrency(status.outstanding_amount)}</div>
                          <div className="text-sm text-muted-foreground">Outstanding</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Totals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      {purchasePayments?.totals.total_invoices || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Invoices</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      {formatCurrency(purchasePayments?.totals.total_amount || 0)}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Amount</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(purchasePayments?.totals.total_paid || 0)}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Paid</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {formatCurrency(purchasePayments?.totals.total_outstanding || 0)}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Outstanding</div>
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
