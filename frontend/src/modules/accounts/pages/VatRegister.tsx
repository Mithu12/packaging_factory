"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { Receipt, FileText, Hash, Loader2 } from "lucide-react";
import { ReportsApiService, type VatRegisterQueryParams } from "@/services/accounts-api";
import { useFormatting } from "@/hooks/useFormatting";

export default function VatRegister() {
  const { formatCurrency, formatDate } = useFormatting();

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  });

  const params: VatRegisterQueryParams = {
    dateFrom: dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : undefined,
    dateTo: dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["vat-register", params],
    queryFn: () => ReportsApiService.getVatRegister(params),
  });

  const totalSubtotal = data?.entries.reduce((s, e) => s + e.subtotal, 0) ?? 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">VAT Register</h1>
          <p className="text-muted-foreground">
            VAT collected from customers on sales invoices, per partial delivery
          </p>
        </div>
        <DateRangePicker date={dateRange} onDateChange={setDateRange} />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : data ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total VAT Collected</CardTitle>
                <Receipt className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-700">
                  {formatCurrency(data.total)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Across {data.entries.length} invoice(s)
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taxable Sales</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalSubtotal)}</div>
                <p className="text-xs text-muted-foreground mt-1">Subtotal of VAT-bearing invoices</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Invoices</CardTitle>
                <Hash className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.entries.length}</div>
                <p className="text-xs text-muted-foreground mt-1">In selected period</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>VAT Breakdown</CardTitle>
              <CardDescription>
                Each row is one sales invoice. Partial deliveries from the same order each produce
                their own invoice, so rate is constant but amount differs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data.entries.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">
                  No VAT-bearing invoices in this period
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>VAT Reg.</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">VAT Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.entries.map((e, idx) => (
                      <TableRow key={`vat-${idx}`}>
                        <TableCell>{formatDate(e.date)}</TableCell>
                        <TableCell className="font-medium">{e.invoice_number}</TableCell>
                        <TableCell>{e.customer_name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {e.vat_number ?? "—"}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(e.subtotal)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline">{e.vat_rate.toFixed(2)}%</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium text-emerald-700">
                          {formatCurrency(e.vat_amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={4} className="text-right font-semibold">
                        Totals
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(totalSubtotal)}
                      </TableCell>
                      <TableCell />
                      <TableCell className="text-right font-bold text-emerald-700">
                        {formatCurrency(data.total)}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <p className="text-center text-muted-foreground py-12">Unable to load VAT register</p>
      )}
    </div>
  );
}
