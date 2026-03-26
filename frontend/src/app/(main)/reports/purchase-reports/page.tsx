"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Users,
  CreditCard,
  RefreshCw,
  Printer,
  Download,
  Package,
  DollarSign,
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { DateRange } from "react-day-picker";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { QuickDateFilter, DatePreset } from "@/components/ui/quick-date-filter";
import {
  PurchaseReportsApi,
  PurchaseSummary,
  SupplierPerformance,
  PurchasePayments,
} from "@/modules/inventory/services/purchase-reports-api";
import { useFormatting } from "@/hooks/useFormatting";
import { cn } from "@/lib/utils";
import { pdf } from "@react-pdf/renderer";
import { PurchaseReportPDF } from "@/modules/inventory/components/reports/PurchaseReportPDF";
import { SettingsApi } from "@/services/settings-api";
import { CompanySettings } from "@/services/settings-types";

export default function PurchaseReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [activePreset, setActivePreset] = useState<DatePreset>("this_month");
  const [activeTab, setActiveTab] = useState("suppliers");
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);
  
  // Report data states
  const [summary, setSummary] = useState<PurchaseSummary | null>(null);
  const [suppliers, setSuppliers] = useState<SupplierPerformance[]>([]);
  const [payments, setPayments] = useState<PurchasePayments | null>(null);
  
  // PDF export states
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  
  const { formatCurrency } = useFormatting();
  const { toast } = useToast();

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
    // Check if data is available for the requested report type
    if (reportType === 'purchase-summary' && !summary) {
      toast({
        title: "No Data",
        description: "Please select a date range to load data before exporting.",
        variant: "destructive",
      });
      return;
    }
    if (reportType === 'supplier-performance' && suppliers.length === 0) {
      toast({
        title: "No Data",
        description: "No supplier data available for the selected period.",
        variant: "destructive",
      });
      return;
    }
    if (reportType === 'purchase-payments' && !payments) {
      toast({
        title: "No Data",
        description: "No payment data available for the selected period.",
        variant: "destructive",
      });
      return;
    }

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
          purchaseSummary={summary}
          supplierPerformance={suppliers}
          purchasePayments={payments}
          formatCurrency={formatCurrencyForPDF}
        />
      ).toBlob();

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
        description: "Failed to export report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setExportLoading(null);
    }
  };

  const fetchReports = useCallback(async () => {
    if (!dateRange?.from) return;
    
    setLoading(true);
    try {
      const params = {
        start_date: format(dateRange.from, "yyyy-MM-dd"),
        end_date: dateRange.to ? format(dateRange.to, "yyyy-MM-dd") : format(dateRange.from, "yyyy-MM-dd"),
      };

      const [summaryRes, suppliersRes, paymentsRes] = await Promise.all([
        PurchaseReportsApi.getPurchaseSummary(params),
        PurchaseReportsApi.getSupplierPerformance({ ...params, limit: 10 }),
        PurchaseReportsApi.getPurchasePayments(params),
      ]);

      setSummary(summaryRes);
      setSuppliers(suppliersRes);
      setPayments(paymentsRes);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load purchase reports data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [dateRange, toast]);

  const handleDateChange = (range: DateRange | undefined, preset: DatePreset) => {
    setDateRange(range);
    setActivePreset(preset);
  };

  const handlePrint = async () => {
    let reportType: 'purchase-summary' | 'supplier-performance' | 'purchase-payments' = 'purchase-summary';
    
    // Choose report type based on active tab
    if (activeTab === 'suppliers') reportType = 'supplier-performance';
    else if (activeTab === 'payments') reportType = 'purchase-payments';

    // Verify data availability
    if (reportType === 'supplier-performance' && suppliers.length === 0) {
      toast({ title: "No Data", description: "No supplier data available to print.", variant: "destructive" });
      return;
    }
    if (reportType === 'purchase-payments' && !payments) {
      toast({ title: "No Data", description: "No payment data available to print.", variant: "destructive" });
      return;
    }

    setPrinting(true);
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
          purchaseSummary={summary}
          supplierPerformance={suppliers}
          purchasePayments={payments}
          formatCurrency={formatCurrencyForPDF}
        />
      ).toBlob();

      const url = window.URL.createObjectURL(blob);
      const printWindow = window.open(url);
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
          // Optional: URL.revokeObjectURL(url) after some delay or on window close
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

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  useEffect(() => {
    // Load company settings on mount
    const loadSettings = async () => {
      try {
        const settings = await SettingsApi.getCompanySettings();
        setCompanySettings(settings);
        
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
    loadSettings();
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return (
    <div className="space-y-6 print:p-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between space-y-2 md:space-y-0 print:hidden">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Purchase Reports</h2>
          <p className="text-muted-foreground">Comprehensive procurement analytics and supplier insights</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={fetchReports} disabled={loading}>
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
              <QuickDateFilter onDateChange={handleDateChange} defaultPreset="this_month" className="w-full" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Print Header */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold">Purchase Report</h1>
        <p className="text-sm text-gray-600">
          Period: {dateRange?.from ? format(dateRange.from, "MMM d, yyyy") : ""} 
          {dateRange?.to && dateRange.from?.getTime() !== dateRange.to.getTime() 
            ? ` - ${format(dateRange.to, "MMM d, yyyy")}` 
            : ""}
        </p>
        <p className="text-sm text-gray-600">Generated: {format(new Date(), "MMM d, yyyy 'at' h:mm a")}</p>
      </div>

      {/* Summary Cards */}
      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="relative overflow-hidden group border-none shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-700 opacity-90 transition-transform group-hover:scale-105 duration-500" />
            <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-50">Total Purchase</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-100" />
            </CardHeader>
            <CardContent className="relative">
              <div className="text-2xl font-bold text-white">{formatCurrency(summary.total_value)}</div>
              <p className="text-xs text-blue-100 mt-1">{summary.total_orders} orders placed</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden group border-none shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 opacity-90 transition-transform group-hover:scale-105 duration-500" />
            <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-emerald-50">Received Orders</CardTitle>
              <Package className="h-4 w-4 text-emerald-100" />
            </CardHeader>
            <CardContent className="relative">
              <div className="text-2xl font-bold text-white">{summary.received_orders}</div>
              <p className="text-xs text-emerald-100 mt-1">{formatPercentage(summary.received_rate)} fulfillment rate</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden group border-none shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-violet-600 opacity-90 transition-transform group-hover:scale-105 duration-500" />
            <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-50">Active Suppliers</CardTitle>
              <Users className="h-4 w-4 text-purple-100" />
            </CardHeader>
            <CardContent className="relative">
              <div className="text-2xl font-bold text-white">{summary.unique_suppliers}</div>
              <p className="text-xs text-purple-100 mt-1">Suppliers engaged this period</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden group border-none shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600 opacity-90 transition-transform group-hover:scale-105 duration-500" />
            <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-amber-50">Pending POs</CardTitle>
              <Clock className="h-4 w-4 text-amber-100" />
            </CardHeader>
            <CardContent className="relative">
              <div className="text-2xl font-bold text-white">{summary.pending_orders}</div>
              <p className="text-xs text-amber-100 mt-1">Awaiting delivery</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Report Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="print:hidden bg-white/50 backdrop-blur-sm dark:bg-slate-950/50 p-1">
          <TabsTrigger value="suppliers" className="gap-2">
            <Users className="w-4 h-4" />
            Suppliers
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2">
            <CreditCard className="w-4 h-4" />
            Payments
          </TabsTrigger>
        </TabsList>

        {/* Suppliers Tab */}
        <TabsContent value="suppliers">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between print:pb-2">
              <div>
                <CardTitle>Supplier Performance</CardTitle>
                <CardDescription>Top suppliers by purchase volume and value</CardDescription>
              </div>
              <div className="flex gap-2 print:hidden">
                <Button variant="outline" size="sm" onClick={() => handleExport("supplier-performance")} disabled={exportLoading !== null}>
                  {exportLoading === 'supplier-performance' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                  {exportLoading === 'supplier-performance' ? 'Generating...' : 'Export'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {suppliers.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="font-semibold">Supplier</TableHead>
                        <TableHead className="font-semibold">Code</TableHead>
                        <TableHead className="font-semibold text-right">Orders</TableHead>
                        <TableHead className="font-semibold text-right">Total Value</TableHead>
                        <TableHead className="font-semibold text-right">Avg Value</TableHead>
                        <TableHead className="font-semibold">Last Order</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {suppliers.map((supplier) => (
                        <TableRow key={supplier.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell>
                            <div className="font-medium">{supplier.name}</div>
                            <div className="text-xs text-muted-foreground">{supplier.phone}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="font-mono text-[10px]">
                              {supplier.supplier_code}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">{supplier.total_orders}</TableCell>
                          <TableCell className="text-right font-semibold text-green-600 dark:text-green-400">
                            {formatCurrency(supplier.total_purchase_value)}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {formatCurrency(supplier.avg_purchase_value)}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {supplier.last_purchase_date
                              ? format(new Date(supplier.last_purchase_date), "MMM d, yyyy")
                              : "Never"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No supplier data found for the selected period</p>
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
                  <CardDescription>Payments by status</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleExport("purchase-payments")} disabled={exportLoading !== null} className="print:hidden">
                  {exportLoading === 'purchase-payments' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                  {exportLoading === 'purchase-payments' ? 'Generating...' : 'Export'}
                </Button>
              </CardHeader>
              <CardContent>
                {payments?.status_distribution && payments.status_distribution.length > 0 ? (
                  <div className="space-y-4">
                    {payments.status_distribution.map((item) => (
                      <div key={item.status} className="flex items-center justify-between p-4 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center",
                            item.status === 'paid' && "bg-green-100 dark:bg-green-900/30",
                            item.status === 'pending' && "bg-orange-100 dark:bg-orange-900/30",
                            item.status === 'partial' && "bg-blue-100 dark:bg-blue-900/30"
                          )}>
                            <CreditCard className={cn(
                              "w-5 h-5",
                              item.status === 'paid' && "text-green-600 dark:text-green-400",
                              item.status === 'pending' && "text-orange-600 dark:text-orange-400",
                              item.status === 'partial' && "text-blue-600 dark:text-blue-400"
                            )} />
                          </div>
                          <div>
                            <div className="font-medium capitalize">{item.status}</div>
                            <div className="text-sm text-muted-foreground">{item.count} invoices</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">
                            {formatCurrency(item.total_amount)}
                          </div>
                          <div className="text-sm text-green-600 dark:text-green-400">
                            Paid: {formatCurrency(item.paid_amount)}
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
                <CardDescription>Summary of unpaid invoices</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-6 rounded-lg border bg-orange-50 dark:bg-orange-900/20 text-center">
                    <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                      {formatCurrency(payments?.totals.total_outstanding || 0)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-2">Total Outstanding</div>
                  </div>
                  <div className="p-6 rounded-lg border bg-green-50 dark:bg-green-900/20 text-center">
                    <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(payments?.totals.total_paid || 0)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-2">Total Paid</div>
                  </div>
                  <div className="p-6 rounded-lg border text-center">
                    <div className="text-3xl font-bold text-primary">
                      {payments?.totals.total_invoices || 0}
                    </div>
                    <div className="text-sm text-muted-foreground mt-2">Total Invoices</div>
                  </div>
                  <div className="p-6 rounded-lg border text-center">
                    <div className="text-3xl font-bold text-primary">
                      {formatCurrency(payments?.totals.total_amount || 0)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-2">Total Amount</div>
                  </div>
                </div>

                {/* Payment Progress */}
                <div className="mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium opacity-90">Payment Progress</span>
                    <span className="text-lg font-bold">
                      {payments && payments.totals.total_amount > 0 
                        ? formatPercentage((payments.totals.total_paid / payments.totals.total_amount) * 100)
                        : "0.0%"}
                    </span>
                  </div>
                  <div className="w-full bg-white/20 dark:bg-slate-700/50 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-white dark:bg-slate-200 h-full transition-all duration-500 rounded-full"
                      style={{ 
                        width: `${payments && payments.totals.total_amount > 0 
                          ? (payments.totals.total_paid / payments.totals.total_amount) * 100 
                          : 0}%` 
                      }}
                    />
                  </div>
                </div>
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
