"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
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
  BookOpen,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Wallet,
  Scale,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, startOfYear } from "date-fns";
import {
  SupplierLedger,
  SupplierLedgerApi,
  SupplierLedgerEntryType,
} from "@/modules/inventory/services/supplier-ledger-api";
import { SupplierApi } from "@/modules/inventory/services/supplier-api";
import { Supplier } from "@/services/types";
import { useFormatting } from "@/hooks/useFormatting";
import { pdf } from "@react-pdf/renderer";
import { SupplierLedgerPDF } from "@/modules/inventory/components/reports/SupplierLedgerPDF";
import { SettingsApi } from "@/services/settings-api";
import { CompanySettings } from "@/services/settings-types";

const ENTRY_TYPE_BADGE: Record<SupplierLedgerEntryType, { label: string; className: string }> = {
  invoice: { label: "Invoice", className: "bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900/40 dark:text-red-300" },
  payment: { label: "Payment", className: "bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/40 dark:text-green-300" },
  discount: { label: "Discount", className: "bg-sky-100 text-sky-700 hover:bg-sky-100 dark:bg-sky-900/40 dark:text-sky-300" },
  return: { label: "Return", className: "bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/40 dark:text-amber-300" },
};

export default function SupplierLedgerPage() {
  const [supplierId, setSupplierId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>(() => format(startOfYear(new Date()), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState<string>(() => format(new Date(), "yyyy-MM-dd"));
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [ledger, setLedger] = useState<SupplierLedger | null>(null);
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);

  // Guards against out-of-order responses when the supplier/dates change quickly.
  const latestRequestRef = useRef(0);

  const { formatCurrency, formatDate } = useFormatting();
  const { toast } = useToast();

  // Entry dates arrive as plain YYYY-MM-DD; parse as local midnight so the
  // displayed day never shifts with the browser's UTC offset.
  const formatLedgerDate = useCallback(
    (d: string) => formatDate(new Date(`${d}T00:00:00`)),
    [formatDate]
  );

  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        const result = await SupplierApi.getSuppliers({ limit: 1000, sortBy: "name", sortOrder: "asc" });
        setSuppliers(result.suppliers || []);
      } catch {
        toast({ title: "Error", description: "Failed to load suppliers.", variant: "destructive" });
      }
    };
    loadSuppliers();
  }, [toast]);

  const fetchLedger = useCallback(async () => {
    const requestId = ++latestRequestRef.current;
    if (!supplierId) {
      setLedger(null);
      setLoading(false);
      return;
    }
    if (startDate && endDate && startDate > endDate) {
      setLedger(null);
      setLoading(false);
      toast({ title: "Invalid range", description: "Start date must be on or before end date.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const data = await SupplierLedgerApi.getSupplierLedger({
        supplierId: Number(supplierId),
        startDate,
        endDate,
      });
      if (requestId !== latestRequestRef.current) return;
      setLedger(data);
    } catch {
      if (requestId !== latestRequestRef.current) return;
      setLedger(null);
      toast({ title: "Error", description: "Failed to load supplier ledger.", variant: "destructive" });
    } finally {
      if (requestId === latestRequestRef.current) setLoading(false);
    }
  }, [supplierId, startDate, endDate, toast]);

  useEffect(() => { fetchLedger(); }, [fetchLedger]);

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

  const buildPdf = (data: SupplierLedger) =>
    pdf(
      <SupplierLedgerPDF
        ledger={data}
        companySettings={companySettings}
        logoBase64={logoBase64}
        formatCurrency={formatCurrencyForPDF}
        formatDate={formatLedgerDate}
      />
    ).toBlob();

  const handlePrint = async () => {
    if (!ledger) {
      toast({ title: "No Data", description: "Nothing to print.", variant: "destructive" });
      return;
    }
    setPrinting(true);
    try {
      const blob = await buildPdf(ledger);
      const url = window.URL.createObjectURL(blob);
      const printWindow = window.open(url);
      if (printWindow) { printWindow.onload = () => { printWindow.print(); }; }
    } catch {
      toast({ title: "Error", description: "Failed to generate print document.", variant: "destructive" });
    } finally { setPrinting(false); }
  };

  const handleExport = async () => {
    if (!ledger) return;
    setExporting(true);
    try {
      const blob = await buildPdf(ledger);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `supplier-ledger-${ledger.supplier.supplier_code}-${format(new Date(), 'yyyyMMdd')}.pdf`);
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
          <h2 className="text-3xl font-bold tracking-tight">Supplier Ledger</h2>
          <p className="text-muted-foreground">Statement of account with running payable balance.</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={fetchLedger} disabled={loading || !supplierId}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={handlePrint} disabled={printing || loading || !ledger}>
            {printing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
            Print
          </Button>
          <Button onClick={handleExport} disabled={exporting || loading || !ledger}>
            {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Export PDF
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-md bg-white/50 backdrop-blur-sm dark:bg-slate-950/50">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div className="w-full md:w-80">
              <Label className="text-sm font-medium mb-1 block text-muted-foreground">Supplier</Label>
              <SearchableSelect
                value={supplierId}
                onValueChange={setSupplierId}
                placeholder="Select a supplier"
                searchPlaceholder="Search suppliers..."
                emptyMessage="No suppliers found."
                data-testid="supplier-ledger-supplier"
                options={suppliers.map((s) => ({
                  value: String(s.id),
                  label: s.name,
                  keywords: `${s.supplier_code ?? ''} ${s.contact_person ?? ''}`,
                  hint: s.supplier_code,
                }))}
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-1 block text-muted-foreground">From</Label>
              <Input type="date" value={startDate} max={endDate || undefined} onChange={(e) => setStartDate(e.target.value)} className="w-44" />
            </div>
            <div>
              <Label className="text-sm font-medium mb-1 block text-muted-foreground">To</Label>
              <Input type="date" value={endDate} min={startDate || undefined} onChange={(e) => setEndDate(e.target.value)} className="w-44" />
            </div>
          </div>
        </CardContent>
      </Card>

      {!supplierId ? (
        <Card className="flex h-[400px] flex-col items-center justify-center border-none shadow-md bg-white/50 backdrop-blur-sm dark:bg-slate-950/50">
          <BookOpen className="h-10 w-10 text-muted-foreground opacity-20 mb-4" />
          <p className="text-muted-foreground">Select a supplier to view their ledger.</p>
        </Card>
      ) : loading ? (
        <div className="flex h-[400px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : ledger ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="relative overflow-hidden group border-none shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-700 opacity-90 transition-transform group-hover:scale-105 duration-500" />
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-50">Opening Balance</CardTitle>
                <Scale className="h-4 w-4 text-blue-100" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-white">{formatCurrency(ledger.opening_balance)}</div>
                <p className="text-xs text-blue-100 mt-1">{startDate ? `As of ${formatLedgerDate(startDate)}` : "Supplier opening"}</p>
              </CardContent>
            </Card>
            <Card className="relative overflow-hidden group border-none shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-rose-500 to-pink-600 opacity-90 transition-transform group-hover:scale-105 duration-500" />
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-rose-50">Purchases (Credit)</CardTitle>
                <TrendingUp className="h-4 w-4 text-rose-100" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-white">{formatCurrency(ledger.totals.total_credit)}</div>
              </CardContent>
            </Card>
            <Card className="relative overflow-hidden group border-none shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 opacity-90 transition-transform group-hover:scale-105 duration-500" />
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-emerald-50">Payments &amp; Adjustments (Debit)</CardTitle>
                <TrendingDown className="h-4 w-4 text-emerald-100" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-white">{formatCurrency(ledger.totals.total_debit)}</div>
              </CardContent>
            </Card>
            <Card className="relative overflow-hidden group border-none shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600 opacity-90 transition-transform group-hover:scale-105 duration-500" />
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-amber-50">Closing Balance</CardTitle>
                <Wallet className="h-4 w-4 text-amber-100" />
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-white">{formatCurrency(ledger.totals.closing_balance)}</div>
                <p className="text-xs text-amber-100 mt-1">{ledger.totals.closing_balance > 0 ? "Payable to supplier" : ledger.totals.closing_balance < 0 ? "Advance with supplier" : "Settled"}</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{ledger.supplier.name} <span className="text-sm font-mono text-muted-foreground">({ledger.supplier.supplier_code})</span></CardTitle>
                <CardDescription>Credits are purchase invoices; debits are approved payments, discounts and purchase returns.</CardDescription>
              </div>
              <Badge variant="outline">{ledger.entries.length} transactions</Badge>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="bg-yellow-50/60 dark:bg-yellow-950/20">
                    <TableCell className="text-sm">{startDate ? formatLedgerDate(startDate) : "—"}</TableCell>
                    <TableCell />
                    <TableCell />
                    <TableCell className="font-semibold">Opening Balance</TableCell>
                    <TableCell />
                    <TableCell />
                    <TableCell className="text-right font-semibold">{formatCurrency(ledger.opening_balance)}</TableCell>
                  </TableRow>
                  {ledger.entries.length > 0 ? ledger.entries.map((e) => (
                    <TableRow key={`${e.entry_type}-${e.source_id}`}>
                      <TableCell className="text-sm whitespace-nowrap">{formatLedgerDate(e.entry_date)}</TableCell>
                      <TableCell>
                        <Badge className={ENTRY_TYPE_BADGE[e.entry_type].className}>{ENTRY_TYPE_BADGE[e.entry_type].label}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs font-semibold">{e.reference}</TableCell>
                      <TableCell className="text-sm">{e.description}</TableCell>
                      <TableCell className="text-right text-green-600">{e.debit ? formatCurrency(e.debit) : "—"}</TableCell>
                      <TableCell className="text-right text-red-600">{e.credit ? formatCurrency(e.credit) : "—"}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(e.balance)}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow><TableCell colSpan={7} className="h-24 text-center">No transactions in this period.</TableCell></TableRow>
                  )}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={4} className="font-bold">Total</TableCell>
                    <TableCell className="text-right font-bold text-green-600">{formatCurrency(ledger.totals.total_debit)}</TableCell>
                    <TableCell className="text-right font-bold text-red-600">{formatCurrency(ledger.totals.total_credit)}</TableCell>
                    <TableCell className="text-right font-bold">{formatCurrency(ledger.totals.closing_balance)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="flex h-[400px] flex-col items-center justify-center border-none shadow-md bg-white/50 backdrop-blur-sm dark:bg-slate-950/50">
          <BookOpen className="h-10 w-10 text-muted-foreground opacity-20 mb-4" />
          <p className="text-muted-foreground">No ledger data. Check the date range and try again.</p>
        </Card>
      )}
    </div>
  );
}
