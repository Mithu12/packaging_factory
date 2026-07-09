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
  RefreshCw,
  Printer,
  Download,
  Loader2,
  TrendingUp,
  Users,
  DollarSign,
  ShoppingCart,
  CreditCard,
  BarChart3,
  RotateCcw,
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
import { useFormatting } from "@/hooks/useFormatting";
import { pdf } from "@react-pdf/renderer";
import { SalesReportPDF } from "@/modules/sales/components/reports/SalesReportPDF";
import { SettingsApi } from "@/services/settings-api";
import { CompanySettings } from "@/services/settings-types";

export default function SalesReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [activeTab, setActiveTab] = useState("summary");
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [summary, setSummary] = useState<SalesSummary | null>(null);
  const [customers, setCustomers] = useState<CustomerPerformance[]>([]);
  const [payment, setPayment] = useState<PaymentAnalysis | null>(null);
  const [fulfillment, setFulfillment] = useState<OrderFulfillment | null>(null);
  const [returns, setReturns] = useState<ReturnsAnalysis | null>(null);

  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);

  const { formatCurrency } = useFormatting();
  const { toast } = useToast();

  const loadLogoAsBase64 = (logoUrl: string): Promise<string | null> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext("2d");
          if (ctx) { ctx.drawImage(img, 0, 0); resolve(canvas.toDataURL("image/png")); }
          else resolve(null);
        } catch { resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = logoUrl.startsWith("http") ? logoUrl : `${process.env.NEXT_PUBLIC_API_URL?.replace("/api", "")}${logoUrl}`;
    });
  };

  const formatCurrencyForPDF = (val: number) => formatCurrency(val).replace(/৳/g, "TK");

  const fetchReports = useCallback(async () => {
    if (!dateRange?.from) return;
    setLoading(true);
    try {
      const params = {
        dateRange: {
          from: dateRange.from,
          to: dateRange.to || dateRange.from,
        },
      };

      const [summaryRes, customerRes, paymentRes, fulfillmentRes, returnsRes] = await Promise.all([
        SalesReportsApi.getSalesSummary(params),
        SalesReportsApi.getCustomerPerformance({ ...params, limit: 20 }),
        SalesReportsApi.getPaymentAnalysis(params),
        SalesReportsApi.getOrderFulfillment(params),
        SalesReportsApi.getReturnsAnalysis(params),
      ]);

      setSummary(summaryRes);
      setCustomers(customerRes);
      setPayment(paymentRes);
      setFulfillment(fulfillmentRes);
      setReturns(returnsRes);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load sales report data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [dateRange, toast]);

  const handleDateChange = (range: DateRange | undefined, _preset: DatePreset) => {
    setDateRange(range);
  };

  const buildPdf = () =>
    pdf(
      <SalesReportPDF
        reportType={activeTab === "summary" ? "sales-summary" : activeTab === "customers" ? "customer-performance" : activeTab === "payments" ? "payment-analysis" : "order-fulfillment"}
        dateRange={{
          from: dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : undefined,
          to: dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
        }}
        companySettings={companySettings}
        logoBase64={logoBase64}
        salesSummary={summary}
        customerPerformance={customers}
        paymentAnalysis={payment}
        orderFulfillment={fulfillment}
        returnsAnalysis={returns}
        formatCurrency={formatCurrencyForPDF}
      />
    ).toBlob();

  const handlePrint = async () => {
    setPrinting(true);
    try {
      const blob = await buildPdf();
      const url = window.URL.createObjectURL(blob);
      const printWindow = window.open(url);
      if (printWindow) printWindow.onload = () => printWindow.print();
    } catch {
      toast({ title: "Error", description: "Failed to generate print document.", variant: "destructive" });
    } finally { setPrinting(false); }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await buildPdf();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `sales-report-${format(new Date(), "yyyyMMdd")}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      toast({ title: "Error", description: "Failed to export report.", variant: "destructive" });
    } finally { setExporting(false); }
  };

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

  useEffect(() => { fetchReports(); }, [fetchReports]);

  return (
    <div className="flex-1 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between space-y-2 md:space-y-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Sales Reports</h2>
          <p className="text-muted-foreground">Sales performance, customer insights, and payment analysis.</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={fetchReports} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handlePrint} disabled={printing || loading}>
            {printing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
            Print
          </Button>
          <Button onClick={handleExport} disabled={exporting || loading}>
            {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Export PDF
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-md bg-white/50 backdrop-blur-sm dark:bg-slate-950/50">
        <CardContent className="p-4">
          <QuickDateFilter onDateChange={handleDateChange} defaultPreset="this_month" className="w-full" />
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex h-[400px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : summary ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="relative overflow-hidden group border-none shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-700 opacity-90 transition-transform group-hover:scale-105 duration-500" />
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-50">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-100" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-white">{formatCurrency(summary.total_revenue)}</div>
                <p className="text-xs text-blue-100 mt-1">{summary.total_orders} orders</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden group border-none shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 opacity-90 transition-transform group-hover:scale-105 duration-500" />
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-emerald-50">Avg Order Value</CardTitle>
                <TrendingUp className="h-4 w-4 text-emerald-100" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-white">{formatCurrency(summary.avg_order_value)}</div>
                <p className="text-xs text-emerald-100 mt-1">Per order average</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden group border-none shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-violet-600 opacity-90 transition-transform group-hover:scale-105 duration-500" />
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-purple-50">Customers</CardTitle>
                <Users className="h-4 w-4 text-purple-100" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-white">{summary.unique_customers}</div>
                <p className="text-xs text-purple-100 mt-1">Active buyers</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden group border-none shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600 opacity-90 transition-transform group-hover:scale-105 duration-500" />
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-amber-50">Payment Rate</CardTitle>
                <CreditCard className="h-4 w-4 text-amber-100" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-white">{summary.payment_rate.toFixed(1)}%</div>
                <p className="text-xs text-amber-100 mt-1">{summary.paid_orders} paid orders</p>
              </CardContent>
            </Card>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-white/50 backdrop-blur-sm dark:bg-slate-950/50 p-1">
              <TabsTrigger value="summary" className="gap-2">
                <BarChart3 className="w-4 h-4" />
                Summary
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
                <ShoppingCart className="w-4 h-4" />
                Fulfillment
              </TabsTrigger>
            </TabsList>

            <TabsContent value="summary">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader><CardTitle className="text-sm">Order Status</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Orders</span>
                      <Badge>{summary.total_orders}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Completed</span>
                      <Badge className="bg-green-100 text-green-800">{summary.completed_orders}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Paid</span>
                      <Badge className="bg-blue-100 text-blue-800">{summary.paid_orders}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Completion Rate</span>
                      <span className="font-semibold">{summary.completion_rate.toFixed(1)}%</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-sm">Returns</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {returns ? (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Total Returns</span>
                          <Badge variant="destructive">{returns.summary.total_returns}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Refund Amount</span>
                          <span className="font-semibold text-red-600">{formatCurrency(returns.summary.total_refund_amount)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Return Rate</span>
                          <span className="font-semibold">{returns.summary.return_rate.toFixed(1)}%</span>
                        </div>
                      </>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">No return data</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="customers">
              <Card>
                <CardHeader>
                  <CardTitle>Top Customers</CardTitle>
                  <CardDescription>Customer performance ranked by revenue</CardDescription>
                </CardHeader>
                <CardContent>
                  {customers.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="font-semibold">Customer</TableHead>
                            <TableHead className="font-semibold">Code</TableHead>
                            <TableHead className="font-semibold text-right">Orders</TableHead>
                            <TableHead className="font-semibold text-right">Total Revenue</TableHead>
                            <TableHead className="font-semibold text-right">Avg Order</TableHead>
                            <TableHead className="font-semibold">Last Order</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {customers.map((c) => (
                            <TableRow key={c.id}>
                              <TableCell>
                                <div className="font-medium">{c.name}</div>
                                <div className="text-xs text-muted-foreground">{c.phone}</div>
                              </TableCell>
                              <TableCell className="font-mono text-xs">{c.customer_code}</TableCell>
                              <TableCell className="text-right">{c.total_orders}</TableCell>
                              <TableCell className="text-right font-semibold text-green-600">{formatCurrency(c.total_revenue)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(c.avg_order_value)}</TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {c.last_order_date ? format(new Date(c.last_order_date), "MMM d, yyyy") : "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No customer data found</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payments">
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader><CardTitle className="text-sm">Payment Methods</CardTitle></CardHeader>
                  <CardContent>
                    {payment?.payment_methods && payment.payment_methods.length > 0 ? (
                      <div className="space-y-3">
                        {payment.payment_methods.map((m) => (
                          <div key={m.method} className="flex justify-between items-center p-3 rounded-lg border">
                            <div>
                              <div className="font-medium capitalize">{m.method}</div>
                              <div className="text-xs text-muted-foreground">{m.order_count} orders</div>
                            </div>
                            <span className="font-semibold">{formatCurrency(m.total_amount)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">No payment data</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-sm">Outstanding</CardTitle></CardHeader>
                  <CardContent>
                    {payment?.outstanding_payments ? (
                      <div className="space-y-4">
                        <div className="p-6 rounded-lg border bg-orange-50 dark:bg-orange-900/20 text-center">
                          <div className="text-3xl font-bold text-orange-600">
                            {formatCurrency(payment.outstanding_payments.total_outstanding)}
                          </div>
                          <div className="text-sm text-muted-foreground mt-2">Total Outstanding</div>
                        </div>
                        <div className="p-4 rounded-lg border text-center">
                          <div className="text-2xl font-bold">{payment.outstanding_payments.outstanding_orders}</div>
                          <div className="text-sm text-muted-foreground mt-1">Orders with Dues</div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">No outstanding data</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="fulfillment">
              <Card>
                <CardHeader>
                  <CardTitle>Order Fulfillment</CardTitle>
                  <CardDescription>Order status distribution and fulfillment metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  {fulfillment ? (
                    <div className="space-y-6">
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="p-4 rounded-lg border text-center">
                          <div className="text-2xl font-bold">{fulfillment.fulfillment_metrics.total_orders}</div>
                          <div className="text-sm text-muted-foreground">Total Orders</div>
                        </div>
                        <div className="p-4 rounded-lg border text-center">
                          <div className="text-2xl font-bold text-green-600">{fulfillment.fulfillment_metrics.completed_orders}</div>
                          <div className="text-sm text-muted-foreground">Completed</div>
                        </div>
                        <div className="p-4 rounded-lg border text-center">
                          <div className="text-2xl font-bold">{fulfillment.fulfillment_metrics.fulfillment_rate.toFixed(1)}%</div>
                          <div className="text-sm text-muted-foreground">Fulfillment Rate</div>
                        </div>
                      </div>

                      {fulfillment.status_distribution.length > 0 && (
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              <TableHead className="font-semibold">Status</TableHead>
                              <TableHead className="font-semibold text-right">Orders</TableHead>
                              <TableHead className="font-semibold text-right">Amount</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {fulfillment.status_distribution.map((s) => (
                              <TableRow key={s.status}>
                                <TableCell>
                                  <Badge variant={s.status === "completed" ? "default" : s.status === "cancelled" ? "destructive" : "secondary"}>
                                    {s.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">{s.order_count}</TableCell>
                                <TableCell className="text-right font-semibold">{formatCurrency(s.total_amount)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No fulfillment data found</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <Card className="flex h-[400px] flex-col items-center justify-center border-none shadow-md bg-white/50 backdrop-blur-sm dark:bg-slate-950/50">
          <TrendingUp className="h-10 w-10 text-muted-foreground opacity-20 mb-4" />
          <p className="text-muted-foreground">Select a date range to load sales report data.</p>
        </Card>
      )}
    </div>
  );
}
