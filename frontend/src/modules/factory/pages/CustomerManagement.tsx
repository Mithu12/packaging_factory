import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Users,
  Building,
  Mail,
  Phone,
  CreditCard,
  Calendar,
  RefreshCw,
  DollarSign,
  TrendingUp,
  Wallet,
} from "lucide-react";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useFormatting } from "@/hooks/useFormatting";
import {
  CustomerOrdersApiService,
  FactoryCustomer,
  CreateCustomerRequest,
  UpdateCustomerRequest,
} from "../services/customer-orders-api";
import CustomerForm from "../components/CustomerForm.tsx";

export default function CustomerManagement() {
  const { formatCurrency, formatDate } = useFormatting();
  const [customers, setCustomers] = useState<FactoryCustomer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<FactoryCustomer | null>(null);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<FactoryCustomer | null>(null);

  // Load customers
  const loadCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await CustomerOrdersApiService.getAllCustomers();
      setCustomers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customers');
      console.error('Error loading customers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  // Filter customers based on search term
  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.company && customer.company.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Handle create customer
  const handleCreateCustomer = () => {
    setSelectedCustomer(null);
    setShowCustomerForm(true);
  };

  // Handle edit customer
  const handleEditCustomer = (customer: FactoryCustomer) => {
    setSelectedCustomer(customer);
    setShowCustomerForm(true);
  };

  // Handle view customer
  const handleViewCustomer = (customer: FactoryCustomer) => {
    setSelectedCustomer(customer);
    setShowCustomerDetails(true);
  };

  // Handle delete customer
  const handleDeleteCustomer = (customer: FactoryCustomer) => {
    setCustomerToDelete(customer);
    setShowDeleteDialog(true);
  };

  // Confirm delete customer
  const confirmDeleteCustomer = async () => {
    if (!customerToDelete) return;

    try {
      await CustomerOrdersApiService.deleteCustomer(customerToDelete.id.toString());
      await loadCustomers(); // Reload customers
      setShowDeleteDialog(false);
      setCustomerToDelete(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete customer');
    }
  };

  // Handle form submit
  const handleFormSubmit = async (data: CreateCustomerRequest | UpdateCustomerRequest) => {
    try {
      if (selectedCustomer) {
        // Update existing customer
        await CustomerOrdersApiService.updateCustomer(selectedCustomer.id.toString(), data as UpdateCustomerRequest);
      } else {
        // Create new customer
        await CustomerOrdersApiService.createCustomer(data as CreateCustomerRequest);
      }

      await loadCustomers(); // Reload customers
      setShowCustomerForm(false);
      setSelectedCustomer(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save customer');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Customer Management</h1>
          <p className="text-muted-foreground">
            Manage factory customers and their information
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadCustomers} disabled={loading} data-testid="refresh-customers-button">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleCreateCustomer} data-testid="add-customer-button">
            <Plus className="h-4 w-4 mr-2" />
            New Customer
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
            <p className="text-xs text-muted-foreground">Active customers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(customers.reduce((sum, c) => sum + Number(c.total_order_value || 0), 0))}
            </div>
            <p className="text-xs text-muted-foreground">All customer orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(customers.reduce((sum, c) => sum + Number(c.total_outstanding_amount || 0), 0))}
            </div>
            <p className="text-xs text-muted-foreground">Pending payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(() => {
                const totalOrders = customers.reduce((sum, c) => sum + Number(c.total_order_value || 0), 0);
                const totalPaid = customers.reduce((sum, c) => sum + Number(c.total_paid_amount || 0), 0);
                return totalOrders > 0 ? `${((totalPaid / totalOrders) * 100).toFixed(1)}%` : '0%';
              })()}
            </div>
            <p className="text-xs text-muted-foreground">Payment collection</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search customers by name, email, or company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="customer-search-input"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-800">
              <span>{error}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setError(null); loadCustomers(); }}
                className="ml-auto"
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Customers {loading && "(Loading...)"}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Total Value</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Outstanding</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => (
                <TableRow key={customer.id} data-testid="customer-row">
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {customer.email}
                    </div>
                  </TableCell>
                  <TableCell>{customer.company || "-"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {customer.order_count || 0} orders
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold">
                    {formatCurrency(customer.total_order_value || 0)}
                  </TableCell>
                  <TableCell className="text-green-600 font-semibold">
                    {formatCurrency(customer.total_paid_amount || 0)}
                  </TableCell>
                  <TableCell>
                    <div className={`font-semibold ${(customer.total_outstanding_amount || 0) > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      {formatCurrency(customer.total_outstanding_amount || 0)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={customer.is_active !== false ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                      {customer.is_active !== false ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewCustomer(customer)}
                        data-testid="view-customer-button"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditCustomer(customer)}
                        data-testid="edit-customer-button"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteCustomer(customer)}
                        className="text-red-600 hover:text-red-700"
                        data-testid="delete-customer-button"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredCustomers.length === 0 && !loading && (
            <p className="text-center text-muted-foreground py-8">
              {searchTerm ? "No customers found matching your search." : "No customers found."}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Customer Form Dialog */}
      <CustomerForm
        open={showCustomerForm}
        onOpenChange={setShowCustomerForm}
        customer={selectedCustomer}
        onSubmit={handleFormSubmit}
      />

      {/* Customer Details Dialog */}
      <Dialog open={showCustomerDetails} onOpenChange={setShowCustomerDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
            <DialogDescription>
              View detailed information about {selectedCustomer?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              {/* Financial Summary Card */}
              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Financial Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Total Orders</div>
                      <div className="text-2xl font-bold">{selectedCustomer.order_count || 0}</div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Order Value</div>
                      <div className="text-2xl font-bold">{formatCurrency(selectedCustomer.total_order_value || 0)}</div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Paid Amount</div>
                      <div className="text-2xl font-bold text-green-600">{formatCurrency(selectedCustomer.total_paid_amount || 0)}</div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">Outstanding</div>
                      <div className={`text-2xl font-bold ${(selectedCustomer.total_outstanding_amount || 0) > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                        {formatCurrency(selectedCustomer.total_outstanding_amount || 0)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Name</label>
                  <p className="text-lg font-semibold">{selectedCustomer.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p>{selectedCustomer.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Phone</label>
                  <p>{selectedCustomer.phone || "Not provided"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Company</label>
                  <p>{selectedCustomer.company || "Not provided"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Credit Limit</label>
                  <p>{selectedCustomer.credit_limit ? formatCurrency(selectedCustomer.credit_limit) : "Not set"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Payment Terms</label>
                  <p>{selectedCustomer.payment_terms || "net_30"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <Badge className={selectedCustomer.is_active !== false ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                    {selectedCustomer.is_active !== false ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Created</label>
                  <p>{formatDate(selectedCustomer.created_at)}</p>
                </div>
              </div>
              {selectedCustomer.address && Object.keys(selectedCustomer.address).length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Address</label>
                  <div className="bg-muted p-3 rounded-md text-sm">
                    {selectedCustomer.address.street}, {selectedCustomer.address.city}, {selectedCustomer.address.state}, {selectedCustomer.address.postal_code}, {selectedCustomer.address.country}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{customerToDelete?.name}"? This action cannot be undone.
              The customer will be marked as inactive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteCustomer} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
