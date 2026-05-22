"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { PurchaseReturnApi } from "@/modules/inventory/services/purchase-return-api";
import {
  EligiblePurchaseReturnLine,
  PurchaseReturnReason,
  PurchaseReturnWithDetails,
} from "@/services/types";
import { ArrowLeft, Save, Loader2 } from "lucide-react";

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

export default function EditPurchaseReturnPage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : params.id?.[0];

  const [original, setOriginal] = useState<PurchaseReturnWithDetails | null>(null);
  const [returnDate, setReturnDate] = useState("");
  const [reason, setReason] = useState<PurchaseReturnReason>("damaged");
  const [reasonNotes, setReasonNotes] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<EditableLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) void load();
  }, [id]);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await PurchaseReturnApi.getPurchaseReturn(parseInt(id!));
      if (data.status !== "draft") {
        setError("Only draft returns can be edited");
        setOriginal(data);
        return;
      }
      setOriginal(data);
      setReturnDate(data.return_date.split("T")[0]);
      setReason(data.reason);
      setReasonNotes(data.reason_notes || "");
      setNotes(data.notes || "");

      const eligible = await PurchaseReturnApi.getEligibleLines(
        data.purchase_order.id,
        data.purchase_order_receipt?.id
      );

      // Merge existing return quantities back into eligible lines
      // (max_returnable_quantity from server already excludes other approved returns,
      // not this draft. So we leave it as-is and the user just enters new quantities.)
      const existingByKey = new Map<string, { qty: number; condition: string; notes: string }>();
      for (const line of data.line_items) {
        const key = `${line.po_line_item_id}:${line.grn_line_item_id ?? "po"}`;
        existingByKey.set(key, {
          qty: line.return_quantity,
          condition: line.condition || "damaged",
          notes: line.notes || "",
        });
      }

      setLines(
        eligible
          .filter(
            (l) =>
              l.max_returnable_quantity > 0 ||
              existingByKey.has(`${l.po_line_item_id}:${l.grn_line_item_id ?? "po"}`)
          )
          .map((l) => {
            const key = `${l.po_line_item_id}:${l.grn_line_item_id ?? "po"}`;
            const existing = existingByKey.get(key);
            return {
              ...l,
              return_quantity: existing?.qty ?? 0,
              condition: existing?.condition ?? "damaged",
              notes: existing?.notes ?? "",
            };
          })
      );
    } catch (err: any) {
      setError(err?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  const updateLine = (idx: number, patch: Partial<EditableLine>) => {
    setLines((prev) =>
      prev.map((line, i) => (i === idx ? { ...line, ...patch } : line))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!original) return;
    const linesToSubmit = lines.filter((l) => l.return_quantity > 0);
    if (linesToSubmit.length === 0) {
      toast.error("Enter a quantity for at least one line");
      return;
    }
    try {
      setSubmitting(true);
      await PurchaseReturnApi.updatePurchaseReturn(original.id, {
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
      toast.success("Purchase return updated");
      router.push(`/inventory/purchase-returns/${original.id}`);
    } catch (err: any) {
      toast.error("Failed to update", { description: err?.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading...
      </div>
    );
  }

  if (error || !original) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <Card>
          <CardContent className="py-12 text-center text-destructive">
            {error || "Not found"}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Edit {original.return_number}
          </h1>
          <p className="text-muted-foreground">
            {original.purchase_order.po_number} — {original.supplier.name}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Header</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <div className="space-y-2">
              <Label>Reason *</Label>
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
            <div className="space-y-2">
              <Label htmlFor="reasonNotes">Reason details</Label>
              <Input
                id="reasonNotes"
                value={reasonNotes}
                onChange={(e) => setReasonNotes(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Line Items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Ordered</TableHead>
                  <TableHead className="text-right">Received</TableHead>
                  <TableHead className="text-right">Max Returnable</TableHead>
                  <TableHead className="text-right">Return Qty</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line, idx) => (
                  <TableRow
                    key={line.po_line_item_id + ":" + (line.grn_line_item_id ?? "po")}
                  >
                    <TableCell>
                      <div className="font-medium">{line.product_name}</div>
                      {line.product_sku && (
                        <div className="text-xs text-muted-foreground">
                          {line.product_sku}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{line.ordered_quantity}</TableCell>
                    <TableCell className="text-right">{line.received_quantity}</TableCell>
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
                        className="w-40"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" variant="add" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" /> Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
