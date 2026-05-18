"use client";

import React, { useState } from "react";
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
    DollarSign,
    Loader2,
    Mail,
    Phone,
    RefreshCw,
    Search,
    Users,
} from "lucide-react";
import { useFormatting } from "@/hooks/useFormatting";
import {
    CustomerPaymentReminderListResponse,
    CustomerPaymentReminderRow,
    FactoryReportsApi,
} from "@/modules/factory/services/factory-reports-api";
import { PaymentReminderDialog } from "@/modules/factory/components/reports/PaymentReminderDialog";

export default function CustomerPaymentRemindersPage() {
    const { formatCurrency, formatNumber } = useFormatting();

    const [searchInput, setSearchInput] = useState("");
    const [appliedSearch, setAppliedSearch] = useState("");
    const [selectedCustomer, setSelectedCustomer] =
        useState<CustomerPaymentReminderRow | null>(null);

    const { data, isFetching, refetch, isError, error } =
        useQuery<CustomerPaymentReminderListResponse>({
            queryKey: ["customer-payment-reminders", appliedSearch],
            queryFn: () =>
                FactoryReportsApi.getCustomerPaymentReminders({
                    search: appliedSearch || undefined,
                }),
        });

    const applySearch = () => setAppliedSearch(searchInput.trim());

    const rows = data?.rows ?? [];
    const summary = data?.summary;

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Customer Payment Reminders</h1>
                    <p className="text-muted-foreground text-sm">
                        Customers with outstanding balances and their aging breakdown. Open a
                        customer to print a payment reminder.
                    </p>
                </div>
                <Button onClick={() => refetch()} disabled={isFetching} variant="outline">
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
                        Search by customer name, company, email, or phone.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-2">
                        <div className="relative max-w-md flex-1">
                            <Search className="text-muted-foreground absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2" />
                            <Input
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && applySearch()}
                                placeholder="Search by name, company, email, phone"
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
                    title="Customers with dues"
                    value={formatNumber(summary?.customers_count ?? 0)}
                    icon={<Users className="h-4 w-4" />}
                />
                <SummaryCard
                    title="Total outstanding"
                    value={formatCurrency(summary?.total_outstanding ?? 0)}
                    icon={<DollarSign className="h-4 w-4" />}
                />
                <SummaryCard
                    title="Over 60 days"
                    value={formatCurrency(summary?.total_over_60 ?? 0)}
                    icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
                    accent={
                        summary && summary.total_over_60 > 0 ? "warning" : undefined
                    }
                />
                <SummaryCard
                    title="Over 90 days"
                    value={formatCurrency(summary?.total_over_90 ?? 0)}
                    icon={<AlertTriangle className="text-destructive h-4 w-4" />}
                    accent={
                        summary && summary.total_over_90 > 0 ? "destructive" : undefined
                    }
                />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Customers</CardTitle>
                    <CardDescription>
                        Aging is computed from sales-invoice due dates. Click a row to open
                        the printable reminder.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isError && (
                        <div className="text-destructive py-10 text-center text-sm">
                            {(error as Error)?.message || "Failed to load report."}
                        </div>
                    )}
                    {!isError && (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Contact</TableHead>
                                        <TableHead className="text-right">Open Invoices</TableHead>
                                        <TableHead className="text-right">Not Yet Due</TableHead>
                                        <TableHead className="text-right">0–30</TableHead>
                                        <TableHead className="text-right">31–60</TableHead>
                                        <TableHead className="text-right">61–90</TableHead>
                                        <TableHead className="text-right">90+</TableHead>
                                        <TableHead className="text-right">Total Outstanding</TableHead>
                                        <TableHead className="text-right">Max Overdue</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isFetching && rows.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={11} className="py-10 text-center">
                                                <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                                            </TableCell>
                                        </TableRow>
                                    ) : rows.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={11}
                                                className="text-muted-foreground py-10 text-center text-sm"
                                            >
                                                No customers with outstanding balances.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        rows.map((row) => (
                                            <TableRow key={row.id}>
                                                <TableCell>
                                                    <div className="font-medium">{row.name}</div>
                                                    {row.company && (
                                                        <div className="text-muted-foreground text-xs">
                                                            {row.company}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {row.email && (
                                                        <div className="text-muted-foreground flex items-center gap-1 text-xs">
                                                            <Mail className="h-3 w-3" />
                                                            {row.email}
                                                        </div>
                                                    )}
                                                    {row.phone && (
                                                        <div className="text-muted-foreground flex items-center gap-1 text-xs">
                                                            <Phone className="h-3 w-3" />
                                                            {row.phone}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-right">
                                                    {formatNumber(row.open_invoice_count)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {formatCurrency(row.not_yet_due, row.currency)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {formatCurrency(row.bucket_0_30, row.currency)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {formatCurrency(row.bucket_31_60, row.currency)}
                                                </TableCell>
                                                <TableCell className="text-right text-amber-600">
                                                    {formatCurrency(row.bucket_61_90, row.currency)}
                                                </TableCell>
                                                <TableCell className="text-destructive text-right">
                                                    {formatCurrency(row.bucket_90_plus, row.currency)}
                                                </TableCell>
                                                <TableCell className="text-right font-semibold">
                                                    {formatCurrency(
                                                        row.total_outstanding_amount,
                                                        row.currency
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {row.max_days_overdue > 30 ? (
                                                        <Badge variant="destructive">
                                                            {row.max_days_overdue}d
                                                        </Badge>
                                                    ) : row.max_days_overdue > 0 ? (
                                                        <Badge variant="secondary">
                                                            {row.max_days_overdue}d
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-muted-foreground">—</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => setSelectedCustomer(row)}
                                                    >
                                                        Reminder
                                                    </Button>
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

            <PaymentReminderDialog
                customerId={selectedCustomer?.id ?? null}
                onClose={() => setSelectedCustomer(null)}
            />
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
    accent?: "destructive" | "warning";
}) {
    return (
        <Card>
            <CardContent className="flex items-center justify-between p-4">
                <div>
                    <p className="text-muted-foreground text-xs">{title}</p>
                    <p
                        className={
                            "text-2xl font-semibold " +
                            (accent === "destructive"
                                ? "text-destructive"
                                : accent === "warning"
                                  ? "text-amber-600"
                                  : "")
                        }
                    >
                        {value}
                    </p>
                </div>
                <div className="bg-muted rounded-full p-2">{icon}</div>
            </CardContent>
        </Card>
    );
}
