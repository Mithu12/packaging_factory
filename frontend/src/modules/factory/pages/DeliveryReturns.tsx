"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  RotateCcw,
  Loader2,
  CheckCircle,
  XCircle,
  Package,
  Plus,
  Ban,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { useFormatting } from "@/hooks/useFormatting";
import {
  CustomerOrdersApiService,
  type DeliveryReturnStatus,
  type DeliveryReturnQueryParams,
  type CreateDeliveryReturnItemRequest,
} from "../services/customer-orders-api";
import { DistributionApi } from "@/modules/inventory/services/distribution-api";

const STATUS_VARIANTS: Record<
  DeliveryReturnStatus,
  { variant: "default" | "secondary" | "destructive" | "outline"; icon: any }
> = {
  draft: { variant: "secondary", icon: RotateCcw },
  approved: { variant: "default", icon: CheckCircle },
  rejected: { variant: "destructive", icon: XCircle },
  cancelled: { variant: "outline", icon: Ban },
};

const RETURN_REASONS = ["defective", "damaged", "wrong_item", "quality_issue", "over_supply", "other"];

export default function DeliveryReturns() {
  const { formatCurrency, formatDate } = useFormatting();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const presetDeliveryId = searchParams.get("deliveryId");

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);

  const queryParams: DeliveryReturnQueryParams = {
    status: statusFilter !== "all" ? (statusFilter as DeliveryReturnStatus) : undefined,
    page: currentPage,
    limit: 20,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["delivery-returns", queryParams],
    queryFn: () => CustomerOrdersApiService.listDeliveryReturns(queryParams),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["delivery-returns"] });

  const approveMut = useMutation({
    mutationFn: (id: number) => CustomerOrdersApiService.approveDeliveryReturn(id),
    onSuccess: () => { toast.success("Return approved — stock restored"); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed to approve"),
  });
  const rejectMut = useMutation({
    mutationFn: (id: number) => CustomerOrdersApiService.rejectDeliveryReturn(id),
    onSuccess: () => { toast.success("Return rejected"); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed to reject"),
  });
  const cancelMut = useMutation({
    mutationFn: (id: number) => CustomerOrdersApiService.cancelDeliveryReturn(id),
    onSuccess: () => { toast.success("Return cancelled"); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Failed to cancel"),
  });

  const getStatusBadge = (status: DeliveryReturnStatus) => {
    const cfg = STATUS_VARIANTS[status] ?? STATUS_VARIANTS.draft;
    const Icon = cfg.icon;
    return (
      <Badge variant={cfg.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.limit)) : 1;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Delivery Returns</h1>
          <p className="text-muted-foreground">
            Goods returned against a delivery challan. Approving a return restores stock and posts a credit note.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Return
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={statusFilter}
            onValueChange={(value) => { setStatusFilter(value); setCurrentPage(1); }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Returns</CardTitle>
          <CardDescription>
            {data ? `Showing ${data.returns.length} of ${data.total} returns` : "Loading..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : data && data.returns.length > 0 ? (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Return #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Delivery #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.returns.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.return_number}</TableCell>
                      <TableCell>{formatDate(r.return_date)}</TableCell>
                      <TableCell>{r.delivery_number ?? r.delivery_id}</TableCell>
                      <TableCell>{r.factory_customer_name ?? "—"}</TableCell>
                      <TableCell className="capitalize">{r.return_reason.replace(/_/g, " ")}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(r.total_return_value)}</TableCell>
                      <TableCell>{getStatusBadge(r.status)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          {r.status === "draft" && (
                            <>
                              <Button
                                variant="ghost" size="sm"
                                onClick={() => approveMut.mutate(r.id)}
                                disabled={approveMut.isPending}
                                title="Approve return"
                              >
                                <Check className="h-4 w-4 mr-1" /> Approve
                              </Button>
                              <Button
                                variant="ghost" size="sm"
                                onClick={() => rejectMut.mutate(r.id)}
                                disabled={rejectMut.isPending}
                                title="Reject return"
                              >
                                <XCircle className="h-4 w-4 mr-1" /> Reject
                              </Button>
                              <Button
                                variant="ghost" size="sm"
                                onClick={() => cancelMut.mutate(r.id)}
                                disabled={cancelMut.isPending}
                                title="Cancel return"
                              >
                                <Ban className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Page {data.page} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage <= 1}>
                      Previous
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage >= totalPages}>
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No delivery returns found</p>
            </div>
          )}
        </CardContent>
      </Card>

      <NewReturnDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        presetDeliveryId={presetDeliveryId}
        onCreated={() => { invalidate(); setDialogOpen(false); }}
      />
    </div>
  );
}

function NewReturnDialog({
  open,
  onOpenChange,
  presetDeliveryId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  presetDeliveryId: string | null;
  onCreated: () => void;
}) {
  const { formatCurrency } = useFormatting();
  const [deliveryId, setDeliveryId] = useState<string>(presetDeliveryId ?? "");
  const [reason, setReason] = useState("damaged");
  const [notes, setNotes] = useState("");
  const [dcId, setDcId] = useState<string>("");
  // delivery_item_id -> return quantity
  const [quantities, setQuantities] = useState<Record<number, string>>({});

  // Distribution centers for the restock destination; default to the primary.
  const { data: dcData } = useQuery({
    queryKey: ["distribution-centers"],
    queryFn: () => DistributionApi.getDistributionCenters({ limit: 100 }),
    enabled: open,
  });
  const distributionCenters = dcData?.centers ?? [];
  useEffect(() => {
    if (!dcId && distributionCenters.length > 0) {
      const primary = distributionCenters.find((c) => c.is_primary) ?? distributionCenters[0];
      if (primary) setDcId(String(primary.id));
    }
  }, [dcId, distributionCenters]);

  // Recent deliveries for the picker (shipped/delivered only — returnable).
  const { data: deliveriesList } = useQuery({
    queryKey: ["returnable-deliveries"],
    queryFn: () => CustomerOrdersApiService.listAllDeliveries({ limit: 100, sort_by: "delivery_date", sort_order: "desc" }),
    enabled: open,
  });

  const { data: delivery, isLoading: loadingDelivery } = useQuery({
    queryKey: ["delivery-for-return", deliveryId],
    queryFn: () => CustomerOrdersApiService.getDelivery(deliveryId),
    enabled: open && !!deliveryId,
  });

  const createMut = useMutation({
    mutationFn: (items: CreateDeliveryReturnItemRequest[]) =>
      CustomerOrdersApiService.createDeliveryReturn(deliveryId, {
        items,
        return_reason: reason,
        notes: notes || undefined,
        distribution_center_id: dcId ? Number(dcId) : undefined,
      }),
    onSuccess: () => {
      toast.success("Return created (draft) — approve it to restore stock");
      setQuantities({});
      setNotes("");
      onCreated();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to create return"),
  });

  const items = useMemo(() => {
    const list: CreateDeliveryReturnItemRequest[] = [];
    for (const [idStr, qtyStr] of Object.entries(quantities)) {
      const qty = parseFloat(qtyStr);
      if (qty > 0) list.push({ delivery_item_id: Number(idStr), returned_quantity: qty });
    }
    return list;
  }, [quantities]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>New Delivery Return</DialogTitle>
          <DialogDescription>
            Select a delivery and the quantities being returned. The return is created as a draft;
            approving it restores stock and posts a credit note.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1 block">Delivery</Label>
              <Select value={deliveryId} onValueChange={(v) => { setDeliveryId(v); setQuantities({}); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a delivery" />
                </SelectTrigger>
                <SelectContent>
                  {(deliveriesList?.deliveries ?? [])
                    .filter((d) => d.delivery_status !== "cancelled")
                    .map((d) => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        {d.delivery_number} — {d.factory_customer_name ?? "—"}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block">Reason</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RETURN_REASONS.map((r) => (
                    <SelectItem key={r} value={r} className="capitalize">{r.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="mb-1 block">Restock to (distribution center)</Label>
            <Select value={dcId} onValueChange={setDcId}>
              <SelectTrigger>
                <SelectValue placeholder="Select distribution center" />
              </SelectTrigger>
              <SelectContent>
                {distributionCenters.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}{c.is_primary ? " (primary)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loadingDelivery ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : delivery ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Delivered</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right w-32">Return Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {delivery.items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell>{it.product_name ?? `#${it.product_id}`}</TableCell>
                    <TableCell className="text-right">{it.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(it.unit_price_snapshot)}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min={0}
                        max={it.quantity}
                        step="0.001"
                        value={quantities[it.id] ?? ""}
                        onChange={(e) =>
                          setQuantities((prev) => ({ ...prev, [it.id]: e.target.value }))
                        }
                        className="w-28 ml-auto text-right"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : null}

          <div>
            <Label className="mb-1 block">Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => createMut.mutate(items)}
            disabled={!deliveryId || items.length === 0 || createMut.isPending}
          >
            {createMut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Create Return
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
