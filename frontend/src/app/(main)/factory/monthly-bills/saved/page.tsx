"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/sonner";
import { ArrowLeft, Download, Eye, Loader2, Trash2 } from "lucide-react";
import { MonthlyBillsApiService, MonthlyBill } from "@/modules/factory/services/monthly-bills-api";
import { useFormatting } from "@/hooks/useFormatting";

export default function SavedMonthlyBillsPage() {
  const router = useRouter();
  const { formatCurrency, formatDate } = useFormatting();
  const [bills, setBills] = useState<MonthlyBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);

  const fetchBills = async () => {
    try {
      setLoading(true);
      const data = await MonthlyBillsApiService.getMonthlyBills({ limit: 50 });
      setBills(data);
    } catch (err: any) {
      toast.error("Failed to load saved bills", { description: err?.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchBills();
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this saved monthly bill?")) return;
    try {
      setDeleting(id);
      await MonthlyBillsApiService.deleteMonthlyBill(id);
      toast.success("Bill deleted");
      void fetchBills();
    } catch (err: any) {
      toast.error("Failed to delete", { description: err?.message });
    } finally {
      setDeleting(null);
    }
  };

  const handleDownload = async (id: number) => {
    try {
      await MonthlyBillsApiService.downloadMonthlyBillPdf(id);
      toast.success("PDF downloaded");
    } catch (err: any) {
      toast.error("Failed to download", { description: err?.message });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Saved Monthly Bills</h1>
            <p className="text-muted-foreground">View and manage saved monthly bills</p>
          </div>
        </div>
        <Button onClick={() => router.push("/factory/monthly-bills")}>
          Generate New Bill
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...
            </div>
          ) : bills.length === 0 ? (
            <div className="text-sm text-muted-foreground py-10 text-center">
              No saved monthly bills yet. Generate one from the Monthly Invoice page.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>VAT</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-32 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bills.map((bill) => (
                  <TableRow key={bill.id}>
                    <TableCell className="font-medium">{bill.bill_number}</TableCell>
                    <TableCell>{bill.customer_name}</TableCell>
                    <TableCell>
                      {formatDate(bill.from_date)} – {formatDate(bill.to_date)}
                    </TableCell>
                    <TableCell className="text-right">{bill.total_qty}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(bill.total_amount)}
                    </TableCell>
                    <TableCell>
                      {bill.vat_filter === "with" ? (
                        <Badge variant="outline">VAT</Badge>
                      ) : bill.vat_filter === "without" ? (
                        <Badge variant="secondary">No VAT</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(bill.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => router.push(`/factory/monthly-bills/saved/${bill.id}`)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDownload(bill.id)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={deleting === bill.id}
                          onClick={() => handleDelete(bill.id)}
                        >
                          {deleting === bill.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4 text-destructive" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
