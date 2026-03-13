import React, { useState, useEffect } from 'react';
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

const Payments: React.FC = () => {
    // State
    const [customers, setCustomers] = useState<FactoryCustomer[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('all');
    const [selectedCustomer, setSelectedCustomer] = useState<FactoryCustomer | null>(null);
    const [paymentHistory, setPaymentHistory] = useState<FactoryCustomerPayment[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

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



    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-BD', {
            style: 'currency',
            currency: 'BDT',
            minimumFractionDigits: 0
        }).format(amount);
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
                    <Button variant="outline">
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
                                        <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
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
        </div>
    );
};

export default Payments;
