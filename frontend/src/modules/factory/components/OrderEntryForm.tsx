import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Trash2,
  Package,
  User,
  MapPin,
  DollarSign,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { useFormatting } from "@/hooks/useFormatting";
import type {
  CustomerOrder,
  Customer,
  Product,
  CreateOrderRequest,
} from "../types/customer-orders";

interface OrderEntryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order?: CustomerOrder | null;
  onSubmit: (orderData: CreateOrderRequest) => void;
}

export function OrderEntryForm({
  open,
  onOpenChange,
  order,
  onSubmit,
}: OrderEntryFormProps) {
  const { formatCurrency, formatDate } = useFormatting();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [formData, setFormData] = useState<CreateOrderRequest>({
    customerId: "",
    requiredDate: "",
    priority: "medium",
    notes: "",
    terms: "",
    paymentTerms: "net_30",
    shippingAddress: {
      street: "",
      city: "",
      state: "",
      postalCode: "",
      country: "",
      contactName: "",
      contactPhone: "",
    },
    billingAddress: {
      street: "",
      city: "",
      state: "",
      postalCode: "",
      country: "",
    },
    lineItems: [],
  });

  useEffect(() => {
    // Mock data - in real app, fetch from API
    setCustomers([
      {
        id: "CUST-001",
        name: "ABC Manufacturing Ltd",
        email: "orders@abcmanufacturing.com",
        phone: "+1-555-0123",
        company: "ABC Manufacturing Ltd",
        address: {
          street: "123 Industrial Blvd",
          city: "Detroit",
          state: "MI",
          postalCode: "48201",
          country: "USA",
        },
        creditLimit: 100000,
        paymentTerms: "net_30",
        isActive: true,
      },
      {
        id: "CUST-002",
        name: "XYZ Industries",
        email: "procurement@xyzindustries.com",
        phone: "+1-555-0125",
        company: "XYZ Industries",
        address: {
          street: "456 Commerce St",
          city: "Chicago",
          state: "IL",
          postalCode: "60601",
          country: "USA",
        },
        creditLimit: 75000,
        paymentTerms: "net_15",
        isActive: true,
      },
    ]);

    setProducts([
      {
        id: "PROD-001",
        name: "Premium Widget A",
        sku: "PWA-001",
        description: "High-quality premium widget",
        unitPrice: 30,
        unitOfMeasure: "pcs",
        isActive: true,
        stockQuantity: 1000,
        leadTimeDays: 5,
      },
      {
        id: "PROD-002",
        name: "Standard Widget B",
        sku: "SWB-002",
        description: "Standard quality widget",
        unitPrice: 20,
        unitOfMeasure: "pcs",
        isActive: true,
        stockQuantity: 2000,
        leadTimeDays: 3,
      },
      {
        id: "PROD-003",
        name: "Custom Widget C",
        sku: "CWC-003",
        description: "Custom manufactured widget",
        unitPrice: 40,
        unitOfMeasure: "pcs",
        isActive: true,
        stockQuantity: 500,
        leadTimeDays: 7,
      },
    ]);

    if (order) {
      // Populate form with existing order data
      setFormData({
        customerId: order.customerId,
        requiredDate: order.requiredDate,
        priority: order.priority,
        notes: order.notes || "",
        terms: order.terms || "",
        paymentTerms: order.paymentTerms,
        shippingAddress: order.shippingAddress,
        billingAddress: order.billingAddress,
        lineItems: order.lineItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountPercentage: item.discountPercentage,
          specifications: item.specifications,
          deliveryDate: item.deliveryDate,
          isOptional: item.isOptional,
        })),
      });
      setSelectedCustomer(
        customers.find((c) => c.id === order.customerId) || null
      );
    } else {
      // Reset form for new order
      setFormData({
        customerId: "",
        requiredDate: "",
        priority: "medium",
        notes: "",
        terms: "",
        paymentTerms: "net_30",
        shippingAddress: {
          street: "",
          city: "",
          state: "",
          postalCode: "",
          country: "",
          contactName: "",
          contactPhone: "",
        },
        billingAddress: {
          street: "",
          city: "",
          state: "",
          postalCode: "",
          country: "",
        },
        lineItems: [],
      });
      setSelectedCustomer(null);
    }
  }, [order, customers]);

  const handleCustomerSelect = (customerId: string) => {
    const customer = customers.find((c) => c.id === customerId);
    setSelectedCustomer(customer || null);
    setFormData((prev) => ({
      ...prev,
      customerId,
      paymentTerms: customer?.paymentTerms || "net_30",
      shippingAddress: customer
        ? {
            ...customer.address,
            contactName: customer.name,
            contactPhone: customer.phone,
          }
        : prev.shippingAddress,
      billingAddress: customer ? customer.address : prev.billingAddress,
    }));
  };

  const handleAddLineItem = () => {
    setFormData((prev) => ({
      ...prev,
      lineItems: [
        ...prev.lineItems,
        {
          productId: "",
          quantity: 1,
          unitPrice: 0,
          isOptional: false,
        },
      ],
    }));
  };

  const handleRemoveLineItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== index),
    }));
  };

  const handleLineItemChange = (index: number, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const handleProductSelect = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (product) {
      handleLineItemChange(index, "productId", productId);
      handleLineItemChange(index, "unitPrice", product.unitPrice);
    }
  };

  const calculateLineTotal = (item: any) => {
    const discountAmount = item.discountPercentage
      ? (item.unitPrice * item.quantity * item.discountPercentage) / 100
      : 0;
    return item.unitPrice * item.quantity - discountAmount;
  };

  const calculateOrderTotal = () => {
    return formData.lineItems.reduce(
      (total, item) => total + calculateLineTotal(item),
      0
    );
  };

  const handleSubmit = () => {
    if (!formData.customerId || formData.lineItems.length === 0) {
      alert("Please select a customer and add at least one line item");
      return;
    }

    onSubmit(formData);
  };

  const copyShippingToBilling = () => {
    setFormData((prev) => ({
      ...prev,
      billingAddress: prev.shippingAddress,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{order ? "Edit Order" : "Create New Order"}</DialogTitle>
          <DialogDescription>
            {order
              ? "Update order details and line items"
              : "Enter customer order information"}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="order-info" className="space-y-4">
          <TabsList>
            <TabsTrigger value="order-info">Order Information</TabsTrigger>
            <TabsTrigger value="line-items">Line Items</TabsTrigger>
            <TabsTrigger value="shipping">Shipping & Billing</TabsTrigger>
          </TabsList>

          <TabsContent value="order-info" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer">Customer *</Label>
                <Select
                  value={formData.customerId}
                  onValueChange={handleCustomerSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name} ({customer.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedCustomer && (
                  <div className="p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4" />
                      <span className="font-medium">
                        {selectedCustomer.name}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>Email: {selectedCustomer.email}</p>
                      <p>Phone: {selectedCustomer.phone}</p>
                      <p>
                        Credit Limit:{" "}
                        {formatCurrency(selectedCustomer.creditLimit || 0)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="required-date">Required Date *</Label>
                <Input
                  id="required-date"
                  type="date"
                  value={formData.requiredDate}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      requiredDate: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, priority: value as any }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-terms">Payment Terms</Label>
                <Select
                  value={formData.paymentTerms}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      paymentTerms: value as any,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="net_15">Net 15</SelectItem>
                    <SelectItem value="net_30">Net 30</SelectItem>
                    <SelectItem value="net_45">Net 45</SelectItem>
                    <SelectItem value="net_60">Net 60</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="advance">Advance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes about this order..."
                value={formData.notes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notes: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="terms">Terms & Conditions</Label>
              <Textarea
                id="terms"
                placeholder="Terms and conditions for this order..."
                value={formData.terms}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, terms: e.target.value }))
                }
              />
            </div>
          </TabsContent>

          <TabsContent value="line-items" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Line Items</h3>
              <Button onClick={handleAddLineItem} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>

            <div className="space-y-4">
              {formData.lineItems.map((item, index) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium">Line Item {index + 1}</h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveLineItem(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Product *</Label>
                        <Select
                          value={item.productId}
                          onValueChange={(value) =>
                            handleProductSelect(index, value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name} ({product.sku}) -{" "}
                                {formatCurrency(product.unitPrice)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Quantity *</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            handleLineItemChange(
                              index,
                              "quantity",
                              parseInt(e.target.value) || 0
                            )
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Unit Price *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) =>
                            handleLineItemChange(
                              index,
                              "unitPrice",
                              parseFloat(e.target.value) || 0
                            )
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Discount %</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={item.discountPercentage || 0}
                          onChange={(e) =>
                            handleLineItemChange(
                              index,
                              "discountPercentage",
                              parseFloat(e.target.value) || 0
                            )
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Delivery Date</Label>
                        <Input
                          type="date"
                          value={item.deliveryDate || ""}
                          onChange={(e) =>
                            handleLineItemChange(
                              index,
                              "deliveryDate",
                              e.target.value
                            )
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Optional</Label>
                        <Select
                          value={item.isOptional ? "true" : "false"}
                          onValueChange={(value) =>
                            handleLineItemChange(
                              index,
                              "isOptional",
                              value === "true"
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="false">Required</SelectItem>
                            <SelectItem value="true">Optional</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2 mt-4">
                      <Label>Specifications</Label>
                      <Textarea
                        placeholder="Product specifications or special requirements..."
                        value={item.specifications || ""}
                        onChange={(e) =>
                          handleLineItemChange(
                            index,
                            "specifications",
                            e.target.value
                          )
                        }
                      />
                    </div>

                    <div className="mt-4 p-3 bg-gray-50 rounded-md">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Line Total:</span>
                        <span className="font-bold">
                          {formatCurrency(calculateLineTotal(item))}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {formData.lineItems.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>Order Total:</span>
                    <span>{formatCurrency(calculateOrderTotal())}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="shipping" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Shipping Address
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="shipping-street">Street Address *</Label>
                    <Input
                      id="shipping-street"
                      value={formData.shippingAddress.street}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          shippingAddress: {
                            ...prev.shippingAddress,
                            street: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="shipping-city">City *</Label>
                      <Input
                        id="shipping-city"
                        value={formData.shippingAddress.city}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            shippingAddress: {
                              ...prev.shippingAddress,
                              city: e.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shipping-state">State *</Label>
                      <Input
                        id="shipping-state"
                        value={formData.shippingAddress.state}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            shippingAddress: {
                              ...prev.shippingAddress,
                              state: e.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="shipping-postal">Postal Code *</Label>
                      <Input
                        id="shipping-postal"
                        value={formData.shippingAddress.postalCode}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            shippingAddress: {
                              ...prev.shippingAddress,
                              postalCode: e.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shipping-country">Country *</Label>
                      <Input
                        id="shipping-country"
                        value={formData.shippingAddress.country}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            shippingAddress: {
                              ...prev.shippingAddress,
                              country: e.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="shipping-contact">Contact Name</Label>
                      <Input
                        id="shipping-contact"
                        value={formData.shippingAddress.contactName || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            shippingAddress: {
                              ...prev.shippingAddress,
                              contactName: e.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shipping-phone">Contact Phone</Label>
                      <Input
                        id="shipping-phone"
                        value={formData.shippingAddress.contactPhone || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            shippingAddress: {
                              ...prev.shippingAddress,
                              contactPhone: e.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Billing Address
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyShippingToBilling}
                      className="ml-auto"
                    >
                      Copy from Shipping
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="billing-street">Street Address *</Label>
                    <Input
                      id="billing-street"
                      value={formData.billingAddress.street}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          billingAddress: {
                            ...prev.billingAddress,
                            street: e.target.value,
                          },
                        }))
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="billing-city">City *</Label>
                      <Input
                        id="billing-city"
                        value={formData.billingAddress.city}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            billingAddress: {
                              ...prev.billingAddress,
                              city: e.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="billing-state">State *</Label>
                      <Input
                        id="billing-state"
                        value={formData.billingAddress.state}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            billingAddress: {
                              ...prev.billingAddress,
                              state: e.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="billing-postal">Postal Code *</Label>
                      <Input
                        id="billing-postal"
                        value={formData.billingAddress.postalCode}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            billingAddress: {
                              ...prev.billingAddress,
                              postalCode: e.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="billing-country">Country *</Label>
                      <Input
                        id="billing-country"
                        value={formData.billingAddress.country}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            billingAddress: {
                              ...prev.billingAddress,
                              country: e.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {order ? "Update Order" : "Create Order"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
