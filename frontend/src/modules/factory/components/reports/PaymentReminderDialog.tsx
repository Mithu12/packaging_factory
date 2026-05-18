"use client";

import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Loader2, Printer } from "lucide-react";
import { useFormatting } from "@/hooks/useFormatting";
import {
    CustomerPaymentReminderDetail,
    FactoryReportsApi,
} from "@/modules/factory/services/factory-reports-api";
import { SettingsApi } from "@/services/settings-api";
import { CompanySettings } from "@/services/settings-types";
import { getImagePath } from "@/utils/image.utils";

interface Props {
    customerId: string | null;
    onClose: () => void;
}

const PRINT_ROOT_ID = "payment-reminder-print-root";

export function PaymentReminderDialog({ customerId, onClose }: Props) {
    const { formatCurrency, formatDate } = useFormatting();
    const open = !!customerId;

    const { data, isLoading, isError, error } = useQuery<CustomerPaymentReminderDetail>({
        queryKey: ["customer-payment-reminder-detail", customerId],
        queryFn: () => FactoryReportsApi.getCustomerPaymentReminderDetail(customerId as string),
        enabled: open,
    });

    const { data: company } = useQuery<CompanySettings>({
        queryKey: ["company-settings"],
        queryFn: () => SettingsApi.getCompanySettings(),
        staleTime: 5 * 60 * 1000,
    });

    const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

    const handlePrint = () => {
        window.print();
    };

    const addressLines = useMemo(() => {
        const a = data?.customer.address || {};
        const lines: string[] = [];
        const street = (a as any).street || (a as any).billing_line;
        if (street) lines.push(String(street));
        const cityLine = [
            (a as any).city,
            (a as any).state,
            (a as any).postal_code,
        ]
            .filter(Boolean)
            .join(", ");
        if (cityLine) lines.push(cityLine);
        if ((a as any).country) lines.push(String((a as any).country));
        return lines;
    }, [data?.customer.address]);

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="payment-reminder-dialog-content max-h-[90vh] max-w-3xl overflow-y-auto">
                <style>{`
                    @media print {
                        /* Remove everything from layout except our DialogContent (which
                           Radix portals directly into body) and any wrapper that contains
                           it (older Radix versions wrap the portal children in a div). */
                        body > *:not(.payment-reminder-dialog-content):not(:has(.payment-reminder-dialog-content)) {
                            display: none !important;
                        }

                        /* Inside the surviving portal subtree, hide the Radix overlay
                           (it's a sibling of DialogContent — same data-state attribute). */
                        body [data-state="open"]:not(.payment-reminder-dialog-content) {
                            display: none !important;
                        }

                        /* Reset DialogContent so it flows from the top of the page. */
                        .payment-reminder-dialog-content {
                            position: static !important;
                            transform: none !important;
                            inset: auto !important;
                            top: auto !important;
                            left: auto !important;
                            max-width: none !important;
                            max-height: none !important;
                            width: auto !important;
                            height: auto !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            border: 0 !important;
                            box-shadow: none !important;
                            overflow: visible !important;
                            background: white !important;
                            animation: none !important;
                            transition: none !important;
                            display: block !important;
                        }

                        /* Hide DialogContent's chrome children (action bar, X close
                           button), keep only the print root. */
                        .payment-reminder-dialog-content > *:not(#${PRINT_ROOT_ID}) {
                            display: none !important;
                        }

                        #${PRINT_ROOT_ID} {
                            background: white !important;
                            color: black !important;
                            padding: 0 !important;
                        }

                        @page { margin: 16mm; }
                    }
                `}</style>

                {isLoading && (
                    <div className="py-16 text-center">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                    </div>
                )}

                {isError && (
                    <div className="text-destructive py-10 text-center text-sm">
                        {(error as Error)?.message || "Failed to load reminder."}
                    </div>
                )}

                {data && (
                    <>
                        <div className="mb-3 flex items-center justify-end gap-2 print:hidden">
                            <Button variant="outline" size="sm" onClick={onClose}>
                                Close
                            </Button>
                            <Button size="sm" onClick={handlePrint}>
                                <Printer className="mr-2 h-4 w-4" />
                                Print
                            </Button>
                        </div>

                        <div id={PRINT_ROOT_ID} className="space-y-6 text-sm">
                            <header className="flex items-start justify-between gap-4 border-b pb-4">
                                <div className="flex items-start gap-3">
                                    {company?.invoice_logo && (
                                        <img
                                            src={getImagePath(company.invoice_logo)}
                                            alt={company.company_name || "Company"}
                                            className="h-14 w-auto object-contain"
                                        />
                                    )}
                                    <div>
                                        <div className="text-lg font-semibold">
                                            {company?.company_name || ""}
                                        </div>
                                        {company?.company_address && (
                                            <div className="text-muted-foreground whitespace-pre-line text-xs">
                                                {company.company_address}
                                            </div>
                                        )}
                                        <div className="text-muted-foreground text-xs">
                                            {[company?.phone, company?.company_email]
                                                .filter(Boolean)
                                                .join(" · ")}
                                        </div>
                                        {company?.tax_id && (
                                            <div className="text-muted-foreground text-xs">
                                                Tax ID: {company.tax_id}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xl font-semibold uppercase tracking-wide">
                                        Payment Reminder
                                    </div>
                                    <div className="text-muted-foreground text-xs">
                                        Date: {formatDate(today)}
                                    </div>
                                </div>
                            </header>

                            <section className="grid grid-cols-2 gap-6">
                                <div>
                                    <div className="text-muted-foreground mb-1 text-xs uppercase tracking-wide">
                                        Bill To
                                    </div>
                                    <div className="font-medium">{data.customer.name}</div>
                                    {data.customer.company && (
                                        <div>{data.customer.company}</div>
                                    )}
                                    {addressLines.map((l, i) => (
                                        <div key={i} className="text-muted-foreground">
                                            {l}
                                        </div>
                                    ))}
                                    {data.customer.email && (
                                        <div className="text-muted-foreground">
                                            {data.customer.email}
                                        </div>
                                    )}
                                    {data.customer.phone && (
                                        <div className="text-muted-foreground">
                                            {data.customer.phone}
                                        </div>
                                    )}
                                    {data.customer.vat_number && (
                                        <div className="text-muted-foreground">
                                            VAT: {data.customer.vat_number}
                                        </div>
                                    )}
                                </div>
                                <div className="text-right">
                                    <div className="text-muted-foreground text-xs uppercase tracking-wide">
                                        Total Amount Due
                                    </div>
                                    <div className="text-2xl font-bold">
                                        {formatCurrency(
                                            data.aging.total_outstanding,
                                            data.customer.currency
                                        )}
                                    </div>
                                    {data.aging.max_days_overdue > 0 && (
                                        <div className="text-destructive text-xs">
                                            Most overdue invoice: {data.aging.max_days_overdue} days
                                        </div>
                                    )}
                                    {data.latest_payment_date && (
                                        <div className="text-muted-foreground text-xs">
                                            Last payment received: {formatDate(data.latest_payment_date)}
                                        </div>
                                    )}
                                </div>
                            </section>

                            <section>
                                <p className="text-sm">
                                    Dear {data.customer.name}, our records show the following
                                    invoices remain unpaid. We would appreciate settlement at your
                                    earliest convenience. If payment has already been remitted,
                                    please disregard this notice.
                                </p>
                            </section>

                            <section>
                                <div className="text-muted-foreground mb-2 text-xs uppercase tracking-wide">
                                    Outstanding Invoices
                                </div>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Invoice #</TableHead>
                                            <TableHead>Invoice Date</TableHead>
                                            <TableHead>Due Date</TableHead>
                                            <TableHead className="text-right">Days Overdue</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                            <TableHead className="text-right">Paid</TableHead>
                                            <TableHead className="text-right">Balance</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.invoices.length === 0 ? (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={7}
                                                    className="text-muted-foreground py-6 text-center text-xs"
                                                >
                                                    No invoices currently outstanding.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            data.invoices.map((inv) => (
                                                <TableRow key={inv.invoice_id}>
                                                    <TableCell className="font-mono text-xs">
                                                        {inv.invoice_number}
                                                    </TableCell>
                                                    <TableCell>{formatDate(inv.invoice_date)}</TableCell>
                                                    <TableCell>{formatDate(inv.due_date)}</TableCell>
                                                    <TableCell className="text-right">
                                                        {inv.days_overdue > 0
                                                            ? `${inv.days_overdue}d`
                                                            : "—"}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {formatCurrency(
                                                            inv.total_amount,
                                                            data.customer.currency
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {formatCurrency(
                                                            inv.paid_amount,
                                                            data.customer.currency
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right font-semibold">
                                                        {formatCurrency(
                                                            inv.outstanding_amount,
                                                            data.customer.currency
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </section>

                            <section>
                                <div className="text-muted-foreground mb-2 text-xs uppercase tracking-wide">
                                    Aging Summary
                                </div>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="text-right">Not Yet Due</TableHead>
                                            <TableHead className="text-right">0–30</TableHead>
                                            <TableHead className="text-right">31–60</TableHead>
                                            <TableHead className="text-right">61–90</TableHead>
                                            <TableHead className="text-right">90+</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow>
                                            <TableCell className="text-right">
                                                {formatCurrency(
                                                    data.aging.not_yet_due,
                                                    data.customer.currency
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {formatCurrency(
                                                    data.aging.bucket_0_30,
                                                    data.customer.currency
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {formatCurrency(
                                                    data.aging.bucket_31_60,
                                                    data.customer.currency
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right text-amber-600">
                                                {formatCurrency(
                                                    data.aging.bucket_61_90,
                                                    data.customer.currency
                                                )}
                                            </TableCell>
                                            <TableCell className="text-destructive text-right">
                                                {formatCurrency(
                                                    data.aging.bucket_90_plus,
                                                    data.customer.currency
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right font-semibold">
                                                {formatCurrency(
                                                    data.aging.total_outstanding,
                                                    data.customer.currency
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </section>

                            {(company?.bank_name ||
                                company?.account_number ||
                                data.customer.payment_terms) && (
                                <section className="border-t pt-4">
                                    <div className="text-muted-foreground mb-2 text-xs uppercase tracking-wide">
                                        Payment Instructions
                                    </div>
                                    {data.customer.payment_terms && (
                                        <div>
                                            <span className="text-muted-foreground">Terms: </span>
                                            {data.customer.payment_terms}
                                        </div>
                                    )}
                                    {company?.bank_name && (
                                        <div>
                                            <span className="text-muted-foreground">Bank: </span>
                                            {company.bank_name}
                                            {company.bank_branch ? `, ${company.bank_branch}` : ""}
                                        </div>
                                    )}
                                    {company?.account_name && (
                                        <div>
                                            <span className="text-muted-foreground">Account Name: </span>
                                            {company.account_name}
                                        </div>
                                    )}
                                    {company?.account_number && (
                                        <div>
                                            <span className="text-muted-foreground">Account #: </span>
                                            {company.account_number}
                                        </div>
                                    )}
                                    {company?.routing_number && (
                                        <div>
                                            <span className="text-muted-foreground">Routing #: </span>
                                            {company.routing_number}
                                        </div>
                                    )}
                                </section>
                            )}

                            <footer className="text-muted-foreground border-t pt-4 text-xs">
                                Thank you for your business. For any payment-related questions,
                                please contact us at{" "}
                                {company?.company_email || "your account manager"}.
                            </footer>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
