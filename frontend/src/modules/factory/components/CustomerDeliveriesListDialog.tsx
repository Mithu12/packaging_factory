"use client";

import { useEffect, useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/sonner";

import {
    CustomerOrdersApiService,
    type Delivery,
    type FactoryCustomer,
} from "../services/customer-orders-api";

interface CustomerDeliveriesListDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    customer: FactoryCustomer | null;
}

export default function CustomerDeliveriesListDialog({
    open,
    onOpenChange,
    customer,
}: CustomerDeliveriesListDialogProps) {
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);
    const [loading, setLoading] = useState(false);
    const [busyId, setBusyId] = useState<number | null>(null);

    useEffect(() => {
        if (!open || !customer) {
            setDeliveries([]);
            return;
        }
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const rows = await CustomerOrdersApiService.listDeliveriesByCustomer(customer.id);
                if (!cancelled) setDeliveries(rows ?? []);
            } catch (err: any) {
                if (!cancelled) {
                    toast.error(`Failed to load deliveries: ${err?.message ?? "Unknown error"}`);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [open, customer]);

    const download = async (
        deliveryId: number,
        kind: "challan" | "invoice",
        addressChoice?: "1" | "2",
    ) => {
        try {
            setBusyId(deliveryId);
            if (kind === "challan") {
                await CustomerOrdersApiService.downloadDeliveryChallan(deliveryId, addressChoice);
            } else {
                await CustomerOrdersApiService.downloadDeliveryInvoice(deliveryId);
            }
        } catch (err: any) {
            toast.error(`Failed to download ${kind}: ${err?.message ?? "Unknown error"}`);
        } finally {
            setBusyId(null);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl">
                <DialogHeader>
                    <DialogTitle>
                        Deliveries{customer ? ` — ${customer.name}` : ""}
                    </DialogTitle>
                    <DialogDescription>
                        All challans and invoices for this customer, including multi-order shipments.
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : deliveries.length === 0 ? (
                    <p className="text-center text-muted-foreground py-12">
                        No deliveries found for this customer.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Delivery #</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Orders</TableHead>
                                    <TableHead>Invoice</TableHead>
                                    <TableHead className="text-right">Subtotal</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {deliveries.map((d) => {
                                    const orderNumbers =
                                        d.touched_orders && d.touched_orders.length > 0
                                            ? d.touched_orders.map((t) => t.order_number).join(", ")
                                            : d.customer_order_number ?? "—";
                                    return (
                                        <TableRow key={d.id}>
                                            <TableCell className="font-medium">{d.delivery_number}</TableCell>
                                            <TableCell>{d.delivery_date}</TableCell>
                                            <TableCell className="max-w-xs truncate" title={orderNumbers}>
                                                {orderNumbers}
                                            </TableCell>
                                            <TableCell>{d.invoice_number ?? "—"}</TableCell>
                                            <TableCell className="text-right">
                                                {d.subtotal.toLocaleString(undefined, {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{d.delivery_status}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex justify-end gap-2">
                                                    {d.delivery_address_2 ? (
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="outline" size="sm" disabled={busyId === d.id} title="Download challan — choose delivery address">
                                                                    <FileText className="h-4 w-4 mr-1" />
                                                                    Challan
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="max-w-xs">
                                                                <DropdownMenuItem onClick={() => download(d.id, "challan", "1")}>
                                                                    <div className="flex flex-col">
                                                                        <span className="font-medium">Delivery Address 1</span>
                                                                        <span className="text-xs text-muted-foreground truncate">{d.delivery_address_1 || "—"}</span>
                                                                    </div>
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => download(d.id, "challan", "2")}>
                                                                    <div className="flex flex-col">
                                                                        <span className="font-medium">Delivery Address 2</span>
                                                                        <span className="text-xs text-muted-foreground truncate">{d.delivery_address_2}</span>
                                                                    </div>
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    ) : (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => download(d.id, "challan")}
                                                            disabled={busyId === d.id}
                                                            title="Download challan"
                                                        >
                                                            <FileText className="h-4 w-4 mr-1" />
                                                            Challan
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => download(d.id, "invoice")}
                                                        disabled={busyId === d.id || !d.invoice_id}
                                                        title={
                                                            d.invoice_id
                                                                ? "Download invoice"
                                                                : "Invoice not yet generated"
                                                        }
                                                    >
                                                        <Download className="h-4 w-4 mr-1" />
                                                        Invoice
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
