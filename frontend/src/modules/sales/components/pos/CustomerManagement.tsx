"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  Users,
  Search,
  Plus,
  Edit,
  Eye,
  Phone,
  Mail,
  MapPin,
  Star,
  DollarSign,
  CreditCard,
  History,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { CustomerApi } from "@/services/api";
import { Customer } from "@/services/types";
import { useFormatting } from "@/hooks/useFormatting";
import { PaymentVoucher } from "../payments/PaymentVoucher";
import { CustomerApi as SalesCustomerApi } from "../../services/customer-api";
import { Checkbox } from "@/components/ui/checkbox";

export function CustomerManagement() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentCustomer, setPaymentCustomer] = useState<Customer | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [loading, setLoading] = useState(false);
  const [isAccessConfirmDialogOpen, setIsAccessConfirmDialogOpen] = useState(false);
  const [customerToToggle, setCustomerToToggle] = useState<Customer | null>(null);
  const [ordersWithDue, setOrdersWithDue] = useState<Array<{
    id: number;
    order_number: string;
    order_date: string;
    total_amount: number;
    cash_received: number;
    due_amount: number;
    payment_method: string | null;
    payment_status: string;
    status: string;
  }>>([]);
  const [orderPayments, setOrderPayments] = useState<Record<number, number>>({});
  const [useOrderWisePayment, setUseOrderWisePayment] = useState(true);
  const [showVoucherDialog, setShowVoucherDialog] = useState(false);
  const [voucherData, setVoucherData] = useState<{
    paymentId: number;
    customer: Customer;
    paymentAmount: number;
    paymentMethod: string;
    paymentDate: string;
    previousDue: number;
    remainingDue: number;
    orderNumber?: string;
  } | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    country: "",
    customer_type: "regular" as
      | "regular"
      | "vip"
      | "wholesale"
      | "retail"
      | "walk_in",
    credit_limit: "",
    opening_due: "",
    notes: "",
    password: "",
    erp_access_approved: false,
  });
  const [editFormData, setEditFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    country: "",
    customer_type: "regular" as
      | "regular"
      | "vip"
      | "wholesale"
      | "retail"
      | "walk_in",
    credit_limit: "",
    notes: "",
    erp_access_approved: false,
  });
  const { formatCurrency } = useFormatting();

  // Load customers on component mount
  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const response = await CustomerApi.getCustomers({ page: 1, limit: 100 });
      setCustomers(response.customers || []);
    } catch (error) {
      console.error("Error loading customers:", error);
      toast({
        title: "Error",
        description: "Failed to load customers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone.includes(searchQuery) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddCustomer = async () => {
    if (!formData.name || !formData.phone) {
      toast({
        title: "Missing Fields",
        description: "Name and phone are required",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const newCustomer = await CustomerApi.createCustomer({
        name: formData.name,
        phone: formData.phone,
        email: formData.email || undefined,
        address: formData.address || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        zip_code: formData.zip_code || undefined,
        country: formData.country || undefined,
        customer_type: formData.customer_type,
        credit_limit: formData.credit_limit
          ? parseFloat(formData.credit_limit)
          : undefined,
        opening_due: formData.opening_due
          ? parseFloat(formData.opening_due)
          : undefined,
        notes: formData.notes || undefined,
        password: formData.password || undefined,
        erp_access_approved: formData.erp_access_approved,
      });

      setCustomers((prev) => [...prev, newCustomer]);
      setFormData({
        name: "",
        phone: "",
        email: "",
        address: "",
        city: "",
        state: "",
        zip_code: "",
        country: "",
        customer_type: "regular",
        credit_limit: "",
        opening_due: "",
        notes: "",
        password: "",
        erp_access_approved: false,
      });
      setIsAddDialogOpen(false);
      toast({ title: "Customer added successfully" });
    } catch (error) {
      console.error("Error adding customer:", error);
      toast({
        title: "Error",
        description: "Failed to add customer",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsViewDialogOpen(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setEditFormData({
      name: customer.name || "",
      phone: customer.phone || "",
      email: customer.email || "",
      address: customer.address || "",
      city: customer.city || "",
      state: customer.state || "",
      zip_code: customer.zip_code || "",
      country: customer.country || "",
      customer_type: customer.customer_type || "regular",
      credit_limit: (customer.credit_limit || 0).toString(),
      notes: customer.notes || "",
      erp_access_approved: !!customer.erp_access_approved,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateCustomer = async () => {
    if (!selectedCustomer || !editFormData.name || !editFormData.phone) {
      toast({
        title: "Missing Fields",
        description: "Name and phone are required",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const updatedCustomer = await CustomerApi.updateCustomer(
        selectedCustomer.id,
        {
          name: editFormData.name,
          phone: editFormData.phone,
          email: editFormData.email || undefined,
          address: editFormData.address || undefined,
          city: editFormData.city || undefined,
          state: editFormData.state || undefined,
          zip_code: editFormData.zip_code || undefined,
          country: editFormData.country || undefined,
          customer_type: editFormData.customer_type,
          credit_limit: editFormData.credit_limit
            ? parseFloat(editFormData.credit_limit)
            : undefined,
          notes: editFormData.notes || undefined,
          erp_access_approved: editFormData.erp_access_approved,
        }
      );

      setCustomers((prev) =>
        prev.map((customer) =>
          customer.id === selectedCustomer.id ? updatedCustomer : customer
        )
      );
      setIsEditDialogOpen(false);
      setSelectedCustomer(null);
      toast({ title: "Customer updated successfully" });
    } catch (error) {
      console.error("Error updating customer:", error);
      toast({
        title: "Error",
        description: "Failed to update customer",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openToggleConfirm = (customer: Customer) => {
    setCustomerToToggle(customer);
    setIsAccessConfirmDialogOpen(true);
  };

  const handleToggleErpAccess = async () => {
    if (!customerToToggle) return;
    try {
      setLoading(true);
      const updatedCustomer = await SalesCustomerApi.toggleErpAccess(
        customerToToggle.id
      );
      setCustomers((prev) =>
        prev.map((c) => (c.id === customerToToggle.id ? updatedCustomer : c))
      );
      setIsAccessConfirmDialogOpen(false);
      setCustomerToToggle(null);
      toast({
        title: "Success",
        description: `ERP access ${
          updatedCustomer.erp_access_approved ? "approved" : "revoked"
        } for ${customerToToggle?.name}`,
      });
    } catch (error) {
      console.error("Error toggling ERP access:", error);
      toast({
        title: "Error",
        description: "Failed to toggle ERP access",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCollectPayment = async (customer: Customer) => {
    setPaymentCustomer(customer);
    setPaymentAmount(customer.due_amount?.toString() || "");
    setOrderPayments({});
    setUseOrderWisePayment(false); // Default to false
    setIsPaymentDialogOpen(true);
    
    // Load orders with due amounts
    try {
      const orders = await SalesCustomerApi.getCustomerOrdersWithDueAmounts(customer.id);
      setOrdersWithDue(orders);
      
      if (orders.length > 0) {
        setUseOrderWisePayment(true);
        // Pre-fill order payments with full due amounts
        const initialPayments: Record<number, number> = {};
        orders.forEach(order => {
          initialPayments[order.id] = order.due_amount;
        });
        setOrderPayments(initialPayments);
        
        // Calculate total from orders
        const total = orders.reduce((sum, order) => sum + order.due_amount, 0);
        setPaymentAmount(total.toString());
      }
    } catch (error) {
      console.error("Error loading orders:", error);
      toast({
        title: "Error",
        description: "Failed to load orders with due amounts",
        variant: "destructive",
      });
    }
  };

  const handleOrderPaymentChange = (orderId: number, amount: number) => {
    const newOrderPayments = { ...orderPayments, [orderId]: amount };
    setOrderPayments(newOrderPayments);
    
    // Calculate total payment amount
    const total = Object.values(newOrderPayments).reduce((sum, amt) => sum + amt, 0);
    setPaymentAmount(total.toString());
  };

  const toggleOrderSelection = (orderId: number, selected: boolean) => {
    const order = ordersWithDue.find(o => o.id === orderId);
    if (!order) return;
    
    const newOrderPayments = { ...orderPayments };
    if (selected) {
      newOrderPayments[orderId] = order.due_amount;
    } else {
      delete newOrderPayments[orderId];
    }
    setOrderPayments(newOrderPayments);
    
    // Calculate total payment amount
    const total = Object.values(newOrderPayments).reduce((sum, amt) => sum + amt, 0);
    setPaymentAmount(total.toString());
  };

  const processPaymentCollection = async () => {
    if (!paymentCustomer || !paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast({
        title: "Invalid Payment",
        description: "Please enter a valid payment amount",
        variant: "destructive",
      });
      return;
    }

    if (parseFloat(paymentAmount) > (paymentCustomer.due_amount || 0)) {
      toast({
        title: "Payment Exceeds Due Amount",
        description: "Payment amount cannot exceed the due amount",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const previousDue = paymentCustomer.due_amount || 0;
      const paidAmount = parseFloat(paymentAmount);
      
      // Prepare order payments array if using order-wise payment
      const orderPaymentsArray = useOrderWisePayment && Object.keys(orderPayments).length > 0
        ? Object.entries(orderPayments)
            .filter(([_, amount]) => amount > 0)
            .map(([orderId, amount]) => ({
              orderId: parseInt(orderId),
              amount: amount
            }))
        : undefined;
      
      // Call the API to record the payment
      const updatedCustomer = await CustomerApi.collectDuePayment(
        paymentCustomer.id,
        paidAmount,
        paymentMethod,
        orderPaymentsArray
      ) as Customer & { payment_id?: number; payment_date?: string; payment_reference?: string };

      // Update the customers list with the updated customer from API response
      setCustomers((prev) =>
        prev.map((customer) =>
          customer.id === paymentCustomer.id ? updatedCustomer : customer
        )
      );

      // Show voucher dialog if payment ID is returned
      if (updatedCustomer.payment_id) {
        // Get order number(s) if order-wise payment was used
        let orderNumber: string | undefined;
        if (useOrderWisePayment && orderPaymentsArray && orderPaymentsArray.length > 0) {
          const orderNumbers = orderPaymentsArray
            .map(op => {
              const order = ordersWithDue.find(o => o.id === op.orderId);
              return order?.order_number;
            })
            .filter(Boolean) as string[];
          
          // If single order, show just that number; if multiple, show comma-separated
          orderNumber = orderNumbers.length === 1 
            ? orderNumbers[0] 
            : orderNumbers.length > 1 
            ? orderNumbers.join(', ') 
            : undefined;
        }
        
        setVoucherData({
          paymentId: updatedCustomer.payment_id,
          customer: paymentCustomer,
          paymentAmount: paidAmount,
          paymentMethod: paymentMethod,
          paymentDate: updatedCustomer.payment_date || new Date().toISOString(),
          previousDue: previousDue,
          remainingDue: updatedCustomer.due_amount || 0,
          orderNumber: orderNumber
        });
        setIsPaymentDialogOpen(false);
        setShowVoucherDialog(true);
      } else {
        setIsPaymentDialogOpen(false);
        setPaymentAmount("");
        setPaymentCustomer(null);
      }

      toast({
        title: "Payment Recorded",
        description: `Payment of ${formatCurrency(paidAmount)} recorded successfully`,
      });
    } catch (error) {
      console.error("Error recording payment:", error);
      toast({
        title: "Error",
        description: "Failed to record payment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Customer Management
            </span>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Customer
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Customer</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        placeholder="Enter customer name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone *</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            phone: e.target.value,
                          }))
                        }
                        placeholder="+1234567890"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      placeholder="customer@example.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                      placeholder="Enter password"
                    />
                  </div>

                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          address: e.target.value,
                        }))
                      }
                      placeholder="Enter address"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            city: e.target.value,
                          }))
                        }
                        placeholder="Enter city"
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            state: e.target.value,
                          }))
                        }
                        placeholder="Enter state"
                      />
                    </div>
                    <div>
                      <Label htmlFor="zip">ZIP Code</Label>
                      <Input
                        id="zip"
                        value={formData.zip_code}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            zip_code: e.target.value,
                          }))
                        }
                        placeholder="Enter ZIP code"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={formData.country}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          country: e.target.value,
                        }))
                      }
                      placeholder="Enter country"
                    />
                  </div>

                  <div>
                    <Label htmlFor="type">Customer Type</Label>
                    <Select
                      value={formData.customer_type}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          customer_type: value as any,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="regular">Regular</SelectItem>
                        <SelectItem value="vip">VIP</SelectItem>
                        <SelectItem value="wholesale">Wholesale</SelectItem>
                        <SelectItem value="retail">Retail</SelectItem>
                        <SelectItem value="walk_in">Walk-in</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                    <div>
                      <Label htmlFor="credit-limit">Credit Limit ($)</Label>
                      <Input
                        id="credit-limit"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.credit_limit}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            credit_limit: e.target.value,
                          }))
                        }
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <Label htmlFor="opening-due">Opening Due ($)</Label>
                      <Input
                        id="opening-due"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.opening_due}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            opening_due: e.target.value,
                          }))
                        }
                        placeholder="0.00"
                      />
                    </div>

                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          notes: e.target.value,
                        }))
                      }
                      placeholder="Enter any additional notes"
                      rows={3}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleAddCustomer} disabled={loading}>
                    {loading ? "Adding..." : "Add Customer"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search customers by name, phone, or email..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Due Amount</TableHead>
                <TableHead>Loyalty Points</TableHead>
                <TableHead>Total Purchases</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1 text-sm">
                        <Phone className="w-3 h-3" />
                        {customer.phone}
                      </div>
                      {customer.email && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Mail className="w-3 h-3" />
                          {customer.email}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {(customer.due_amount || 0) > 0 ? (
                      <Badge
                        variant="destructive"
                        className="flex items-center gap-1 w-fit"
                      >
                        {formatCurrency(customer.due_amount || 0)}
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="flex items-center gap-1 w-fit text-green-600"
                      >
                        {formatCurrency(0)}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className="flex items-center gap-1 w-fit"
                    >
                      <Star className="w-3 h-3" />
                      {customer.loyalty_points}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {customer.total_purchases > 0 ? (
                      <Badge
                        variant="default"
                        className="flex items-center gap-1 w-fit"
                      >
                        {formatCurrency(customer.total_purchases)}
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="flex items-center gap-1 w-fit"
                      >
                        {formatCurrency(0)}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewCustomer(customer)}
                        title="View Details"
                      >
                        <Eye className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/sales/customers/${customer.id}/payment-history`)}
                        title="View Payment History"
                      >
                        <History className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditCustomer(customer)}
                        title="Edit Customer"
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openToggleConfirm(customer)}
                        title={customer.erp_access_approved ? "Revoke ERP Access" : "Approve ERP Access"}
                        className={customer.erp_access_approved ? "text-green-600 border-green-200 bg-green-50" : "text-amber-600 border-amber-200 bg-amber-50"}
                      >
                        {customer.erp_access_approved ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                      </Button>
                      {(customer.due_amount || 0) > 0 && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleCollectPayment(customer)}
                          className="bg-green-600 hover:bg-green-700"
                          title="Collect Payment"
                        >
                          <CreditCard className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Customer Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Name</Label>
                  <p className="text-lg">{selectedCustomer.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Phone</Label>
                  <p className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {selectedCustomer.phone}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Email</Label>
                  <p className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {selectedCustomer.email || "Not provided"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Customer Type</Label>
                  <p className="flex items-center gap-2">
                    <Badge variant="outline">
                      {selectedCustomer.customer_type}
                    </Badge>
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Loyalty Points</Label>
                  <p className="flex items-center gap-2">
                    <Star className="w-4 h-4" />
                    {selectedCustomer.loyalty_points}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Total Purchases</Label>
                  <p className="flex items-center gap-2">
                    {formatCurrency(selectedCustomer.total_purchases)}
                  </p>
                </div>
              </div>

              {selectedCustomer.address && (
                <div>
                  <Label className="text-sm font-medium">Address</Label>
                  <p className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {selectedCustomer.address}
                  </p>
                </div>
              )}

              <Separator />

              <div>
                <Label className="text-lg font-medium">
                  Customer Information
                </Label>
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Status:
                    </span>
                    <Badge
                      variant={
                        selectedCustomer.status === "active"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {selectedCustomer.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Last Purchase:
                    </span>
                    <span className="text-sm">
                      {selectedCustomer.last_purchase_date
                        ? new Date(
                            selectedCustomer.last_purchase_date
                          ).toLocaleDateString()
                        : "Never"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-name">Name *</Label>
                <Input
                  id="edit-name"
                  value={editFormData.name}
                  onChange={(e) =>
                    setEditFormData((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder="Enter customer name"
                />
              </div>
              <div>
                <Label htmlFor="edit-phone">Phone *</Label>
                <Input
                  id="edit-phone"
                  value={editFormData.phone}
                  onChange={(e) =>
                    setEditFormData((prev) => ({
                      ...prev,
                      phone: e.target.value,
                    }))
                  }
                  placeholder="Enter phone number"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editFormData.email}
                onChange={(e) =>
                  setEditFormData((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
                placeholder="Enter email address"
              />
            </div>

            <div>
              <Label htmlFor="edit-address">Address</Label>
              <Input
                id="edit-address"
                value={editFormData.address}
                onChange={(e) =>
                  setEditFormData((prev) => ({
                    ...prev,
                    address: e.target.value,
                  }))
                }
                placeholder="Enter address"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="edit-city">City</Label>
                <Input
                  id="edit-city"
                  value={editFormData.city}
                  onChange={(e) =>
                    setEditFormData((prev) => ({
                      ...prev,
                      city: e.target.value,
                    }))
                  }
                  placeholder="Enter city"
                />
              </div>
              <div>
                <Label htmlFor="edit-state">State</Label>
                <Input
                  id="edit-state"
                  value={editFormData.state}
                  onChange={(e) =>
                    setEditFormData((prev) => ({
                      ...prev,
                      state: e.target.value,
                    }))
                  }
                  placeholder="Enter state"
                />
              </div>
              <div>
                <Label htmlFor="edit-zip">ZIP Code</Label>
                <Input
                  id="edit-zip"
                  value={editFormData.zip_code}
                  onChange={(e) =>
                    setEditFormData((prev) => ({
                      ...prev,
                      zip_code: e.target.value,
                    }))
                  }
                  placeholder="Enter ZIP code"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-country">Country</Label>
              <Input
                id="edit-country"
                value={editFormData.country}
                onChange={(e) =>
                  setEditFormData((prev) => ({
                    ...prev,
                    country: e.target.value,
                  }))
                }
                placeholder="Enter country"
              />
            </div>

            <div>
              <Label htmlFor="edit-type">Customer Type</Label>
              <Select
                value={editFormData.customer_type}
                onValueChange={(value) =>
                  setEditFormData((prev) => ({
                    ...prev,
                    customer_type: value as any,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regular">Regular</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                  <SelectItem value="wholesale">Wholesale</SelectItem>
                  <SelectItem value="retail">Retail</SelectItem>
                  <SelectItem value="walk_in">Walk-in</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="edit-credit-limit">Credit Limit ($)</Label>
              <Input
                id="edit-credit-limit"
                type="number"
                step="0.01"
                min="0"
                value={editFormData.credit_limit}
                onChange={(e) =>
                  setEditFormData((prev) => ({
                    ...prev,
                    credit_limit: e.target.value,
                  }))
                }
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={editFormData.notes}
                onChange={(e) =>
                  setEditFormData((prev) => ({
                    ...prev,
                    notes: e.target.value,
                  }))
                }
                placeholder="Enter any additional notes"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateCustomer} disabled={loading}>
              {loading ? "Updating..." : "Update Customer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Collection Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Collect Payment</DialogTitle>
          </DialogHeader>

          {paymentCustomer && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">{paymentCustomer.name}</span>
                  <Badge variant="destructive">
                    Due: {formatCurrency(paymentCustomer.due_amount || 0)}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {paymentCustomer.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {paymentCustomer.phone}
                    </div>
                  )}
                </div>
              </div>

              {ordersWithDue.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="use-order-wise"
                      checked={useOrderWisePayment}
                      onCheckedChange={(checked) => {
                        setUseOrderWisePayment(checked as boolean);
                        if (!checked) {
                          setOrderPayments({});
                        } else {
                          const initialPayments: Record<number, number> = {};
                          ordersWithDue.forEach(order => {
                            initialPayments[order.id] = order.due_amount;
                          });
                          setOrderPayments(initialPayments);
                          const total = ordersWithDue.reduce((sum, order) => sum + order.due_amount, 0);
                          setPaymentAmount(total.toString());
                        }
                      }}
                    />
                    <Label htmlFor="use-order-wise" className="cursor-pointer">
                      Allocate payment to specific orders
                    </Label>
                  </div>

                  {useOrderWisePayment && (
                    <div className="border rounded-lg p-4 space-y-3 max-h-64 overflow-y-auto">
                      <div className="text-sm font-medium mb-2">Orders with Due Amounts</div>
                      {ordersWithDue.map((order) => (
                        <div key={order.id} className="flex items-center gap-3 p-2 border rounded">
                          <Checkbox
                            checked={orderPayments[order.id] !== undefined && orderPayments[order.id] > 0}
                            onCheckedChange={(checked) => toggleOrderSelection(order.id, checked as boolean)}
                          />
                          <div className="flex-1">
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-sm">{order.order_number}</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(order.order_date).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="flex justify-between items-center mt-1">
                              <span className="text-xs text-muted-foreground">
                                Due: {formatCurrency(order.due_amount)}
                              </span>
                              {orderPayments[order.id] !== undefined && orderPayments[order.id] > 0 && (
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max={order.due_amount}
                                  value={orderPayments[order.id]}
                                  onChange={(e) => handleOrderPaymentChange(order.id, parseFloat(e.target.value) || 0)}
                                  className="w-24 h-7 text-xs"
                                  placeholder="0.00"
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="payment-amount">Total Payment Amount</Label>
                <Input
                  id="payment-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  max={paymentCustomer.due_amount || 0}
                  value={paymentAmount}
                  onChange={(e) => {
                    setPaymentAmount(e.target.value);
                    if (!useOrderWisePayment) {
                      setOrderPayments({});
                    }
                  }}
                  placeholder="Enter payment amount"
                  disabled={useOrderWisePayment && ordersWithDue.length > 0}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-method">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentAmount && parseFloat(paymentAmount) > 0 && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span>Payment Amount:</span>
                    <span className="font-medium">
                      {formatCurrency(parseFloat(paymentAmount))}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Remaining Due:</span>
                    <span className="font-medium">
                      {formatCurrency(
                        Number(paymentCustomer.due_amount || 0) -
                          Number(parseFloat(paymentAmount))
                      )}
                    </span>
                  </div>
                  {useOrderWisePayment && Object.keys(orderPayments).length > 0 && (
                    <div className="mt-2 pt-2 border-t text-xs">
                      <div className="font-medium mb-1">Payment Allocation:</div>
                      {Object.entries(orderPayments)
                        .filter(([_, amount]) => amount > 0)
                        .map(([orderId, amount]) => {
                          const order = ordersWithDue.find(o => o.id === parseInt(orderId));
                          return (
                            <div key={orderId} className="flex justify-between">
                              <span>{order?.order_number}:</span>
                              <span>{formatCurrency(amount)}</span>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsPaymentDialogOpen(false);
                setOrdersWithDue([]);
                setOrderPayments({});
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={processPaymentCollection}
              disabled={
                !paymentAmount || parseFloat(paymentAmount) <= 0 || loading ||
                (useOrderWisePayment && Object.keys(orderPayments).length === 0)
              }
            >
              {loading ? "Processing..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Voucher Dialog */}
      <Dialog open={showVoucherDialog} onOpenChange={setShowVoucherDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payment Voucher</DialogTitle>
          </DialogHeader>
          {voucherData && (
            <div className="space-y-4">
              <PaymentVoucher
                paymentId={voucherData.paymentId}
                customer={voucherData.customer}
                paymentAmount={voucherData.paymentAmount}
                paymentMethod={voucherData.paymentMethod}
                paymentDate={voucherData.paymentDate}
                previousDue={voucherData.previousDue}
                remainingDue={voucherData.remainingDue}
                orderNumber={voucherData.orderNumber}
                onClose={() => {
                  setShowVoucherDialog(false);
                  setVoucherData(null);
                  setPaymentAmount("");
                  setPaymentCustomer(null);
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ERP Access Toggle Confirmation */}
      <AlertDialog open={isAccessConfirmDialogOpen} onOpenChange={setIsAccessConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {customerToToggle?.erp_access_approved ? "Revoke ERP Access" : "Approve ERP Access"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {customerToToggle?.erp_access_approved 
                ? `Are you sure you want to revoke ERP access for ${customerToToggle?.name}? They will no longer be able to log in to the e-commerce site.`
                : `Are you sure you want to approve ERP access for ${customerToToggle?.name}? They will be able to log in to the e-commerce site using their credentials.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleToggleErpAccess();
              }}
              className={customerToToggle?.erp_access_approved ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : "bg-primary text-primary-foreground hover:bg-primary/90"}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                customerToToggle?.erp_access_approved ? "Revoke Access" : "Approve Access"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
