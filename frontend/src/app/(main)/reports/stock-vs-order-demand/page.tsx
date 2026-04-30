"use client";

import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    AlertTriangle,
    Loader2,
    Package,
    RefreshCw,
    Search,
    TrendingDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFormatting } from "@/hooks/useFormatting";
import {
    ALL_ORDER_STATUSES,
    DEFAULT_OPEN_ORDER_STATUSES,
    FactoryCustomerOrderStatus,
    FactoryReportsApi,
    StockVsOrderDemandResponse,
} from "@/modules/factory/services/factory-reports-api";

const STATUS_LABELS: Record<FactoryCustomerOrderStatus, string> = {
    draft: "Draft",
    pending: "Pending",
    quoted: "Quoted",
    approved: "Approved",
    rejected: "Rejected",
    in_production: "In Production",
    completed: "Completed",
    partially_shipped: "Partially Shipped",
    shipped: "Shipped",
    cancelled: "Cancelled",
};

export default function StockVsOrderDemandPage() {
    const { toast } = useToast();
    const { formatNumber } = useFormatting();

    const [selectedStatuses, setSelectedStatuses] = useState<FactoryCustomerOrderStatus[]>(
        DEFAULT_OPEN_ORDER_STATUSES
    );
    const [searchInput, setSearchInput] = useState("");
    const [appliedSearch, setAppliedSearch] = useState("");

    const sortedStatuses = useMemo(
        () => [...selectedStatuses].sort(),
        [selectedStatuses]
    );

    const queryEnabled = sortedStatuses.length > 0;

    const { data, isFetching, refetch, isError, error } = useQuery<StockVsOrderDemandResponse>({
        queryKey: ["stock-vs-order-demand", sortedStatuses, appliedSearch],
        queryFn: () =>
            FactoryReportsApi.getStockVsOrderDemand({
                statuses: sortedStatuses,
                search: appliedSearch || undefined,
            }),
        enabled: queryEnabled,
    });

    const toggleStatus = (status: FactoryCustomerOrderStatus) => {
        setSelectedStatuses((prev) =>
            prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
        );
    };

    const applySearch = () => setAppliedSearch(searchInput.trim());

    const handleRefresh = () => {
        if (!queryEnabled) {
            toast({
                title: "Select at least one status",
                description: "Choose one or more order statuses to run the report.",
                variant: "destructive",
            });
            return;
        }
        refetch();
    };

    const rows = data?.rows ?? [];
    const summary = data?.summary;

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Stock vs Order Demand Report</h1>
                    <p className="text-muted-foreground text-sm">
                        Compare on-hand stock for finished goods against quantities committed to
                        customer orders, filtered by order status.
                    </p>
                </div>
                <Button onClick={handleRefresh} disabled={isFetching} variant="outline">
                    {isFetching ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Refresh
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Filters</CardTitle>
                    <CardDescription>
                        Pick the order statuses to count toward demand. Default selection covers
                        open orders that still consume stock.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-3">
                        {ALL_ORDER_STATUSES.map((status) => {
                            const checked = selectedStatuses.includes(status);
                            return (
                                <label
                                    key={status}
                                    className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
                                >
                                    <Checkbox
                                        checked={checked}
                                        onCheckedChange={() => toggleStatus(status)}
                                    />
                                    {STATUS_LABELS[status]}
                                </label>
                            );
                        })}
                    </div>
                    <div className="flex gap-2">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && applySearch()}
                                placeholder="Search by name, SKU, or product code"
                                className="pl-8"
                            />
                        </div>
                        <Button onClick={applySearch} variant="secondary">
                            Apply
                        </Button>
                        {appliedSearch && (
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    setSearchInput("");
                                    setAppliedSearch("");
                                }}
                            >
                                Clear
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-4">
                <SummaryCard
                    title="Products"
                    value={formatNumber(summary?.total_products ?? 0)}
                    icon={<Package className="h-4 w-4" />}
                />
                <SummaryCard
                    title="Short on stock"
                    value={formatNumber(summary?.products_short ?? 0)}
                    icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
                    accent={summary && summary.products_short > 0 ? "destructive" : undefined}
                />
                <SummaryCard
                    title="Total ordered qty"
                    value={formatNumber(summary?.total_ordered_qty ?? 0)}
                    icon={<TrendingDown className="h-4 w-4" />}
                />
                <SummaryCard
                    title="Total available stock"
                    value={formatNumber(summary?.total_available_stock ?? 0)}
                    icon={<Package className="h-4 w-4" />}
                />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Per-product breakdown</CardTitle>
                    <CardDescription>
                        Net position = current stock − ordered qty in selected statuses. Negative
                        values indicate a shortfall.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {!queryEnabled && (
                        <div className="py-10 text-center text-sm text-muted-foreground">
                            Select at least one order status to run the report.
                        </div>
                    )}
                    {isError && (
                        <div className="py-10 text-center text-sm text-destructive">
                            {(error as Error)?.message || "Failed to load report."}
                        </div>
                    )}
                    {queryEnabled && !isError && (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>SKU</TableHead>
                                        <TableHead>Product Code</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>UoM</TableHead>
                                        <TableHead className="text-right">Current Stock</TableHead>
                                        <TableHead className="text-right">Reserved</TableHead>
                                        <TableHead className="text-right">Available</TableHead>
                                        <TableHead className="text-right">Ordered Qty</TableHead>
                                        <TableHead className="text-right">Open Orders</TableHead>
                                        <TableHead className="text-right">Net Position</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isFetching && rows.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={10} className="py-10 text-center">
                                                <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                                            </TableCell>
                                        </TableRow>
                                    ) : rows.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={10}
                                                className="py-10 text-center text-sm text-muted-foreground"
                                            >
                                                No Ready Goods products match the current filters.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        rows.map((row) => (
                                            <TableRow key={row.product_id}>
                                                <TableCell className="font-mono text-xs">
                                                    {row.sku}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs">
                                                    {row.product_code ?? "—"}
                                                </TableCell>
                                                <TableCell>{row.name}</TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {row.unit_of_measure ?? "—"}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {formatNumber(row.current_stock)}
                                                </TableCell>
                                                <TableCell className="text-right text-muted-foreground">
                                                    {formatNumber(row.reserved_stock)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {formatNumber(row.available_stock)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {formatNumber(row.ordered_qty)}
                                                </TableCell>
                                                <TableCell className="text-right text-muted-foreground">
                                                    {formatNumber(row.order_count)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {row.net_position < 0 ? (
                                                        <Badge variant="destructive">
                                                            {formatNumber(row.net_position)}
                                                        </Badge>
                                                    ) : (
                                                        <span>{formatNumber(row.net_position)}</span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function SummaryCard({
    title,
    value,
    icon,
    accent,
}: {
    title: string;
    value: string;
    icon: React.ReactNode;
    accent?: "destructive";
}) {
    return (
        <Card>
            <CardContent className="flex items-center justify-between p-4">
                <div>
                    <p className="text-xs text-muted-foreground">{title}</p>
                    <p
                        className={
                            "text-2xl font-semibold " +
                            (accent === "destructive" ? "text-destructive" : "")
                        }
                    >
                        {value}
                    </p>
                </div>
                <div className="rounded-full bg-muted p-2">{icon}</div>
            </CardContent>
        </Card>
    );
}
