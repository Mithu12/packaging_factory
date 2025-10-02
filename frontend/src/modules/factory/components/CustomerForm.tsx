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
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  FactoryCustomer,
  CreateCustomerRequest,
  UpdateCustomerRequest,
} from "../services/customer-orders-api";

// Form validation schema
const customerFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  company: z.string().optional(),
  credit_limit: z.number().min(0, "Credit limit must be positive").optional(),
  payment_terms: z.string().optional(),
  is_active: z.boolean().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postal_code: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
});

type CustomerFormData = z.infer<typeof customerFormSchema>;

interface CustomerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: FactoryCustomer | null;
  onSubmit: (data: CreateCustomerRequest | UpdateCustomerRequest) => Promise<void>;
}

function CustomerForm({
  open,
  onOpenChange,
  customer,
  onSubmit,
}: CustomerFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      company: "",
      credit_limit: 0,
      payment_terms: "net_30",
      is_active: true,
      address: {
        street: "",
        city: "",
        state: "",
        postal_code: "",
        country: "Bangladesh",
      },
    },
  });

  // Reset form when customer changes
  useEffect(() => {
    if (customer) {
      // Editing existing customer
      form.reset({
        name: customer.name,
        email: customer.email,
        phone: customer.phone || "",
        company: customer.company || "",
        credit_limit: customer.credit_limit || 0,
        payment_terms: customer.payment_terms || "net_30",
        is_active: customer.is_active !== false,
        address: {
          street: customer.address?.street || "",
          city: customer.address?.city || "",
          state: customer.address?.state || "",
          postal_code: customer.address?.postal_code || "",
          country: customer.address?.country || "Bangladesh",
        },
      });
    } else {
      // Creating new customer
      form.reset({
        name: "",
        email: "",
        phone: "",
        company: "",
        credit_limit: 0,
        payment_terms: "net_30",
        is_active: true,
        address: {
          street: "",
          city: "",
          state: "",
          postal_code: "",
          country: "Bangladesh",
        },
      });
    }
  }, [customer, form]);

  const handleSubmit = async (data: CustomerFormData) => {
    try {
      setIsSubmitting(true);
      
      const customerData = {
        name: data.name,
        email: data.email,
        phone: data.phone || undefined,
        company: data.company || undefined,
        credit_limit: data.credit_limit || undefined,
        payment_terms: data.payment_terms || "net_30", // Always provide payment_terms
        is_active: data.is_active !== undefined ? data.is_active : true,
        address: data.address && (
          data.address.street || 
          data.address.city || 
          data.address.state || 
          data.address.postal_code || 
          data.address.country
        ) ? data.address : undefined,
      };

      await onSubmit(customerData);
      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting customer:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {customer ? "Edit Customer" : "Create New Customer"}
          </DialogTitle>
          <DialogDescription>
            {customer 
              ? `Edit details for ${customer.name}` 
              : "Fill in the details to create a new customer"
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter customer name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="phone"
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
                  <FormField
                    control={form.control}
                    name="company"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter company name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Business Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Business Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="credit_limit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Credit Limit (BDT)</FormLabel>
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
                  <FormField
                    control={form.control}
                    name="payment_terms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Terms</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select payment terms" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="net_15">Net 15 days</SelectItem>
                            <SelectItem value="net_30">Net 30 days</SelectItem>
                            <SelectItem value="net_45">Net 45 days</SelectItem>
                            <SelectItem value="net_60">Net 60 days</SelectItem>
                            <SelectItem value="cash_on_delivery">Cash on Delivery</SelectItem>
                            <SelectItem value="advance_payment">Advance Payment</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                {customer && (
                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Active Status</FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Enable or disable this customer
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>

            {/* Address Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Address Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="address.street"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter street address" 
                          className="resize-none" 
                          rows={2}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="address.city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter city" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address.state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State/Division</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter state or division" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="address.postal_code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postal Code</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter postal code" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address.country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select country" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Bangladesh">Bangladesh</SelectItem>
                            <SelectItem value="India">India</SelectItem>
                            <SelectItem value="Pakistan">Pakistan</SelectItem>
                            <SelectItem value="Nepal">Nepal</SelectItem>
                            <SelectItem value="Sri Lanka">Sri Lanka</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                {isSubmitting ? "Saving..." : customer ? "Update Customer" : "Create Customer"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default CustomerForm;
// Customer form component for CRUD operations
