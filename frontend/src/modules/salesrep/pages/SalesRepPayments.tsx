import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Eye,
  Filter,
  CreditCard,
  Calendar,
  DollarSign,
} from "lucide-react";
import { salesRepApi } from "../services/salesrep-api";
import type { SalesRepPayment } from "../types";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const SalesRepPayments = () => {
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPayment, setSelectedPayment] = useState<SalesRepPayment | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const limit = 10;

  const { data: paymentsData, isLoading } = useQuery({
    queryKey: ["salesrep-payments", search, methodFilter, currentPage],
    queryFn: () =>
      salesRepApi.getPayments(
        { search, payment_method: methodFilter },
        { page: currentPage, limit }
      ),
  });

  const getPaymentMethodBadge = (method: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      cash: "outline",
      bank_transfer: "default",
      cheque: "secondary",
      credit_card: "destructive",
    };

    return (
      <Badge variant={variants[method] || "default"}>
        {method.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const payments = paymentsData?.data || [];
  const pagination = paymentsData?.pagination;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground">
            Track customer payments and payment history
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Record Payment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
              <DialogDescription>
                Record a new customer payment.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select invoice" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Invoice #001 - Customer 1</SelectItem>
                  <SelectItem value="2">Invoice #002 - Customer 2</SelectItem>
                </SelectContent>
              </Select>
              <Input type="number" step="0.01" placeholder="Amount" />
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                </SelectContent>
              </Select>
              <Input placeholder="Reference number (optional)" />
            </div>
            <DialogFooter>
              <Button variant="outline">Cancel</Button>
              <Button>Record Payment</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search payments..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Methods</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
                <SelectItem value="credit_card">Credit Card</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => {
                setSearch("");
                setMethodFilter("");
                setCurrentPage(1);
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment List</CardTitle>
          <CardDescription>
            {pagination ? `${pagination.total} payments found` : "Loading payments..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payment Details</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                    </TableCell>
                    <TableCell>
                      <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
                    </TableCell>
                    <TableCell>
                      <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
                    </TableCell>
                    <TableCell>
                      <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
                    </TableCell>
                    <TableCell>
                      <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
                    </TableCell>
                    <TableCell>
                      <div className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
                    </TableCell>
                    <TableCell>
                      <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                    </TableCell>
                  </TableRow>
                ))
              ) : payments.length > 0 ? (
                payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{payment.payment_number}</p>
                        {payment.reference_number && (
                          <p className="text-sm text-muted-foreground">
                            Ref: {payment.reference_number}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">
                        {payment.invoice?.invoice_number || 'N/A'}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">
                        {payment.invoice?.order?.customer?.name || 'Unknown'}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm">
                        <Calendar className="h-3 w-3 mr-1" />
                        {format(new Date(payment.payment_date), 'MMM dd, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <DollarSign className="h-3 w-3 mr-1" />
                        <span className="font-medium">
                          ${payment.amount.toLocaleString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getPaymentMethodBadge(payment.payment_method)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedPayment(payment)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex flex-col items-center space-y-2">
                      <CreditCard className="h-12 w-12 text-muted-foreground" />
                      <p className="text-muted-foreground">No payments found</p>
                      <p className="text-sm text-muted-foreground">
                        Try adjusting your search or filters
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Payment Detail Dialog */}
      {selectedPayment && (
        <Dialog open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Payment Details</DialogTitle>
              <DialogDescription>
                View detailed information about this payment.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Payment Number</Label>
                  <p className="font-medium">{selectedPayment.payment_number}</p>
                </div>
                <div>
                  <Label>Amount</Label>
                  <p className="font-medium">${selectedPayment.amount.toLocaleString()}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Payment Method</Label>
                  <div>{getPaymentMethodBadge(selectedPayment.payment_method)}</div>
                </div>
                <div>
                  <Label>Date</Label>
                  <p className="font-medium">
                    {format(new Date(selectedPayment.payment_date), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>
              {selectedPayment.reference_number && (
                <div>
                  <Label>Reference Number</Label>
                  <p className="font-medium">{selectedPayment.reference_number}</p>
                </div>
              )}
              {selectedPayment.notes && (
                <div>
                  <Label>Notes</Label>
                  <p className="text-sm text-muted-foreground">{selectedPayment.notes}</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedPayment(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default SalesRepPayments;
