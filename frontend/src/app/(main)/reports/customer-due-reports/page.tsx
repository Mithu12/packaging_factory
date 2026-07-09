"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import {
  Download,
  Printer,
  Loader2,
  AlertCircle,
  RefreshCw,
  Users,
  DollarSign,
  CreditCard,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFormatting } from "@/hooks/useFormatting";
import { pdf } from "@react-pdf/renderer";
import { SettingsApi } from "@/services/settings-api";
import { CompanySettings } from "@/services/settings-types";
import {
  SalesReportsApi,
  CustomerDueItem,
  CustomerDueReport,
} from "@/modules/sales/services/sales-reports-api";
import { CustomerDueReportPDF } from "@/modules/sales/components/reports/CustomerDueReportPDF";

export default function CustomerDueReportPage() {
  const [onlyWithDues, setOnlyWithDues] = useState(true);
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [customers, setCustomers] = useState<CustomerDueItem[]>([]);
  const [totals, setTotals] = useState<CustomerDueReport["totals"] | null>(null);

  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);

  const { formatCurrency } = useFormatting();
  const { toast } = useToast();

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const data = await SalesReportsApi.getCustomerDueReport({ onlyWithDues });
      setCustomers(data.customers || []);
      setTotals(data.totals || null);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load customer due report.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [onlyWithDues, toast]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

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

  const buildPdf = () =>
    pdf(
      <CustomerDueReportPDF
        companySettings={companySettings}
        logoBase64={logoBase64}
        customers={customers}
        totals={totals}
        formatCurrency={formatCurrencyForPDF}
      />
    ).toBlob();

  const handlePrint = async () => {
    if (!totals) {
      toast({ title: "No Data", description: "Nothing to print.", variant: "destructive" });
      return;
    }
    setPrinting(true);
    try {
      const blob = await buildPdf();
      const url = window.URL.createObjectURL(blob);
      const printWindow = window.open(url);
      if (printWindow) { printWindow.onload = () => { printWindow.print(); }; }
    } catch {
      toast({ title: "Error", description: "Failed to generate print document.", variant: "destructive" });
    } finally { setPrinting(false); }
  };

  const handleExport = async () => {
    if (!totals) return;
    setExporting(true);
    try {
      const blob = await buildPdf();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `customer-due-${new Date().toISOString().slice(0,10).replace(/-/g,'')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch { toast({ title: "Error", description: "Failed to export report.", variant: "destructive" }); }
    finally { setExporting(false); }
  };

  return (
    <div className="flex-1 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between space-y-2 md:space-y-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Customer Due Report</h2>
          <p className="text-muted-foreground">Outstanding receivables aggregated per customer.</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={fetchReport} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handlePrint} disabled={printing || loading || !totals}>
            {printing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
            Print
          </Button>
          <Button onClick={handleExport} disabled={exporting || loading || !totals}>
            {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Export PDF
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-md bg-white/50 backdrop-blur-sm dark:bg-slate-950/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Switch id="only-dues" checked={onlyWithDues} onCheckedChange={setOnlyWithDues} />
            <Label htmlFor="only-dues" className="text-sm">Only customers with dues</Label>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : totals ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="relative overflow-hidden group border-none shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-rose-500 to-pink-600 opacity-90 transition-transform group-hover:scale-105 duration-500" />
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-rose-50">Total Due</CardTitle>
                <DollarSign className="h-4 w-4 text-rose-100" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-white">{formatCurrency(totals.total_due)}</div>
                <p className="text-xs text-rose-100 mt-1">{totals.customers_with_dues} customers owing</p>
              </CardContent>
            </Card>
            <Card className="relative overflow-hidden group border-none shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 opacity-90 transition-transform group-hover:scale-105 duration-500" />
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-emerald-50">Total Paid</CardTitle>
                <CreditCard className="h-4 w-4 text-emerald-100" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-white">{formatCurrency(totals.total_paid)}</div>
              </CardContent>
            </Card>
            <Card className="relative overflow-hidden group border-none shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-700 opacity-90 transition-transform group-hover:scale-105 duration-500" />
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-50">Total Purchased</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-100" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-white">{formatCurrency(totals.total_purchased)}</div>
              </CardContent>
            </Card>
            <Card className="relative overflow-hidden group border-none shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600 opacity-90 transition-transform group-hover:scale-105 duration-500" />
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-amber-50">Customers</CardTitle>
                <Users className="h-4 w-4 text-amber-100" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-white">{totals.customer_count}</div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>Customer Dues</CardTitle><CardDescription>Outstanding amounts owed by customers.</CardDescription></div>
              <Badge variant="outline">{customers.length} shown</Badge>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="text-right">Purchased</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Due</TableHead>
                    <TableHead className="text-center">Orders</TableHead>
                    <TableHead>Last Order</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.length > 0 ? customers.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-xs font-semibold">{c.customer_code}</TableCell>
                      <TableCell>{c.name}</TableCell>
                      <TableCell className="text-muted-foreground">{c.phone || '—'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(c.total_purchased)}</TableCell>
                      <TableCell className="text-right text-green-600">{formatCurrency(c.total_paid)}</TableCell>
                      <TableCell className="text-right font-bold text-red-600">{formatCurrency(c.total_due)}</TableCell>
                      <TableCell className="text-center">
                        {c.due_order_count > 0 ? <Badge variant="destructive">{c.due_order_count}/{c.order_count}</Badge> : <span className="text-muted-foreground">{c.order_count}</span>}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {c.last_order_date ? new Date(c.last_order_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </TableCell>
                    </TableRow>
                  )) : <TableRow><TableCell colSpan={8} className="h-24 text-center">No customer dues found.</TableCell></TableRow>}
                </TableBody>
                {totals && customers.length > 0 && (
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={3} className="font-bold">Total</TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(totals.total_purchased)}</TableCell>
                      <TableCell className="text-right font-bold text-green-600">{formatCurrency(totals.total_paid)}</TableCell>
                      <TableCell className="text-right font-bold text-red-600">{formatCurrency(totals.total_due)}</TableCell>
                      <TableCell colSpan={2} />
                    </TableRow>
                  </TableFooter>
                )}
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="flex h-[400px] flex-col items-center justify-center border-none shadow-md bg-white/50 backdrop-blur-sm dark:bg-slate-950/50">
          <AlertCircle className="h-10 w-10 text-muted-foreground opacity-20 mb-4" />
          <p className="text-muted-foreground">No data available.</p>
        </Card>
      )}
    </div>
  );
}
