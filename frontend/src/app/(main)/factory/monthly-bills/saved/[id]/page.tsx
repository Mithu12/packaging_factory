"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/sonner";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import {
  MonthlyBillsApiService,
  MonthlyBillWithLines,
} from "@/modules/factory/services/monthly-bills-api";
import { useFormatting } from "@/hooks/useFormatting";

export default function SavedMonthlyBillDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : params.id?.[0];
  const { formatCurrency, formatDate } = useFormatting();

  const [bill, setBill] = useState<MonthlyBillWithLines | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) void loadBill();
  }, [id]);

  const loadBill = async () => {
    try {
      setLoading(true);
      const data = await MonthlyBillsApiService.getMonthlyBill(parseInt(id!));
      setBill(data);
    } catch (err: any) {
      toast.error("Failed to load bill", { description: err?.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!bill) return;
    try {
      await MonthlyBillsApiService.downloadMonthlyBillPdf(bill.id);
      toast.success("PDF downloaded");
    } catch (err: any) {
      toast.error("Failed to download", { description: err?.message });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading...
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-destructive">
            Bill not found
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-foreground">
                {bill.bill_number}
              </h1>
            </div>
            <p className="text-muted-foreground">
              {bill.customer_name} — {formatDate(bill.from_date)} to {formatDate(bill.to_date)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" /> Download PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Qty
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bill.total_qty}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Subtotal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(bill.subtotal)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tax
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(bill.tax_amount)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(bill.total_amount)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Line Items ({bill.line_items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Challan No</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                <TableHead className="text-right">VAT</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bill.line_items.map((li, i) => (
                <TableRow key={li.id}>
                  <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="font-medium">
                    {li.delivery_number || `#${li.delivery_id}`}
                  </TableCell>
                  <TableCell>{li.delivery_date ? formatDate(li.delivery_date) : "—"}</TableCell>
                  <TableCell className="text-right">{li.total_qty}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(li.subtotal)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(li.tax_amount)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(li.total_amount)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="font-semibold">
                <TableCell colSpan={3} className="text-right">
                  Totals
                </TableCell>
                <TableCell className="text-right">{bill.total_qty}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(bill.subtotal)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(bill.tax_amount)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(bill.total_amount)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <div>
            <span className="text-muted-foreground">Customer:</span>{" "}
            <span className="font-medium">{bill.customer_name}</span>
          </div>
          <div>
            <span className="text-muted-foreground">VAT Number:</span>{" "}
            {bill.customer_vat_number || "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Period:</span>{" "}
            {formatDate(bill.from_date)} to {formatDate(bill.to_date)}
          </div>
          <div>
            <span className="text-muted-foreground">VAT filter:</span>{" "}
            {bill.vat_filter === "with" ? "VAT" : bill.vat_filter === "without" ? "No VAT" : "Combined"}
          </div>
          <div>
            <span className="text-muted-foreground">Created by:</span>{" "}
            {bill.created_by || "—"}
          </div>
          <div>
            <span className="text-muted-foreground">Created at:</span>{" "}
            {new Date(bill.created_at).toLocaleString()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
