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
  AlertTriangle,
  Wallet,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  SupplierDueReportsApi,
  SupplierDueRow,
  SupplierDueTotals,
} from "@/modules/inventory/services/supplier-due-reports-api";
import { useFormatting } from "@/hooks/useFormatting";
import { pdf } from "@react-pdf/renderer";
import { SupplierDueReportPDF } from "@/modules/inventory/components/reports/SupplierDueReportPDF";
import { SettingsApi } from "@/services/settings-api";
import { CompanySettings } from "@/services/settings-types";

export default function SupplierDueReportsPage() {
  const [asOfDate, setAsOfDate] = useState<string>(() => format(new Date(), "yyyy-MM-dd"));
  const [onlyWithDues, setOnlyWithDues] = useState(true);
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [suppliers, setSuppliers] = useState<SupplierDueRow[]>([]);
  const [totals, setTotals] = useState<SupplierDueTotals | null>(null);

  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);

  const { formatCurrency } = useFormatting();
  const { toast } = useToast();

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const data = await SupplierDueReportsApi.getSupplierDueReport({
        asOfDate: asOfDate ? new Date(asOfDate) : undefined,
        onlyWithDues,
      });
      setSuppliers(data.suppliers || []);
      setTotals(data.totals || null);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load supplier due report.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [asOfDate, onlyWithDues, toast]);

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
      <SupplierDueReportPDF
        asOfDate={asOfDate}
        companySettings={companySettings}
        logoBase64={logoBase64}
        suppliers={suppliers}
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
      link.setAttribute("download", `supplier-due-${format(new Date(), 'yyyyMMdd')}.pdf`);
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
          <h2 className="text-3xl font-bold tracking-tight">Total Supplier Due Report</h2>
          <p className="text-muted-foreground">Outstanding payables aggregated per supplier.</p>
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
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div>
              <Label className="text-sm font-medium mb-1 block text-muted-foreground">As of date</Label>
              <Input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} className="w-48" />
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Switch id="only-dues" checked={onlyWithDues} onCheckedChange={setOnlyWithDues} />
              <Label htmlFor="only-dues" className="text-sm">Only suppliers with dues</Label>
            </div>
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
                <p className="text-xs text-rose-100 mt-1">{totals.suppliers_with_dues} suppliers owing</p>
              </CardContent>
            </Card>
            <Card className="relative overflow-hidden group border-none shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600 opacity-90 transition-transform group-hover:scale-105 duration-500" />
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-amber-50">Invoice Outstanding</CardTitle>
                <Wallet className="h-4 w-4 text-amber-100" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-white">{formatCurrency(totals.invoice_outstanding)}</div>
              </CardContent>
            </Card>
            <Card className="relative overflow-hidden group border-none shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-700 opacity-90 transition-transform group-hover:scale-105 duration-500" />
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-50">Opening Balance</CardTitle>
                <AlertTriangle className="h-4 w-4 text-blue-100" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-white">{formatCurrency(totals.opening_balance)}</div>
              </CardContent>
            </Card>
            <Card className="relative overflow-hidden group border-none shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 opacity-90 transition-transform group-hover:scale-105 duration-500" />
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-emerald-50">Suppliers</CardTitle>
                <Users className="h-4 w-4 text-emerald-100" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-white">{totals.supplier_count}</div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle>Supplier Dues</CardTitle><CardDescription>Opening balance plus outstanding invoices.</CardDescription></div>
              <Badge variant="outline">{suppliers.length} shown</Badge>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-right">Opening</TableHead>
                    <TableHead className="text-right">Invoiced</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Due</TableHead>
                    <TableHead className="text-center">Overdue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.length > 0 ? suppliers.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs font-semibold">{s.supplier_code}</TableCell>
                      <TableCell>{s.name}</TableCell>
                      <TableCell className="text-right">{formatCurrency(s.opening_balance)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(s.total_invoiced)}</TableCell>
                      <TableCell className="text-right text-green-600">{formatCurrency(s.total_paid)}</TableCell>
                      <TableCell className="text-right font-bold text-red-600">{formatCurrency(s.total_due)}</TableCell>
                      <TableCell className="text-center">
                        {s.overdue_count > 0 ? <Badge variant="destructive">{s.overdue_count}</Badge> : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                    </TableRow>
                  )) : <TableRow><TableCell colSpan={7} className="h-24 text-center">No supplier dues found.</TableCell></TableRow>}
                </TableBody>
                {totals && suppliers.length > 0 && (
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={2} className="font-bold">Total</TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(totals.opening_balance)}</TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(totals.total_invoiced)}</TableCell>
                      <TableCell className="text-right font-bold text-green-600">{formatCurrency(totals.total_paid)}</TableCell>
                      <TableCell className="text-right font-bold text-red-600">{formatCurrency(totals.total_due)}</TableCell>
                      <TableCell />
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
