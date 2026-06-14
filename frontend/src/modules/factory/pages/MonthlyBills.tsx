"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useFormatting } from "@/hooks/useFormatting";
import {
  CustomerOrdersApiService,
  type FactoryCustomer,
  type MonthlyBillRow,
  type MonthlyBillVatFilter,
} from "../services/customer-orders-api";

// First day of the current month, formatted as YYYY-MM-DD for <input type="date">.
const firstOfMonth = (): string => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};
const today = (): string => new Date().toISOString().slice(0, 10);

// A challan is VAT-bearing when its (return-netted) invoice carries VAT.
const isVatRow = (r: MonthlyBillRow): boolean => r.tax_amount > 0.005;

export default function MonthlyBills() {
  const [customerId, setCustomerId] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>(firstOfMonth());
  const [toDate, setToDate] = useState<string>(today());
  const [downloading, setDownloading] = useState<MonthlyBillVatFilter | null>(null);
  const { formatCurrency, formatDate } = useFormatting();

  const { data: customers, isLoading: loadingCustomers } = useQuery({
    queryKey: ["factory-customers", "all"],
    queryFn: () => CustomerOrdersApiService.getAllCustomers(),
  });

  // Sort active customers by company → name so the dropdown lists them
  // alphabetically the way users scan for them.
  const sortedCustomers = useMemo<FactoryCustomer[]>(() => {
    if (!customers) return [];
    return [...customers]
      .filter(c => c.is_active !== false)
      .sort((a, b) =>
        (a.company || a.name).localeCompare(b.company || b.name, undefined, {
          sensitivity: "base",
        })
      );
  }, [customers]);

  const rangeInvalid = !!fromDate && !!toDate && fromDate > toDate;
  const canPreview = !!customerId && !!fromDate && !!toDate && !rangeInvalid;

  // Auto-load the selected company's challans for the period (view-only).
  const {
    data: bill,
    isFetching: loadingBill,
    error: billError,
  } = useQuery({
    queryKey: ["monthly-bill-data", customerId, fromDate, toDate],
    queryFn: () =>
      CustomerOrdersApiService.getMonthlyBillData(customerId, fromDate, toDate),
    enabled: canPreview,
  });

  const vatRows = useMemo(() => (bill?.rows ?? []).filter(isVatRow), [bill]);
  const nonVatRows = useMemo(
    () => (bill?.rows ?? []).filter(r => !isVatRow(r)),
    [bill]
  );

  const handleDownload = async (vat: MonthlyBillVatFilter) => {
    if (!canPreview || downloading) return;
    try {
      setDownloading(vat);
      await CustomerOrdersApiService.downloadMonthlyBill(
        customerId,
        fromDate,
        toDate,
        vat
      );
      toast.success(`${vat === "with" ? "VAT" : "Without-VAT"} bill downloaded`);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to download bill");
    } finally {
      setDownloading(null);
    }
  };

  const renderSection = (
    title: string,
    vat: MonthlyBillVatFilter,
    rows: MonthlyBillRow[]
  ) => {
    const totals = rows.reduce(
      (acc, r) => ({
        qty: acc.qty + r.total_qty,
        subtotal: acc.subtotal + r.subtotal,
        tax: acc.tax + r.tax_amount,
        total: acc.total + r.total_amount,
      }),
      { qty: 0, subtotal: 0, tax: 0, total: 0 }
    );

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">
            {title}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              ({rows.length} challan{rows.length === 1 ? "" : "s"})
            </span>
          </CardTitle>
          <Button
            size="sm"
            onClick={() => handleDownload(vat)}
            disabled={rows.length === 0 || !!downloading}
          >
            {downloading === vat ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Download PDF
          </Button>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No {vat === "with" ? "VAT" : "without-VAT"} challans in this period.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">Sl.</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Challan No</TableHead>
                  <TableHead>Vat No</TableHead>
                  <TableHead>PO / Order</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="text-right">VAT</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={r.delivery_id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell>{formatDate(r.delivery_date)}</TableCell>
                    <TableCell className="font-medium">
                      {r.delivery_number}
                    </TableCell>
                    <TableCell>{r.vat_number ?? "—"}</TableCell>
                    <TableCell>{r.po_numbers || "—"}</TableCell>
                    <TableCell className="text-right">{r.total_qty}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(r.subtotal)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(r.tax_amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(r.total_amount)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-semibold">
                  <TableCell colSpan={5} className="text-right">
                    Totals
                  </TableCell>
                  <TableCell className="text-right">{totals.qty}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(totals.subtotal)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(totals.tax)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(totals.total)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Monthly Bills</h1>
        <p className="text-muted-foreground">
          Pick a company and date range to list its challans, then download
          separate VAT and without-VAT bills.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate Bill</CardTitle>
          <CardDescription>
            The challans of the selected company appear below, split into VAT and
            without-VAT bills you can download separately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="mb-customer">Customer</Label>
              <Select
                value={customerId}
                onValueChange={setCustomerId}
                disabled={loadingCustomers}
              >
                <SelectTrigger id="mb-customer">
                  <SelectValue
                    placeholder={loadingCustomers ? "Loading…" : "Select customer"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {sortedCustomers.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.company || c.name}
                      {c.company && c.name && c.company !== c.name
                        ? ` — ${c.name}`
                        : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mb-from">From</Label>
              <Input
                id="mb-from"
                type="date"
                value={fromDate}
                max={toDate || undefined}
                onChange={e => setFromDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mb-to">To</Label>
              <Input
                id="mb-to"
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={e => setToDate(e.target.value)}
              />
            </div>
          </div>

          {rangeInvalid && (
            <p className="mt-3 text-sm text-destructive">
              &quot;From&quot; date must be on or before &quot;To&quot; date.
            </p>
          )}
        </CardContent>
      </Card>

      {!canPreview ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Select a company and a valid date range to list its challans.
          </CardContent>
        </Card>
      ) : loadingBill ? (
        <Card>
          <CardContent className="py-10 flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 mr-2 animate-spin" /> Loading challans…
          </CardContent>
        </Card>
      ) : billError ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-destructive">
            {(billError as Error)?.message ?? "Failed to load challans"}
          </CardContent>
        </Card>
      ) : (bill?.rows.length ?? 0) === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No challans found for this company in the selected period.
          </CardContent>
        </Card>
      ) : (
        <>
          {renderSection("VAT Bill", "with", vatRows)}
          {renderSection("Without-VAT Bill", "without", nonVatRows)}
        </>
      )}
    </div>
  );
}
