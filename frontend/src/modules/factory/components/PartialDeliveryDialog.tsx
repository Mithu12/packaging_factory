"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/sonner";

import {
    CustomerOrdersApiService,
    type CreateDeliveryItemRequest,
    type FactoryCustomerOrder,
} from "../services/customer-orders-api";
import { DistributionApi, type DistributionCenter } from "@/modules/inventory/services/distribution-api";

interface PartialDeliveryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    order: FactoryCustomerOrder | null;
    onCreated?: () => void;
}

interface RowState {
    orderLineItemId: string;
    /** Product id — used to look up per-DC available stock. */
    productId: string;
    /** Source order number — used to map rows back to their order (e.g. the order picker). */
    sourceOrderNumber: string;
    /** Customer PO number for the source order — shown in the "PO No" column. */
    sourceOrderPoNumber: string;
    productName: string;
    productSku: string;
    /** Editable; pre-filled from products.customer_item_code, overridable per shipment line. */
    itemCode: string;
    ordered: number;
    delivered: number;
    remaining: number;
    /** stored as string so the input can be cleared without resetting to 0 */
    inputValue: string;
    bundlesValue: string;
}

function buildRowsFromOrder(order: FactoryCustomerOrder, defaultShipRemaining: boolean): RowState[] {
    return (order.line_items ?? []).map(li => {
        const ordered = Number(li.quantity ?? 0);
        const delivered = Number(li.delivered_qty ?? 0);
        const remaining = Math.max(ordered - delivered, 0);
        return {
            orderLineItemId: String(li.id),
            productId: String(li.product_id),
            sourceOrderNumber: order.order_number,
            sourceOrderPoNumber: order.po_number ?? "",
            productName: li.product_name,
            productSku: li.product_sku,
            itemCode: li.customer_item_code ?? "",
            ordered,
            delivered,
            remaining,
            inputValue: defaultShipRemaining && remaining > 0 ? String(remaining) : "0",
            bundlesValue: "",
        };
    });
}

function buildRows(order: FactoryCustomerOrder | null): RowState[] {
    if (!order) return [];
    // Primary order: default Ship-now to remaining qty (common case).
    return buildRowsFromOrder(order, true);
}

