import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Clock, CheckCircle, Search, Plus, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

// Components
import { ProductSearch } from "@/components/pos/ProductSearch";
import { Cart } from "@/components/pos/Cart";
import { SalesPriceConfiguration } from "@/components/pos/SalesPriceConfiguration";
import { CustomerManagement } from "@/components/pos/CustomerManagement";
import { SalesOrderProcessing } from "@/components/pos/SalesOrderProcessing";
import { SalesReceiptRecording } from "@/components/pos/SalesReceiptRecording";

// Mock data
const mockProducts = [
  {
    id: "1",
    name: "Laptop Computer",
    price: 999.99,
    stock: 15,
    category: "Electronics",
    barcode: "123456789",
  },
  {
    id: "2",
    name: "Wireless Mouse",
    price: 29.99,
    stock: 50,
    category: "Electronics",
    barcode: "987654321",
  },
  {
    id: "3",
    name: "Office Chair",
    price: 199.99,
    stock: 8,
    category: "Furniture",
    barcode: "456789123",
  },
  {
    id: "4",
    name: "Notebook",
    price: 4.99,
    stock: 100,
    category: "Stationery",
    barcode: "789123456",
  },
  {
    id: "5",
    name: "Water Bottle",
    price: 12.99,
    stock: 25,
    category: "Accessories",
    barcode: "321654987",
  },
  {
    id: "6",
    name: "Desk Lamp",
    price: 45.99,
    stock: 12,
    category: "Electronics",
    barcode: "654987321",
  },
];

const mockCustomers = [
  {
    id: "1",
    name: "John Doe",
    email: "john@example.com",
    phone: "+1234567890",
  },
  {
    id: "2",
    name: "Jane Smith",
    email: "jane@example.com",
    phone: "+1987654321",
  },
  { id: "3", name: "Walk-in Customer", email: "", phone: "", isWalkIn: true },
];

const mockTransactions = [
  {
    id: "TXN-001",
    date: "2024-01-09 14:30",
    customer: "John Doe",
    items: 3,
    total: 1074.97,
    status: "Completed",
    paymentMethod: "Credit Card",
  },
  {
    id: "TXN-002",
    date: "2024-01-09 13:15",
    customer: "Walk-in Customer",
    items: 1,
    total: 29.99,
    status: "Completed",
    paymentMethod: "Cash",
  },
];

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  isWalkIn?: boolean;
}

