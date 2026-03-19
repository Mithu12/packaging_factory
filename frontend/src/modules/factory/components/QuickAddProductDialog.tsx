"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { Plus } from "lucide-react";
import { ApiService, ApiError, Category, Supplier } from "@/services/api";
import { SupplierApi } from "@/modules/inventory/services/supplier-api";
import { ProductApi } from "@/modules/inventory/services/product-api";
import type { Product } from "@/services/types";
import { generateSimpleSKU } from "@/utils/sku-generator";
import { generateBarcode } from "@/utils/barcode-generator";
import { QuickAddSupplierDialog } from "./QuickAddSupplierDialog";

function buildQuickSku(name: string): string {
  const fromName = generateSimpleSKU(name).replace(/^-|-$/g, "");
  const suffix = Date.now().toString().slice(-6);
  let base =
    fromName && fromName.length >= 2 ? `${fromName}-${suffix}` : `QK-${suffix}`;
  if (base.length > 50) {
    base = base.slice(0, 50);
  }
  if (base.length < 2) {
    base = `QK-${suffix}`;
  }
  return base;
}

export interface QuickAddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductCreated?: (product: Product) => void | Promise<void>;
}

export function QuickAddProductDialog({
  open,
  onOpenChange,
  onProductCreated,
}: QuickAddProductDialogProps) {
  const [name, setName] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [addSupplierOpen, setAddSupplierOpen] = useState(false);

  const loadCategoriesAndSuppliers = useCallback(async () => {
    try {
      setLoadingMeta(true);
      const [catRes, supRes] = await Promise.all([
        ApiService.getCategories({ limit: 100 }),
        SupplierApi.getSuppliers({ limit: 100 }),
      ]);
      setCategories(catRes.categories ?? []);
      setSuppliers(supRes.suppliers ?? []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load categories or suppliers");
    } finally {
      setLoadingMeta(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadCategoriesAndSuppliers();
      setName("");
      setSellingPrice("");
      setCategoryId("");
      setSupplierId("");
    }
  }, [open, loadCategoriesAndSuppliers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(sellingPrice);
    if (!name.trim()) {
      toast.error("Product name is required");
      return;
    }
    if (Number.isNaN(priceNum) || priceNum <= 0) {
      toast.error("Enter a valid selling price greater than zero");
      return;
    }
    if (!categoryId) {
      toast.error("Select a category");
      return;
    }
    if (!supplierId) {
      toast.error("Select a supplier");
      return;
    }

    const sku = buildQuickSku(name.trim());
    const barcode = generateBarcode();

    setIsSubmitting(true);
    try {
      const created = await ProductApi.createProduct({
        name: name.trim(),
        sku,
        category_id: parseInt(categoryId, 10),
        unit_of_measure: "pcs",
        cost_price: priceNum,
        selling_price: priceNum,
        current_stock: 0,
        min_stock_level: 0,
        supplier_id: parseInt(supplierId, 10),
        status: "active",
        barcode,
      });

      toast.success("Product created", {
        description: `${created.name} was added to the catalog.`,
      });

      await Promise.resolve(onProductCreated?.(created));
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error("Failed to create product", {
          description: error.message,
        });
      } else {
        toast.error("Failed to create product");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSupplierCreated = async (supplier?: { id: number; name: string }) => {
    await loadCategoriesAndSuppliers();
    if (supplier?.id != null) {
      setSupplierId(String(supplier.id));
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quick add product</DialogTitle>
            <DialogDescription>
              Create a minimal product record. SKU, barcode, and stock defaults
              are filled in automatically.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quick-product-name">Product name *</Label>
              <Input
                id="quick-product-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Custom bracket"
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quick-product-price">Selling price *</Label>
              <Input
                id="quick-product-price"
                type="number"
                step="0.01"
                min="0.01"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label>Category *</Label>
              <Select
                value={categoryId}
                onValueChange={setCategoryId}
                disabled={loadingMeta}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      loadingMeta ? "Loading..." : "Select category"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="flex-1">Supplier *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0 h-8 w-8"
                  title="Add new supplier"
                  onClick={() => setAddSupplierOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <Select
                key={`quick-product-suppliers-${suppliers.length}-${supplierId}`}
                value={supplierId}
                onValueChange={(v) => setSupplierId(String(v))}
                disabled={loadingMeta}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      loadingMeta ? "Loading..." : "Select supplier"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || loadingMeta}>
                {isSubmitting ? "Creating…" : "Create product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <QuickAddSupplierDialog
        open={addSupplierOpen}
        onOpenChange={setAddSupplierOpen}
        onSupplierCreated={handleSupplierCreated}
      />
    </>
  );
}
