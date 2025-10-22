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
  FileText,
  Send,
  Download,
  Calendar,
  DollarSign,
} from "lucide-react";
import { salesRepApi } from "../services/salesrep-api";
import type { SalesRepInvoice } from "../types";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const SalesRepInvoices = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedInvoice, setSelectedInvoice] = useState<SalesRepInvoice | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const limit = 10;

  const { data: invoicesData, isLoading } = useQuery({
    queryKey: ["salesrep-invoices", search, statusFilter, currentPage],
    queryFn: () =>
      salesRepApi.getInvoices(
        { search, status: statusFilter },
        { page: currentPage, limit }
      ),
  });

  const sendMutation = useMutation({
    mutationFn: (id: number) => salesRepApi.sendInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salesrep-invoices"] });
      toast({
        title: "Success",
        description: "Invoice sent successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send invoice",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "outline",
      sent: "default",
      paid: "default",
      overdue: "destructive",
      cancelled: "destructive",
    };

    const colors: Record<string, string> = {
      draft: "bg-gray-100 text-gray-800",
      sent: "bg-blue-100 text-blue-800",
      paid: "bg-green-100 text-green-800",
      overdue: "bg-red-100 text-red-800",
      cancelled: "bg-red-100 text-red-800",
    };

    return (
      <Badge variant={variants[status] || "default"} className={colors[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handleSendInvoice = (id: number) => {
    sendMutation.mutate(id);
  };

  const getBalanceColor = (balance: number) => {
    if (balance === 0) return "text-green-600";
    if (balance > 0) return "text-red-600";
    return "text-gray-600";
  };

  const invoices = invoicesData?.data || [];
  const pagination = invoicesData?.pagination;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground">
            Manage customer invoices and track payments
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Generate Invoice
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate Invoice</DialogTitle>
              <DialogDescription>
                Select an order to generate an invoice for.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select an order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Order #001 - Customer 1</SelectItem>
                  <SelectItem value="2">Order #002 - Customer 2</SelectItem>
                  <SelectItem value="3">Order #003 - Customer 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline">Cancel</Button>
              <Button>Generate Invoice</Button>
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
                  placeholder="Search invoices..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => {
                setSearch("");
                setStatusFilter("");
                setCurrentPage(1);
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice List</CardTitle>
          <CardDescription>
            {pagination ? `${pagination.total} invoices found` : "Loading invoices..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice Details</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
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
                      <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
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
                      <div className="flex space-x-1">
                        <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                        <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : invoices.length > 0 ? (
                invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{invoice.invoice_number}</p>
                        <p className="text-sm text-muted-foreground">
                          Order: {invoice.order?.order_number || 'N/A'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{invoice.order?.customer?.name || 'Unknown'}</p>
                        <p className="text-sm text-muted-foreground">
                          {invoice.order?.customer?.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-sm">
                        <Calendar className="h-3 w-3 mr-1" />
                        {format(new Date(invoice.invoice_date), 'MMM dd, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <DollarSign className="h-3 w-3 mr-1" />
                        <span className="font-medium">
                          ${invoice.total_amount.toLocaleString()}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`font-medium ${getBalanceColor(invoice.balance_amount)}`}>
                        ${invoice.balance_amount.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(invoice.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {invoice.status === 'draft' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendInvoice(invoice.id)}
                            disabled={sendMutation.isPending}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex flex-col items-center space-y-2">
                      <FileText className="h-12 w-12 text-muted-foreground" />
                      <p className="text-muted-foreground">No invoices found</p>
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

      {/* Invoice Detail Dialog */}
      {selectedInvoice && (
        <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Invoice Details</DialogTitle>
              <DialogDescription>
                View detailed information about this invoice.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Invoice Number</Label>
                  <p className="font-medium">{selectedInvoice.invoice_number}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <div>{getStatusBadge(selectedInvoice.status)}</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Total Amount</Label>
                  <p className="font-medium">${selectedInvoice.total_amount.toLocaleString()}</p>
                </div>
                <div>
                  <Label>Paid Amount</Label>
                  <p className="font-medium">${selectedInvoice.paid_amount.toLocaleString()}</p>
                </div>
                <div>
                  <Label>Balance</Label>
                  <p className={`font-medium ${getBalanceColor(selectedInvoice.balance_amount)}`}>
                    ${selectedInvoice.balance_amount.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedInvoice(null)}>
                Close
              </Button>
              <Button>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default SalesRepInvoices;
