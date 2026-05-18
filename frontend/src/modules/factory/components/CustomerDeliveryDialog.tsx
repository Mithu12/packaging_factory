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
    type FactoryCustomer,
    type FactoryCustomerOrder,
} from "../services/customer-orders-api";

interface CustomerDeliveryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    customer: FactoryCustomer | null;
    onCreated?: () => void;
}

interface RowState {
    orderLineItemId: string;
    sourceOrderNumber: string;
    productName: string;
    productSku: string;
    itemCode: string;
    ordered: number;
    delivered: number;
    remaining: number;
    /** stored as string so empty cells stay null (= "skip this line"). */
    inputValue: string;
    bundlesValue: string;
}

function flattenOpenOrdersToRows(orders: FactoryCustomerOrder[]): RowState[] {
    const out: RowState[] = [];
    for (const o of orders) {
        for (const li of o.line_items ?? []) {
            const ordered = Number(li.quantity ?? 0);
            const delivered = Number(li.delivered_qty ?? 0);
            const remaining = Math.max(ordered - delivered, 0);
            if (remaining <= 0) continue;
            out.push({
                orderLineItemId: String(li.id),
                sourceOrderNumber: o.order_number,
                productName: li.product_name,
                productSku: li.product_sku,
                itemCode: li.customer_item_code ?? "",
                ordered,
                delivered,
                remaining,
                // Default Ship-now to 0 in the customer-level view — user
                // explicitly checks the lines they want to ship.
                inputValue: "0",
                bundlesValue: "",
            });
        }
    }
    return out;
}

