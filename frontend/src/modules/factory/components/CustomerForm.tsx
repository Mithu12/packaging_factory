"use client";

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
import { UserPlus } from "lucide-react";
import {
  FactoryCustomer,
  CreateCustomerRequest,
  UpdateCustomerRequest,
} from "../services/customer-orders-api";

const DEFAULT_PAYMENT_TERMS = "cash_on_delivery";

// --- Create (new customer) schema & form ---

const createCustomerFormSchema = z
  .object({
    customer_type: z.enum(["individual", "business"]),
    full_name: z.string().optional(),
    contact_person: z.string().optional(),
    company_name: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    shipping_line: z.string().optional(),
    billing_line: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.customer_type === "individual") {
      if (!data.full_name?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Full name is required",
          path: ["full_name"],
        });
      }
    } else {
      if (!data.contact_person?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Contact person is required",
          path: ["contact_person"],
        });
      }
      if (!data.company_name?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Company name is required",
          path: ["company_name"],
        });
      }
    }
    const phoneTrim = data.phone?.trim() ?? "";
    const emailTrim = data.email?.trim() ?? "";
    if (!phoneTrim && !emailTrim) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide email or phone",
        path: ["email"],
      });
    }
    if (emailTrim && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a valid email address",
        path: ["email"],
      });
    }
    if (!emailTrim && phoneTrim.length > 0 && phoneTrim.length < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Phone number is too short",
        path: ["phone"],
      });
    }
  });

type CreateCustomerFormData = z.infer<typeof createCustomerFormSchema>;

function buildCreateAddressPayload(data: CreateCustomerFormData) {
  const shipping = data.shipping_line?.trim();
  const billing = data.billing_line?.trim();
  if (!shipping && !billing) return undefined;
  return {
    ...(shipping ? { shipping_line: shipping } : {}),
    ...(billing ? { billing_line: billing } : {}),
  };
}

