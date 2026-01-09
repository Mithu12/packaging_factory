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
  FileText,
  Users,
  CreditCard,
  RefreshCw,
  Printer,
  Download,
  Package,
  DollarSign,
  TrendingUp,
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
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState<string | null>(null);
  
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

  const handlePrint = () => {
    window.print();
  };

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
    <div className="p-6 space-y-6 print:p-0">
      {/* Header */}
      <div className="space-y-4 print:hidden">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Purchase Reports</h1>
            <p className="text-muted-foreground">
              Monitor procurement performance and supplier metrics
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={fetchReports} disabled={loading} className="border-border hover:bg-muted transition-colors">
              <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
              Refresh
            </Button>
            <Button variant="outline" onClick={handlePrint} className="border-border hover:bg-muted transition-colors">
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </div>
        </div>

        {/* Quick Date Filter */}
        <QuickDateFilter
          onDateChange={handleDateChange}
          defaultPreset="this_month"
        />
      </div>

      {/* Summary Cards - Neutral B&W Design */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-background border-border shadow-sm hover:border-foreground/20 transition-all group">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2 group-hover:text-foreground transition-colors">
              <DollarSign className="w-4 h-4" />
              Total Purchase
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {summary ? formatCurrency(summary.total_value) : "$0.00"}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {summary?.total_orders || 0} orders placed
            </div>
          </CardContent>
        </Card>

        <Card className="bg-background border-border shadow-sm hover:border-foreground/20 transition-all group">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2 group-hover:text-foreground transition-colors">
              <Package className="w-4 h-4" />
              Received Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {summary?.received_orders || 0}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {summary ? summary.received_rate.toFixed(1) : 0}% fulfillment rate
            </div>
          </CardContent>
        </Card>

        <Card className="bg-background border-border shadow-sm hover:border-foreground/20 transition-all group">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2 group-hover:text-foreground transition-colors">
              <Users className="w-4 h-4" />
              Active Suppliers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {summary?.unique_suppliers || 0}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Suppliers engaged this period
            </div>
          </CardContent>
        </Card>

        <Card className="bg-background border-border shadow-sm hover:border-foreground/20 transition-all group">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2 group-hover:text-foreground transition-colors">
              <Clock className="w-4 h-4" />
              Pending POs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {summary?.pending_orders || 0}
            </div>
            <div className="text-xs text-muted-foreground mt-1 text-orange-600 dark:text-orange-400 font-medium">
              Awaiting delivery
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="suppliers" className="space-y-6">
        <TabsList className="bg-muted/50 border border-border p-1">
          <TabsTrigger value="suppliers" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Users className="w-4 h-4" />
            Supplier Performance
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <CreditCard className="w-4 h-4" />
            Purchase Payments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="suppliers">
          <Card className="border-border shadow-sm overflow-hidden">
            <CardHeader className="border-b bg-muted/20 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Top Suppliers</CardTitle>
                  <CardDescription>Suppliers by purchase volume and value</CardDescription>
                </div>
                <Button onClick={() => handleExport('supplier-performance')} disabled={exportLoading !== null}>
                  {exportLoading === 'supplier-performance' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                  {exportLoading === 'supplier-performance' ? 'Generating...' : 'Export PDF'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30 border-b">
                    <TableHead className="font-semibold text-foreground">Supplier</TableHead>
                    <TableHead className="font-semibold text-foreground">Code</TableHead>
                    <TableHead className="text-right font-semibold text-foreground">Orders</TableHead>
                    <TableHead className="text-right font-semibold text-foreground">Total Value</TableHead>
                    <TableHead className="text-right font-semibold text-foreground">Avg Value</TableHead>
                    <TableHead className="font-semibold text-foreground">Last Order</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map((supplier) => (
                    <TableRow key={supplier.id} className="hover:bg-muted/20 transition-colors border-b last:border-0">
                      <TableCell>
                        <div className="font-medium text-foreground">{supplier.name}</div>
                        <div className="text-xs text-muted-foreground">{supplier.phone}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-[10px] py-0 border-border bg-muted/40 text-foreground">
                          {supplier.supplier_code}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{supplier.total_orders}</TableCell>
                      <TableCell className="text-right font-bold text-foreground">
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
                  {suppliers.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No supplier data found for this period.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2 border-border shadow-sm">
              <CardHeader className="border-b bg-muted/20">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Payment Status Breakdown</CardTitle>
                    <CardDescription>Invoices organized by status</CardDescription>
                  </div>
                  <Button onClick={() => handleExport('purchase-payments')} disabled={exportLoading !== null}>
                    {exportLoading === 'purchase-payments' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                    {exportLoading === 'purchase-payments' ? 'Generating...' : 'Export PDF'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="font-semibold text-foreground">Status</TableHead>
                      <TableHead className="text-right font-semibold text-foreground">Count</TableHead>
                      <TableHead className="text-right font-semibold text-foreground">Total Amount</TableHead>
                      <TableHead className="text-right font-semibold text-foreground">Paid</TableHead>
                      <TableHead className="text-right font-semibold text-foreground">Outstanding</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments?.status_distribution.map((item) => (
                      <TableRow key={item.status} className="hover:bg-muted/20 transition-colors">
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "capitalize border-border",
                              item.status === 'paid' && "bg-black text-white",
                              item.status === 'pending' && "bg-muted text-foreground",
                              item.status === 'partial' && "bg-foreground text-background"
                            )}
                          >
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">{item.count}</TableCell>
                        <TableCell className="text-right font-bold">{formatCurrency(item.total_amount)}</TableCell>
                        <TableCell className="text-right text-green-600 dark:text-green-400 font-medium">{formatCurrency(item.paid_amount)}</TableCell>
                        <TableCell className="text-right text-red-600 dark:text-red-400 font-medium">{formatCurrency(item.outstanding_amount)}</TableCell>
                      </TableRow>
                    ))}
                    {!payments && !loading && (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                          No payment data found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm bg-muted/10">
              <CardHeader className="border-b bg-muted/20">
                <CardTitle>Payment Summary</CardTitle>
                <CardDescription>Overall procurement liability</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Invoices</span>
                    <span className="font-bold">{payments?.totals.total_invoices || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Amount</span>
                    <span className="font-bold text-lg">{formatCurrency(payments?.totals.total_amount || 0)}</span>
                  </div>
                  <div className="border-t pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Paid to Suppliers</span>
                      <span className="font-semibold text-green-600">{formatCurrency(payments?.totals.total_paid || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total Outstanding</span>
                      <span className="font-bold text-red-600 size-lg">{formatCurrency(payments?.totals.total_outstanding || 0)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-black text-white p-4 rounded-lg space-y-2">
                  <div className="text-xs uppercase tracking-wider opacity-70">Payment Progress</div>
                  <div className="text-2xl font-bold">
                    {payments && payments.totals.total_amount > 0 
                      ? ((payments.totals.total_paid / payments.totals.total_amount) * 100).toFixed(1)
                      : "0.0"}%
                  </div>
                  <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden mt-2">
                    <div 
                      className="bg-white h-full transition-all duration-500" 
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
    </div>
  );
}
