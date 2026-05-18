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

interface PartialDeliveryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    order: FactoryCustomerOrder | null;
    onCreated?: () => void;
}

interface RowState {
    orderLineItemId: string;
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

function buildRows(order: FactoryCustomerOrder | null): RowState[] {
    if (!order) return [];
    return (order.line_items ?? []).map(li => {
        const ordered = Number(li.quantity ?? 0);
        const delivered = Number(li.delivered_qty ?? 0);
        const remaining = Math.max(ordered - delivered, 0);
        return {
            orderLineItemId: String(li.id),
            productName: li.product_name,
            productSku: li.product_sku,
            itemCode: li.customer_item_code ?? "",
            ordered,
            delivered,
            remaining,
            // Default each row to its remaining qty (most common case = ship rest)
            inputValue: remaining > 0 ? String(remaining) : "0",
            bundlesValue: "",
        };
    });
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
    const [submitting, setSubmitting] = useState(false);

    // Reset state whenever the dialog opens for a new order
    useEffect(() => {
        if (open) {
            setRows(buildRows(order));
            setTrackingNumber("");
            setCarrier("");
            setEstimatedDate("");
            setNotes("");
            setVatNumber(order?.customer_vat_number ?? "");
        }
    }, [open, order]);

    const totalToShip = useMemo(
        () => rows.reduce((sum, r) => sum + (Number(r.inputValue) || 0), 0),
        [rows]
    );
    const fullyDelivered = rows.length > 0 && rows.every(r => r.remaining === 0);

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
        setRows(prev => prev.map(r => ({ ...r, inputValue: String(r.remaining) })));
    }

    function clearAll() {
        setRows(prev => prev.map(r => ({ ...r, inputValue: "0" })));
    }

    async function handleSubmit() {
        if (!order) return;

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
                toast.error(
                    `${r.productName}: cannot ship ${qty}; only ${r.remaining} remaining`
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
            <DialogContent className="max-w-5xl">
                <DialogHeader>
                    <DialogTitle>New Delivery</DialogTitle>
                    <DialogDescription>
                        {order
                            ? `Ship part or all of order #${order.order_number}. A challan and invoice will be generated for this shipment.`
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
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={r.remaining}
                                                    step="0.001"
                                                    value={r.inputValue}
                                                    disabled={r.remaining === 0}
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
                                                    disabled={r.remaining === 0}
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
                                <Label htmlFor="tracking-number">Transport No</Label>
                                <Input
                                    id="tracking-number"
                                    value={trackingNumber}
                                    onChange={e => setTrackingNumber(e.target.value)}
                                    placeholder="Optional"
                                />
                            </div>
                            <div>
                                <Label htmlFor="carrier">Carrier</Label>
                                <Select value={carrier} onValueChange={setCarrier}>
                                    <SelectTrigger>
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
                                    placeholder={order?.customer_vat_number ? "Defaults from customer" : "Optional"}
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
                        disabled={submitting || fullyDelivered || totalToShip <= 0}
                    >
                        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Delivery
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