function CustomerCreateForm({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateCustomerRequest) => Promise<void>;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateCustomerFormData>({
    resolver: zodResolver(createCustomerFormSchema),
    defaultValues: {
      customer_type: "individual",
      full_name: "",
      contact_person: "",
      company_name: "",
      phone: "",
      email: "",
      shipping_line: "",
      billing_line: "",
    },
  });

  const customerType = form.watch("customer_type");

  useEffect(() => {
    if (open) {
      form.reset({
        customer_type: "individual",
        full_name: "",
        contact_person: "",
        company_name: "",
        phone: "",
        email: "",
        shipping_line: "",
        billing_line: "",
      });
    }
  }, [open, form]);

  const handleSubmit = async (data: CreateCustomerFormData) => {
    try {
      setIsSubmitting(true);
      const name =
        data.customer_type === "individual"
          ? data.full_name!.trim()
          : data.contact_person!.trim();
      const company =
        data.customer_type === "business"
          ? data.company_name!.trim()
          : undefined;
      const emailTrim = data.email?.trim() ?? "";
      const phoneTrim = data.phone?.trim() ?? "";

      const addrPayload = buildCreateAddressPayload(data);
      const customerData: CreateCustomerRequest = {
        name,
        ...(company ? { company } : {}),
        ...(emailTrim ? { email: emailTrim } : {}),
        ...(phoneTrim ? { phone: phoneTrim } : {}),
        ...(addrPayload ? { address: addrPayload } : {}),
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
      <DialogContent
        className="max-w-md max-h-[90vh] overflow-y-auto gap-0 p-0"
        data-testid="customer-form-dialog"
      >
        <div className="border-b px-6 pt-6 pb-4">
          <DialogHeader className="space-y-0">
            <div className="flex items-center gap-3 pr-8">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
                aria-hidden
              >
                <UserPlus className="h-5 w-5" />
              </div>
              <DialogTitle
                className="text-lg font-semibold leading-tight"
                data-testid="customer-form-title"
              >
                New Customer
              </DialogTitle>
            </div>
          </DialogHeader>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4 px-6 py-5"
          >
            <FormField
              control={form.control}
              name="customer_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="customer-type-select">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {customerType === "individual" ? (
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel data-testid="customer-name-label">
                      Full Name
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. Sarah Jenkins"
                        {...field}
                        data-testid="customer-name-input"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : (
              <>
                <FormField
                  control={form.control}
                  name="contact_person"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Person</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. John Smith" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="company_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Acme Corporation"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="+1 (555)..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="relative py-1" aria-hidden="false">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background text-muted-foreground border px-3 py-1 font-medium uppercase tracking-wide">
                  OR / AND
                </span>
              </div>
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel data-testid="customer-email-label">
                    Email Address
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="sarah@example.com"
                      {...field}
                      data-testid="customer-email-input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="shipping_line"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Shipping Address (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 123 Commerce St" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="billing_line"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Billing Address (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Same as shipping..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="border-t pt-4 space-y-3">
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
                data-testid="submit-customer-button"
              >
                {isSubmitting ? "Saving..." : "Create Profile"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                data-testid="cancel-customer-button"
              >
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// --- Edit customer schema & form (existing detailed layout) ---

const customerEditFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().optional(),
  company: z.string().optional(),
  credit_limit: z.number().min(0, "Credit limit must be positive").optional(),
  payment_terms: z.string().optional(),
  is_active: z.boolean().optional(),
  address: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postal_code: z.string().optional(),
      country: z.string().optional(),
      shipping_line: z.string().optional(),
      billing_line: z.string().optional(),
    })
    .optional(),
});

type CustomerEditFormData = z.infer<typeof customerEditFormSchema>;

function CustomerEditForm({
  open,
  onOpenChange,
  customer,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: FactoryCustomer;
  onSubmit: (data: UpdateCustomerRequest) => Promise<void>;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CustomerEditFormData>({
    resolver: zodResolver(customerEditFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      company: "",
      credit_limit: 0,
      payment_terms: DEFAULT_PAYMENT_TERMS,
      is_active: true,
      address: {
        street: "",
        city: "",
        state: "",
        postal_code: "",
        country: "Bangladesh",
        shipping_line: "",
        billing_line: "",
      },
    },
  });

  useEffect(() => {
    form.reset({
      name: customer.name,
      email: customer.email ?? "",
      phone: customer.phone || "",
      company: customer.company || "",
      credit_limit: customer.credit_limit || 0,
      payment_terms: customer.payment_terms || DEFAULT_PAYMENT_TERMS,
      is_active: customer.is_active !== false,
      address: {
        street: customer.address?.street || "",
        city: customer.address?.city || "",
        state: customer.address?.state || "",
        postal_code: customer.address?.postal_code || "",
        country: customer.address?.country || "Bangladesh",
        shipping_line: customer.address?.shipping_line || "",
        billing_line: customer.address?.billing_line || "",
      },
    });
  }, [customer, form]);

  const handleSubmit = async (data: CustomerEditFormData) => {
    try {
      setIsSubmitting(true);

      const customerData: UpdateCustomerRequest = {
        name: data.name,
        email: data.email,
        phone: data.phone || undefined,
        company: data.company || undefined,
        credit_limit: data.credit_limit || undefined,
        payment_terms: data.payment_terms || DEFAULT_PAYMENT_TERMS,
        is_active: data.is_active !== undefined ? data.is_active : true,
        address:
          data.address &&
          (data.address.street ||
            data.address.city ||
            data.address.state ||
            data.address.postal_code ||
            data.address.country ||
            data.address.shipping_line ||
            data.address.billing_line)
            ? data.address
            : undefined,
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
      <DialogContent
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
        data-testid="customer-form-dialog"
      >
        <DialogHeader>
          <DialogTitle data-testid="customer-form-title">
            Edit Customer
          </DialogTitle>
          <DialogDescription data-testid="customer-form-description">
            Edit details for {customer.name}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            <Card data-testid="basic-info-card">
              <CardHeader>
                <CardTitle className="text-lg" data-testid="basic-info-title">
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4" data-testid="basic-info-content">
                <div
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                  data-testid="name-email-row"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel data-testid="customer-name-label">
                          Name *
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter customer name"
                            {...field}
                            data-testid="customer-name-input"
                          />
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
                        <FormLabel data-testid="customer-email-label">
                          Email *
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="customer@example.com"
                            {...field}
                            data-testid="customer-email-input"
                          />
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
                          <Input
                            placeholder="Enter company name"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Business Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                  data-testid="credit-payment-row"
                >
                  <FormField
                    control={form.control}
                    name="credit_limit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel data-testid="credit-limit-label">
                          Credit Limit (BDT)
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseFloat(e.target.value) || 0)
                            }
                            data-testid="credit-limit-input"
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
                        <FormLabel data-testid="payment-terms-label">
                          Payment Terms
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="payment-terms-select">
                              <SelectValue placeholder="Select payment terms" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="net_15">Net 15 days</SelectItem>
                            <SelectItem value="net_30">Net 30 days</SelectItem>
                            <SelectItem value="net_45">Net 45 days</SelectItem>
                            <SelectItem value="net_60">Net 60 days</SelectItem>
                            <SelectItem value="cash_on_delivery">
                              Cash on Delivery
                            </SelectItem>
                            <SelectItem value="advance_payment">
                              Advance Payment
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Address Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="address.shipping_line"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shipping line (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Single-line shipping" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address.billing_line"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Billing line (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Single-line billing" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                          <Input
                            placeholder="Enter state or division"
                            {...field}
                          />
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
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select country" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Bangladesh">
                              Bangladesh
                            </SelectItem>
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

            <div
              className="flex justify-end space-x-4 pt-6"
              data-testid="customer-form-actions"
            >
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                data-testid="cancel-customer-button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                data-testid="submit-customer-button"
              >
                {isSubmitting ? "Saving..." : "Update Customer"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// --- Public wrapper ---

interface CustomerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: FactoryCustomer | null;
  onSubmit: (
    data: CreateCustomerRequest | UpdateCustomerRequest
  ) => Promise<void>;
}

function CustomerForm({
  open,
  onOpenChange,
  customer,
  onSubmit,
}: CustomerFormProps) {
  if (customer) {
    return (
      <CustomerEditForm
        open={open}
        onOpenChange={onOpenChange}
        customer={customer}
        onSubmit={onSubmit}
      />
    );
  }
  return (
    <CustomerCreateForm
      open={open}
      onOpenChange={onOpenChange}
      onSubmit={onSubmit}
    />
  );
}

export default CustomerForm;
