"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Receipt, TrendingDown, TrendingUp, Wallet, Loader2 } from "lucide-react";
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">VAT Register</h1>
          <p className="text-muted-foreground">
            Input VAT (purchases) vs Output VAT (sales) for the selected period
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
                <CardTitle className="text-sm font-medium">Output VAT (Sales)</CardTitle>
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-700">
                  {formatCurrency(data.outputVat.total)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {data.outputVat.entries.length} invoice(s)
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Input VAT (Purchases)</CardTitle>
                <TrendingDown className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-700">
                  {formatCurrency(data.inputVat.total)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {data.inputVat.entries.length} invoice(s)
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net VAT Payable</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${
                    data.netPayable >= 0 ? "text-rose-700" : "text-emerald-700"
                  }`}
                >
                  {formatCurrency(Math.abs(data.netPayable))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {data.netPayable >= 0 ? "Payable to authority" : "Reclaimable / credit"}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-emerald-600" />
                Output VAT — Sales Invoices
              </CardTitle>
              <CardDescription>VAT collected from customers on sales</CardDescription>
            </CardHeader>
            <CardContent>
              {data.outputVat.entries.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">
                  No sales VAT in this period
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
                    {data.outputVat.entries.map((e, idx) => (
                      <TableRow key={`out-${idx}`}>
                        <TableCell>{formatDate(e.date)}</TableCell>
                        <TableCell className="font-medium">{e.invoice_number}</TableCell>
                        <TableCell>{e.party_name}</TableCell>
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
                      <TableCell colSpan={6} className="text-right font-semibold">
                        Total Output VAT
                      </TableCell>
                      <TableCell className="text-right font-bold text-emerald-700">
                        {formatCurrency(data.outputVat.total)}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-blue-600" />
                Input VAT — Supplier Invoices
              </CardTitle>
              <CardDescription>VAT paid to suppliers on purchases</CardDescription>
            </CardHeader>
            <CardContent>
              {data.inputVat.entries.length === 0 ? (
                <p className="text-center text-muted-foreground py-6">
                  No purchase VAT in this period
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>VAT Reg.</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">VAT Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.inputVat.entries.map((e, idx) => (
                      <TableRow key={`in-${idx}`}>
                        <TableCell>{formatDate(e.date)}</TableCell>
                        <TableCell className="font-medium">{e.invoice_number}</TableCell>
                        <TableCell>{e.party_name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {e.vat_number ?? "—"}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(e.subtotal)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline">{e.vat_rate.toFixed(2)}%</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium text-blue-700">
                          {formatCurrency(e.vat_amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={6} className="text-right font-semibold">
                        Total Input VAT
                      </TableCell>
                      <TableCell className="text-right font-bold text-blue-700">
                        {formatCurrency(data.inputVat.total)}
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
