"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { WastageApiService, wastageQueryKeys } from "@/services/wastage-api";
import { useFormatting } from "@/hooks/useFormatting";

interface SellWastageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SellWastageDialog({ open, onOpenChange }: SellWastageDialogProps) {
  const queryClient = useQueryClient();
  const { formatCurrency, formatDate } = useFormatting();

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank_transfer">("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [notes, setNotes] = useState("");

  // Sold records leave 'approved', so this list is always the sellable set
  const { data: approvedData, isLoading } = useQuery({
    queryKey: wastageQueryKeys.list({ status: "approved", limit: 100 }),
    queryFn: () =>
      WastageApiService.getWastageRecords({
        status: "approved",
        sort_by: "recorded_date",
        sort_order: "desc",
        limit: 100,
      }),
    enabled: open,
  });

  const approvedRecords = approvedData?.wastage_records || [];
  const selectedRecords = approvedRecords.filter((record) =>
    selectedIds.includes(Number(record.id))
  );
  const selectedCost = selectedRecords.reduce(
    (sum, record) => sum + Number(record.cost ?? 0),
    0
  );

  const resetForm = () => {
    setSelectedIds([]);
    setBuyerName("");
    setBuyerPhone("");
    setTotalAmount("");
    setPaymentMethod("cash");
    setPaymentReference("");
    setNotes("");
  };

  const toggleRecord = (id: number, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...prev, id] : prev.filter((selectedId) => selectedId !== id)
    );
  };

  const sellMutation = useMutation({
    mutationFn: () =>
      WastageApiService.createWastageSale({
        wastage_ids: selectedIds,
        buyer_name: buyerName.trim(),
        buyer_phone: buyerPhone.trim() || undefined,
        total_amount: Number(totalAmount),
        payment_method: paymentMethod,
        payment_reference: paymentReference.trim() || undefined,
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: wastageQueryKeys.all });
      toast.success("Wastage sold successfully");
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error?.message || "Failed to sell wastage");
    },
  });

  const canSubmit =
    selectedIds.length > 0 &&
    buyerName.trim() !== "" &&
    Number(totalAmount) > 0 &&
    !sellMutation.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) resetForm();
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Sell Scrap</DialogTitle>
          <DialogDescription>
            Sell approved wastage to a scrap buyer. The sale posts a receipt
            voucher (cash/bank against scrap income); stock was already
            written off at recording.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Approved wastage *</Label>
            <div className="rounded-md border max-h-60 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Recorded Cost</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-gray-500">
                        Loading approved wastage...
                      </TableCell>
                    </TableRow>
                  ) : approvedRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-gray-500">
                        No approved wastage available to sell
                      </TableCell>
                    </TableRow>
                  ) : (
                    approvedRecords.map((record) => {
                      const id = Number(record.id);
                      return (
                        <TableRow key={record.id}>
                          <TableCell>
                            <Checkbox
                              data-testid={`sell-wastage-row-${id}`}
                              checked={selectedIds.includes(id)}
                              onCheckedChange={(checked) => toggleRecord(id, checked === true)}
                            />
                          </TableCell>
                          <TableCell>{record.material_name}</TableCell>
                          <TableCell>
                            {Number(record.quantity ?? 0)} {record.unit_of_measure}
                          </TableCell>
                          <TableCell>{formatCurrency(Number(record.cost ?? 0))}</TableCell>
                          <TableCell>{formatDate(record.recorded_date)}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            <p className="text-sm text-gray-500">
              {selectedIds.length} selected — recorded cost {formatCurrency(selectedCost)}{" "}
              (reference only; enter the agreed sale price below)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sell-buyer-name">Buyer Name *</Label>
              <Input
                id="sell-buyer-name"
                data-testid="sell-buyer-name"
                placeholder="e.g. Local scrap dealer"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                maxLength={255}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sell-buyer-phone">Buyer Phone</Label>
              <Input
                id="sell-buyer-phone"
                data-testid="sell-buyer-phone"
                value={buyerPhone}
                onChange={(e) => setBuyerPhone(e.target.value)}
                maxLength={50}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sell-total-amount">Sale Amount *</Label>
              <Input
                id="sell-total-amount"
                data-testid="sell-total-amount"
                type="number"
                min="0"
                step="any"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Method *</Label>
              <Select
                value={paymentMethod}
                onValueChange={(value) => setPaymentMethod(value as "cash" | "bank_transfer")}
              >
                <SelectTrigger data-testid="sell-payment-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sell-payment-reference">Payment Reference</Label>
            <Input
              id="sell-payment-reference"
              data-testid="sell-payment-reference"
              placeholder="Receipt no., transaction ID..."
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              maxLength={255}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sell-notes">Notes</Label>
            <Textarea
              id="sell-notes"
              data-testid="sell-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            data-testid="sell-submit"
            onClick={() => canSubmit && sellMutation.mutate()}
            disabled={!canSubmit}
          >
            {sellMutation.isPending ? "Selling..." : "Sell Scrap"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
