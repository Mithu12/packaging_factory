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
import { Download, Loader2, Receipt } from "lucide-react";
import { toast } from "sonner";
import {
  CustomerOrdersApiService,
  type FactoryCustomer,
} from "../services/customer-orders-api";

// First day of the current month, formatted as YYYY-MM-DD for <input type="date">.
const firstOfMonth = (): string => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};
const today = (): string => new Date().toISOString().slice(0, 10);

export default function MonthlyBills() {
  const [customerId, setCustomerId] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>(firstOfMonth());
  const [toDate, setToDate] = useState<string>(today());
  const [busy, setBusy] = useState(false);

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
  const canSubmit = !!customerId && !!fromDate && !!toDate && !rangeInvalid && !busy;

  const handleDownload = async () => {
    if (!canSubmit) return;
    try {
      setBusy(true);
      await CustomerOrdersApiService.downloadMonthlyBill(customerId, fromDate, toDate);
      toast.success("Monthly bill downloaded");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to download monthly bill");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Monthly Bills</h1>
        <p className="text-muted-foreground">
          Consolidated bill listing every challan for a customer over a date
          range, with payment summary.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate Bill</CardTitle>
          <CardDescription>
            Pick a customer and date range. The PDF includes one row per challan
            issued in the period, totals, and the customer&apos;s current
            outstanding balance.
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

          <div className="mt-6 flex justify-end">
            <Button onClick={handleDownload} disabled={!canSubmit}>
              {busy ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Generate &amp; Download PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            About the monthly bill
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Each row corresponds to one delivery challan and its per-delivery
            invoice. Cancelled deliveries are excluded.
          </p>
          <p>
            The payment summary shows totals received from the customer within
            the same period plus the customer&apos;s current outstanding balance
            across all orders.
          </p>
          <p>
            This bill is informational — it does not post any ledger entry, so
            it can be regenerated as often as needed without double-counting.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
