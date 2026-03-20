"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFormatting } from "@/hooks/useFormatting";
import {
  FactoryCustomerOrder,
  FactoryCustomerOrderLineItem,
  UpdateOrderLineItemRequest,
} from "../services/customer-orders-api";
import { Loader2 } from "lucide-react";

export interface ApproveOrderLinesConfirmPayload {
  line_items: UpdateOrderLineItemRequest[];
  notes?: string;
}

export interface ApproveOrderLinesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: FactoryCustomerOrder | null;
  /** Optional notes shown when the dialog opens (e.g. Order Acceptance textarea). */
  defaultApprovalNotes?: string;
  onConfirm: (payload: ApproveOrderLinesConfirmPayload) => Promise<void>;
}

type EditableRow = {
  lineItemId: string;
  productId: string;
  productName: string;
  productSku: string;
  quotedQty: number;
  quotedUnitPrice: number;
  quotedLineTotal: number;
  quantity: number;
  unitPrice: number;
};

function lineAmount(li: FactoryCustomerOrderLineItem): number | undefined {
  if (li.line_total != null && !Number.isNaN(Number(li.line_total))) {
    return Number(li.line_total);
  }
  if (li.total_price != null && !Number.isNaN(Number(li.total_price))) {
    return Number(li.total_price);
  }
  return undefined;
}

function buildRows(order: FactoryCustomerOrder): EditableRow[] {
  return order.line_items.map((li) => {
    const q = Number(li.quantity);
    const p = Number(li.unit_price);
    const quotedLineTotal = lineAmount(li) ?? q * p;
    return {
      lineItemId: String(li.id),
      productId: String(li.product_id),
      productName: li.product_name,
      productSku: li.product_sku,
      quotedQty: q,
      quotedUnitPrice: p,
      quotedLineTotal,
      quantity: q,
      unitPrice: p,
    };
  });
}

export function ApproveOrderLinesDialog({
  open,
  onOpenChange,
  order,
  defaultApprovalNotes = "",
  onConfirm,
}: ApproveOrderLinesDialogProps) {
  const { formatCurrency } = useFormatting();
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !order) {
      return;
    }
    setRows(buildRows(order));
    setNotes(defaultApprovalNotes.trim());
    setError(null);
  }, [open, order?.id, defaultApprovalNotes]);

  const isQuoted = order?.status === "quoted";

  const title = useMemo(() => {
    if (!order) return "";
    return isQuoted ? "Convert quotation to order" : "Approve order & line items";
  }, [order, isQuoted]);

  const confirmLabel = useMemo(() => {
    if (!order) return "Confirm";
    return isQuoted ? "Convert to order" : "Approve order";
  }, [order, isQuoted]);

  const newLinesTotal = useMemo(() => {
    return rows.reduce((sum, r) => sum + r.quantity * r.unitPrice, 0);
  }, [rows]);

  const quotedLinesTotal = useMemo(() => {
    return rows.reduce((sum, r) => sum + r.quotedLineTotal, 0);
  }, [rows]);

  const updateRow = (index: number, patch: Partial<Pick<EditableRow, "quantity" | "unitPrice">>) => {
    setRows((prev) => {
      const next = [...prev];
      const cur = next[index];
      if (!cur) return prev;
      next[index] = { ...cur, ...patch };
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!order || rows.length === 0) return;

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!Number.isFinite(r.quantity) || r.quantity <= 0) {
        setError(`Line ${i + 1}: quantity must be greater than zero.`);
        return;
      }
      if (!Number.isFinite(r.unitPrice) || r.unitPrice < 0) {
        setError(`Line ${i + 1}: unit price cannot be negative.`);
        return;
      }
    }

    const line_items: UpdateOrderLineItemRequest[] = rows.map((r, i) => {
      const li = order.line_items[i];
      const spec =
        (li?.specifications && String(li.specifications)) ||
        (li?.notes && String(li.notes)) ||
        "";
      return {
        product_id: parseInt(String(r.productId), 10),
        quantity: Number(r.quantity),
        unit_price: Number(r.unitPrice),
        specifications: spec || undefined,
      };
    });

    setSubmitting(true);
    setError(null);
    try {
      await onConfirm({
        line_items,
        notes: notes.trim() || undefined,
      });
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Adjust quantities and prices for the final order. Draft work orders will be created from
            these values. The &quot;Original quotation&quot; column stays as when this dialog opened.
          </DialogDescription>
        </DialogHeader>

        {!order ? null : (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">#{order.order_number}</span>
              {" — "}
              {order.factory_customer_name}
            </div>

            {error && (
              <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="whitespace-nowrap">Original quotation</TableHead>
                    <TableHead className="text-right w-[100px]">Qty</TableHead>
                    <TableHead className="text-right w-[120px]">Unit price</TableHead>
                    <TableHead className="text-right">Line total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={r.lineItemId}>
                      <TableCell>
                        <div className="font-medium">{r.productName}</div>
                        <div className="text-xs text-muted-foreground">{r.productSku}</div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground align-top">
                        <span className="whitespace-nowrap">
                          Qty {r.quotedQty} · {formatCurrency(r.quotedUnitPrice)} · Line{" "}
                          {formatCurrency(r.quotedLineTotal)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          step="any"
                          className="text-right"
                          value={Number.isFinite(r.quantity) ? r.quantity : ""}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            updateRow(i, {
                              quantity: Number.isFinite(v) ? v : 0,
                            });
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          className="text-right"
                          value={Number.isFinite(r.unitPrice) ? r.unitPrice : ""}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value);
                            updateRow(i, {
                              unitPrice: Number.isFinite(v) ? v : 0,
                            });
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(r.quantity * r.unitPrice)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-wrap justify-end gap-6 text-sm">
              <div>
                <span className="text-muted-foreground">Quoted lines total: </span>
                <span className="font-medium">{formatCurrency(quotedLinesTotal)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">New lines total: </span>
                <span className="font-medium">{formatCurrency(newLinesTotal)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="approve-lines-notes">Approval notes (optional)</Label>
              <Textarea
                id="approve-lines-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes recorded on approval…"
                rows={2}
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={submitting || !order}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Working…
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
