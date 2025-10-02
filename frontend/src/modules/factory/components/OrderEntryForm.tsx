import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Search } from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  FactoryCustomerOrder,
  CreateCustomerOrderRequest,
  OrderPriority,
  CreateOrderLineItemRequest,
  CustomerOrdersApiService,
  FactoryCustomer,
  FactoryProduct,
} from "../services/customer-orders-api";
import { useFormatting } from "@/hooks/useFormatting";
import { useAuth } from "@/hooks/useAuth";

// Form validation schema
const orderFormSchema = z.object({
  factory_customer_id: z.string().min(1, "Customer is required"),
  order_date: z.string().min(1, "Order date is required"),
  required_date: z.string().min(1, "Required date is required"),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  currency: z.string().default("BDT"),
  sales_person: z.string().min(1, "Sales person is required"),
  notes: z.string().optional(),
  line_items: z.array(z.object({
    factory_product_id: z.string().min(1, "Product is required"),
    quantity: z.number().min(1, "Quantity must be at least 1"),
    unit_price: z.number().min(0, "Unit price must be positive"),
    notes: z.string().optional(),
  })).min(1, "At least one line item is required"),
});

type OrderFormData = z.infer<typeof orderFormSchema>;

interface OrderEntryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order?: FactoryCustomerOrder | null;
  onSubmit: (data: CreateCustomerOrderRequest) => Promise<void>;
}

