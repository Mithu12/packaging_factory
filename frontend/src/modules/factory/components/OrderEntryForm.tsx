"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
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
import { Plus, Trash2 } from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    FactoryCustomerOrder,
    FactoryCustomerOrderStatus,
    CreateCustomerOrderRequest,
    OrderPriority,
    CreateOrderLineItemRequest,
    CustomerOrdersApiService,
    FactoryCustomer,
    FactoryProduct,
} from "../services/customer-orders-api";
import FactoryApiService, { Factory } from "@/services/factory-api";
import { UsersApiService, User } from "@/services/users-api";
import { useFormatting } from "@/hooks/useFormatting";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_NAMES } from "@/services/rbac-types";
import { QuickAddProductDialog } from "./QuickAddProductDialog";
import { QuickAddCustomerDialog } from "./QuickAddCustomerDialog";
import type { Product } from "@/services/types";

const DEFAULT_QUOTATION_TERMS = `Price Excluding TAX & Vat .
50% in advance and rest of payment will be Bank Transfer.
Payment should be made by Cash/Cash Cheque on be heaved Micromedia or Bank Transfer.
Delivery will be confirm within 10 working days after getting the approval.`;

/** Compare ids as strings so number/string mismatch never breaks selection or lookups. */
function idEq(a: unknown, b: unknown): boolean {
    return String(a) === String(b);
}

function isFactoryFieldEmpty(value: unknown): boolean {
    if (value === undefined || value === null) {
        return true;
    }
    if (typeof value === "number") {
        return !Number.isFinite(value);
    }
    return String(value).trim() === "";
}

function productToFactoryProduct(created: Product): FactoryProduct {
    return {
        id: Number(created.id),
        name: created.name,
        sku: created.sku,
        description: created.description,
        unit_price: Number(created.selling_price),
        currency: "BDT",
        current_stock:
            created.current_stock != null ? Number(created.current_stock) : undefined,
        status: created.status,
        created_at: created.created_at,
        updated_at: created.updated_at,
    };
}

// Form validation schema factory function
const createOrderFormSchema = (isAdmin: boolean) => z.object({
    factory_customer_id: z.string().min(1, "Customer is required"),
    factory_id: isAdmin ? z.string().min(1, "Factory is required") : z.string().optional(),
    order_date: z.string().min(1, "Order date is required"),
    required_date: z.string().min(1, "Required date is required"),
    priority: z.enum(["low", "medium", "high", "urgent"]),
    currency: z.string().default("BDT"),
    sales_person: z.string().min(1, "Sales person is required"),
    valid_until: z.string().optional(),
    tax_rate: z.coerce.number().min(0).max(100).default(0),
    notes: z.string().optional(),
    terms: z.string().optional(),
    line_items: z.array(z.object({
        product_id: z.string().min(1, "Product is required"),
        quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
        unit_price: z.coerce.number().min(0, "Unit price must be positive"),
        specifications: z.string().optional(),
    })).min(1, "At least one line item is required"),
});

type OrderFormData = {
    factory_customer_id: string;
    /** String from Select for admins; number when bound from user/order. */
    factory_id?: string | number;
    order_date: string;
    required_date: string;
    priority: "low" | "medium" | "high" | "urgent";
    currency: string;
    sales_person: string;
    valid_until?: string;
    tax_rate: number;
    notes?: string;
    terms?: string;
    line_items: Array<{
        product_id: string;
        quantity: number;
        unit_price: number;
        specifications?: string;
    }>;
};

interface OrderEntryFormProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    order?: FactoryCustomerOrder | null;
    initialStatus?: FactoryCustomerOrderStatus;
    onSubmit: (data: CreateCustomerOrderRequest) => Promise<void>;
}

