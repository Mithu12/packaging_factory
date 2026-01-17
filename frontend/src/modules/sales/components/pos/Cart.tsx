"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  User,
  DollarSign,
  CreditCard,
  Receipt,
  Search,
  X,
  CheckIcon,
  ChevronsUpDownIcon,
  SquarePen,
  Info,
  Building2,
} from "lucide-react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useState } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
  stock: number;
  discount?: number;
  discountType?: "percentage" | "fixed";
  isGift: boolean;
}

import { Customer } from "@/services/types";
import { useFormatting } from "@/hooks/useFormatting";

interface CartProps {
  cart: CartItem[];
  customers: Customer[];
  selectedCustomer: Customer | null;
  paymentMethod: string;
  cashAmount: string;
  partialPaymentAmount?: string;
  overallDiscount: string;
  overallDiscountType: "percentage" | "flat";
  overallTax: string;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveFromCart: (id: string) => void;
  onClearCart: () => void;
  onCustomerChange: (customer: Customer | null) => void;
  onPaymentMethodChange: (method: string) => void;
  onCashAmountChange: (amount: string) => void;
  onPartialPaymentAmountChange?: (amount: string) => void;
  onOverallDiscountChange: (
    discount: string,
    discountType: "percentage" | "flat"
  ) => void;
  onOverallTaxChange: (tax: string) => void;
  onProcessPayment: () => void;
  onAddCustomer: (customer: any) => Promise<Customer>;
  onUpdateItemDiscount?: (
    id: string,
    discount: number,
    discountType: "percentage" | "fixed"
  ) => void;
  onUpdatePrice?: (id: string, price: number) => void;
  loading?: boolean;
}

const demoCustomers = [
  {
    value: "Walk-in Customer",
    label: "Walk-in Customer",
  },
  {
    value: "John Doe",
    label: "John Doe",
  },
  {
    value: "Jane Doe",
    label: "Jane Doe",
  },
];

