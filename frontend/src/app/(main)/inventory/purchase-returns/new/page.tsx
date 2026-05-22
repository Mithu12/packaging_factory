"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/sonner";
import { PurchaseOrderApi } from "@/modules/inventory/services/purchase-order-api";
import { PurchaseReturnApi } from "@/modules/inventory/services/purchase-return-api";
import {
  EligiblePurchaseReturnLine,
  PurchaseOrder,
  PurchaseOrderReceipt,
  PurchaseReturnReason,
} from "@/services/types";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { useFormatting } from "@/hooks/useFormatting";

const REASONS: Array<{ value: PurchaseReturnReason; label: string }> = [
  { value: "defective", label: "Defective" },
  { value: "wrong_item", label: "Wrong item" },
  { value: "damaged", label: "Damaged" },
  { value: "quality_issue", label: "Quality issue" },
  { value: "over_supply", label: "Over-supply" },
  { value: "expired", label: "Expired" },
  { value: "other", label: "Other" },
];

const CONDITIONS = ["damaged", "defective", "expired", "wrong_item", "other"];

type EditableLine = EligiblePurchaseReturnLine & {
  return_quantity: number;
  condition: string;
  notes: string;
};

export default function NewPurchaseReturnPage() {
  const router = useRouter();
  const { formatCurrency } = useFormatting();

  // PO + GRN selection
  const [eligiblePOs, setEligiblePOs] = useState<PurchaseOrder[]>([]);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [poReceipts, setPoReceipts] = useState<PurchaseOrderReceipt[]>([]);
  const [selectedReceiptId, setSelectedReceiptId] = useState<string>("");
  const [loadingPOs, setLoadingPOs] = useState(false);
  const [loadingLines, setLoadingLines] = useState(false);

  // Header fields
  const [returnDate, setReturnDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [reason, setReason] = useState<PurchaseReturnReason>("damaged");
  const [reasonNotes, setReasonNotes] = useState("");
  const [notes, setNotes] = useState("");

  // Line items
  const [lines, setLines] = useState<EditableLine[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Load returnable POs (received or partially_received, approved)
  useEffect(() => {
    void fetchPOs();
  }, []);

  const fetchPOs = async () => {
    try {
      setLoadingPOs(true);
      // Fetch a generous batch and filter client-side
      const response = await PurchaseOrderApi.getPurchaseOrders({ limit: 100 });
      const eligible = response.purchase_orders.filter(
        (po) =>
          po.approval_status === "approved" &&
          (po.status === "received" || po.status === "partially_received")
      );
      setEligiblePOs(eligible);
    } catch (err: any) {
      toast.error("Failed to load purchase orders", {
        description: err?.message,
      });
    } finally {
      setLoadingPOs(false);
    }
  };

  const handleSelectPO = async (poId: string) => {
    const po = eligiblePOs.find((p) => p.id.toString() === poId);
    setSelectedPO(po || null);
    setPoReceipts([]);
    setSelectedReceiptId("");
    setLines([]);
    if (!po) return;
    try {
      const receipts = await PurchaseOrderApi.getReceipts(po.id);
      setPoReceipts(receipts);
      // Default: load PO-level eligible lines
      await loadEligibleLines(po.id, undefined);
    } catch (err: any) {
      toast.error("Failed to load receipts for PO", {
        description: err?.message,
      });
    }
  };

  const handleSelectReceipt = async (receiptId: string) => {
    setSelectedReceiptId(receiptId);
    if (!selectedPO) return;
    const grnId = receiptId === "__none__" ? undefined : parseInt(receiptId);
    await loadEligibleLines(selectedPO.id, grnId);
  };

  const loadEligibleLines = async (poId: number, grnId?: number) => {
    try {
      setLoadingLines(true);
      const eligible = await PurchaseReturnApi.getEligibleLines(poId, grnId);
      setLines(
        eligible
          .filter((l) => l.max_returnable_quantity > 0)
          .map((l) => ({
            ...l,
            return_quantity: 0,
            condition: "damaged",
            notes: "",
          }))
      );
    } catch (err: any) {
      toast.error("Failed to load eligible lines", {
        description: err?.message,
      });
    } finally {
      setLoadingLines(false);
    }
  };

  const updateLine = (index: number, patch: Partial<EditableLine>) => {
    setLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, ...patch } : line))
    );
  };

  const totalPreview = lines.reduce((sum, line) => {
    const cost =
      selectedReceiptId && selectedReceiptId !== "__none__"
        ? line.unit_price
        : line.current_cost_price;
    return sum + line.return_quantity * cost;
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPO) {
      toast.error("Select a purchase order first");
      return;
    }
    const linesToSubmit = lines.filter((l) => l.return_quantity > 0);
    if (linesToSubmit.length === 0) {
      toast.error("Enter a quantity for at least one line item");
      return;
    }

    // Validate quantities
    for (const line of linesToSubmit) {
      if (line.return_quantity > line.max_returnable_quantity) {
        toast.error(
          `Return quantity for ${line.product_name} exceeds available (${line.max_returnable_quantity})`
        );
        return;
      }
    }

    const grnId =
      selectedReceiptId && selectedReceiptId !== "__none__"
        ? parseInt(selectedReceiptId)
        : undefined;

    try {
      setSubmitting(true);
      const created = await PurchaseReturnApi.createPurchaseReturn({
        purchase_order_id: selectedPO.id,
        purchase_order_receipt_id: grnId,
        return_date: returnDate,
        reason,
        reason_notes: reasonNotes || undefined,
        notes: notes || undefined,
        line_items: linesToSubmit.map((line) => ({
          po_line_item_id: line.po_line_item_id,
          grn_line_item_id: line.grn_line_item_id || undefined,
          return_quantity: line.return_quantity,
          condition: line.condition,
          notes: line.notes || undefined,
        })),
      });
      toast.success(`Purchase return ${created.return_number} created`);
      router.push(`/inventory/purchase-returns/${created.id}`);
    } catch (err: any) {
      toast.error("Failed to create purchase return", {
        description: err?.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">New Purchase Return</h1>
          <p className="text-muted-foreground">
            Record goods being returned to the supplier
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Source</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Purchase Order *</Label>
              <Select
                value={selectedPO?.id.toString() ?? ""}
                onValueChange={handleSelectPO}
                disabled={loadingPOs || submitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a PO..." />
                </SelectTrigger>
                <SelectContent>
                  {eligiblePOs.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No eligible POs found
                    </div>
                  ) : (
                    eligiblePOs.map((po) => (
                      <SelectItem key={po.id} value={po.id.toString()}>
                        {po.po_number} — {po.supplier_name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Only approved POs with received goods can be returned against.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Goods Receipt Note (optional)</Label>
              <Select
                value={selectedReceiptId}
                onValueChange={handleSelectReceipt}
                disabled={!selectedPO || submitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All received qty (no GRN)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">All received qty (no GRN)</SelectItem>
                  {poReceipts.map((r) => (
                    <SelectItem key={r.id} value={r.id.toString()}>
                      {r.receipt_number} —{" "}
                      {new Date(r.receipt_date).toLocaleDateString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Preferred when a specific receipt is known — uses the receipt&apos;s unit cost.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="returnDate">Return Date *</Label>
              <Input
                id="returnDate"
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                required
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reason</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Return reason *</Label>
              <Select
                value={reason}
                onValueChange={(v) => setReason(v as PurchaseReturnReason)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="reasonNotes">Reason details</Label>
              <Textarea
                id="reasonNotes"
                value={reasonNotes}
                onChange={(e) => setReasonNotes(e.target.value)}
                rows={2}
                placeholder="Optional — describe the issue"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Line Items</CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedPO ? (
              <div className="text-sm text-muted-foreground py-6 text-center">
                Select a purchase order to load returnable line items.
              </div>
            ) : loadingLines ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Loading line items...
              </div>
            ) : lines.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">
                No returnable line items found for this selection.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Ordered</TableHead>
                    <TableHead className="text-right">Received</TableHead>
                    <TableHead className="text-right">Already Returned</TableHead>
                    <TableHead className="text-right">Max Returnable</TableHead>
                    <TableHead className="text-right">Return Qty</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line, idx) => (
                    <TableRow key={line.po_line_item_id + ":" + (line.grn_line_item_id ?? "po")}>
                      <TableCell>
                        <div className="font-medium">{line.product_name}</div>
                        {line.product_sku && (
                          <div className="text-xs text-muted-foreground">{line.product_sku}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{line.ordered_quantity}</TableCell>
                      <TableCell className="text-right">{line.received_quantity}</TableCell>
                      <TableCell className="text-right">
                        {line.already_returned_quantity}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {line.max_returnable_quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min={0}
                          max={line.max_returnable_quantity}
                          step="0.001"
                          value={line.return_quantity || ""}
                          onChange={(e) =>
                            updateLine(idx, {
                              return_quantity: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-24 text-right"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={line.condition}
                          onValueChange={(v) => updateLine(idx, { condition: v })}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CONDITIONS.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={line.notes}
                          onChange={(e) => updateLine(idx, { notes: e.target.value })}
                          placeholder="Optional"
                          className="w-40"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {lines.length > 0 && (
              <div className="flex justify-end mt-4 text-sm">
                <div className="text-muted-foreground">
                  Estimated debit-note value:{" "}
                  <span className="font-medium text-foreground">
                    {formatCurrency(totalPreview, "bdt")}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Optional internal notes for this return"
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="add"
            disabled={submitting || !selectedPO || lines.length === 0}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" /> Save as Draft
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