export default function CustomerDeliveryDialog({
    open,
    onOpenChange,
    customer,
    onCreated,
}: CustomerDeliveryDialogProps) {
    const [rows, setRows] = useState<RowState[]>([]);
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [trackingNumber, setTrackingNumber] = useState("");
    const [carrier, setCarrier] = useState<string>("");
    const [estimatedDate, setEstimatedDate] = useState("");
    const [notes, setNotes] = useState("");
    const [vatNumber, setVatNumber] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!open || !customer) return;
        setRows([]);
        setTrackingNumber("");
        setCarrier("");
        setEstimatedDate("");
        setNotes("");
        setVatNumber(customer.vat_number ?? "");
        setLoadingOrders(true);

        // Load the customer's open orders and flatten every shippable line item
        // into the rows array. User picks quantities/bundles per line.
        (async () => {
            try {
                const list = await CustomerOrdersApiService.listOpenOrdersForCustomer(customer.id);
                // The list endpoint returns orders without line_items; we have to
                // hydrate each one. Parallel fetch is fine for typical small N.
                const detailed = await Promise.all(
                    list.map(o => CustomerOrdersApiService.getCustomerOrderById(String(o.id)))
                );
                setRows(flattenOpenOrdersToRows(detailed));
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : "Failed to load open orders";
                toast.error(msg);
            } finally {
                setLoadingOrders(false);
            }
        })();
    }, [open, customer]);

    const totalToShip = useMemo(
        () => rows.reduce((sum, r) => sum + (Number(r.inputValue) || 0), 0),
        [rows]
    );

    function setRowQty(idx: number, value: string) {
        setRows(prev => prev.map((r, i) => (i === idx ? { ...r, inputValue: value } : r)));
    }
    function setRowBundles(idx: number, value: string) {
        setRows(prev => prev.map((r, i) => (i === idx ? { ...r, bundlesValue: value } : r)));
    }
    function setRowItemCode(idx: number, value: string) {
        setRows(prev => prev.map((r, i) => (i === idx ? { ...r, itemCode: value } : r)));
    }

    function shipAll() {
        setRows(prev => prev.map(r => ({ ...r, inputValue: String(r.remaining) })));
    }
    function clearAll() {
        setRows(prev => prev.map(r => ({ ...r, inputValue: "0" })));
    }

    async function handleSubmit() {
        if (!customer) return;

        const items: CreateDeliveryItemRequest[] = rows
            .map(r => {
                const bundlesRaw = r.bundlesValue.trim();
                const bundles =
                    bundlesRaw === "" || Number.isNaN(Number(bundlesRaw))
                        ? null
                        : Math.max(0, Math.trunc(Number(bundlesRaw)));
                const itemCodeTrimmed = r.itemCode.trim();
                return {
                    order_line_item_id: r.orderLineItemId,
                    quantity: Number(r.inputValue) || 0,
                    bundles,
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
                toast.error(`${r.productName}: cannot ship ${qty}; only ${r.remaining} remaining`);
                return;
            }
        }

        setSubmitting(true);
        try {
            const result = await CustomerOrdersApiService.createCustomerDelivery(customer.id, {
                items,
                tracking_number: trackingNumber || undefined,
                carrier: carrier || undefined,
                delivery_date: estimatedDate || undefined,
                notes: notes || undefined,
                vat_number: vatNumber || undefined,
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
            <DialogContent className="max-w-6xl">
                <DialogHeader>
                    <DialogTitle>New Delivery — {customer?.name ?? ""}</DialogTitle>
                    <DialogDescription>
                        Ship goods from one or more of this customer&apos;s open orders in a single
                        challan + invoice. Enter a quantity for the lines you want to dispatch.
                    </DialogDescription>
                </DialogHeader>

                {loadingOrders ? (
                    <div className="text-center text-sm text-muted-foreground py-8">
                        <Loader2 className="inline mr-2 h-4 w-4 animate-spin" />
                        Loading this customer&apos;s open orders…
                    </div>
                ) : rows.length === 0 ? (
                    <div className="text-center text-sm text-muted-foreground py-8">
                        No open orders with remaining quantity for {customer?.name ?? "this customer"}.
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="rounded-md border max-h-96 overflow-y-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Order</TableHead>
                                        <TableHead>Product</TableHead>
                                        <TableHead>Item Code</TableHead>
                                        <TableHead className="text-right">Ordered</TableHead>
                                        <TableHead className="text-right">Delivered</TableHead>
                                        <TableHead className="text-right">Remaining</TableHead>
                                        <TableHead className="text-right w-32">Ship now</TableHead>
                                        <TableHead className="text-right w-24">Bundles</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rows.map((r, idx) => (
                                        <TableRow key={r.orderLineItemId}>
                                            <TableCell className="text-xs whitespace-nowrap">
                                                {r.sourceOrderNumber}
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium">{r.productName}</div>
                                                <div className="text-xs text-muted-foreground">{r.productSku}</div>
                                            </TableCell>
                                            <TableCell className="w-32">
                                                <Input
                                                    value={r.itemCode}
                                                    onChange={e => setRowItemCode(idx, e.target.value)}
                                                    className="h-8"
                                                    placeholder="—"
                                                />
                                            </TableCell>
                                            <TableCell className="text-right">{r.ordered}</TableCell>
                                            <TableCell className="text-right">{r.delivered}</TableCell>
                                            <TableCell className="text-right font-medium">{r.remaining}</TableCell>
                                            <TableCell className="text-right">
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={r.remaining}
                                                    step="0.001"
                                                    value={r.inputValue}
                                                    onChange={e => setRowQty(idx, e.target.value)}
                                                    className="h-8 text-right"
                                                />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    step="1"
                                                    value={r.bundlesValue}
                                                    onChange={e => setRowBundles(idx, e.target.value)}
                                                    className="h-8 text-right"
                                                    placeholder="—"
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
                                    Ship all remaining
                                </Button>
                                <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
                                    Clear
                                </Button>
                            </div>
                            <div className="text-muted-foreground">
                                Total this shipment: <span className="font-medium text-foreground">{totalToShip}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="cust-tracking-number">Transport No</Label>
                                <Input
                                    id="cust-tracking-number"
                                    value={trackingNumber}
                                    onChange={e => setTrackingNumber(e.target.value)}
                                    placeholder="Optional"
                                />
                            </div>
                            <div>
                                <Label htmlFor="cust-carrier">Carrier</Label>
                                <Select value={carrier} onValueChange={setCarrier}>
                                    <SelectTrigger id="cust-carrier">
                                        <SelectValue placeholder="Select carrier" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="truck">Truck</SelectItem>
                                        <SelectItem value="pickup">Pickup</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="cust-delivery-date">Delivery Date</Label>
                                <Input
                                    id="cust-delivery-date"
                                    type="date"
                                    value={estimatedDate}
                                    onChange={e => setEstimatedDate(e.target.value)}
                                />
                            </div>
                            <div>
                                <Label htmlFor="cust-vat-number">VAT No</Label>
                                <Input
                                    id="cust-vat-number"
                                    value={vatNumber}
                                    onChange={e => setVatNumber(e.target.value)}
                                    placeholder={customer?.vat_number ? "Defaults from customer" : "Optional"}
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="cust-delivery-notes">Notes</Label>
                            <Textarea
                                id="cust-delivery-notes"
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
                        disabled={submitting || loadingOrders || rows.length === 0 || totalToShip <= 0}
                    >
                        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Delivery
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