export function Cart({
  cart,
  customers,
  selectedCustomer,
  paymentMethod,
  cashAmount,
  partialPaymentAmount,
  overallDiscount,
  overallDiscountType,
  overallTax,
  onUpdateQuantity,
  onRemoveFromCart,
  onClearCart,
  onCustomerChange,
  onPaymentMethodChange,
  onCashAmountChange,
  onPartialPaymentAmountChange,
  onOverallDiscountChange,
  onOverallTaxChange,
  onProcessPayment,
  onAddCustomer,
  onUpdateItemDiscount,
  onUpdatePrice,
  loading = false,
}: CartProps) {
  const subtotal = cart.reduce((sum, item) => {
    const itemSubtotal = item.price * item.quantity;
    let itemDiscount = 0;

    if (item.discount && item.discount > 0) {
      if (item.discountType === "percentage") {
        itemDiscount = (itemSubtotal * item.discount) / 100;
      } else {
        itemDiscount = item.discount;
      }
    }

    return sum + (itemSubtotal - itemDiscount);
  }, 0);
  const discountAmount = overallDiscount
    ? overallDiscountType === "percentage"
      ? (subtotal * parseFloat(overallDiscount)) / 100
      : parseFloat(overallDiscount)
    : 0;
  const discountedSubtotal = subtotal - discountAmount;
  const tax = overallTax
    ? (discountedSubtotal * parseFloat(overallTax)) / 100
    : 0;
  const total = discountedSubtotal + tax;

  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
  });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDiscountDialogOpen, setIsDiscountDialogOpen] = useState(false);
  const [discountType, setDiscountType] = useState("Percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [isTaxDialogOpen, setIsTaxDialogOpen] = useState(false);
  const [taxPercentage, setTaxPercentage] = useState("");
  const { formatCurrency, formatDate } = useFormatting();

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
      const newCustomer = await onAddCustomer({
        name: formData.name,
        phone: formData.phone,
        email: formData.email || undefined,
        customer_type: "regular",
      });

      setFormData({ name: "", phone: "", email: "", address: "" });
      setIsAddDialogOpen(false);
      setValue(newCustomer.name);
      onCustomerChange(newCustomer);
    } catch (error) {
      // Error handling is done in the parent component
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Cart ({cart.length})
          </span>
          {cart.length > 0 && (
            <Button variant="outline" size="sm" onClick={onClearCart}>
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Customer and Date Section */}
        <div className="grid grid-cols-3 gap-10">
          <div className="col-span-2">
            <Label className="text-sm font-medium">Customer</Label>
            <div className="flex flex-col gap-2">
              <div className="flex gap-3 items-center justify-start">
                <div className="flex  ">
                  <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="justify-between w-[300px]"
                      >
                        <span className="flex items-center gap-2">
                          {selectedCustomer ? selectedCustomer.name : "Search Customer..."}
                          {selectedCustomer?.customer_type === 'wholesale' && (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs">
                              <Building2 className="w-3 h-3 mr-1" />
                              Wholesale
                            </Badge>
                          )}
                        </span>
                        <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px]">
                      <Command>
                        <CommandInput placeholder="Search Customers..." />
                        <CommandList>
                          <CommandEmpty>No Customer found.</CommandEmpty>
                          <CommandGroup>
                            {customers.map((customer) => (
                              <CommandItem
                                key={customer.id}
                                value={customer.name}
                                onSelect={() => {
                                  onCustomerChange(customer);
                                  setOpen(false);
                                }}
                              >
                                <CheckIcon
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedCustomer?.id === customer.id
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                <span className="flex items-center gap-2 flex-1">
                                  {customer.name}
                                  {customer.customer_type === 'wholesale' && (
                                    <Badge variant="outline" className="text-xs">
                                      <Building2 className="w-3 h-3 mr-1" />
                                      Wholesale
                                    </Badge>
                                  )}
                                </span>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <Dialog
                  open={isAddDialogOpen}
                  onOpenChange={setIsAddDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Customer</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
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
                          placeholder="123 Main St, City, State"
                        />
                      </div>
                      <div className="flex gap-2 pt-4">
                        <Button onClick={handleAddCustomer} className="flex-1">
                          Add Customer
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setIsAddDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              
              {/* Wholesale Customer Alert */}
              {selectedCustomer?.customer_type === 'wholesale' && (
                <Alert className="mt-2 bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <AlertDescription className="text-blue-800 dark:text-blue-200">
                    <span className="font-medium">Wholesale Customer:</span> Wholesale prices will be applied to all products in this order.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          <div className="col-span-1">
            <div className="w-[80%] ml-auto">
              <Label className="text-sm font-medium">Date</Label>
              <Input
                type="date"
                defaultValue={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Order Table */}
        <div className="space-y-3">
          {cart.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Cart is empty
            </p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr className="text-left">
                    <th className="p-2 text-xs font-medium">SL</th>
                    <th className="p-2 text-xs font-medium">Product</th>
                    <th className="p-2 text-xs font-medium">Quantity</th>
                    <th className="p-2 text-xs font-medium">Price</th>
                    <th className="p-2 text-xs font-medium">Discount</th>
                    <th className="p-2 text-xs font-medium">Amount</th>
                    <th className="p-2 text-xs font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item, index) => (
                    <tr key={item.id} className="border-t">
                      <td className="p-2 text-sm">{index + 1}</td>
                      <td className="p-2">
                        <div>
                          <div className="font-medium text-sm flex items-center gap-2">
                            {item.isGift && "🎁 "}
                            {item.name}
                            {item.isGift && (
                              <Badge
                                variant="secondary"
                                className="bg-yellow-100 text-yellow-800 text-xs"
                              >
                                GIFT
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {item.isGift
                              ? "Free Gift Item"
                              : `Stock: ${item.stock || 100}`}
                          </div>
                        </div>
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 w-6 p-0"
                            onClick={() =>
                              onUpdateQuantity(item.id, item.quantity - 1)
                            }
                          >
                            -
                          </Button>
                          <Input
                            type="number"
                            className="w-12 h-6 text-center text-sm p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            value={item.quantity}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              onUpdateQuantity(item.id, isNaN(val) ? 0 : val);
                            }}
                            min="0"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 w-6 p-0"
                            onClick={() =>
                              onUpdateQuantity(item.id, item.quantity + 1)
                            }
                          >
                            +
                          </Button>
                        </div>
                      </td>
                      <td className="p-2 text-sm">
                        {item.isGift ? (
                          <span className="text-muted-foreground line-through">
                            {Number(item.price)}
                          </span>
                        ) : (
                          <Input
                            type="number"
                            className="w-20 h-6 text-sm p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            value={item.price}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              onUpdatePrice?.(item.id, isNaN(val) ? 0 : val);
                            }}
                            min="0"
                            step="0.01"
                          />
                        )}
                      </td>
                      <td className="p-2">
                        {item.isGift ? (
                          <div className="flex items-center gap-1">
                            <Input
                              className="w-14 h-6 text-xs bg-yellow-50"
                              type="number"
                              value="100"
                              readOnly
                            />
                            <span className="text-xs text-yellow-600">
                              % GIFT
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Input
                              className="w-14 h-6 text-xs"
                              type="number"
                              value={item.discount || 0}
                              onChange={(e) => {
                                const discount =
                                  parseFloat(e.target.value) || 0;
                                onUpdateItemDiscount?.(
                                  item.id,
                                  discount,
                                  item.discountType || "percentage"
                                );
                              }}
                              min="0"
                              step="0.01"
                            />
                            <Select
                              value={item.discountType || "percentage"}
                              onValueChange={(value) => {
                                onUpdateItemDiscount?.(
                                  item.id,
                                  item.discount || 0,
                                  value as "percentage" | "fixed"
                                );
                              }}
                            >
                              <SelectTrigger className="w-15 h-6 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="percentage">%</SelectItem>
                                <SelectItem value="fixed">R</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </td>
                      <td className="p-2 font-medium text-sm">
                        {item.isGift ? (
                          <span className="text-green-600 font-semibold">
                            FREE
                          </span>
                        ) : (
                          (() => {
                            const itemSubtotal = item.price * item.quantity;
                            let itemDiscount = 0;

                            if (item.discount && item.discount > 0) {
                              if (item.discountType === "percentage") {
                                itemDiscount =
                                  (itemSubtotal * item.discount) / 100;
                              } else {
                                itemDiscount = item.discount;
                              }
                            }

                            return Number(itemSubtotal - itemDiscount);
                          })()
                        )}
                      </td>
                      <td className="p-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-red-500"
                          onClick={() => onRemoveFromCart(item.id)}
                        >
                          ×
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <Separator />

        {/* Overall Discount and Tax */}
        <div className="flex gap-5">
          <div>
            <Dialog
              open={isDiscountDialogOpen}
              onOpenChange={setIsDiscountDialogOpen}
            >
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start p-0 h-auto text-left"
                >
                  <div className="flex items-center gap-2 text-sm">
                    <span>Discount</span>
                    <span className="text-blue-500">
                      <SquarePen />
                    </span>
                    <span className="ml-auto font-medium">
                      {overallDiscount || "0.00"}
                      {overallDiscountType === "percentage" ? "%" : ""}
                    </span>
                  </div>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Order Discount</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="discount-type">Order Discount Type</Label>
                      <Select
                        value={discountType}
                        onValueChange={setDiscountType}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Flat">Flat</SelectItem>
                          <SelectItem value="Percentage">Percentage</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="discount-value">Value</Label>
                      <Input
                        id="discount-value"
                        type="number"
                        placeholder="0"
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                        min="0"
                        step="0.1"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsDiscountDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      onOverallDiscountChange(
                        discountValue,
                        discountType.toLowerCase() as "percentage" | "flat"
                      );
                      setIsDiscountDialogOpen(false);
                    }}
                  >
                    Apply
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <div>
            <Dialog open={isTaxDialogOpen} onOpenChange={setIsTaxDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full justify-start p-0 h-auto text-left"
                >
                  <div className="flex items-center gap-2 text-sm">
                    <span>Tax</span>
                    <span className="text-blue-500">
                      <SquarePen />
                    </span>
                    <span className="ml-auto font-medium">
                      {overallTax || "0.00"} %
                    </span>
                  </div>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Tax Settings</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="tax-percentage">Tax Percentage (%)</Label>
                    <Input
                      id="tax-percentage"
                      type="number"
                      placeholder="0"
                      value={taxPercentage}
                      onChange={(e) => setTaxPercentage(e.target.value)}
                      min="0"
                      max="100"
                      step="0.01"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsTaxDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      onOverallTaxChange(taxPercentage);
                      setIsTaxDialogOpen(false);
                    }}
                  >
                    Apply
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Separator />

        {/* Totals */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal:</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {overallDiscount && parseFloat(overallDiscount) > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>
                Discount ({overallDiscount}
                {overallDiscountType === "percentage" ? "%" : ""}):
              </span>
              <span>-{formatCurrency(discountAmount)}</span>
            </div>
          )}
          {overallTax && parseFloat(overallTax) > 0 && (
            <div className="flex justify-between text-sm">
              <span>Tax ({overallTax}%):</span>
              <span>{formatCurrency(tax)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-bold text-lg">
            <span>Total:</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>

        {/* Payment */}
        <div className="space-y-3">
          <Label>Payment Method</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={paymentMethod === "cash" ? "default" : "outline"}
              onClick={() => onPaymentMethodChange("cash")}
              className="flex items-center gap-2"
            >
              <DollarSign className="w-4 h-4" />
              Cash
            </Button>
            <Button
              variant={paymentMethod === "card" ? "default" : "outline"}
              onClick={() => onPaymentMethodChange("card")}
              className="flex items-center gap-2"
            >
              <CreditCard className="w-4 h-4" />
              Card
            </Button>
            <Button
              variant={paymentMethod === "credit" ? "default" : "outline"}
              onClick={() => onPaymentMethodChange("credit")}
              className="flex items-center gap-2"
              disabled={
                !selectedCustomer ||
                selectedCustomer.customer_type === "walk_in"
              }
            >
              <User className="w-4 h-4" />
              Credit
            </Button>
            <Button
              variant={paymentMethod === "partial" ? "default" : "outline"}
              onClick={() => onPaymentMethodChange("partial")}
              className="flex items-center gap-2"
              disabled={
                !selectedCustomer ||
                selectedCustomer.customer_type === "walk_in"
              }
            >
              <Receipt className="w-4 h-4" />
              Partial
            </Button>
          </div>

          {paymentMethod === "cash" && (
            <div>
              <Label htmlFor="cash-amount">Cash Amount</Label>
              <Input
                id="cash-amount"
                type="number"
                placeholder="0.00"
                value={cashAmount}
                onChange={(e) => onCashAmountChange(e.target.value)}
                min="0"
                step="0.01"
              />
              {cashAmount && parseFloat(cashAmount) > total && (
                <p className="text-sm text-muted-foreground mt-1">
                  Change:
                  {formatCurrency(parseFloat(cashAmount) - Number(total))}
                </p>
              )}
            </div>
          )}

          {paymentMethod === "credit" && selectedCustomer && (
            <div className="space-y-2 p-3 bg-blue-50 rounded-lg">
              <div className="flex justify-between text-sm">
                <span>Current Due:</span>
                <span className="font-medium">
                  {formatCurrency(selectedCustomer.due_amount || 0)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Credit Limit:</span>
                <span className="font-medium">
                  {formatCurrency(selectedCustomer.credit_limit || 0)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Available Credit:</span>
                <span className="font-medium">
                  {formatCurrency(
                    Math.max(
                      0,
                      (selectedCustomer.credit_limit || 0) -
                        (selectedCustomer.due_amount || 0)
                    )
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Order Total:</span>
                <span className="font-medium">{formatCurrency(total)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm font-semibold">
                <span>New Total Due:</span>
                <span
                  className={`${
                    (selectedCustomer.due_amount || 0) + total >
                    (selectedCustomer.credit_limit || 0)
                      ? "text-red-600"
                      : "text-blue-600"
                  }`}
                >
                  {formatCurrency((selectedCustomer.due_amount || 0) + total)}
                </span>
              </div>
              {(selectedCustomer.due_amount || 0) + total >
                (selectedCustomer.credit_limit || 0) && (
                <div className="text-xs text-red-600 mt-2">
                  ⚠️ This order will exceed the credit limit by
                  {formatCurrency(
                    (selectedCustomer.due_amount || 0) +
                      total -
                      (selectedCustomer.credit_limit || 0)
                  )}
                </div>
              )}
            </div>
          )}

          {paymentMethod === "partial" && selectedCustomer && (
            <div className="space-y-3">
              <div className="p-3 bg-yellow-50 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span>Order Total:</span>
                  <span className="font-medium">{formatCurrency(total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Current Due:</span>
                  <span className="font-medium">
                    {formatCurrency(selectedCustomer.due_amount || 0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Credit Limit:</span>
                  <span className="font-medium">
                    {formatCurrency(selectedCustomer.credit_limit || 0)}
                  </span>
                </div>
              </div>

              <div>
                <Label htmlFor="partial-amount">Payment Amount</Label>
                <Input
                  id="partial-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  max={total}
                  value={partialPaymentAmount || ""}
                  onChange={(e) =>
                    onPartialPaymentAmountChange?.(e.target.value)
                  }
                  placeholder="Enter payment amount"
                />
                {partialPaymentAmount &&
                  parseFloat(partialPaymentAmount) > 0 && (
                    <div className="mt-2 p-2 bg-green-50 rounded text-sm">
                      <div className="flex justify-between">
                        <span>Payment:</span>
                        <span className="font-medium">
                          {formatCurrency(partialPaymentAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Remaining Due:</span>
                        <span className="font-medium">
                          {formatCurrency(
                            total - parseFloat(partialPaymentAmount)
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>New Customer Due:</span>
                        <span className="font-medium">
                          {formatCurrency(
                            Number(selectedCustomer.due_amount || 0) +
                              Number(total - parseFloat(partialPaymentAmount))
                          )}
                        </span>
                      </div>
                    </div>
                  )}
              </div>
            </div>
          )}

          <Button
            onClick={onProcessPayment}
            disabled={cart.length === 0 || !paymentMethod || loading}
            className="w-full"
            size="lg"
          >
            <Receipt className="w-4 h-4 mr-2" />
            {loading
              ? "Processing..."
              : paymentMethod === "credit"
              ? `Add to Credit (${formatCurrency(total)})`
              : paymentMethod === "partial"
              ? `Partial Payment (${formatCurrency(
                  partialPaymentAmount || "0"
                )})`
              : `Process Payment (${formatCurrency(total)})`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
