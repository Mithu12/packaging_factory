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
} from "../services/customer-orders-api";
import { useFormatting } from "@/hooks/useFormatting";

// Form validation schema
const orderFormSchema = z.object({
  factory_customer_name: z.string().min(1, "Customer name is required"),
  factory_customer_email: z.string().email("Valid email is required"),
  factory_customer_phone: z.string().optional(),
  order_date: z.string().min(1, "Order date is required"),
  required_date: z.string().min(1, "Required date is required"),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  currency: z.string().default("BDT"),
  sales_person: z.string().min(1, "Sales person is required"),
  notes: z.string().optional(),
  line_items: z.array(z.object({
    factory_product_name: z.string().min(1, "Product name is required"),
    factory_product_sku: z.string().min(1, "Product SKU is required"),
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
  const { formatCurrency } = useFormatting();
  
  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      factory_customer_name: "",
      factory_customer_email: "",
      factory_customer_phone: "",
      order_date: new Date().toISOString().split('T')[0],
      required_date: "",
      priority: "medium",
      currency: "BDT",
      sales_person: "",
      notes: "",
      line_items: [
        {
          factory_product_name: "",
          factory_product_sku: "",
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

  // Reset form when order changes
  useEffect(() => {
    if (order) {
      // Editing existing order
      form.reset({
        factory_customer_name: order.factory_customer_name,
        factory_customer_email: order.factory_customer_email,
        factory_customer_phone: order.factory_customer_phone || "",
        order_date: order.order_date.split('T')[0],
        required_date: order.required_date.split('T')[0],
        priority: order.priority,
        currency: order.currency,
        sales_person: order.sales_person,
        notes: order.notes || "",
        line_items: order.line_items.map(item => ({
          factory_product_name: item.factory_product_name,
          factory_product_sku: item.factory_product_sku,
          quantity: item.quantity,
          unit_price: item.unit_price,
          notes: item.notes || "",
        })),
      });
    } else {
      // Creating new order
      form.reset({
        factory_customer_name: "",
        factory_customer_email: "",
        factory_customer_phone: "",
        order_date: new Date().toISOString().split('T')[0],
        required_date: "",
        priority: "medium",
        currency: "BDT",
        sales_person: "",
        notes: "",
        line_items: [
          {
            factory_product_name: "",
            factory_product_sku: "",
            quantity: 1,
            unit_price: 0,
            notes: "",
          },
        ],
      });
    }
  }, [order, form]);

  const handleSubmit = async (data: OrderFormData) => {
    try {
      setIsSubmitting(true);
      
      const orderData: CreateCustomerOrderRequest = {
        factory_customer_id: order?.factory_customer_id || `CUST-${Date.now()}`, // Generate temp ID for new customers
        factory_customer_name: data.factory_customer_name,
        factory_customer_email: data.factory_customer_email,
        factory_customer_phone: data.factory_customer_phone,
        order_date: data.order_date,
        required_date: data.required_date,
        priority: data.priority,
        currency: data.currency,
        sales_person: data.sales_person,
        notes: data.notes,
        line_items: data.line_items.map(item => ({
          factory_product_id: `PROD-${Date.now()}-${Math.random()}`, // Generate temp ID
          factory_product_name: item.factory_product_name,
          factory_product_sku: item.factory_product_sku,
          quantity: item.quantity,
          unit_price: item.unit_price,
          notes: item.notes,
        })),
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
      factory_product_name: "",
      factory_product_sku: "",
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="factory_customer_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter customer name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="factory_customer_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="customer@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="factory_customer_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter phone number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                          <Input placeholder="Enter sales person name" {...field} />
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <FormField
                        control={form.control}
                        name={`line_items.${index}.factory_product_name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Product Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter product name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`line_items.${index}.factory_product_sku`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SKU *</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter SKU" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
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