"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
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
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Loader2,
  Plus,
  Save,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { ApiService } from "@/services/api";
import { StockAdjustmentApi } from "@/modules/inventory/services/stock-adjustment-api";
import type { Product, StockAdjustment, StockAdjustmentBatch } from "@/services/types";

type AdjustmentType = "increase" | "decrease" | "set";

interface DistributionCenter {
  id: number;
  name: string;
  is_primary: boolean;
}

interface BulkLine {
  key: string;
  product_id: number | null;
  product?: Product;
  adjustment_type: AdjustmentType;
  quantity: string;
  notes: string;
}

const REASON_OPTIONS = [
  "Cycle count correction",
  "Physical inventory adjustment",
  "Damaged goods",
  "Expired products",
  "Theft/Loss",
  "Found extra stock",
  "Stock transfer reconciliation",
  "Other",
];

const newLine = (): BulkLine => ({
  key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  product_id: null,
  adjustment_type: "increase",
  quantity: "",
  notes: "",
});

const previewNewStock = (line: BulkLine): number | null => {
  if (!line.product) return null;
  const qty = parseFloat(line.quantity);
  if (Number.isNaN(qty)) return null;
  const current = Number(line.product.current_stock);
  if (line.adjustment_type === "increase") return current + qty;
  if (line.adjustment_type === "decrease") return current - qty;
  return qty;
};

