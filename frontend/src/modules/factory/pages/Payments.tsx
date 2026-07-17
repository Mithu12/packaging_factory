'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
    Plus,
    Search,
    Download,
    Wallet,
    Calendar,
    History,
    User,
    FileText,
    DollarSign,
    CreditCard,
} from 'lucide-react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import CustomerOrdersApiService, {
    FactoryCustomer,
    FactoryCustomerPayment,
} from '../services/customer-orders-api';
import { SalesInvoicesApi, SalesInvoice } from '../services/salesInvoices-api';
import { useFormatting } from '@/hooks/useFormatting';

interface InvoiceSummary {
    invoiceId: number;
    invoiceNumber: string;
    invoiceDate: string;
    subTotal: number;
    taxAmount: number;
    totalAmount: number;
    paidAmount: number;
    outstandingAmount: number;
    returnedAmount: number;
    status: string;
    orderNumber?: string;
    deliveryNumber?: string;
}

const Payments: React.FC = () => {
    const { formatCurrency, formatDate } = useFormatting();
    // State
    const [customers, setCustomers] = useState<FactoryCustomer[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('all');
    const [selectedCustomer, setSelectedCustomer] = useState<FactoryCustomer | null>(null);
    const [paymentHistory, setPaymentHistory] = useState<FactoryCustomerPayment[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Record-payment dialog state
    const [showRecordDialog, setShowRecordDialog] = useState(false);
    const [dialogCustomerId, setDialogCustomerId] = useState<string>('');
    const [outstandingInvoices, setOutstandingInvoices] = useState<SalesInvoice[]>([]);
    const [dialogInvoiceId, setDialogInvoiceId] = useState<string>('');
    const [dialogAmount, setDialogAmount] = useState<string>('');
    const [dialogMethod, setDialogMethod] = useState<string>('cash');
    const [dialogDate, setDialogDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [dialogReference, setDialogReference] = useState<string>('');
    const [dialogBankName, setDialogBankName] = useState<string>('');
    const [dialogAit, setDialogAit] = useState<string>('');
    const [dialogChequeDate, setDialogChequeDate] = useState<string>('');
    const [dialogNotes, setDialogNotes] = useState<string>('');
    const [dialogSubmitting, setDialogSubmitting] = useState(false);

    const methodNeedsBank = dialogMethod === 'cheque' || dialogMethod === 'bank_transfer';
    const methodIsCheque = dialogMethod === 'cheque';

    const dialogSelectedInvoice = useMemo(
        () => outstandingInvoices.find(i => i.id.toString() === dialogInvoiceId) || null,
        [outstandingInvoices, dialogInvoiceId]
    );

    // Fetch initial data
    useEffect(() => {
        const fetchCustomers = async () => {
            try {
                const data = await CustomerOrdersApiService.getAllCustomers();
                setCustomers(data);
            } catch (error) {
                console.error('Error fetching customers:', error);
                toast.error('Failed to load customers');
            } finally {
                setLoading(false);
            }
        };

        fetchCustomers();
    }, []);

    // Fetch customer details and payments when selectedCustomerId changes
    useEffect(() => {
        const fetchCustomerData = async () => {
            if (selectedCustomerId === 'all') {
                setSelectedCustomer(null);
                fetchGlobalHistory();
                return;
            }

            setLoading(true);
            try {
                const customer = await CustomerOrdersApiService.getCustomerById(selectedCustomerId);
                setSelectedCustomer(customer);

                const historyResponse = await CustomerOrdersApiService.getAllPayments({
                    customer_id: selectedCustomerId,
                    limit: 50,
                });
                setPaymentHistory(historyResponse.payments);
            } catch (error) {
                console.error('Error fetching customer data:', error);
                toast.error('Failed to load customer details');
            } finally {
                setLoading(false);
            }
        };

        fetchCustomerData();
    }, [selectedCustomerId]);

    const fetchGlobalHistory = async () => {
        setLoading(true);
        try {
            const response = await CustomerOrdersApiService.getAllPayments({ limit: 50 });
            setPaymentHistory(response.payments);
        } catch (error) {
            console.error('Error fetching global history:', error);
        } finally {
            setLoading(false);
        }
    };

    const customerLabel = (c: FactoryCustomer | null | undefined) =>
        c ? (c.company?.trim() || c.name) : '';

    const openRecordDialog = async () => {
        const initialCustomerId = selectedCustomerId !== 'all' ? selectedCustomerId : '';
        setDialogCustomerId(initialCustomerId);
        setDialogInvoiceId('');
        setOutstandingInvoices([]);
        setDialogAmount('');
        setDialogMethod('cash');
        setDialogDate(new Date().toISOString().split('T')[0]);
        setDialogReference('');
        setDialogBankName('');
        setDialogAit('');
        setDialogChequeDate('');
        setDialogNotes('');
        setShowRecordDialog(true);
        if (initialCustomerId) {
            await loadOutstandingInvoices(initialCustomerId);
        }
    };

    const loadOutstandingInvoices = async (customerId: string) => {
        if (!customerId) {
            setOutstandingInvoices([]);
            return;
        }
        try {
            const response = await SalesInvoicesApi.getSalesInvoices({
                factory_customer_id: Number(customerId),
                limit: 100,
            });
            // Eligible = money still owed AND not fully covered by approved returns.
            // (A returned challan's invoice nets to zero and must not be payable.)
            const eligible = response.invoices.filter(
                i => Number(i.outstanding_amount || 0) - Number(i.returned_amount || 0) > 0.005
            );
            setOutstandingInvoices(eligible);
        } catch (error) {
            console.error('Error loading customer invoices:', error);
            toast.error('Failed to load invoices for this customer');
            setOutstandingInvoices([]);
        }
    };

    const handleDialogCustomerChange = async (customerId: string) => {
        setDialogCustomerId(customerId);
        setDialogInvoiceId('');
        setDialogAmount('');
        await loadOutstandingInvoices(customerId);
    };

    // Net outstanding after approved returns — the most that can be settled.
    const netOutstanding = (inv: SalesInvoice | null | undefined) =>
        Number(inv?.outstanding_amount || 0) - Number(inv?.returned_amount || 0);

    const handleDialogInvoiceChange = (invoiceId: string) => {
        setDialogInvoiceId(invoiceId);
        const invoice = outstandingInvoices.find(i => i.id.toString() === invoiceId);
        if (invoice) {
            setDialogAmount(String(Math.max(0, netOutstanding(invoice)).toFixed(2)));
        }
    };

    const submitRecordPayment = async () => {
        if (!dialogInvoiceId) {
            toast.error('Select an invoice to record payment against');
            return;
        }
        const amount = Number(dialogAmount);
        if (!amount || amount <= 0) {
            toast.error('Enter a valid payment amount');
            return;
        }
        const ait = Number(dialogAit) || 0;
        if (ait < 0) {
            toast.error('AIT cannot be negative');
            return;
        }
        const invoice = dialogSelectedInvoice;
        const outstanding = netOutstanding(invoice);
        if (invoice && amount + ait > outstanding + 0.005) {
            toast.error(`Payment + AIT exceeds outstanding (${outstanding.toFixed(2)})`);
            return;
        }
        try {
            setDialogSubmitting(true);
            await SalesInvoicesApi.recordPayment(Number(dialogInvoiceId), {
                payment_amount: amount,
                payment_method: dialogMethod,
                payment_date: dialogDate,
                reference_number: dialogReference.trim() || undefined,
                notes: dialogNotes.trim() || undefined,
                bank_name: methodNeedsBank ? (dialogBankName.trim() || undefined) : undefined,
                ait_amount: ait > 0 ? ait : undefined,
                cheque_date: methodIsCheque ? (dialogChequeDate || undefined) : undefined,
            });
            toast.success('Payment recorded');
            setShowRecordDialog(false);
            // Refresh visible history
            if (selectedCustomerId === 'all') {
                fetchGlobalHistory();
            } else {
                const historyResponse = await CustomerOrdersApiService.getAllPayments({
                    customer_id: selectedCustomerId,
                    limit: 50,
                });
                setPaymentHistory(historyResponse.payments);
            }
        } catch (error) {
            console.error('Failed to record payment:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to record payment');
        } finally {
            setDialogSubmitting(false);
        }
    };

    // Export the currently visible payment history as a CSV
    const handleExport = () => {
        const rowsToExport = paymentHistory.filter(p =>
            !searchQuery || p.payment_reference?.toLowerCase().includes(searchQuery.toLowerCase())
        );
        if (rowsToExport.length === 0) {
            toast.error('Nothing to export');
            return;
        }
        const headers = [
            'Date',
            'Company Name',
            'Invoice No',
            'Amount',
            'Method',
            'Voucher',
            'Bank',
            'Reference',
            'Notes',
        ];
        const escape = (v: unknown) => {
            const s = v == null ? '' : String(v);
            return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const lines = rowsToExport.map(p => [
            new Date(p.payment_date).toISOString().slice(0, 10),
            p.company_name || p.customer_name || '',
            p.invoice_number || (p.order_number ? `#${p.order_number}` : ''),
            Number(p.payment_amount || 0).toFixed(2),
            p.payment_method.replace(/_/g, ' '),
            p.voucher_no || '',
            p.bank_name || '',
            p.payment_reference || '',
            p.notes || '',
        ].map(escape).join(','));
        const csv = [headers.map(escape).join(','), ...lines].join('\r\n');
        const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const stamp = new Date().toISOString().slice(0, 10);
        const scope = selectedCustomer
            ? (selectedCustomer.company?.trim() || selectedCustomer.name).replace(/[^a-z0-9]+/gi, '_')
            : 'all-customers';
        link.href = url;
        link.download = `payments-${scope}-${stamp}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return <Badge className="bg-green-100 text-green-800 border-green-200">Completed</Badge>;
            case 'shipped':
                return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Shipped</Badge>;
            case 'in_production':
                return <Badge className="bg-orange-100 text-orange-800 border-orange-200">In Production</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    // Transform invoices for detailed display
    const invoiceSummaries = useMemo((): InvoiceSummary[] => {
        return outstandingInvoices.map(inv => ({
            invoiceId: inv.id,
            invoiceNumber: inv.invoice_number,
            invoiceDate: inv.invoice_date,
            subTotal: inv.sub_total || 0,
            taxAmount: inv.tax_amount || 0,
            totalAmount: inv.total_amount || 0,
            paidAmount: inv.paid_amount || 0,
            outstandingAmount: inv.outstanding_amount || 0,
            returnedAmount: inv.returned_amount || 0,
            status: inv.status,
            orderNumber: inv.customer_order_number,
        }));
    }, [outstandingInvoices]);

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Customer Payments</h1>
                    <p className="text-muted-foreground">
                        Record collections against <strong>delivered invoices</strong> (challans). Orders without delivery are not due.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="add" onClick={openRecordDialog}>
                        <Plus className="mr-2 h-4 w-4" />
                        Record Payment
                    </Button>
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="mr-2 h-4 w-4" />
                        Export Report
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Left Sidebar: Customer Selection & Summary */}
                <div className="md:col-span-1 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium">Select Customer</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All Customers" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Customers</SelectItem>
                                    {customers.map(c => (
                                        <SelectItem key={c.id} value={c.id.toString()}>
                                            {c.company?.trim() || c.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {selectedCustomer && (
                                <div className="mt-6 space-y-4">
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5">
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                            <User className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">{selectedCustomer.name}</p>
                                            <p className="text-xs text-muted-foreground">{selectedCustomer.company || 'Private Customer'}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2 border-t pt-4">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Total Delevary Value:</span>
                                            <span className="font-medium">{formatCurrency(selectedCustomer.total_order_value || 0)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Total Paid:</span>
                                            <span className="font-medium text-green-600">{formatCurrency(selectedCustomer.total_paid_amount || 0)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm pt-2 border-t font-semibold">
                                            <span>Due Balance:</span>
                                            <span className="text-orange-600">{formatCurrency(selectedCustomer.total_outstanding_amount || 0)}</span>
                                        </div>
                                    </div>

                                    {selectedCustomer.credit_limit && (
                                        <div className="p-3 rounded-md bg-muted text-xs">
                                            <p className="font-medium mb-1">Credit Details</p>
                                            <p className="text-muted-foreground">Limit: {formatCurrency(selectedCustomer.credit_limit)}</p>
                                            <p className="text-muted-foreground">Terms: {selectedCustomer.payment_terms || 'N/A'}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {!selectedCustomer && (
                        <Card className="bg-primary/5 border-primary/20">
                            <CardContent className="pt-6">
                                <div className="text-center space-y-2">
                                    <Wallet className="h-8 w-8 mx-auto text-primary opacity-50" />
                                    <p className="text-sm font-medium italic text-primary">Global View</p>
                                    <p className="text-xs text-muted-foreground">
                                        Showing payment history for all customers. Select a customer to see
                                        outstanding invoices and record new payments.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right Content Area: Outstanding Invoices & Payment History */}
                <div className="md:col-span-3 space-y-6">
                    {/* Outstanding Invoices Card */}
                    {selectedCustomer && outstandingInvoices.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="h-5 w-5" />
                                    Outstanding Invoices (Delivered)
                                </CardTitle>
                                <CardDescription>
                                    Only delivered invoices with remaining balance are shown. Payments apply to invoice total (incl. VAT).
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Invoice #</TableHead>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Order #</TableHead>
                                                <TableHead className="text-right">Subtotal</TableHead>
                                                <TableHead className="text-right">VAT</TableHead>
                                                <TableHead className="text-right">Total</TableHead>
                                                <TableHead className="text-right">Paid</TableHead>
                                                <TableHead className="text-right">Outstanding</TableHead>
                                                <TableHead>Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {invoiceSummaries.map(inv => (
                                                <TableRow key={inv.invoiceId}>
                                                    <TableCell className="font-mono font-medium">{inv.invoiceNumber}</TableCell>
                                                    <TableCell>{new Date(inv.invoiceDate).toLocaleDateString()}</TableCell>
                                                    <TableCell className="text-muted-foreground">{inv.orderNumber || '—'}</TableCell>
                                                    <TableCell className="text-right">{formatCurrency(inv.subTotal)}</TableCell>
                                                    <TableCell className="text-right">{formatCurrency(inv.taxAmount)}</TableCell>
                                                    <TableCell className="text-right font-medium">{formatCurrency(inv.totalAmount)}</TableCell>
                                                    <TableCell className="text-right text-green-600">{formatCurrency(inv.paidAmount)}</TableCell>
                                                    <TableCell className="text-right font-semibold text-orange-600">{formatCurrency(inv.outstandingAmount - inv.returnedAmount)}</TableCell>
                                                    <TableCell>{getStatusBadge(inv.status)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Payment History Card */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <div>
                                <CardTitle>Payment History</CardTitle>
                                <CardDescription>Recently recorded collections against invoices.</CardDescription>
                            </div>
                            <div className="relative w-64">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search reference..."
                                    className="pl-8"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </CardHeader>
                        <CardContent>
                            {paymentHistory.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Delivery Date</TableHead>
                                                {!selectedCustomer && <TableHead>Company Name</TableHead>}
                                                <TableHead>Invoice No</TableHead>
                                                <TableHead className="text-right">Invoice Amount</TableHead>
                                                <TableHead className="text-right">Payment Amount</TableHead>
                                                <TableHead className="text-right">AIT</TableHead>
                                                <TableHead>Method</TableHead>
                                                <TableHead>Voucher</TableHead>
                                                <TableHead>Cheque Number</TableHead>
                                                <TableHead>Cheque Date</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {paymentHistory
                                                .filter(p =>
                                                    !searchQuery ||
                                                    p.payment_reference?.toLowerCase().includes(searchQuery.toLowerCase())
                                                )
                                                .map(payment => {
                                                    // Extract invoice amount from additional_metadata if available
                                                    const meta = payment.additional_metadata || {};
                                                    const invoiceAmount = meta.invoice_amount || meta.invoice_total || 0;
                                                    return (
                                                        <TableRow key={payment.id}>
                                                            <TableCell>{formatDate(payment.payment_date)}</TableCell>
                                                            {!selectedCustomer && (
                                                                <TableCell className="font-medium italic">
                                                                    {payment.company_name || payment.customer_name || 'N/A'}
                                                                </TableCell>
                                                            )}
                                                            <TableCell className="text-muted-foreground font-mono">
                                                                {payment.invoice_number || (payment.order_number ? `#${payment.order_number}` : '—')}
                                                            </TableCell>
                                                            <TableCell className="text-right">{formatCurrency(invoiceAmount)}</TableCell>
                                                            <TableCell className="text-right font-bold text-green-600">
                                                                {formatCurrency(payment.payment_amount)}
                                                            </TableCell>
                                                            <TableCell className="text-right text-blue-600">
                                                                {formatCurrency(payment.ait_amount || 0)}
                                                            </TableCell>
                                                            <TableCell className="capitalize">{payment.payment_method.replace('_', ' ')}</TableCell>
                                                            <TableCell>
                                                                {payment.voucher_no ? (
                                                                    <Badge variant="secondary" className="font-mono">
                                                                        {payment.voucher_no}
                                                                    </Badge>
                                                                ) : (
                                                                    <span className="text-xs text-muted-foreground">—</span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="font-mono text-sm">
                                                                {payment.payment_reference || '—'}
                                                            </TableCell>
                                                            <TableCell className="text-sm text-muted-foreground">
                                                                {payment.cheque_date ? formatDate(payment.cheque_date) : '—'}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            {/* Totals Row */}
                                            <TableRow className="font-semibold bg-muted/50">
                                                <TableCell colSpan={!selectedCustomer ? 3 : 2} className="text-right">Totals:</TableCell>
                                                <TableCell className="text-right">
                                                    {formatCurrency(
                                                        paymentHistory
                                                            .filter(p =>
                                                                !searchQuery ||
                                                                p.payment_reference?.toLowerCase().includes(searchQuery.toLowerCase())
                                                            )
                                                            .reduce((sum, p) => {
                                                                const meta = p.additional_metadata || {};
                                                                const invAmt = (meta.invoice_amount ?? meta.invoice_total) as number | undefined;
                                                                return sum + (invAmt ?? 0);
                                                            }, 0)
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right text-green-600">
                                                    {formatCurrency(
                                                        paymentHistory
                                                            .filter(p =>
                                                                !searchQuery ||
                                                                p.payment_reference?.toLowerCase().includes(searchQuery.toLowerCase())
                                                            )
                                                            .reduce((sum, p) => sum + (p.payment_amount || 0), 0)
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right text-blue-600">
                                                    {formatCurrency(
                                                        paymentHistory
                                                            .filter(p =>
                                                                !searchQuery ||
                                                                p.payment_reference?.toLowerCase().includes(searchQuery.toLowerCase())
                                                            )
                                                            .reduce((sum, p) => {
                                                                return sum + (p.ait_amount || 0);
                                                            }, 0)
                                                    )}
                                                </TableCell>
                                                <TableCell colSpan={4} />
                                            </TableRow>
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : (
                                <div className="text-center py-10 text-muted-foreground">No payment records found.</div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Record Payment Dialog */}
            <Dialog open={showRecordDialog} onOpenChange={setShowRecordDialog}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Record Payment</DialogTitle>
                        <DialogDescription>
                            Record a payment against an outstanding <strong>delivered invoice</strong>.
                            Amount includes VAT; AIT settles the invoice without cash received.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Customer</Label>
                            <Select value={dialogCustomerId} onValueChange={handleDialogCustomerChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select customer" />
                                </SelectTrigger>
                                <SelectContent>
                                    {customers.map(c => (
                                        <SelectItem key={c.id} value={c.id.toString()}>
                                            {customerLabel(c)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Invoice</Label>
                            <Select
                                value={dialogInvoiceId}
                                onValueChange={handleDialogInvoiceChange}
                                disabled={!dialogCustomerId || outstandingInvoices.length === 0}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={
                                        !dialogCustomerId
                                            ? 'Select a customer first'
                                            : outstandingInvoices.length === 0
                                                ? 'No outstanding invoices'
                                                : 'Select invoice'
                                    } />
                                </SelectTrigger>
                                <SelectContent>
                                    {outstandingInvoices.map(i => (
                                        <SelectItem key={i.id} value={i.id.toString()}>
                                            {i.invoice_number} — {formatCurrency(netOutstanding(i))} outstanding
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {dialogSelectedInvoice && (
                                <div className="p-3 bg-muted/50 rounded-md space-y-1 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Invoice Total (incl. VAT):</span>
                                        <span className="font-medium">{formatCurrency(dialogSelectedInvoice.total_amount || 0)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>Subtotal: {formatCurrency(dialogSelectedInvoice.sub_total || 0)}</span>
                                        <span>VAT: {formatCurrency(dialogSelectedInvoice.tax_amount || 0)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Already Paid:</span>
                                        <span className="text-green-600">{formatCurrency(dialogSelectedInvoice.paid_amount || 0)}</span>
                                    </div>
                                    <div className="flex justify-between pt-1 border-t font-semibold">
                                        <span>Net Outstanding:</span>
                                        <span className="text-orange-600">{formatCurrency(netOutstanding(dialogSelectedInvoice))}</span>
                                    </div>
                                    {dialogSelectedInvoice.returned_amount && dialogSelectedInvoice.returned_amount > 0 && (
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>Approved Returns:</span>
                                            <span>{formatCurrency(dialogSelectedInvoice.returned_amount)}</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="payment-amount">Payment Amount</Label>
                                <Input
                                    id="payment-amount"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={dialogAmount}
                                    onChange={e => setDialogAmount(e.target.value)}
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="payment-date">Payment Date</Label>
                                <Input
                                    id="payment-date"
                                    type="date"
                                    value={dialogDate}
                                    onChange={e => setDialogDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="payment-ait">AIT (Advance Income Tax)</Label>
                                <Input
                                    id="payment-ait"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={dialogAit}
                                    onChange={e => setDialogAit(e.target.value)}
                                    placeholder="0.00"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Settles the invoice with the payment; not cash received.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label>Invoice Total (incl. VAT)</Label>
                                <div className="h-10 flex items-center rounded-md border bg-muted/40 px-3 text-sm font-medium">
                                    {dialogSelectedInvoice
                                        ? formatCurrency(dialogSelectedInvoice.total_amount || 0)
                                        : '—'}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Method</Label>
                            <Select value={dialogMethod} onValueChange={setDialogMethod}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="cash"><CreditCard className="mr-2 h-4 w-4" />Cash</SelectItem>
                                    <SelectItem value="bank_transfer"><CreditCard className="mr-2 h-4 w-4" />Bank Transfer</SelectItem>
                                    <SelectItem value="cheque"><CreditCard className="mr-2 h-4 w-4" />Cheque</SelectItem>
                                    <SelectItem value="card"><CreditCard className="mr-2 h-4 w-4" />Card</SelectItem>
                                    <SelectItem value="mobile_banking"><CreditCard className="mr-2 h-4 w-4" />Mobile Banking</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="payment-reference">
                                {methodIsCheque ? 'Cheque Number' : 'Reference'}
                            </Label>
                            <Input
                                id="payment-reference"
                                value={dialogReference}
                                onChange={e => setDialogReference(e.target.value)}
                                placeholder={methodIsCheque ? 'Cheque number' : 'Cheque #, txn ID, etc.'}
                            />
                        </div>

                        {methodIsCheque && (
                            <div className="space-y-2">
                                <Label htmlFor="payment-cheque-date">Cheque Date</Label>
                                <Input
                                    id="payment-cheque-date"
                                    type="date"
                                    value={dialogChequeDate}
                                    onChange={e => setDialogChequeDate(e.target.value)}
                                />
                            </div>
                        )}

                        {methodNeedsBank && (
                            <div className="space-y-2">
                                <Label htmlFor="payment-bank-name">Bank Name</Label>
                                <Input
                                    id="payment-bank-name"
                                    value={dialogBankName}
                                    onChange={e => setDialogBankName(e.target.value)}
                                    placeholder="e.g. Standard Chartered"
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="payment-notes">Notes</Label>
                            <Textarea
                                id="payment-notes"
                                value={dialogNotes}
                                onChange={e => setDialogNotes(e.target.value)}
                                rows={3}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRecordDialog(false)} disabled={dialogSubmitting}>
                            Cancel
                        </Button>
                        <Button onClick={submitRecordPayment} disabled={dialogSubmitting}>
                            {dialogSubmitting ? 'Recording…' : 'Record Payment'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Payments;