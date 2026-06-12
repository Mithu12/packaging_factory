"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { WastageApiService, wastageQueryKeys } from "@/services/wastage-api";
import ProductsApiService, { productsQueryKeys } from "@/services/products-api";

interface RecordWastageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function RecordWastageDialog({ open, onOpenChange }: RecordWastageDialogProps) {
  const queryClient = useQueryClient();

  const [materialSearch, setMaterialSearch] = useState("");
  const [materialId, setMaterialId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [notes, setNotes] = useState("");

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: productsQueryKeys.list({ search: materialSearch, status: "active", limit: 50 }),
    queryFn: () =>
      ProductsApiService.getProducts({ search: materialSearch || undefined, status: "active", limit: 50 }),
    enabled: open,
  });

  const products = productsData?.products || [];
  const selectedProduct = products.find((p) => String(p.id) === materialId);

  const resetForm = () => {
    setMaterialSearch("");
    setMaterialId("");
    setQuantity("");
    setReason("");
    setBatchNumber("");
    setNotes("");
  };

  const createMutation = useMutation({
    mutationFn: () =>
      WastageApiService.createWastage({
        material_id: materialId,
        quantity: Number(quantity),
        wastage_reason: reason.trim(),
        batch_number: batchNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wastageQueryKeys.all });
      toast.success("Wastage recorded successfully");
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to record wastage");
    },
  });

  const quantityNumber = Number(quantity);
  const canSubmit =
    materialId !== "" && quantityNumber > 0 && reason.trim() !== "" && !createMutation.isPending;

  const handleSubmit = () => {
    if (!canSubmit) return;
    createMutation.mutate();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) resetForm();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Record Wastage</DialogTitle>
          <DialogDescription>
            Record material wastage found outside production — storage damage, QC rejects, etc.
            Stock is deducted immediately; the cost write-off posts once a manager approves.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="wastage-material-search">Material *</Label>
            <Input
              id="wastage-material-search"
              data-testid="wastage-material-search"
              placeholder="Search materials by name or SKU..."
              value={materialSearch}
              onChange={(e) => setMaterialSearch(e.target.value)}
            />
            <Select value={materialId} onValueChange={setMaterialId}>
              <SelectTrigger data-testid="wastage-material-select">
                <SelectValue placeholder={productsLoading ? "Loading materials..." : "Select material"} />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={String(product.id)}>
                    {product.name} ({product.sku}) — stock: {Number(product.current_stock ?? 0)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="wastage-quantity">
                Quantity *{selectedProduct ? ` (${selectedProduct.unit_of_measure})` : ""}
              </Label>
              <Input
                id="wastage-quantity"
                data-testid="wastage-quantity"
                type="number"
                min="0"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wastage-batch">Batch Number</Label>
              <Input
                id="wastage-batch"
                data-testid="wastage-batch"
                value={batchNumber}
                onChange={(e) => setBatchNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="wastage-reason">Reason *</Label>
            <Input
              id="wastage-reason"
              data-testid="wastage-reason"
              placeholder="e.g. Water damage in storage"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={255}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wastage-notes">Notes</Label>
            <Textarea
              id="wastage-notes"
              data-testid="wastage-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button data-testid="wastage-submit" onClick={handleSubmit} disabled={!canSubmit}>
            {createMutation.isPending ? "Recording..." : "Record Wastage"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
