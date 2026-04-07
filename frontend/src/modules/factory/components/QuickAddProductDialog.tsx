"use client";

import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
} from "react";
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

function hasSelectedCategoryId(value: string): boolean {
  return value.trim() !== "";
}

function hasSelectedSupplierId(value: string): boolean {
  return value.trim() !== "";
}

function extractCategoriesFromResponse(payload: unknown): Category[] {
  if (payload == null) {
    return [];
  }
  if (Array.isArray(payload)) {
    return payload as Category[];
  }
  if (typeof payload !== "object") {
    return [];
  }
  const o = payload as Record<string, unknown>;
  const raw = o.categories ?? o.items ?? o.data ?? o.results;
  if (Array.isArray(raw)) {
    return raw as Category[];
  }
  return [];
}

function getCategoryRowId(row: unknown): string | null {
  if (row == null || typeof row !== "object") {
    return null;
  }
  const r = row as Record<string, unknown>;
  const raw = r.id ?? r.category_id ?? r.ID;
  if (raw == null) {
    return null;
  }
  return String(raw);
}

function getSupplierRowId(row: unknown): string | null {
  if (row == null || typeof row !== "object") {
    return null;
  }
  const r = row as Record<string, unknown>;
  const raw = r.id ?? r.supplier_id ?? r.ID;
  if (raw == null) {
    return null;
  }
  return String(raw);
}

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
  /** When false (default), category is auto-filled from the first loaded category. */
  showCategorySelect?: boolean;
  /** When false (default), supplier is auto-filled from the first loaded supplier. */
  showSupplierSelect?: boolean;
  defaultCategoryName?: string;
}

export function QuickAddProductDialog({
  open,
  onOpenChange,
  onProductCreated,
  showCategorySelect = false,
  showSupplierSelect = false,
  defaultCategoryName,
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
  const [categorySelectKey, setCategorySelectKey] = useState(0);
  const [supplierSelectKey, setSupplierSelectKey] = useState(0);
  const prevOpenRef = useRef(false);

  const loadCategoriesAndSuppliers = useCallback(async () => {
    try {
      setLoadingMeta(true);
      const settled = await Promise.allSettled([
        ApiService.getCategories({ limit: 100 }),
        SupplierApi.getSuppliers({ limit: 100 }),
      ]);
      if (settled[0].status === "fulfilled") {
        setCategories(extractCategoriesFromResponse(settled[0].value));
      } else {
        console.error("Failed to load categories:", settled[0].reason);
        setCategories([]);
      }
      if (settled[1].status === "fulfilled") {
        const v = settled[1].value as { suppliers?: Supplier[] };
        const sups = v?.suppliers;
        setSuppliers(Array.isArray(sups) ? sups : []);
      } else {
        console.error("Failed to load suppliers:", settled[1].reason);
        setSuppliers([]);
      }
      if (settled.some((r) => r.status === "rejected")) {
        toast.error("Failed to load categories or suppliers");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load categories or suppliers");
    } finally {
      setLoadingMeta(false);
    }
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      prevOpenRef.current = false;
      return;
    }
    const justOpened = !prevOpenRef.current;
    prevOpenRef.current = true;
    if (justOpened) {
      setCategorySelectKey((k) => k + 1);
      setSupplierSelectKey((k) => k + 1);
      setName("");
      setSellingPrice("");
    }
    setCategoryId((prev) => {
      let next = justOpened ? "" : prev;
      if (!hasSelectedCategoryId(next) && categories.length > 0) {
        if (defaultCategoryName) {
          const match = categories.find(
            (c) => c.name.toLowerCase() === defaultCategoryName.toLowerCase(),
          );
          if (match) {
            const rowId = getCategoryRowId(match);
            if (rowId !== null) return rowId;
          }
        }
        const rowId = getCategoryRowId(categories[0]);
        if (rowId !== null) {
          next = rowId;
        }
      }
      return next;
    });
    setSupplierId((prev) => {
      let next = justOpened ? "" : prev;
      if (!hasSelectedSupplierId(next) && suppliers.length > 0) {
        const rowId = getSupplierRowId(suppliers[0]);
        if (rowId !== null) {
          next = rowId;
        }
      }
      return next;
    });
  }, [open, categories, suppliers]);

  useEffect(() => {
    if (!open) {
      return;
    }
    void loadCategoriesAndSuppliers();
  }, [open, loadCategoriesAndSuppliers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(sellingPrice);
    if (!name.trim()) {
      toast.error("Product name is required");
      return;
    }
    if (Number.isNaN(priceNum) || priceNum <= 0) {
      toast.error("Enter a valid price greater than zero");
      return;
    }
    if (!hasSelectedCategoryId(categoryId)) {
      toast.error(
        showCategorySelect
          ? "Select a category"
          : "No categories available. Add a category first.",
      );
      return;
    }
    if (!hasSelectedSupplierId(supplierId)) {
      toast.error(
        showSupplierSelect
          ? "Select a supplier"
          : "No suppliers available. Add a supplier first.",
      );
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

  const handleSupplierCreated = async (supplier?: {
    id: number;
    name: string;
  }) => {
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
              <Label htmlFor="quick-product-price">Price *</Label>
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

            {showCategorySelect && (
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select
                  key={categorySelectKey}
                  value={
                    hasSelectedCategoryId(categoryId)
                      ? String(categoryId)
                      : undefined
                  }
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
                      <SelectItem key={String(c.id)} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {showSupplierSelect && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="flex-1">Supplier *</Label>
                  <Button
                    type="button"
                    variant="quickAdd"
                    size="icon"
                    className="shrink-0 h-8 w-8"
                    title="Add new supplier"
                    onClick={() => setAddSupplierOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <Select
                  key={supplierSelectKey}
                  value={
                    hasSelectedSupplierId(supplierId)
                      ? String(supplierId)
                      : undefined
                  }
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
            )}

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
