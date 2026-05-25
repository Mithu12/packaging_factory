import React, { useState, useEffect, useMemo } from 'react';
import {
    Plus,
    Search,
    Filter,
    Download,
    Wallet,
    Calendar,
    History,
    ArrowUpRight,
    CheckCircle2,
    Clock,
    User,
    FileText,
    DollarSign,
    MoreHorizontal
} from 'lucide-react';
import { 
    Card, 
    CardContent, 
    CardHeader, 
    CardTitle, 
    CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import CustomerOrdersApiService, {
    FactoryCustomer,
    FactoryCustomerOrder,
    FactoryCustomerPayment,
    RecordPaymentRequest
} from '../services/customer-orders-api';
import { useFormatting } from '@/hooks/useFormatting';

const Payments: React.FC = () => {
    const { formatCurrency } = useFormatting();
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
    const [outstandingOrders, setOutstandingOrders] = useState<FactoryCustomerOrder[]>([]);
    const [dialogOrderId, setDialogOrderId] = useState<string>('');
    const [dialogAmount, setDialogAmount] = useState<string>('');
    const [dialogMethod, setDialogMethod] = useState<string>('cash');
    const [dialogDate, setDialogDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [dialogReference, setDialogReference] = useState<string>('');
    const [dialogNotes, setDialogNotes] = useState<string>('');
    const [dialogSubmitting, setDialogSubmitting] = useState(false);

    const dialogSelectedOrder = useMemo(
        () => outstandingOrders.find(o => o.id.toString() === dialogOrderId) || null,
        [outstandingOrders, dialogOrderId]
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
                // Fetch global history
                fetchGlobalHistory();
                return;
            }

            setLoading(true);
            try {
                // Fetch specific customer info
                const customer = await CustomerOrdersApiService.getCustomerById(selectedCustomerId);
                console.log('Fetched selected customer:', customer);
                setSelectedCustomer(customer);

                // Fetch customer payment history
                const historyResponse = await CustomerOrdersApiService.getAllPayments({
                    customer_id: selectedCustomerId,
                    limit: 50
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
            const response = await CustomerOrdersApiService.getAllPayments({
                limit: 50
            });
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
        setDialogOrderId('');
        setOutstandingOrders([]);
        setDialogAmount('');
        setDialogMethod('cash');
        setDialogDate(new Date().toISOString().split('T')[0]);
        setDialogReference('');
        setDialogNotes('');
        setShowRecordDialog(true);
        if (initialCustomerId) {
            await loadOutstandingOrders(initialCustomerId);
        }
    };

    const loadOutstandingOrders = async (customerId: string) => {
        if (!customerId) {
            setOutstandingOrders([]);
            return;
        }
        try {
            const response = await CustomerOrdersApiService.getCustomerOrders({
                factory_customer_id: customerId,
                limit: 100,
            });
            // Only orders with money still owed are eligible for payment recording.
            const eligible = response.orders.filter(o => Number(o.outstanding_amount || 0) > 0);
            setOutstandingOrders(eligible);
        } catch (error) {
            console.error('Error loading customer orders:', error);
            toast.error('Failed to load orders for this customer');
            setOutstandingOrders([]);
        }
    };

    const handleDialogCustomerChange = async (customerId: string) => {
        setDialogCustomerId(customerId);
        setDialogOrderId('');
        setDialogAmount('');
        await loadOutstandingOrders(customerId);
    };

    const handleDialogOrderChange = (orderId: string) => {
        setDialogOrderId(orderId);
        const order = outstandingOrders.find(o => o.id.toString() === orderId);
        if (order) {
            setDialogAmount(String(Number(order.outstanding_amount || 0).toFixed(2)));
        }
    };

    const submitRecordPayment = async () => {
        if (!dialogOrderId) {
            toast.error('Select an order to record payment against');
            return;
        }
        const amount = Number(dialogAmount);
        if (!amount || amount <= 0) {
            toast.error('Enter a valid payment amount');
            return;
        }
        const order = dialogSelectedOrder;
        const outstanding = Number(order?.outstanding_amount || 0);
        if (order && amount > outstanding + 0.005) {
            toast.error(`Amount exceeds outstanding (${outstanding.toFixed(2)})`);
            return;
        }
        try {
            setDialogSubmitting(true);
            await CustomerOrdersApiService.recordPayment(dialogOrderId, {
                payment_amount: amount,
                payment_method: dialogMethod,
                payment_date: dialogDate,
                payment_reference: dialogReference.trim() || undefined,
                notes: dialogNotes.trim() || undefined,
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

    // Export the currently visible payment history as a CSV the user can
    // open in Excel or share. Honours the active customer + search filter.
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
            'Customer',
            'Order #',
            'Amount',
            'Method',
            'Voucher',
            'Reference',
            'Notes',
        ];
        const escape = (v: unknown) => {
            const s = v == null ? '' : String(v);
            return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        };
        const lines = rowsToExport.map(p => [
            new Date(p.payment_date).toISOString().slice(0, 10),
            p.customer_name || '',
            p.order_number || '',
            Number(p.payment_amount || 0).toFixed(2),
            p.payment_method.replace(/_/g, ' '),
            p.voucher_no || '',
            p.payment_reference || '',
            p.notes || '',
        ].map(escape).join(','));
        const csv = [headers.map(escape).join(','), ...lines].join('\r\n');
        const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8;' });
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
            case 'completed': return <Badge className="bg-green-100 text-green-800 border-green-200">Completed</Badge>;
            case 'shipped': return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Shipped</Badge>;
            case 'in_production': return <Badge className="bg-orange-100 text-orange-800 border-orange-200">In Production</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Customer Payments</h1>
                    <p className="text-muted-foreground">Manage collections and track payment history from factory customers.</p>
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
                                    
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Total Orders:</span>
                                            <span className="font-medium">{selectedCustomer.order_count || 0}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Total Value:</span>
                                            <span className="font-medium">{formatCurrency(selectedCustomer.total_order_value || 0)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground">Total Paid:</span>
                                            <span className="font-medium text-green-600">{formatCurrency(selectedCustomer.total_paid_amount || 0)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm pt-2 border-t font-semibold">
                                            <span>Outstanding:</span>
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
                                    <p className="text-xs text-muted-foreground">Showing payment history for all customers. Select a customer to see specific dues and record new payments.</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right Content Area: Dues and History */}
                <div className="md:col-span-3 space-y-6">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                                    <div>
                                        <CardTitle>Payment History</CardTitle>
                                        <CardDescription>Recently recorded collections.</CardDescription>
                                    </div>
                                    <div className="relative w-64">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search reference..."
                                            className="pl-8"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {paymentHistory.length > 0 ? (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Date</TableHead>
                                                    {!selectedCustomer && <TableHead>Customer</TableHead>}
                                                    <TableHead>Order #</TableHead>
                                                    <TableHead>Amount</TableHead>
                                                    <TableHead>Method</TableHead>
                                                    <TableHead>Voucher</TableHead>
                                                    <TableHead>Reference</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {paymentHistory.filter(p => 
                                                    !searchQuery || p.payment_reference?.toLowerCase().includes(searchQuery.toLowerCase())
                                                ).map((payment) => (
                                                    <TableRow key={payment.id}>
                                                        <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                                                        {!selectedCustomer && (
                                                            <TableCell className="font-medium italic">
                                                                {payment.customer_name || 'N/A'}
                                                            </TableCell>
                                                        )}
                                                        <TableCell className="text-muted-foreground">
                                                            #{payment.order_number || 'N/A'}
                                                        </TableCell>
                                                        <TableCell className="font-bold text-green-600">
                                                            {formatCurrency(payment.payment_amount)}
                                                        </TableCell>
                                                        <TableCell className="capitalize">{payment.payment_method.replace('_', ' ')}</TableCell>
                                                        <TableCell>
                                                            {payment.voucher_no ? (
                                                                <Badge variant="secondary" className="font-mono">
                                                                    {payment.voucher_no}
                                                                </Badge>
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground">-</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-xs max-w-[150px] truncate">
                                                            {payment.payment_reference || '-'}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    ) : (
                                        <div className="text-center py-10 text-muted-foreground">
                                            No payment records found.
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                </div>
            </div>

            <Dialog open={showRecordDialog} onOpenChange={setShowRecordDialog}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Record Payment</DialogTitle>
                        <DialogDescription>
                            Record a payment against an outstanding order.
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
                            <Label>Order</Label>
                            <Select
                                value={dialogOrderId}
                                onValueChange={handleDialogOrderChange}
                                disabled={!dialogCustomerId || outstandingOrders.length === 0}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={
                                        !dialogCustomerId
                                            ? 'Select a customer first'
                                            : outstandingOrders.length === 0
                                                ? 'No outstanding orders'
                                                : 'Select order'
                                    } />
                                </SelectTrigger>
                                <SelectContent>
                                    {outstandingOrders.map(o => (
                                        <SelectItem key={o.id} value={o.id.toString()}>
                                            {o.order_number} — Outstanding {formatCurrency(o.outstanding_amount || 0)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {dialogSelectedOrder && (
                                <p className="text-xs text-muted-foreground">
                                    Outstanding: {formatCurrency(dialogSelectedOrder.outstanding_amount || 0)} of {formatCurrency(dialogSelectedOrder.total_value || 0)}
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="payment-amount">Amount</Label>
                                <Input
                                    id="payment-amount"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={dialogAmount}
                                    onChange={(e) => setDialogAmount(e.target.value)}
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="payment-date">Date</Label>
                                <Input
                                    id="payment-date"
                                    type="date"
                                    value={dialogDate}
                                    onChange={(e) => setDialogDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Method</Label>
                            <Select value={dialogMethod} onValueChange={setDialogMethod}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="cash">Cash</SelectItem>
                                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                                    <SelectItem value="cheque">Cheque</SelectItem>
                                    <SelectItem value="card">Card</SelectItem>
                                    <SelectItem value="mobile_banking">Mobile Banking</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="payment-reference">Reference</Label>
                            <Input
                                id="payment-reference"
                                value={dialogReference}
                                onChange={(e) => setDialogReference(e.target.value)}
                                placeholder="Cheque #, txn ID, etc."
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="payment-notes">Notes</Label>
                            <Textarea
                                id="payment-notes"
                                value={dialogNotes}
                                onChange={(e) => setDialogNotes(e.target.value)}
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
