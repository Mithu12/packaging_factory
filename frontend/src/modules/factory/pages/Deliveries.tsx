"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import {
  Truck,
  Download,
  FileText,
  Search,
  Loader2,
  CheckCircle,
  XCircle,
  Package,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { useFormatting } from "@/hooks/useFormatting";
import {
  CustomerOrdersApiService,
  type DeliveryQueryParams,
  type DeliveryStatus,
} from "../services/customer-orders-api";

const STATUS_VARIANTS: Record<
  DeliveryStatus,
  { variant: "default" | "secondary" | "destructive" | "outline"; icon: any }
> = {
  shipped: { variant: "secondary", icon: Truck },
  delivered: { variant: "default", icon: CheckCircle },
  returned: { variant: "outline", icon: RotateCcw },
  cancelled: { variant: "destructive", icon: XCircle },
};

export default function Deliveries() {
  const { formatCurrency, formatDate } = useFormatting();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [busyId, setBusyId] = useState<number | null>(null);

  const queryParams: DeliveryQueryParams = {
    search: searchTerm || undefined,
    status: statusFilter !== "all" ? (statusFilter as DeliveryStatus) : undefined,
    page: currentPage,
    limit: 20,
    sort_by: "delivery_date",
    sort_order: "desc",
  };

  const { data, isLoading } = useQuery({
    queryKey: ["all-deliveries", queryParams],
    queryFn: () => CustomerOrdersApiService.listAllDeliveries(queryParams),
  });

  const download = async (
    deliveryId: number,
    kind: "challan" | "invoice",
    invoiceId?: number,
  ) => {
    if (kind === "invoice" && !invoiceId) {
      toast.error("Invoice not yet generated for this delivery");
      return;
    }
    try {
      setBusyId(deliveryId);
      if (kind === "challan") {
        await CustomerOrdersApiService.downloadDeliveryChallan(deliveryId);
      } else {
        await CustomerOrdersApiService.downloadDeliveryInvoice(deliveryId);
      }
      toast.success(`${kind === "challan" ? "Challan" : "Invoice"} downloaded`);
    } catch (err: any) {
      toast.error(`Failed to download ${kind}: ${err?.message ?? "Unknown error"}`);
    } finally {
      setBusyId(null);
    }
  };

  const getStatusBadge = (status: DeliveryStatus) => {
    const cfg = STATUS_VARIANTS[status] ?? STATUS_VARIANTS.shipped;
    const Icon = cfg.icon;
    return (
      <Badge variant={cfg.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Deliveries</h1>
          <p className="text-muted-foreground">
            All shipments across customers with downloadable challan and invoice
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Search and filter deliveries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by delivery #, order #, invoice #, customer..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9"
                />
              </div>
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="returned">Returned</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Deliveries</CardTitle>
          <CardDescription>
            {data
              ? `Showing ${data.deliveries.length} of ${data.total} deliveries`
              : "Loading..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : data && data.deliveries.length > 0 ? (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Delivery #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Orders</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.deliveries.map((d) => {
                    const orderNumbers =
                      d.touched_orders && d.touched_orders.length > 0
                        ? d.touched_orders.map((t) => t.order_number).join(", ")
                        : d.customer_order_number ?? "—";
                    return (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">
                          {d.delivery_number}
                        </TableCell>
                        <TableCell>{formatDate(d.delivery_date)}</TableCell>
                        <TableCell>{d.factory_customer_name ?? "—"}</TableCell>
                        <TableCell className="max-w-xs truncate" title={orderNumbers}>
                          {orderNumbers}
                        </TableCell>
                        <TableCell>{d.invoice_number ?? "—"}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(d.subtotal)}
                        </TableCell>
                        <TableCell>{getStatusBadge(d.delivery_status)}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => download(d.id, "challan")}
                              disabled={busyId === d.id}
                              title="Download challan"
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              Challan
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => download(d.id, "invoice", d.invoice_id)}
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

              {data.totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Page {data.page} of {data.totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage <= 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage(Math.min(data.totalPages, currentPage + 1))
                      }
                      disabled={currentPage >= data.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No deliveries found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