export default function OrderEntryForm({
                                           open,
                                           onOpenChange,
                                           order,
                                           initialStatus,
                                           onSubmit,
                                       }: OrderEntryFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [customers, setCustomers] = useState<FactoryCustomer[]>([]);
    const [products, setProducts] = useState<FactoryProduct[]>([]);
    const [factories, setFactories] = useState<Factory[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loadingCustomers, setLoadingCustomers] = useState(false);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [loadingFactories, setLoadingFactories] = useState(false);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [quickAddProductOpen, setQuickAddProductOpen] = useState(false);
    const [quickAddCustomerOpen, setQuickAddCustomerOpen] = useState(false);
    const [quickAddLineIndex, setQuickAddLineIndex] = useState<number | null>(null);
    const quickAddLineIndexRef = useRef<number | null>(null);
    const { formatCurrency } = useFormatting();
    const { user } = useAuth();

    // Determine if user is admin (no factory_id)
    const isAdmin = user?.role === ROLE_NAMES.SYSTEM_ADMIN;

    const form = useForm<OrderFormData>({
        resolver: zodResolver(createOrderFormSchema(isAdmin)),
        defaultValues: {
            factory_customer_id: "",
            ...(isAdmin ? {} : { factory_id: user?.factory_id }),
            order_date: new Date().toISOString().split('T')[0],
            required_date: "",
            priority: "medium",
            currency: "BDT",
            sales_person: user?.full_name || user?.username || "",
            valid_until: order?.valid_until ? new Date(order.valid_until).toISOString().split('T')[0] : "",
            tax_rate: order?.tax_rate || 0,
            notes: order?.notes || "",
            terms: order?.terms || "",
            line_items: [
                {
                    product_id: "",
                    quantity: 1,
                    unit_price: 0,
                    specifications: "",
                },
            ],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "line_items",
    });

    // Load customers and products
    const loadCustomers = useCallback(async (): Promise<FactoryCustomer[]> => {
        try {
            setLoadingCustomers(true);
            const data = await CustomerOrdersApiService.getAllCustomers();
            setCustomers(data);
            return data;
        } catch (error) {
            console.error('Error loading customers:', error);
            return [];
        } finally {
            setLoadingCustomers(false);
        }
    }, []);

    const loadProducts = useCallback(async (): Promise<FactoryProduct[]> => {
        try {
            setLoadingProducts(true);
            const data = await CustomerOrdersApiService.getAllProducts();
            console.log('Loaded products:', data);
            setProducts(data);
            return data;
        } catch (error) {
            console.error('Error loading products:', error);
            return [];
        } finally {
            setLoadingProducts(false);
        }
    }, []);

    const loadFactories = useCallback(async () => {
        try {
            setLoadingFactories(true);
            // For admin users (no factory_id), load all factories
            // For regular users, load their assigned factories
            if (user?.role != ROLE_NAMES.SYSTEM_ADMIN) {
                const data = await FactoryApiService.getUserFactories();
                setFactories(data.factories);
            } else {
                // Admin user - load all factories
                const data = await FactoryApiService.getAllFactories();
                setFactories(data.factories);
            }
        } catch (error) {
            console.error('Error loading factories:', error);
        } finally {
            setLoadingFactories(false);
        }
    }, [user?.role, user?.factory_id]);

    const loadUsers = useCallback(async () => {
        try {
            setLoadingUsers(true);
            const data = await UsersApiService.getUsers();
            setUsers(data);
        } catch (error) {
            console.error('Error loading users:', error);
        } finally {
            setLoadingUsers(false);
        }
    }, []);

    // Load data when dialog opens
    useEffect(() => {
        if (open) {
            loadCustomers();
            loadProducts();
            loadFactories();
            loadUsers();
        }
    }, [open, user, loadCustomers, loadProducts, loadFactories, loadUsers]);

    // Update sales person when user changes (for new orders, default to current user)
    useEffect(() => {
        if (user && !order) {
            const defaultSalesPerson = `${user.full_name || user.username} (${user.username})`;
            form.setValue('sales_person', defaultSalesPerson);
        }
    }, [user, order, form]);

    // Reset form when order changes
    useEffect(() => {

        if (order) {
            // Editing existing order - use factory_id from order if available
            const orderFactoryId = order.factory_id || user?.factory_id;
            form.reset({
                factory_customer_id: order.factory_customer_id.toString(),
                ...(isAdmin ? { factory_id: orderFactoryId } : { factory_id: user?.factory_id }),
                order_date: order.order_date.split('T')[0],
                required_date: order.required_date.split('T')[0],
                priority: order.priority,
                currency: order.currency,
                sales_person: order.sales_person,
                valid_until: order.valid_until
                    ? new Date(order.valid_until).toISOString().split("T")[0]
                    : "",
                tax_rate: order.tax_rate ?? 0,
                notes: order.notes || "",
                terms: order.terms || "",
                line_items: order.line_items.map(item => ({
                    product_id: item.product_id.toString(),
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    specifications: item.specifications || "",
                })),
            });
        } else {
            // Creating new order
            const defaultSalesPerson = user ? `${user.full_name || user.username} (${user.username})` : "";
            const defaultTerms = initialStatus === 'quoted' ? DEFAULT_QUOTATION_TERMS : "";
            
            form.reset({
                factory_customer_id: "",
                ...(isAdmin ? {} : { factory_id: user?.factory_id }),
                order_date: new Date().toISOString().split('T')[0],
                required_date: "",
                priority: "medium",
                currency: "BDT",
                sales_person: defaultSalesPerson,
                notes: "",
                terms: defaultTerms,
                line_items: [
                    {
                        product_id: "",
                        quantity: 1,
                        unit_price: 0,
                        specifications: "",
                    },
                ],
            });
        }
    }, [order, form, user, isAdmin, initialStatus]);

    // Admins: pre-select the first factory when creating a new order/quotation once factories are loaded.
    useEffect(() => {
        if (!open || order != null || !isAdmin) {
            return;
        }
        if (factories.length === 0) {
            return;
        }
        if (!isFactoryFieldEmpty(form.getValues("factory_id"))) {
            return;
        }
        const first = factories[0];
        if (first?.id == null) {
            return;
        }
        form.setValue("factory_id", String(first.id), { shouldDirty: false });
    }, [open, order, isAdmin, factories, form]);

    const handleSubmit = async (data: OrderFormData) => {
        try {
            setIsSubmitting(true);

            // Find selected customer
            const selectedCustomer = customers.find(c => idEq(c.id, data.factory_customer_id));

            const orderData: CreateCustomerOrderRequest = {
                factory_customer_id: parseInt(data.factory_customer_id),
                factory_customer_name: selectedCustomer?.name || "",
                factory_customer_email: selectedCustomer?.email || "",
                factory_customer_phone: selectedCustomer?.phone,
                payment_terms: selectedCustomer?.payment_terms,
                factory_id: (() => {
                    const raw = data.factory_id as unknown;
                    if (raw === undefined || raw === null || raw === "") {
                        return undefined;
                    }
                    const s = String(raw).trim();
                    if (!s) {
                        return undefined;
                    }
                    const n = Number(s);
                    return Number.isFinite(n) ? s : undefined;
                })(),
                order_date: data.order_date,
                required_date: data.required_date,
                priority: data.priority,
                // currency: data.currency,
                sales_person: data.sales_person,
                notes: data.notes,
                shipping_address: {
                    city: selectedCustomer?.address?.city || "",
                    state: selectedCustomer?.address?.state || "",
                    country: selectedCustomer?.address?.country || "",
                    street: selectedCustomer?.address?.street || "",
                    postal_code: selectedCustomer?.address?.postal_code || "",
                },
                billing_address: {
                    city: selectedCustomer?.address?.city || "",
                    state: selectedCustomer?.address?.state || "",
                    country: selectedCustomer?.address?.country || "",
                    street: selectedCustomer?.address?.street || "",
                    postal_code: selectedCustomer?.address?.postal_code || "",
                },
                line_items: data.line_items.map(item => {
                    const selectedProduct = products.find(p => idEq(p.id, item.product_id));
                    return {
                        product_id: parseInt(String(item.product_id), 10),
                        // product_name: selectedProduct?.name || "",
                        // product_sku: selectedProduct?.sku || "",
                        quantity: item.quantity,
                        unit_price: item.unit_price,
                        specifications: item.specifications,
                    };
                }),
                // Preserve status when editing (quoted/pending/draft); new orders use initialStatus.
                status: order ? order.status : initialStatus || "pending",
                valid_until: data.valid_until?.trim()
                    ? data.valid_until.trim()
                    : undefined,
                tax_rate: data.tax_rate,
                subtotal: calculateOrderTotal(),
                tax_amount: (calculateOrderTotal() * data.tax_rate) / 100,
                terms: data.terms,
            };
            console.log('Order data:', orderData);

            await onSubmit(orderData);
        } catch (error) {
            console.error("Error submitting order:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const addLineItem = () => {
        append({
            product_id: "",
            quantity: 1,
            unit_price: 0,
            specifications: "",
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

    const calculateTaxAmount = () => {
        const subtotal = calculateOrderTotal();
        const taxRate = form.watch("tax_rate") || 0;
        return (subtotal * taxRate) / 100;
    };

    const calculateGrandTotal = () => {
        return calculateOrderTotal() + calculateTaxAmount();
    };

    // Get product details for display
    const getProductDetails = (productId: string) => {
        const product = products.find(p => idEq(p.id, productId));
        console.log('Getting product details for ID:', productId, 'Found:', product, 'All products:', products);
        return product;
    };

    const priorityColors = {
        low: "bg-green-100 text-green-800",
        medium: "bg-yellow-100 text-yellow-800",
        high: "bg-orange-100 text-orange-800",
        urgent: "bg-red-100 text-red-800",
    };

    return (
        <>
        <QuickAddCustomerDialog
            open={quickAddCustomerOpen}
            onOpenChange={setQuickAddCustomerOpen}
            onCustomerCreated={async (created: FactoryCustomer) => {
                const idStr = String(created.id);
                const loaded = await loadCustomers();
                // Prefer POST response (includes address) over list row shape
                const next = [
                    created,
                    ...loaded.filter((c) => !idEq(c.id, idStr)),
                ];
                setCustomers(next);
                form.setValue("factory_customer_id", idStr, {
                    shouldValidate: true,
                    shouldDirty: true,
                    shouldTouch: true,
                });
            }}
        />
        <QuickAddProductDialog
            open={quickAddProductOpen}
            onOpenChange={setQuickAddProductOpen}
            onProductCreated={async (created: Product) => {
                const idx = quickAddLineIndexRef.current;
                const idStr = String(created.id);
                const unitPrice = Number(created.selling_price);
                const loaded = await loadProducts();
                let nextList = loaded;
                if (!nextList.some((p) => idEq(p.id, idStr))) {
                    nextList = [productToFactoryProduct(created), ...nextList];
                    setProducts(nextList);
                }
                if (idx !== null && idx >= 0) {
                    form.setValue(`line_items.${idx}.product_id`, idStr, {
                        shouldValidate: true,
                        shouldDirty: true,
                        shouldTouch: true,
                    });
                    form.setValue(`line_items.${idx}.unit_price`, unitPrice, {
                        shouldValidate: true,
                        shouldDirty: true,
                    });
                }
                quickAddLineIndexRef.current = null;
                setQuickAddLineIndex(null);
            }}
        />
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="order-entry-dialog">
                <DialogHeader>
                    <DialogTitle data-testid="order-entry-title">
                        {order 
                            ? (order.status === 'quoted' ? "Edit Quotation" : "Edit Customer Order")
                            : (initialStatus === 'quoted' ? "Create New Quotation" : "Create New Customer Order")
                        }
                    </DialogTitle>
                    <DialogDescription data-testid="order-entry-description">
                        {order
                            ? `Edit ${order.status === 'quoted' ? 'quotation' : 'order'} ${order.order_number}`
                            : `Fill in the details to create a new customer ${initialStatus === 'quoted' ? 'quotation' : 'order'}`
                        }
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                        {/* Customer Information */}
                        <Card data-testid="customer-info-card">
                            <CardHeader>
                                <CardTitle className="text-lg" data-testid="customer-info-title">Customer Information</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4" data-testid="customer-info-content">
                                <FormField
                                    control={form.control}
                                    name="factory_customer_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <div className="flex items-center gap-2">
                                                <FormLabel className="flex-1" data-testid="customer-select-label">Customer *</FormLabel>
                                                <Button
                                                    type="button"
                                                    variant="quickAdd"
                                                    size="icon"
                                                    className="shrink-0 h-8 w-8"
                                                    title="Quick add customer"
                                                    onClick={() => setQuickAddCustomerOpen(true)}
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <Select
                                                key={`customer-select-${customers.length}-${field.value ?? ""}`}
                                                onValueChange={(v) => field.onChange(String(v))}
                                                value={field.value ? String(field.value) : ""}
                                            >
                                                <FormControl>
                                                    <SelectTrigger data-testid="customer-select-trigger">
                                                        <SelectValue placeholder={loadingCustomers ? "Loading customers..." : "Select a customer"} />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {customers.map((customer) => (
                                                        <SelectItem key={customer.id} value={String(customer.id)}>
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
                                            const selectedCustomer = customers.find(c =>
                                                idEq(c.id, form.watch("factory_customer_id"))
                                            );
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

                                {/* Factory Selection - only for admin users */}
                                {isAdmin && (
                                    <FormField
                                        control={form.control}
                                        name="factory_id"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Factory *</FormLabel>
                                                <Select onValueChange={(value) => field.onChange((value))} value={field.value?.toString()}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder={loadingFactories ? "Loading factories..." : "Select a factory"} />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {factories?.map((factory) => (
                                                            <SelectItem key={factory.id} value={factory.id.toString()}>
                                                                <div className="flex flex-col">
                                                                    <span className="font-medium">{factory.name}</span>
                                                                    <span className="text-sm text-muted-foreground">{factory.code}</span>
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}

                                {/* Factory Display - for regular users */}
                                {!isAdmin && (
                                    <div className="bg-muted p-3 rounded-md">
                                        <div className="space-y-1 text-sm">
                                            <div><strong>Factory:</strong> {
                                                factories.find(f => idEq(f.id, user.factory_id))?.name ||
                                                `Factory ID: ${user.factory_id}`
                                            }</div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Order Information */}
                        <Card data-testid="order-info-card">
                            <CardHeader>
                                <CardTitle className="text-lg" data-testid="order-info-title">Order Information</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4" data-testid="order-info-content">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="order-dates-row">
                                    <FormField
                                        control={form.control}
                                        name="order_date"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel data-testid="order-date-label">Order Date *</FormLabel>
                                                <FormControl>
                                                    <Input type="date" {...field} data-testid="order-date-input" />
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
                                                <FormLabel data-testid="required-date-label">Required Date *</FormLabel>
                                                <FormControl>
                                                    <Input type="date" {...field} data-testid="required-date-input" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="valid_until"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Valid Until</FormLabel>
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
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder={loadingUsers ? "Loading users..." : "Select a sales person"} />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {users.map((user) => (
                                                            <SelectItem key={user.id} value={`${user.full_name} (${user.username})`}>
                                                                <div className="flex flex-col">
                                                                    <span className="font-medium">{user.full_name} ({user.role})</span>
                                                                    <span className="text-sm text-muted-foreground">{user.username} - {user.email}</span>
                                                                </div>
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
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
                                <FormField
                                    control={form.control}
                                    name="terms"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Terms & Conditions</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Enter any legal terms or payment conditions"
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
                                <Button type="button" variant="add" onClick={addLineItem} size="sm">
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
                                                name={`line_items.${index}.product_id`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <div className="flex items-center gap-2">
                                                            <FormLabel className="flex-1">Product *</FormLabel>
                                                            <Button
                                                                type="button"
                                                                variant="quickAdd"
                                                                size="icon"
                                                                className="shrink-0 h-8 w-8"
                                                                title="Quick add product"
                                                                onClick={() => {
                                                                    quickAddLineIndexRef.current = index;
                                                                    setQuickAddLineIndex(index);
                                                                    setQuickAddProductOpen(true);
                                                                }}
                                                            >
                                                                <Plus className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                        <Select
                                                            key={`product-select-${index}-${products.length}-${field.value ?? ""}`}
                                                            onValueChange={(value) => {
                                                                field.onChange(String(value));
                                                                const selectedProduct = products.find(p => idEq(p.id, value));
                                                                if (selectedProduct) {
                                                                    form.setValue(`line_items.${index}.unit_price`, Number(selectedProduct.unit_price));
                                                                }
                                                            }}
                                                            value={field.value ? String(field.value) : ""}
                                                        >
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder={loadingProducts ? "Loading products..." : "Select a product"} />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {products.map((product) => (
                                                                    <SelectItem key={product.id} value={String(product.id)}>
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

                                            {form.watch(`line_items.${index}.product_id`) && (
                                                <div className="bg-blue-50 border border-blue-200 p-3 rounded-md">
                                                    {(() => {
                                                        const productId = form.watch(`line_items.${index}.product_id`);
                                                        const selectedProduct = getProductDetails(productId);
                                                        return selectedProduct ? (
                                                            <div className="space-y-1 text-sm">
                                                                <div><strong>Product:</strong> {selectedProduct.name}</div>
                                                                <div><strong>SKU:</strong> {selectedProduct.sku}</div>
                                                                <div><strong>Unit Price:</strong> {formatCurrency(selectedProduct.unit_price)}</div>
                                                                {selectedProduct.current_stock !== undefined && (
                                                                    <div><strong>Stock:</strong> {selectedProduct.current_stock}</div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="text-sm text-red-600">
                                                                Product not found (ID: {productId})
                                                            </div>
                                                        );
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
                                                                    onChange={(e) => field.onChange(e.target.value)}
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
                                                                    onChange={(e) => field.onChange(e.target.value)}
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
                                                name={`line_items.${index}.specifications`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Item specifications</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Enter item-specific specifications" {...field} />
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

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">
                                    {order?.status === 'quoted' || initialStatus === 'quoted' ? 'Quotation Summary' : 'Order Summary'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <div className="flex justify-between items-center text-sm">
                                    <span>Subtotal:</span>
                                    <span>{formatCurrency(calculateOrderTotal())}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <div className="flex items-center gap-2">
                                        <span>Tax Rate (%):</span>
                                        <FormField
                                            control={form.control}
                                            name="tax_rate"
                                            render={({ field }) => (
                                                <FormItem className="w-20">
                                                    <FormControl>
                                                        <Input 
                                                            type="number" 
                                                            min="0" 
                                                            max="100" 
                                                            step="0.01" 
                                                            {...field} 
                                                            onChange={(e) => field.onChange(e.target.value)}
                                                            className="h-8 text-right"
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <span>{formatCurrency(calculateTaxAmount())}</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between items-center text-lg font-semibold">
                                    <span>Total:</span>
                                    <span>{formatCurrency(calculateGrandTotal())}</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Form Actions */}
                        <div className="flex justify-end space-x-4 pt-6" data-testid="order-form-actions">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={isSubmitting}
                                data-testid="cancel-order-button"
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting} data-testid="submit-order-button">
                                {isSubmitting ? "Saving..." : 
                                    order 
                                        ? (order.status === 'quoted' ? "Update Quotation" : "Update Order") 
                                        : (initialStatus === 'quoted' ? "Create Quotation" : "Create Order")
                                }
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
        </>
    );
}