export default function OrderEntryForm({
  open,
  onOpenChange,
  order,
  onSubmit,
}: OrderEntryFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customers, setCustomers] = useState<FactoryCustomer[]>([]);
  const [products, setProducts] = useState<FactoryProduct[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const { formatCurrency } = useFormatting();
  const { user } = useAuth();
  
  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      factory_customer_id: "",
      order_date: new Date().toISOString().split('T')[0],
      required_date: "",
      priority: "medium",
      currency: "BDT",
      sales_person: user?.full_name || user?.username || "",
      notes: "",
      line_items: [
        {
          factory_product_id: "",
          quantity: 1,
          unit_price: 0,
          notes: "",
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "line_items",
  });

  // Load customers and products
  const loadCustomers = async () => {
    try {
      setLoadingCustomers(true);
      const data = await CustomerOrdersApiService.getAllCustomers();
      setCustomers(data);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      const data = await CustomerOrdersApiService.getAllProducts();
      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  // Load data when dialog opens
  useEffect(() => {
    if (open) {
      loadCustomers();
      loadProducts();
    }
  }, [open]);

  // Update sales person when user changes
  useEffect(() => {
    if (user && !order) {
      form.setValue('sales_person', user.full_name || user.username || '');
    }
  }, [user, order, form]);

  // Reset form when order changes
  useEffect(() => {
    if (order) {
      // Editing existing order
      form.reset({
        factory_customer_id: order.factory_customer_id,
        order_date: order.order_date.split('T')[0],
        required_date: order.required_date.split('T')[0],
        priority: order.priority,
        currency: order.currency,
        sales_person: order.sales_person,
        notes: order.notes || "",
        line_items: order.line_items.map(item => ({
          factory_product_id: item.factory_product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          notes: item.notes || "",
        })),
      });
    } else {
      // Creating new order
      form.reset({
        factory_customer_id: "",
        order_date: new Date().toISOString().split('T')[0],
        required_date: "",
        priority: "medium",
        currency: "BDT",
        sales_person: user?.full_name || user?.username || "",
        notes: "",
        line_items: [
          {
            factory_product_id: "",
            quantity: 1,
            unit_price: 0,
            notes: "",
          },
        ],
      });
    }
  }, [order, form, user]);

  const handleSubmit = async (data: OrderFormData) => {
    try {
      setIsSubmitting(true);
      
      // Find selected customer
      const selectedCustomer = customers.find(c => c.id === data.factory_customer_id);
      
      const orderData: CreateCustomerOrderRequest = {
        factory_customer_id: data.factory_customer_id,
        factory_customer_name: selectedCustomer?.name || "",
        factory_customer_email: selectedCustomer?.email || "",
        factory_customer_phone: selectedCustomer?.phone,
        order_date: data.order_date,
        required_date: data.required_date,
        priority: data.priority,
        currency: data.currency,
        sales_person: data.sales_person,
        notes: data.notes,
        line_items: data.line_items.map(item => {
          const selectedProduct = products.find(p => p.id === item.factory_product_id);
          return {
            factory_product_id: item.factory_product_id,
            factory_product_name: selectedProduct?.name || "",
            factory_product_sku: selectedProduct?.sku || "",
            quantity: item.quantity,
            unit_price: item.unit_price,
            notes: item.notes,
          };
        }),
      };

      await onSubmit(orderData);
      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting order:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addLineItem = () => {
    append({
      factory_product_id: "",
      quantity: 1,
      unit_price: 0,
      notes: "",
    });
  };

  const removeLineItem = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  const calculateLineTotal = (quantity: number, unitPrice: number) => {
    return quantity * unitPrice;
  };

  const calculateOrderTotal = () => {
    const lineItems = form.watch("line_items");
    return lineItems.reduce((total, item) => {
      return total + (item.quantity * item.unit_price);
    }, 0);
  };

  // Get product details for display
  const getProductDetails = (productId: string) => {
    return products.find(p => p.id === productId);
  };

  const priorityColors = {
    low: "bg-green-100 text-green-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-orange-100 text-orange-800",
    urgent: "bg-red-100 text-red-800",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {order ? "Edit Customer Order" : "Create New Customer Order"}
          </DialogTitle>
          <DialogDescription>
            {order 
              ? `Edit order ${order.order_number}` 
              : "Fill in the details to create a new customer order"
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Customer Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="factory_customer_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={loadingCustomers ? "Loading customers..." : "Select a customer"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {customers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{customer.name}</span>
                                <span className="text-sm text-muted-foreground">{customer.email}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {form.watch("factory_customer_id") && (
                  <div className="bg-muted p-3 rounded-md">
                    {(() => {
                      const selectedCustomer = customers.find(c => c.id === form.watch("factory_customer_id"));
                      return selectedCustomer ? (
                        <div className="space-y-1 text-sm">
                          <div><strong>Name:</strong> {selectedCustomer.name}</div>
                          <div><strong>Email:</strong> {selectedCustomer.email}</div>
                          {selectedCustomer.phone && <div><strong>Phone:</strong> {selectedCustomer.phone}</div>}
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Order Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Order Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="order_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Order Date *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="required_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Required Date *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">
                              <Badge className={priorityColors.low}>Low</Badge>
                            </SelectItem>
                            <SelectItem value="medium">
                              <Badge className={priorityColors.medium}>Medium</Badge>
                            </SelectItem>
                            <SelectItem value="high">
                              <Badge className={priorityColors.high}>High</Badge>
                            </SelectItem>
                            <SelectItem value="urgent">
                              <Badge className={priorityColors.urgent}>Urgent</Badge>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="sales_person"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sales Person *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Auto-filled from current user" 
                            {...field} 
                            readOnly
                            className="bg-muted"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Currency</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select currency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="BDT">BDT</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter any additional notes or requirements" 
                          className="resize-none" 
                          rows={3}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Line Items */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Order Items</CardTitle>
                <Button type="button" onClick={addLineItem} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Item {index + 1}</h4>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeLineItem(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name={`line_items.${index}.factory_product_id`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Product *</FormLabel>
                            <Select 
                              onValueChange={(value) => {
                                  console.log(value)
                                field.onChange(value);
                                // Auto-fill unit price when product is selected
                                const selectedProduct = products.find(p => p.id === value);
                                if (selectedProduct) {
                                  form.setValue(`line_items.${index}.unit_price`, selectedProduct.unit_price);
                                }
                              }} 
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={loadingProducts ? "Loading products..." : "Select a product"} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {products.map((product) => (
                                  <SelectItem key={product.id} value={product.id}>
                                    <div className="flex flex-col">
                                      <span className="font-medium">{product.name}</span>
                                      <span className="text-sm text-muted-foreground">
                                        {product.sku} - {formatCurrency(product.unit_price)}
                                      </span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {form.watch(`line_items.${index}.factory_product_id`) && (
                        <div className="bg-muted p-3 rounded-md">
                          {(() => {
                            const selectedProduct = getProductDetails(form.watch(`line_items.${index}.factory_product_id`));
                            return selectedProduct ? (
                              <div className="space-y-1 text-sm">
                                <div><strong>Product:</strong> {selectedProduct.name}</div>
                                <div><strong>SKU:</strong> {selectedProduct.sku}</div>
                                <div><strong>Unit Price:</strong> {formatCurrency(selectedProduct.unit_price)}</div>
                              </div>
                            ) : null;
                          })()}
                        </div>
                      )}
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name={`line_items.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Quantity *</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="1"
                                  placeholder="0"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`line_items.${index}.unit_price`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Unit Price *</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="0"
                                  step="0.01"
                                  placeholder="0.00"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`line_items.${index}.notes`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Item Notes</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter item-specific notes" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex items-end">
                        <div className="text-sm text-muted-foreground">
                          Line Total: {formatCurrency(calculateLineTotal(
                            form.watch(`line_items.${index}.quantity`) as number,
                            form.watch(`line_items.${index}.unit_price`) as number
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Total Order Value:</span>
                  <span>{formatCurrency(calculateOrderTotal())}</span>
                </div>
              </CardContent>
            </Card>

            {/* Form Actions */}
            <div className="flex justify-end space-x-4 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : order ? "Update Order" : "Create Order"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}