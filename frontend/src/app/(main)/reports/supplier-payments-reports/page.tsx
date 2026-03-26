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
  Download,
  DollarSign,
  Printer,
  FileText,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertCircle,
  CreditCard,
  Banknote,
  RefreshCw,
} from "lucide-react";
import { DateRange } from "react-day-picker";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { QuickDateFilter, DatePreset } from "@/components/ui/quick-date-filter";
import { SupplierPaymentsReportsApi, SupplierPaymentReportParams } from "@/modules/inventory/services/supplier-payments-reports-api";
import { Payment, Invoice, PaymentStats } from "@/services/types";
import { useFormatting } from "@/hooks/useFormatting";
import { pdf } from "@react-pdf/renderer";
import { SupplierPaymentsReportPDF } from "@/modules/inventory/components/reports/SupplierPaymentsReportPDF";
import { SettingsApi } from "@/services/settings-api";
import { CompanySettings } from "@/services/settings-types";

export default function SupplierPaymentsReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [activePreset, setActivePreset] = useState<DatePreset>("this_month");
  const [activeTab, setActiveTab] = useState("summary");
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);

  const [paymentStats, setPaymentStats] = useState<PaymentStats | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentsTotal, setPaymentsTotal] = useState(0);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicesTotal, setInvoicesTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);

  const { formatCurrency } = useFormatting();
  const { toast } = useToast();

  const fetchReports = useCallback(async () => {
    if (!dateRange?.from) return;
    setLoading(true);
    try {
      const params: SupplierPaymentReportParams = { dateRange, page: currentPage, limit: pageSize };
      const [statsRes, paymentsRes, invoicesRes] = await Promise.all([
        SupplierPaymentsReportsApi.getPaymentStats(params),
        SupplierPaymentsReportsApi.getPaymentsList(params),
        SupplierPaymentsReportsApi.getInvoicesList(params),
      ]);
      setPaymentStats(statsRes);
      setPayments(paymentsRes.payments || []);
      setPaymentsTotal(paymentsRes.total || 0);
      setInvoices(invoicesRes.invoices || []);
      setInvoicesTotal(invoicesRes.total || 0);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load supplier payment reports.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [dateRange, currentPage, toast]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await SettingsApi.getCompanySettings();
        setCompanySettings(settings);
        if (settings.invoice_logo) {
          const base64 = await loadLogoAsBase64(settings.invoice_logo);
          setLogoBase64(base64);
        }
      } catch (error) { console.error("Error loading settings:", error); }
    };
    loadSettings();
  }, []);

  const handleDateChange = (range: DateRange | undefined, preset: DatePreset) => {
    setDateRange(range);
    setActivePreset(preset);
    setCurrentPage(1);
  };

  const formatCurrencyForPDF = (val: number) => formatCurrency(val).replace(/৳/g, 'TK');

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
          if (ctx) { ctx.drawImage(img, 0, 0); resolve(canvas.toDataURL('image/png')); }
          else resolve(null);
        } catch { resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = logoUrl.startsWith('http') ? logoUrl : `${process.env.NEXT_PUBLIC_API_URL?.replace('/api', '')}${logoUrl}`;
    });
  };

  const handlePrint = async () => {
    let reportType: 'payments-summary' | 'payments-details' | 'invoices-outstanding' = 'payments-summary';
    if (activeTab === 'payments') reportType = 'payments-details';
    else if (activeTab === 'invoices') reportType = 'invoices-outstanding';

    if (!paymentStats) {
      toast({ title: "No Data", description: "Please select a date range to load data.", variant: "destructive" });
      return;
    }
    setPrinting(true);
    try {
      const blob = await pdf(
        <SupplierPaymentsReportPDF
          reportType={reportType}
          dateRange={{ from: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined, to: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined }}
          companySettings={companySettings}
          logoBase64={logoBase64}
          paymentStats={paymentStats}
          payments={payments}
          invoices={invoices}
          formatCurrency={formatCurrencyForPDF}
        />
      ).toBlob();
      const url = window.URL.createObjectURL(blob);
      const printWindow = window.open(url);
      if (printWindow) { printWindow.onload = () => { printWindow.print(); }; }
    } catch (error) {
      toast({ title: "Error", description: "Failed to generate print document.", variant: "destructive" });
    } finally { setPrinting(false); }
  };

  const handleExport = async (type: 'payments-summary' | 'payments-details' | 'invoices-outstanding') => {
    if (!paymentStats) return;
    setExportLoading(type);
    try {
      const blob = await pdf(
        <SupplierPaymentsReportPDF
          reportType={type}
          dateRange={{ from: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined, to: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined }}
          companySettings={companySettings}
          logoBase64={logoBase64}
          paymentStats={paymentStats}
          payments={payments}
          invoices={invoices}
          formatCurrency={formatCurrencyForPDF}
        />
      ).toBlob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `supplier-${type}-${format(new Date(), 'yyyyMMdd')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch { toast({ title: "Error", description: "Failed to export report.", variant: "destructive" }); }
    finally { setExportLoading(null); }
  };

  return (
    <div className="flex-1 space-y-4 ">
      <div className="flex flex-col md:flex-row md:items-center justify-between space-y-2 md:space-y-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Supplier Payments Report</h2>
          <p className="text-muted-foreground">Analyze payments made to suppliers and outstanding invoices.</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={fetchReports} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handlePrint} disabled={printing || loading || !paymentStats}>
            {printing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
            Print
          </Button>
          <Button onClick={() => handleExport(activeTab === 'invoices' ? 'invoices-outstanding' : activeTab === 'payments' ? 'payments-details' : 'payments-summary')} disabled={!!exportLoading || loading || !paymentStats}>
            {exportLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Export PDF
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-md bg-white/50 backdrop-blur-sm dark:bg-slate-950/50">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1 block text-muted-foreground">Date Range</label>
              <QuickDateFilter onDateChange={handleDateChange} defaultPreset={activePreset} className="w-full" />
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : paymentStats ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="relative overflow-hidden group border-none shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 opacity-90 transition-transform group-hover:scale-105 duration-500" />
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-emerald-50">Total Paid</CardTitle>
                <Banknote className="h-4 w-4 text-emerald-100" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-white">{formatCurrency(paymentStats.total_paid_amount)}</div>
                <p className="text-xs text-emerald-100 mt-1">{paymentStats.paid_invoices} invoices paid</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden group border-none shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600 opacity-90 transition-transform group-hover:scale-105 duration-500" />
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-amber-50">Outstanding</CardTitle>
                <Clock className="h-4 w-4 text-amber-100" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-white">{formatCurrency(paymentStats.total_outstanding_amount)}</div>
                <p className="text-xs text-amber-100 mt-1">{paymentStats.pending_invoices + paymentStats.partial_invoices} invoices pending</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden group border-none shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-rose-500 to-pink-600 opacity-90 transition-transform group-hover:scale-105 duration-500" />
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-rose-50">Overdue</CardTitle>
                <AlertTriangle className="h-4 w-4 text-rose-100" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-white">{formatCurrency(paymentStats.overdue_amount)}</div>
                <p className="text-xs text-rose-100 mt-1">{paymentStats.overdue_invoices} overdue invoices</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden group border-none shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-700 opacity-90 transition-transform group-hover:scale-105 duration-500" />
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-50">Total Invoices</CardTitle>
                <FileText className="h-4 w-4 text-blue-100" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-white">{paymentStats.total_invoices}</div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="summary" className="space-y-4" onValueChange={setActiveTab}>
            <TabsList className="bg-white/50 backdrop-blur-sm dark:bg-slate-950/50 p-1">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="payments">Payment History</TabsTrigger>
              <TabsTrigger value="invoices">Outstanding Invoices</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Invoice Status Distribution */}
                <Card className="border-none shadow-md">
                  <CardHeader>
                    <CardTitle>Invoice Status Distribution</CardTitle>
                    <CardDescription>Breakdown of invoices by status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-green-500" />
                          <span className="text-sm">Paid</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{paymentStats.paid_invoices}</span>
                          <span className="text-muted-foreground text-xs">({paymentStats.total_invoices > 0 ? ((paymentStats.paid_invoices / paymentStats.total_invoices) * 100).toFixed(0) : 0}%)</span>
                        </div>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500" style={{ width: `${paymentStats.total_invoices > 0 ? (paymentStats.paid_invoices / paymentStats.total_invoices) * 100 : 0}%` }} />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-amber-500" />
                          <span className="text-sm">Pending / Partial</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{paymentStats.pending_invoices + paymentStats.partial_invoices}</span>
                          <span className="text-muted-foreground text-xs">({paymentStats.total_invoices > 0 ? (((paymentStats.pending_invoices + paymentStats.partial_invoices) / paymentStats.total_invoices) * 100).toFixed(0) : 0}%)</span>
                        </div>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500" style={{ width: `${paymentStats.total_invoices > 0 ? ((paymentStats.pending_invoices + paymentStats.partial_invoices) / paymentStats.total_invoices) * 100 : 0}%` }} />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-red-500" />
                          <span className="text-sm">Overdue</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{paymentStats.overdue_invoices}</span>
                          <span className="text-muted-foreground text-xs">({paymentStats.total_invoices > 0 ? ((paymentStats.overdue_invoices / paymentStats.total_invoices) * 100).toFixed(0) : 0}%)</span>
                        </div>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500" style={{ width: `${paymentStats.total_invoices > 0 ? (paymentStats.overdue_invoices / paymentStats.total_invoices) * 100 : 0}%` }} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Insights */}
                <Card className="border-none shadow-md">
                  <CardHeader>
                    <CardTitle>Payment Insights</CardTitle>
                    <CardDescription>Key financial metrics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="flex items-center justify-between p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Paid</p>
                          <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(paymentStats.total_paid_amount)}</p>
                        </div>
                        <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                      </div>
                      <div className="flex items-center justify-between p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30">
                        <div>
                          <p className="text-sm text-muted-foreground">Outstanding</p>
                          <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{formatCurrency(paymentStats.total_outstanding_amount)}</p>
                        </div>
                        <Clock className="h-8 w-8 text-amber-500" />
                      </div>
                      <div className="flex items-center justify-between p-4 rounded-lg bg-rose-50 dark:bg-rose-950/30">
                        <div>
                          <p className="text-sm text-muted-foreground">Overdue</p>
                          <p className="text-2xl font-bold text-rose-700 dark:text-rose-400">{formatCurrency(paymentStats.overdue_amount)}</p>
                        </div>
                        <AlertTriangle className="h-8 w-8 text-rose-500" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>


            <TabsContent value="payments" className="space-y-4">
              <Card className="border-none shadow-md">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div><CardTitle>Payment History</CardTitle><CardDescription>All payments to suppliers.</CardDescription></div>
                  <Badge variant="outline">{paymentsTotal} Total</Badge>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Payment #</TableHead><TableHead>Supplier</TableHead><TableHead>Method</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {payments.length > 0 ? payments.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>{format(new Date(p.payment_date), "dd MMM yyyy")}</TableCell>
                          <TableCell className="font-mono text-xs font-semibold">{p.payment_number}</TableCell>
                          <TableCell>{p.supplier_name}</TableCell>
                          <TableCell>{p.payment_method}</TableCell>
                          <TableCell><Badge variant={p.status === 'completed' ? 'default' : 'secondary'}>{p.status}</Badge></TableCell>
                          <TableCell className="text-right font-bold">{formatCurrency(p.amount)}</TableCell>
                        </TableRow>
                      )) : <TableRow><TableCell colSpan={6} className="h-24 text-center">No payments found.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="invoices" className="space-y-4">
              <Card className="border-none shadow-md">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div><CardTitle>Outstanding Invoices</CardTitle><CardDescription>Invoices with pending balances.</CardDescription></div>
                  <Badge variant="outline">{invoicesTotal} Total</Badge>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader><TableRow><TableHead>Invoice #</TableHead><TableHead>Supplier</TableHead><TableHead>Invoice Date</TableHead><TableHead>Due Date</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">Paid</TableHead><TableHead className="text-right">Outstanding</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {invoices.length > 0 ? invoices.map((inv) => (
                        <TableRow key={inv.id}>
                          <TableCell className="font-mono text-xs font-semibold">{inv.invoice_number}</TableCell>
                          <TableCell>{inv.supplier_name}</TableCell>
                          <TableCell>{format(new Date(inv.invoice_date), "dd MMM yyyy")}</TableCell>
                          <TableCell>{format(new Date(inv.due_date), "dd MMM yyyy")}</TableCell>
                          <TableCell className="text-right">{formatCurrency(inv.total_amount)}</TableCell>
                          <TableCell className="text-right text-green-600">{formatCurrency(inv.paid_amount)}</TableCell>
                          <TableCell className="text-right font-bold text-red-600">{formatCurrency(inv.outstanding_amount)}</TableCell>
                        </TableRow>
                      )) : <TableRow><TableCell colSpan={7} className="h-24 text-center">No invoices found.</TableCell></TableRow>}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <Card className="flex h-[400px] flex-col items-center justify-center border-none shadow-md bg-white/50 backdrop-blur-sm dark:bg-slate-950/50">
          <AlertCircle className="h-10 w-10 text-muted-foreground opacity-20 mb-4" />
          <p className="text-muted-foreground">Select a date range to generate the report.</p>
        </Card>
      )}
    </div>
  );
}