export default function POSManager() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [customers, setCustomers] = useState<Customer[]>(mockCustomers);
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [cashAmount, setCashAmount] = useState("");
  const [overallDiscount, setOverallDiscount] = useState("");
  const [overallTax, setOverallTax] = useState("");
  const [activeTab, setActiveTab] = useState("pos");

  const addToCart = (product: (typeof mockProducts)[0]) => {
    const existingItem = cart.find((item) => item.id === product.id);

    if (existingItem) {
      if (existingItem.quantity < product.stock) {
        setCart(
          cart.map((item) =>
            item.id === product.id
              ? {
                  ...item,
                  quantity: item.quantity + 1,
                  total: (item.quantity + 1) * item.price,
                }
              : item
          )
        );
      } else {
        toast({
          title: "Insufficient Stock",
          description: `Only ${product.stock} items available`,
          variant: "destructive",
        });
      }
    } else {
      setCart([
        ...cart,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          total: product.price,
        },
      ]);
    }
  };

  const updateQuantity = (id: string, newQuantity: number) => {
    const product = mockProducts.find((p) => p.id === id);
    if (!product) return;

    if (newQuantity <= 0) {
      removeFromCart(id);
    } else if (newQuantity <= product.stock) {
      setCart(
        cart.map((item) =>
          item.id === id
            ? {
                ...item,
                quantity: newQuantity,
                total: newQuantity * item.price,
              }
            : item
        )
      );
    } else {
      toast({
        title: "Insufficient Stock",
        description: `Only ${product.stock} items available`,
        variant: "destructive",
      });
    }
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = overallDiscount
    ? (subtotal * parseFloat(overallDiscount)) / 100
    : 0;
  const discountedSubtotal = subtotal - discountAmount;
  const tax = overallTax
    ? (discountedSubtotal * parseFloat(overallTax)) / 100
    : 0;
  const total = discountedSubtotal + tax;

  const processPayment = () => {
    if (cart.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Please add items to cart before processing payment",
        variant: "destructive",
      });
      return;
    }

    if (!selectedCustomer) {
      toast({
        title: "Customer Required",
        description: "Please select a customer or choose Walk-in Customer",
        variant: "destructive",
      });
      return;
    }

    if (!paymentMethod) {
      toast({
        title: "Payment Method Required",
        description: "Please select a payment method",
        variant: "destructive",
      });
      return;
    }

    if (
      paymentMethod === "cash" &&
      (!cashAmount || parseFloat(cashAmount) < total)
    ) {
      toast({
        title: "Insufficient Cash",
        description: "Cash amount is less than total",
        variant: "destructive",
      });
      return;
    }

    // Process payment logic here
    toast({
      title: "Payment Processed",
      description: `Transaction completed successfully - ${paymentMethod}`,
    });

    // Clear cart and reset form
    setCart([]);
    setSelectedCustomer(null);
    setPaymentMethod("");
    setCashAmount("");
    setOverallDiscount("");
    setOverallTax("");
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
  };

  const handleAddCustomer = async (customerData: Omit<Customer, "id">) => {
    const newCustomer = {
      ...customerData,
      id: Date.now().toString(),
    };

    setCustomers((prev) => [...prev, newCustomer]);
    setSelectedCustomer(newCustomer);

    return newCustomer;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">POS Manager</h1>
        <Badge variant="secondary" className="text-sm">
          <Clock className="w-4 h-4 mr-1" />
          {new Date().toLocaleTimeString()}
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="pos">Point of Sale</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="receipts">Receipts</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="pos" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Product Selection */}
            <div className="space-y-4">
              <ProductSearch products={mockProducts} onAddToCart={addToCart} />
            </div>

            {/* Shopping Cart */}
            <div className="space-y-4">
              <Cart
                cart={cart}
                customers={customers}
                selectedCustomer={selectedCustomer}
                paymentMethod={paymentMethod}
                cashAmount={cashAmount}
                overallDiscount={overallDiscount}
                overallTax={overallTax}
                onUpdateQuantity={updateQuantity}
                onRemoveFromCart={removeFromCart}
                onClearCart={clearCart}
                onCustomerChange={setSelectedCustomer}
                onPaymentMethodChange={setPaymentMethod}
                onCashAmountChange={setCashAmount}
                onOverallDiscountChange={setOverallDiscount}
                onOverallTaxChange={setOverallTax}
                onProcessPayment={processPayment}
                onAddCustomer={handleAddCustomer}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="pricing">
          <SalesPriceConfiguration />
        </TabsContent>

        <TabsContent value="customers">
          <CustomerManagement />
        </TabsContent>

        <TabsContent value="orders">
          <SalesOrderProcessing />
        </TabsContent>

        <TabsContent value="receipts">
          <SalesReceiptRecording />
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Today's Sales</h3>
              <p className="text-2xl font-bold">$1,104.96</p>
              <p className="text-sm opacity-90">2 transactions</p>
            </div>
            <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Average Order</h3>
              <p className="text-2xl font-bold">$552.48</p>
              <p className="text-sm opacity-90">Per transaction</p>
            </div>
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Items Sold</h3>
              <p className="text-2xl font-bold">4</p>
              <p className="text-sm opacity-90">Products</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="font-semibold mb-4 text-lg">
                Recent Transactions
              </h3>
              <div className="space-y-3">
                {mockTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{transaction.id}</span>
                        <Badge
                          variant={
                            transaction.status === "Completed"
                              ? "default"
                              : "secondary"
                          }
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          {transaction.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {transaction.customer}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {transaction.date}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">
                        ${transaction.total.toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {transaction.items} items
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {transaction.paymentMethod}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <h3 className="font-semibold mb-4 text-lg">Payment Methods</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Credit Card</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: "66%" }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">66%</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Cash</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: "34%" }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium">34%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
