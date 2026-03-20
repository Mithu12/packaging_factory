"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFormatting } from "@/hooks/useFormatting";
import type { QuotedOrderSnapshot } from "../services/customer-orders-api";

export interface QuotedSnapshotDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderNumber: string;
  snapshot: QuotedOrderSnapshot | null | undefined;
}

export function QuotedSnapshotDialog({
  open,
  onOpenChange,
  orderNumber,
  snapshot,
}: QuotedSnapshotDialogProps) {
  const { formatCurrency, formatDate } = useFormatting();
  const lines = snapshot?.line_items ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Original quotation</DialogTitle>
          <DialogDescription>
            Record saved when this order was converted from quotation #{orderNumber}
            {snapshot?.captured_at
              ? ` · ${formatDate(snapshot.captured_at)}`
              : ""}
            . View only.
          </DialogDescription>
        </DialogHeader>

        {!snapshot || lines.length === 0 ? (
          <p className="text-sm text-muted-foreground">No quotation snapshot is stored for this order.</p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Quoted total: </span>
                <span className="font-medium">
                  {formatCurrency(snapshot.total_value ?? 0)} {snapshot.currency || ""}
                </span>
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit price</TableHead>
                    <TableHead className="text-right">Line total</TableHead>
                    <TableHead>Specs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line, idx) => (
                    <TableRow key={`${line.product_id}-${idx}`}>
                      <TableCell>
                        <div className="font-medium">{line.product_name}</div>
                        <div className="text-xs text-muted-foreground">{line.product_sku}</div>
                      </TableCell>
                      <TableCell className="text-right">{line.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(line.unit_price)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(line.line_total)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {line.specifications || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
