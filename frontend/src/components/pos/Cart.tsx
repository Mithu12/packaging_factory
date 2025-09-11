import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  isWalkIn?: boolean;
}

interface CartProps {
  cart: CartItem[];
  customers: Customer[];
  selectedCustomer: Customer | null;
  paymentMethod: string;
  cashAmount: string;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveFromCart: (id: string) => void;
  onClearCart: () => void;
  onCustomerChange: (customer: Customer | null) => void;
  onPaymentMethodChange: (method: string) => void;
  onCashAmountChange: (amount: string) => void;
  onProcessPayment: () => void;
  onAddCustomer: (customer: Omit<Customer, "id">) => Promise<Customer>;
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
  onUpdateQuantity,
  onRemoveFromCart,
  onClearCart,
  onCustomerChange,
  onPaymentMethodChange,
  onCashAmountChange,
  onProcessPayment,
  onAddCustomer,
}: CartProps) {
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const tax = subtotal * 0.1; // 10% tax
  const total = subtotal + tax;

  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("Walk-in Customer");
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
  });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const handleAddCustomer = () => {};

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
                        {value
                          ? demoCustomers.find(
                              (customer) => customer.value === value
                            )?.label
                          : "Search Customer..."}
                        <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px]">
                      <Command>
                        <CommandInput placeholder="Search Customers..." />
                        <CommandList>
                          <CommandEmpty>No Customer found.</CommandEmpty>
                          <CommandGroup>
                            {demoCustomers.map((customer) => (
                              <CommandItem
                                key={customer.value}
                                value={customer.value}
                                onSelect={(currentValue) => {
                                  setValue(
                                    currentValue === value ? "" : currentValue
                                  );
                                  setOpen(false);
                                }}
                              >
                                <CheckIcon
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    value === customer.value
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                {customer.label}
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
                          <div className="font-medium text-sm">{item.name}</div>
                          <div className="text-xs text-muted-foreground">
                            Stock: 100
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
                          <span className="w-8 text-center text-sm">
                            {item.quantity}
                          </span>
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
                      <td className="p-2 text-sm">{item.price.toFixed(2)}</td>
                      <td className="p-2">
                        <div className="flex items-center gap-1">
                          <Input
                            className="w-14 h-6 text-xs"
                            defaultValue="0"
                          />
                          <Select defaultValue="%">
                            <SelectTrigger className="w-15 h-6 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="%">%</SelectItem>
                              <SelectItem value="R">R</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </td>
                      <td className="p-2 font-medium text-sm">
                        {item.total.toFixed(2)}
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

        {/* Totals */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal:</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Tax (10%):</span>
            <span>${tax.toFixed(2)}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-bold text-lg">
            <span>Total:</span>
            <span>${total.toFixed(2)}</span>
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
                  Change: ${(parseFloat(cashAmount) - total).toFixed(2)}
                </p>
              )}
            </div>
          )}

          <Button
            onClick={onProcessPayment}
            disabled={cart.length === 0 || !paymentMethod}
            className="w-full"
            size="lg"
          >
            <Receipt className="w-4 h-4 mr-2" />
            Process Payment (${total.toFixed(2)})
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