export default function BulkStockAdjustmentPage() {
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [distributionCenters, setDistributionCenters] = useState<DistributionCenter[]>([]);
  const [distributionCenterId, setDistributionCenterId] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [reference, setReference] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [lines, setLines] = useState<BulkLine[]>([newLine()]);
  const [submitting, setSubmitting] = useState(false);

  const [recentBatches, setRecentBatches] = useState<StockAdjustmentBatch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [expandedBatchId, setExpandedBatchId] = useState<number | null>(null);
  const [batchLines, setBatchLines] = useState<Record<number, StockAdjustment[]>>({});
  const [loadingBatchLines, setLoadingBatchLines] = useState<number | null>(null);

  const fetchRecentBatches = async () => {
    try {
      setLoadingBatches(true);
      const batches = await StockAdjustmentApi.getStockAdjustmentBatches({ limit: 10 });
      setRecentBatches(batches);
    } catch (err: any) {
      toast.error("Failed to load recent batches", { description: err?.message });
    } finally {
      setLoadingBatches(false);
    }
  };

  useEffect(() => {
    void fetchRecentBatches();
  }, []);

  const toggleBatch = async (batchId: number) => {
    if (expandedBatchId === batchId) {
      setExpandedBatchId(null);
      return;
    }
    setExpandedBatchId(batchId);
    if (batchLines[batchId]) return;
    try {
      setLoadingBatchLines(batchId);
      const full = await StockAdjustmentApi.getStockAdjustmentBatch(batchId);
      setBatchLines((prev) => ({ ...prev, [batchId]: full.lines ?? [] }));
    } catch (err: any) {
      toast.error("Failed to load batch details", { description: err?.message });
      setExpandedBatchId(null);
    } finally {
      setLoadingBatchLines(null);
    }
  };

  useEffect(() => {
    void (async () => {
      try {
        setLoadingProducts(true);
        const response = await ApiService.getProducts({ limit: 500, status: "active" });
        // response shape: { products, total, page, limit }
        const list = Array.isArray(response) ? response : (response?.products ?? []);
        setProducts(list);
      } catch (err: any) {
        toast.error("Failed to load products", { description: err?.message });
      } finally {
        setLoadingProducts(false);
      }
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const response = await ApiService.getDistributionCenters({ status: "active" });
        const centers: DistributionCenter[] = response.centers || [];
        setDistributionCenters(centers);
        const primary = centers.find((c) => c.is_primary);
        if (primary) setDistributionCenterId(primary.id.toString());
        else if (centers.length > 0) setDistributionCenterId(centers[0].id.toString());
      } catch (err: any) {
        toast.error("Failed to load distribution centers", { description: err?.message });
      }
    })();
  }, []);

  const productById = useMemo(() => {
    const map = new Map<number, Product>();
    for (const p of products) map.set(p.id, p);
    return map;
  }, [products]);

  const updateLine = (index: number, patch: Partial<BulkLine>) => {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  };

  const handleProductChange = (index: number, productIdStr: string) => {
    const productId = parseInt(productIdStr, 10);
    const product = productById.get(productId);
    updateLine(index, { product_id: productId, product });
  };

  const addLine = () => setLines((prev) => [...prev, newLine()]);
  const removeLine = (index: number) =>
    setLines((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));

  const validLines = lines.filter(
    (l) => l.product_id !== null && parseFloat(l.quantity) > 0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason) {
      toast.error("Select a reason for this adjustment batch");
      return;
    }
    if (validLines.length === 0) {
      toast.error("Add at least one line with a product and a positive quantity");
      return;
    }

    const seen = new Set<number>();
    for (const line of validLines) {
      if (seen.has(line.product_id!)) {
        toast.error("Duplicate product", {
          description: `${line.product?.name} appears on more than one line — merge them into one.`,
        });
        return;
      }
      seen.add(line.product_id!);

      const qty = parseFloat(line.quantity);
      if (
        line.adjustment_type === "decrease" &&
        line.product &&
        qty > Number(line.product.current_stock)
      ) {
        toast.error("Insufficient stock", {
          description: `Cannot decrease ${line.product.name} by ${qty} — current stock is ${line.product.current_stock}.`,
        });
        return;
      }
    }

    try {
      setSubmitting(true);
      const created = await StockAdjustmentApi.createStockAdjustmentBatch({
        reason,
        reference: reference || undefined,
        notes: notes || undefined,
        distribution_center_id: distributionCenterId
          ? parseInt(distributionCenterId, 10)
          : undefined,
        lines: validLines.map((l) => ({
          product_id: l.product_id!,
          adjustment_type: l.adjustment_type,
          quantity: parseFloat(l.quantity),
          notes: l.notes || undefined,
        })),
      });
      toast.success(`Stock adjustment batch ${created.batch_number} created`, {
        description: `${created.line_count} line${created.line_count === 1 ? "" : "s"} applied`,
      });
      setReason("");
      setReference("");
      setNotes("");
      setLines([newLine()]);
      void fetchRecentBatches();
    } catch (err: any) {
      toast.error("Failed to create stock adjustment batch", {
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
          <h1 className="text-3xl font-bold text-foreground">Bulk Stock Adjustment</h1>
          <p className="text-muted-foreground">
            Adjust stock for multiple products in a single transaction
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Batch Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Reason *</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {REASON_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Warehouse</Label>
              <Select value={distributionCenterId} onValueChange={setDistributionCenterId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {distributionCenters.map((dc) => (
                    <SelectItem key={dc.id} value={dc.id.toString()}>
                      {dc.name}
                      {dc.is_primary ? " (Default)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference">Reference</Label>
              <Input
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g., CYCLE-2026-04"
              />
            </div>

            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Optional context for this batch"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Line Items</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addLine}>
              <Plus className="w-4 h-4 mr-1" /> Add line
            </Button>
          </CardHeader>
          <CardContent>
            {loadingProducts ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Loading products...
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[260px]">Product</TableHead>
                    <TableHead className="text-right">Current</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">New Stock</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line, idx) => {
                    const newStock = previewNewStock(line);
                    return (
                      <TableRow key={line.key}>
                        <TableCell>
                          <Select
                            value={line.product_id?.toString() ?? ""}
                            onValueChange={(v) => handleProductChange(idx, v)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map((p) => (
                                <SelectItem key={p.id} value={p.id.toString()}>
                                  {p.name} {p.sku ? `(${p.sku})` : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {line.product ? (
                            <>
                              {line.product.current_stock}
                              <span className="text-xs ml-1">{line.product.unit_of_measure}</span>
                            </>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={line.adjustment_type}
                            onValueChange={(v) =>
                              updateLine(idx, { adjustment_type: v as AdjustmentType })
                            }
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="increase">
                                <div className="flex items-center gap-2">
                                  <TrendingUp className="w-4 h-4 text-success" /> Increase
                                </div>
                              </SelectItem>
                              <SelectItem value="decrease">
                                <div className="flex items-center gap-2">
                                  <TrendingDown className="w-4 h-4 text-destructive" /> Decrease
                                </div>
                              </SelectItem>
                              <SelectItem value="set">Set to</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min={0}
                            step="0.001"
                            value={line.quantity}
                            onChange={(e) => updateLine(idx, { quantity: e.target.value })}
                            className="w-24 text-right"
                            placeholder="0"
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {newStock === null ? "—" : newStock}
                        </TableCell>
                        <TableCell>
                          <Input
                            value={line.notes}
                            onChange={(e) => updateLine(idx, { notes: e.target.value })}
                            placeholder="Optional"
                            className="w-40"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={lines.length === 1}
                            onClick={() => removeLine(idx)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="add"
            disabled={submitting || validLines.length === 0}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" /> Apply batch
              </>
            )}
          </Button>
        </div>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>Recent Batches</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingBatches ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Loading batches...
            </div>
          ) : recentBatches.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">
              No bulk adjustment batches yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Batch #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Lines</TableHead>
                  <TableHead>Created by</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentBatches.map((batch) => {
                  const isExpanded = expandedBatchId === batch.id;
                  const linesForBatch = batchLines[batch.id];
                  return (
                    <Fragment key={batch.id}>
                      <TableRow
                        className="cursor-pointer"
                        onClick={() => toggleBatch(batch.id)}
                      >
                        <TableCell>
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{batch.batch_number}</TableCell>
                        <TableCell>
                          {new Date(batch.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{batch.reason}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {batch.reference || "—"}
                        </TableCell>
                        <TableCell className="text-right">{batch.line_count}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {batch.adjusted_by || "—"}
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow className="bg-accent/20">
                          <TableCell />
                          <TableCell colSpan={6} className="py-3">
                            {loadingBatchLines === batch.id ? (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Loading lines...
                              </div>
                            ) : !linesForBatch || linesForBatch.length === 0 ? (
                              <div className="text-sm text-muted-foreground">No lines.</div>
                            ) : (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Product</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead className="text-right">Quantity</TableHead>
                                    <TableHead className="text-right">Previous</TableHead>
                                    <TableHead className="text-right">New</TableHead>
                                    <TableHead>Notes</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {linesForBatch.map((line) => (
                                    <TableRow key={line.id}>
                                      <TableCell>
                                        <div className="font-medium">
                                          {line.product_name || `#${line.product_id}`}
                                        </div>
                                        {line.product_sku && (
                                          <div className="text-xs text-muted-foreground">
                                            {line.product_sku}
                                          </div>
                                        )}
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-1 capitalize">
                                          {line.adjustment_type === "increase" ? (
                                            <TrendingUp className="w-4 h-4 text-success" />
                                          ) : line.adjustment_type === "decrease" ? (
                                            <TrendingDown className="w-4 h-4 text-destructive" />
                                          ) : null}
                                          {line.adjustment_type}
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-right">{line.quantity}</TableCell>
                                      <TableCell className="text-right text-muted-foreground">
                                        {line.previous_stock}
                                      </TableCell>
                                      <TableCell className="text-right font-medium">
                                        {line.new_stock}
                                      </TableCell>
                                      <TableCell className="text-muted-foreground">
                                        {line.notes || "—"}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
