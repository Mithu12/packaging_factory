"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { ApiService, ApiError } from "@/services/api";
import type { Supplier } from "@/services/types";

export interface QuickAddSupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSupplierCreated?: (supplier?: { id: number; name: string }) => void | Promise<void>;
}

/**
 * Minimal supplier create — backend only requires `name` (Joi); optional fields omitted.
 */
export function QuickAddSupplierDialog({
  open,
  onOpenChange,
  onSupplierCreated,
}: QuickAddSupplierDialogProps) {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      toast.error("Company name must be at least 2 characters");
      return;
    }

    setIsSubmitting(true);
    try {
      const created = (await ApiService.createSupplier({
        name: trimmed,
        payment_terms: "net-30",
        status: "active",
      })) as Supplier;

      toast.success("Supplier created", {
        description: `${trimmed} was added.`,
      });

      await Promise.resolve(
        onSupplierCreated?.(
          created?.id != null
            ? { id: Number(created.id), name: String(created.name) }
            : undefined
        )
      );
      onOpenChange(false);
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error("Failed to create supplier", { description: error.message });
      } else {
        toast.error("Failed to create supplier");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Quick add supplier</DialogTitle>
          <DialogDescription>
            Only the company name is required. You can add full details later in
            Suppliers.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="quick-supplier-name">Company name *</Label>
            <Input
              id="quick-supplier-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Materials Ltd"
              autoComplete="off"
              minLength={2}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating…" : "Create supplier"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
