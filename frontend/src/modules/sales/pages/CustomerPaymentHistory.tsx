"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Search,
  Download,
  DollarSign,
  CreditCard,
  Calendar,
  FileText,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFormatting } from "@/hooks/useFormatting";
import { CustomerApi, CustomerPaymentHistoryResponse } from "../services/customer-api";
import { toast } from "@/hooks/use-toast";

export default function CustomerPaymentHistory() {
  const params = useParams();
  const customerId = typeof params.customerId === 'string' ? parseInt(params.customerId) : parseInt(params.customerId?.[0] || '0');
  const router = useRouter();
  const { formatCurrency, formatDate } = useFormatting();
  
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<CustomerPaymentHistoryResponse | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>("all");

  useEffect(() => {
    if (customerId) {
      loadPaymentHistory();
    }
  }, [customerId]);

  const loadPaymentHistory = async () => {
    try {
      setLoading(true);
      const response = await CustomerApi.getCustomerPaymentHistory(customerId);
      setData(response);
    } catch (error: any) {
      console.error("Error loading payment history:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load payment history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPaymentTypeBadge = (type: string) => {
    const badges = {
      upfront: <Badge className="bg-green-100 text-green-800">Upfront</Badge>,
      due_payment: <Badge className="bg-blue-100 text-blue-800">Due Payment</Badge>,
      refund: <Badge className="bg-red-100 text-red-800">Refund</Badge>,
      adjustment: <Badge className="bg-yellow-100 text-yellow-800">Adjustment</Badge>,
    };
    return badges[type as keyof typeof badges] || <Badge>{type}</Badge>;
  };

  const getOrderPaymentTypeBadge = (type: string) => {
    const badges = {
      full_cash: <Badge className="bg-green-100 text-green-800">Full Cash</Badge>,
      partial: <Badge className="bg-yellow-100 text-yellow-800">Partial</Badge>,
      credit: <Badge className="bg-orange-100 text-orange-800">Credit</Badge>,
      full_card: <Badge className="bg-blue-100 text-blue-800">Card</Badge>,
      full_bank_transfer: <Badge className="bg-purple-100 text-purple-800">Bank Transfer</Badge>,
    };
    return badges[type as keyof typeof badges] || <Badge>{type}</Badge>;
  };

  const getPaymentStatusBadge = (status: string) => {
    const badges = {
      paid: <Badge className="bg-green-100 text-green-800">Paid</Badge>,
      partially_paid: <Badge className="bg-yellow-100 text-yellow-800">Partial</Badge>,
      pending: <Badge className="bg-gray-100 text-gray-800">Pending</Badge>,
      refunded: <Badge className="bg-red-100 text-red-800">Refunded</Badge>,
    };
    return badges[status as keyof typeof badges] || <Badge>{status}</Badge>;
  };

  const filteredPayments = data?.payments.filter((payment) => {
    const matchesSearch = 
      payment.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.payment_reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = paymentTypeFilter === "all" || payment.payment_type === paymentTypeFilter;
    
    if (activeTab === "all") {
      return matchesSearch && matchesType;
    } else if (activeTab === "upfront") {
      return payment.payment_type === "upfront" && matchesSearch && matchesType;
    } else if (activeTab === "due_payments") {
      return payment.payment_type === "due_payment" && matchesSearch && matchesType;
    }
    return matchesSearch && matchesType;
  }) || [];

  const filteredOrders = data?.orders.filter((order) => {
    const matchesSearch = order.order_number.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === "due_amounts") {
      return order.due_amount > 0 && matchesSearch;
    } else if (activeTab === "orders") {
      return matchesSearch;
    }
    return false;
  }) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p>No payment history found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Payment History</h1>
            <p className="text-muted-foreground">
              {data.customer.name} - {data.customer.email || data.customer.phone}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => window.print()}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.total_orders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(data.summary.total_paid)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Outstanding</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(data.summary.current_outstanding)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Order Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.summary.total_order_value)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upfront Payments</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(data.summary.total_upfront_payments)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Due Payments Collected</CardTitle>
            <CreditCard className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(data.summary.total_due_payments_collected)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Due Amounts</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatCurrency(data.summary.total_due_amounts)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs and Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Payment Transactions</CardTitle>
            <div className="flex gap-2">
              <Input
                placeholder="Search by order number or reference..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">All Payments</TabsTrigger>
              <TabsTrigger value="upfront">Upfront Payments</TabsTrigger>
              <TabsTrigger value="due_payments">Due Payments</TabsTrigger>
              <TabsTrigger value="due_amounts">Due Amounts</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
            </TabsList>

            {/* All Payments Tab */}
            <TabsContent value="all" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Order Number</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Recorded By</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        No payments found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{formatDate(payment.payment_date)}</TableCell>
                        <TableCell>{getPaymentTypeBadge(payment.payment_type)}</TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(payment.payment_amount)}
                        </TableCell>
                        <TableCell>{payment.payment_method}</TableCell>
                        <TableCell>{payment.order_number || "-"}</TableCell>
                        <TableCell>{payment.payment_reference || "-"}</TableCell>
                        <TableCell>{payment.recorded_by_username || "-"}</TableCell>
                        <TableCell className="max-w-xs truncate">{payment.notes || "-"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            {/* Upfront Payments Tab */}
            <TabsContent value="upfront" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Order Number</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No upfront payments found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{formatDate(payment.payment_date)}</TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(payment.payment_amount)}
                        </TableCell>
                        <TableCell>{payment.payment_method}</TableCell>
                        <TableCell>{payment.order_number || "-"}</TableCell>
                        <TableCell>{payment.payment_reference || "-"}</TableCell>
                        <TableCell className="max-w-xs truncate">{payment.notes || "-"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            {/* Due Payments Tab */}
            <TabsContent value="due_payments" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Recorded By</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No due payments found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{formatDate(payment.payment_date)}</TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(payment.payment_amount)}
                        </TableCell>
                        <TableCell>{payment.payment_method}</TableCell>
                        <TableCell>{payment.payment_reference || "-"}</TableCell>
                        <TableCell>{payment.recorded_by_username || "-"}</TableCell>
                        <TableCell className="max-w-xs truncate">{payment.notes || "-"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            {/* Due Amounts Tab */}
            <TabsContent value="due_amounts" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order Number</TableHead>
                    <TableHead>Order Date</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Cash Received</TableHead>
                    <TableHead>Due Amount</TableHead>
                    <TableHead>Payment Status</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No orders with due amounts found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.order_number}</TableCell>
                        <TableCell>{formatDate(order.order_date)}</TableCell>
                        <TableCell>{formatCurrency(order.total_amount)}</TableCell>
                        <TableCell>{formatCurrency(order.cash_received)}</TableCell>
                        <TableCell className="font-medium text-orange-600">
                          {formatCurrency(order.due_amount)}
                        </TableCell>
                        <TableCell>{getPaymentStatusBadge(order.payment_status)}</TableCell>
                        <TableCell>{order.status}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            {/* Orders Tab */}
            <TabsContent value="orders" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order Number</TableHead>
                    <TableHead>Order Date</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Cash Received</TableHead>
                    <TableHead>Due Amount</TableHead>
                    <TableHead>Payment Type</TableHead>
                    <TableHead>Payment Status</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        No orders found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.order_number}</TableCell>
                        <TableCell>{formatDate(order.order_date)}</TableCell>
                        <TableCell>{formatCurrency(order.total_amount)}</TableCell>
                        <TableCell>{formatCurrency(order.cash_received)}</TableCell>
                        <TableCell className={order.due_amount > 0 ? "font-medium text-orange-600" : ""}>
                          {formatCurrency(order.due_amount)}
                        </TableCell>
                        <TableCell>{getOrderPaymentTypeBadge(order.payment_type)}</TableCell>
                        <TableCell>{getPaymentStatusBadge(order.payment_status)}</TableCell>
                        <TableCell>{order.status}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