export default function PartialDeliveryDialog({
    open,
    onOpenChange,
    order,
    onCreated,
}: PartialDeliveryDialogProps) {
    const [rows, setRows] = useState<RowState[]>([]);
    const [trackingNumber, setTrackingNumber] = useState("");
    const [carrier, setCarrier] = useState<string>("");
    const [estimatedDate, setEstimatedDate] = useState("");
    const [notes, setNotes] = useState("");
    const [vatNumber, setVatNumber] = useState("");
    const [masterCartonFor, setMasterCartonFor] = useState("");
    const [masterCartonSubLabel, setMasterCartonSubLabel] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [distributionCenters, setDistributionCenters] = useState<DistributionCenter[]>([]);
    const [dcId, setDcId] = useState<string>("");
    // Available stock per product id at the currently selected DC (the shipment source).
    const [availableByProduct, setAvailableByProduct] = useState<Record<string, number>>({});
    const [stockLoading, setStockLoading] = useState(false);
    // V145+: list of the customer's other open orders that can contribute lines to this delivery.
    const [otherOrders, setOtherOrders] = useState<FactoryCustomerOrder[]>([]);
    const [addingOrderId, setAddingOrderId] = useState<string>("");

    // Fetch per-DC available stock for every product in `targetRows`, then clamp
    // each row's "Now Delivery" down to min(remaining, available). We only ever
    // lower the entered qty so the user can ship exactly what is on hand and no
    // more — the rest stays on the order for a later (post-production) delivery.
    async function loadStockAndClamp(targetRows: RowState[], dc: string) {
        if (!dc) return;
        const productIds = Array.from(
            new Set(targetRows.map(r => r.productId).filter(pid => pid && pid !== "undefined"))
        );
        if (productIds.length === 0) return;
        setStockLoading(true);
        try {
            const results = await Promise.all(
                productIds.map(pid =>
                    DistributionApi.getProductLocations({
                        distribution_center_id: Number(dc),
                        product_id: Number(pid),
                    })
                        .then(res => ({ pid, available: res.locations?.[0]?.available_stock ?? 0 }))
                        .catch(() => ({ pid, available: 0 }))
                )
            );
            const map: Record<string, number> = {};
            results.forEach(({ pid, available }) => {
                map[pid] = Number(available) || 0;
            });
            setAvailableByProduct(map);
            setRows(prev =>
                prev.map(r => {
                    const cap = Math.min(r.remaining, map[r.productId] ?? 0);
                    const cur = Number(r.inputValue) || 0;
                    return cur > cap ? { ...r, inputValue: String(cap) } : r;
                })
            );
        } finally {
            setStockLoading(false);
        }
    }

    // Reset state whenever the dialog opens for a new order
    useEffect(() => {
        if (open) {
            const builtRows = buildRows(order);
            setRows(builtRows);
            setAvailableByProduct({});
            setTrackingNumber("");
            setCarrier("");
            setEstimatedDate("");
            setNotes("");
            // VAT is entered by hand per shipment — do not auto-link the customer's VAT.
            setVatNumber("");
            setMasterCartonFor("");
            setMasterCartonSubLabel("");
            setOtherOrders([]);
            setAddingOrderId("");

            // Load distribution centers; default the "ship from" DC to the primary.
            DistributionApi.getDistributionCenters({ limit: 100 })
                .then(res => {
                    const centers = res.centers ?? [];
                    setDistributionCenters(centers);
                    const primary = centers.find(c => c.is_primary) ?? centers[0];
                    const primaryId = primary ? String(primary.id) : "";
                    setDcId(primaryId);
                    if (primaryId) void loadStockAndClamp(builtRows, primaryId);
                })
                .catch(err => console.error("Failed to load distribution centers", err));

            // Async: load other open orders for the same customer so the user
            // can pull more line items into this shipment.
            if (order?.factory_customer_id) {
                CustomerOrdersApiService.listOpenOrdersForCustomer(order.factory_customer_id)
                    .then(list => {
                        const filtered = list.filter(o => Number(o.id) !== Number(order.id));
                        setOtherOrders(filtered);
                    })
                    .catch(err => {
                        console.error("Failed to load other open orders", err);
                    });
            }
        }
    }, [open, order]);

    // Order IDs already represented in the rows — used to disable already-added orders in the picker.
    const orderIdsInRows = useMemo(() => {
        const ids = new Set<string>();
        // The primary order is always in the rows initially.
        if (order) ids.add(String(order.id));
        // Any other order whose lines are in rows: we tag rows by sourceOrderNumber, so map back to ids.
        for (const o of otherOrders) {
            if (rows.some(r => r.sourceOrderNumber === o.order_number)) {
                ids.add(String(o.id));
            }
        }
        return ids;
    }, [order, otherOrders, rows]);

    async function handleAddLinesFromOrder() {
        if (!addingOrderId) return;
        try {
            const fresh = await CustomerOrdersApiService.getCustomerOrderById(addingOrderId);
            const newRows = buildRowsFromOrder(fresh, false);
            // Skip rows that have no remaining qty.
            const usable = newRows.filter(r => r.remaining > 0);
            if (usable.length === 0) {
                toast.info(`Order ${fresh.order_number} has no remaining quantity to ship.`);
            } else {
                const merged = [...rows, ...usable];
                setRows(merged);
                // Pull in stock for the newly added products and clamp the merged set.
                void loadStockAndClamp(merged, dcId);
                toast.success(`Added ${usable.length} line(s) from order ${fresh.order_number}.`);
            }
            setAddingOrderId("");
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Failed to load order";
            toast.error(msg);
        }
    }

    function handleDcChange(value: string) {
        setDcId(value);
        // Available stock is DC-specific — refetch and re-clamp for the new source.
        void loadStockAndClamp(rows, value);
    }

    const totalToShip = useMemo(
        () => rows.reduce((sum, r) => sum + (Number(r.inputValue) || 0), 0),
        [rows]
    );
    const fullyDelivered = rows.length > 0 && rows.every(r => r.remaining === 0);

    // Available cap per row = min(remaining, on-hand stock at the selected DC).
    function availableFor(r: RowState): number {
        const avail = availableByProduct[r.productId];
        return avail === undefined ? r.remaining : Math.min(r.remaining, avail);
    }
    // A row entered above its on-hand stock blocks submit (would 400 mid-transaction).
    const hasOverStock = useMemo(
        () =>
            rows.some(r => {
                const avail = availableByProduct[r.productId];
                if (avail === undefined) return false;
                return (Number(r.inputValue) || 0) > avail + 1e-9;
            }),
        [rows, availableByProduct]
    );

    function setRowQty(idx: number, value: string) {
        setRows(prev =>
            prev.map((r, i) => (i === idx ? { ...r, inputValue: value } : r))
        );
    }

    function setRowBundles(idx: number, value: string) {
        setRows(prev =>
            prev.map((r, i) => (i === idx ? { ...r, bundlesValue: value } : r))
        );
    }

    function setRowItemCode(idx: number, value: string) {
        setRows(prev =>
            prev.map((r, i) => (i === idx ? { ...r, itemCode: value } : r))
        );
    }

    function shipAll() {
        // "Ship all available" — never exceed on-hand stock at the selected DC.
        setRows(prev => prev.map(r => ({ ...r, inputValue: String(availableFor(r)) })));
    }

    function clearAll() {
        setRows(prev => prev.map(r => ({ ...r, inputValue: "0" })));
    }

    async function handleSubmit() {
        if (!order) return;

        const items: CreateDeliveryItemRequest[] = rows
            .map(r => {
                // bundles is free text (e.g. "20 x 50") — pass the trimmed string as-is.
                const bundlesTrimmed = r.bundlesValue.trim();
                const itemCodeTrimmed = r.itemCode.trim();
                return {
                    order_line_item_id: r.orderLineItemId,
                    quantity: Number(r.inputValue) || 0,
                    bundles: bundlesTrimmed === "" ? null : bundlesTrimmed,
                    item_code: itemCodeTrimmed === "" ? null : itemCodeTrimmed,
                };
            })
            .filter(it => it.quantity > 0);

        if (items.length === 0) {
            toast.error("Enter a quantity for at least one line");
            return;
        }

        for (const r of rows) {
            const qty = Number(r.inputValue) || 0;
            if (qty > r.remaining + 1e-9) {
                toast.error(
                    `${r.productName}: cannot ship ${qty}; only ${r.remaining} remaining`
                );
                return;
            }
            const avail = availableByProduct[r.productId];
            if (avail !== undefined && qty > avail + 1e-9) {
                toast.error(
                    `${r.productName}: only ${avail} in stock at the selected warehouse; produce the rest before shipping it`
                );
                return;
            }
        }

        setSubmitting(true);
        try {
            const result = await CustomerOrdersApiService.createDelivery(String(order.id), {
                items,
                tracking_number: trackingNumber || undefined,
                carrier: carrier || undefined,
                // The dialog input is labelled "Delivery Date" — send it as
                // delivery_date so the challan header reflects what the user typed.
                delivery_date: estimatedDate || undefined,
                notes: notes || undefined,
                vat_number: vatNumber || undefined,
                master_carton_for: masterCartonFor.trim() || undefined,
                master_carton_sub_label: masterCartonSubLabel.trim() || undefined,
                distribution_center_id: dcId ? Number(dcId) : undefined,
            });
            toast.success(
                `Delivery ${result.delivery.delivery_number} created (Invoice ${result.invoice.invoice_number})`
            );
            onOpenChange(false);
            onCreated?.();
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : "Failed to create delivery";
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-7xl">
                <DialogHeader>
                    <DialogTitle>New Delivery</DialogTitle>
                    <DialogDescription>
                        {order
                            ? `Ship part or all of Company PO #${order.po_number || order.order_number}. A challan and invoice will be generated for this shipment.`
                            : ""}
                    </DialogDescription>
                </DialogHeader>

                {fullyDelivered ? (
                    <div className="text-center text-sm text-muted-foreground py-6">
                        All items on this order have been delivered.
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>PO No</TableHead>
                                        <TableHead>Product Name</TableHead>
                                        <TableHead>Item Code</TableHead>
                                        <TableHead className="text-right">Total Ordered</TableHead>
                                        <TableHead className="text-right">Total Delivered</TableHead>
                                        <TableHead className="text-right">Due Ordered</TableHead>
                                        <TableHead className="text-right">In Stock</TableHead>
                                        <TableHead className="text-right w-32">Now Delivery</TableHead>
                                        <TableHead className="text-right w-24">Bundles</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rows.map((r, idx) => (
                                        <TableRow key={r.orderLineItemId}>
                                            <TableCell className="text-xs whitespace-nowrap">
                                                {r.sourceOrderPoNumber || "—"}
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium">{r.productName}</div>
                                                <div className="text-xs text-muted-foreground">{r.productSku}</div>
                                            </TableCell>
                                            <TableCell className="w-32">
                                                <Input
                                                    value={r.itemCode}
                                                    onChange={e => setRowItemCode(idx, e.target.value)}
                                                    disabled={r.remaining === 0}
                                                    className="h-8"
                                                    placeholder="—"
                                                />
                                            </TableCell>
                                            <TableCell className="text-right">{r.ordered}</TableCell>
                                            <TableCell className="text-right">{r.delivered}</TableCell>
                                            <TableCell className="text-right font-medium">{r.remaining}</TableCell>
                                            <TableCell className="text-right">
                                                {availableByProduct[r.productId] === undefined ? (
                                                    <span className="text-muted-foreground">
                                                        {stockLoading ? "…" : "—"}
                                                    </span>
                                                ) : (
                                                    <span
                                                        className={
                                                            availableByProduct[r.productId] <= 0
                                                                ? "text-orange-600 font-medium"
                                                                : ""
                                                        }
                                                    >
                                                        {availableByProduct[r.productId]}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={availableFor(r)}
                                                    step="0.001"
                                                    value={r.inputValue}
                                                    disabled={r.remaining === 0}
                                                    onChange={e => setRowQty(idx, e.target.value)}
                                                    className={`h-8 text-right ${
                                                        availableByProduct[r.productId] !== undefined &&
                                                        (Number(r.inputValue) || 0) > availableByProduct[r.productId] + 1e-9
                                                            ? "border-orange-500 focus-visible:ring-orange-500"
                                                            : ""
                                                    }`}
                                                />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Textarea
                                                    rows={2}
                                                    value={r.bundlesValue}
                                                    disabled={r.remaining === 0}
                                                    onChange={e => setRowBundles(idx, e.target.value)}
                                                    className="text-right min-h-0 resize-none"
                                                    placeholder="e.g. 20 x 50"
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <div className="space-x-2">
                                <Button type="button" variant="ghost" size="sm" onClick={shipAll}>
                                    Ship all available
                                </Button>
                                <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
                                    Clear
                                </Button>
                            </div>
                            <div className="text-muted-foreground">
                                Total this shipment: <span className="font-medium text-foreground">{totalToShip}</span>
                            </div>
                        </div>

                        {hasOverStock && (
                            <div className="text-sm text-orange-600">
                                Some lines exceed the stock available at the selected warehouse. Ship only
                                what is on hand now; the remainder can be delivered once it is produced.
                            </div>
                        )}

                        {/* V145+: add line items from another of this customer's open orders */}
                        {otherOrders.length > 0 && (
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground">+ Add lines from another order:</span>
                                <Select value={addingOrderId} onValueChange={setAddingOrderId}>
                                    <SelectTrigger className="h-8 w-72">
                                        <SelectValue placeholder="Pick another order…" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {otherOrders
                                            .filter(o => !orderIdsInRows.has(String(o.id)))
                                            .map(o => (
                                                <SelectItem key={o.id} value={String(o.id)}>
                                                    {o.order_number} — {o.status}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={!addingOrderId}
                                    onClick={handleAddLinesFromOrder}
                                >
                                    Add
                                </Button>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="tracking-number">Transport No</Label>
                                <Input
                                    id="tracking-number"
                                    value={trackingNumber}
                                    onChange={e => setTrackingNumber(e.target.value)}
                                    placeholder="Optional"
                                />
                            </div>
                            <div>
                                <Label htmlFor="transport-name">Transport Name</Label>
                                <Input
                                    id="transport-name"
                                    value={carrier}
                                    onChange={e => setCarrier(e.target.value)}
                                    placeholder="Optional"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="estimated-date">Delivery Date</Label>
                                <Input
                                    id="estimated-date"
                                    type="date"
                                    value={estimatedDate}
                                    onChange={e => setEstimatedDate(e.target.value)}
                                />
                            </div>
                            <div>
                                <Label htmlFor="vat-number">VAT No</Label>
                                <Input
                                    id="vat-number"
                                    value={vatNumber}
                                    onChange={e => setVatNumber(e.target.value)}
                                    placeholder="VAT"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Delivery from ( Warehouse )</Label>
                                <Select value={dcId} onValueChange={handleDcChange}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select warehouse" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {distributionCenters.map(c => (
                                            <SelectItem key={c.id} value={String(c.id)}>
                                                {c.name}{c.is_primary ? " (primary)" : ""}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="master-carton-for">Master Carton For</Label>
                                <Textarea
                                    id="master-carton-for"
                                    rows={2}
                                    value={masterCartonFor}
                                    onChange={e => setMasterCartonFor(e.target.value)}
                                    placeholder="Corrugated Carton"
                                />
                            </div>
                            <div>
                                <Label htmlFor="master-carton-sub-label">Sub Label</Label>
                                <Textarea
                                    id="master-carton-sub-label"
                                    rows={2}
                                    value={masterCartonSubLabel}
                                    onChange={e => setMasterCartonSubLabel(e.target.value)}
                                    placeholder="e.g. Hanicom"
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="delivery-notes">Notes</Label>
                            <Textarea
                                id="delivery-notes"
                                rows={2}
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="Any notes for this shipment..."
                            />
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={submitting || fullyDelivered || totalToShip <= 0 || hasOverStock}
                    >
                        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Delivery
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
