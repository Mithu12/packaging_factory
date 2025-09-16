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

// API Services
import { ProductApi, CustomerApi, SalesOrderApi } from "@/services/api";
import { Product, Customer, SalesOrder } from "@/services/types";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
  stock: number;
  discount?: number;
  discountType?: 'percentage' | 'fixed';
}

export default function POSManager() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [cashAmount, setCashAmount] = useState("");
  const [overallDiscount, setOverallDiscount] = useState("");
  const [overallDiscountType, setOverallDiscountType] = useState<'percentage' | 'flat'>('percentage');
  const [overallTax, setOverallTax] = useState("");
  const [activeTab, setActiveTab] = useState("pos");
  const [loading, setLoading] = useState(false);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [productsData, customersData, salesOrdersData] = await Promise.all([
        ProductApi.getProducts({ page: 1, limit: 100 }),
        CustomerApi.getCustomers({ page: 1, limit: 100 }),
        SalesOrderApi.getSalesOrders({ page: 1, limit: 100 })
      ]);

      setProducts(productsData.products || []);
      setCustomers(customersData.customers || []);
      setSalesOrders(salesOrdersData.sales_orders || []);
    } catch (error) {
      console.error("Error loading initial data:", error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product: Product) => {
    // Check if product has stock
    if (product.current_stock <= 0) {
      toast({
        title: "Out of Stock",
        description: `${product.name} is currently out of stock`,
        variant: "destructive",
      });
      return;
    }

    const existingItem = cart.find((item) => item.id === product.id.toString());

    if (existingItem) {
      if (existingItem.quantity < product.current_stock) {
        setCart(
          cart.map((item) =>
            item.id === product.id.toString()
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
          description: `Only ${product.current_stock} items available`,
          variant: "destructive",
        });
      }
    } else {
      setCart([
        ...cart,
        {
          id: product.id.toString(),
          name: product.name,
          price: product.selling_price,
          quantity: 1,
          total: product.selling_price,
          stock: product.current_stock,
        },
      ]);
    }
  };

  const updateQuantity = (id: string, newQuantity: number) => {
    const product = products.find((p) => p.id.toString() === id);
    if (!product) return;

    if (newQuantity <= 0) {
      removeFromCart(id);
    } else if (newQuantity <= product.current_stock) {
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
        description: `Only ${product.current_stock} items available`,
        variant: "destructive",
      });
    }
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  const updateItemDiscount = (id: string, discount: number, discountType: 'percentage' | 'fixed') => {
    setCart(cart.map((item) =>
      item.id === id
        ? {
            ...item,
            discount,
            discountType,
          }
        : item
    ));
  };

  const handleOverallDiscountChange = (discount: string, discountType: 'percentage' | 'flat') => {
    setOverallDiscount(discount);
    setOverallDiscountType(discountType);
  };

  const subtotal = cart.reduce((sum, item) => {
    const itemSubtotal = item.price * item.quantity;
    let itemDiscount = 0;
    
    if (item.discount && item.discount > 0) {
      if (item.discountType === 'percentage') {
        itemDiscount = (itemSubtotal * item.discount) / 100;
      } else {
        itemDiscount = item.discount;
      }
    }
    
    return sum + (itemSubtotal - itemDiscount);
  }, 0);
  const discountAmount = overallDiscount
    ? overallDiscountType === 'percentage'
      ? (subtotal * parseFloat(overallDiscount)) / 100
      : parseFloat(overallDiscount)
    : 0;
  const discountedSubtotal = subtotal - discountAmount;
  const tax = overallTax
    ? (discountedSubtotal * parseFloat(overallTax)) / 100
    : 0;
  const total = discountedSubtotal + tax;

  const processPayment = async () => {
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

    try {
      setLoading(true);
      
      // Create sales order
      const salesOrderData = {
        customer_id: selectedCustomer.id,
        cashier_id: 1, // TODO: Get from auth context
        payment_method: paymentMethod as "cash" | "card" | "credit" | "check" | "bank_transfer",
        cash_received: paymentMethod === "cash" ? parseFloat(cashAmount) || total : undefined,
        notes: `Payment processed via ${paymentMethod}`,
        discount_amount: overallDiscountType === 'flat' ? parseFloat(overallDiscount) : 0,
        discount_percentage: overallDiscountType === 'percentage' ? parseFloat(overallDiscount) : 0,
        tax_amount: tax,
        line_items: cart.map(item => {
          const itemSubtotal = item.price * item.quantity;
          let itemDiscount = 0;
          
          if (item.discount && item.discount > 0) {
            if (item.discountType === 'percentage') {
              itemDiscount = (itemSubtotal * item.discount) / 100;
            } else {
              itemDiscount = item.discount;
            }
          }
          
          const itemTotal = itemSubtotal - itemDiscount;
          
          return {
            product_id: parseInt(item.id),
            quantity: item.quantity,
            unit_price: item.price,
            discount_percentage: item.discountType === 'percentage' ? item.discount : 0,
            discount_amount: item.discountType === 'fixed' ? item.discount : 0,
            total_price: itemTotal
          };
        })
      };

      const newOrder = await SalesOrderApi.createSalesOrder(salesOrderData);
      
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

      // Refresh sales orders
      const updatedOrders = await SalesOrderApi.getSalesOrders({ page: 1, limit: 100 });
      setSalesOrders(updatedOrders.sales_orders || []);

    } catch (error) {
      console.error("Error processing payment:", error);
      toast({
        title: "Payment Failed",
        description: "Failed to process payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
  };

  const handleAddCustomer = async (customerData: any) => {
    try {
      const newCustomer = await CustomerApi.createCustomer(customerData);
      setCustomers((prev) => [...prev, newCustomer]);
      setSelectedCustomer(newCustomer);
      return newCustomer;
    } catch (error) {
      console.error("Error adding customer:", error);
      toast({
        title: "Error",
        description: "Failed to add customer",
        variant: "destructive",
      });
      throw error;
    }
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
              <ProductSearch products={products} onAddToCart={addToCart} />
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
                overallDiscountType={overallDiscountType}
                overallTax={overallTax}
                onUpdateQuantity={updateQuantity}
                onRemoveFromCart={removeFromCart}
                onClearCart={clearCart}
                onCustomerChange={setSelectedCustomer}
                onPaymentMethodChange={setPaymentMethod}
                onCashAmountChange={setCashAmount}
                onOverallDiscountChange={handleOverallDiscountChange}
                onOverallTaxChange={setOverallTax}
                onProcessPayment={processPayment}
                onAddCustomer={handleAddCustomer}
                onUpdateItemDiscount={updateItemDiscount}
                loading={loading}
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
          {(() => {
            // Get recent transactions for display
            const recentTransactions = salesOrders.slice(0, 5).map(order => ({
              id: order.order_number,
              date: new Date(order.created_at).toLocaleString(),
              customer: order.customer_name || "Walk-in Customer",
              items: 0, // TODO: Get from line items when available
              total: order.total_amount,
              status: order.status,
              paymentMethod: order.payment_method
            }));

            // Calculate today's stats
            const today = new Date().toDateString();
            const todayOrders = salesOrders.filter(order => 
              new Date(order.created_at).toDateString() === today
            );
            const todaySales = todayOrders.reduce((sum, order) => sum + order.total_amount, 0);
            const averageOrder = todayOrders.length > 0 ? todaySales / todayOrders.length : 0;
            const itemsSold = 0; // TODO: Calculate from line items when available

            return (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg">
                    <h3 className="text-lg font-semibold mb-2">Today's Sales</h3>
                    <p className="text-2xl font-bold">${Number(todaySales).toFixed(2)}</p>
                    <p className="text-sm opacity-90">{todayOrders.length} transactions</p>
                  </div>
                  <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-lg">
                    <h3 className="text-lg font-semibold mb-2">Average Order</h3>
                    <p className="text-2xl font-bold">${Number(averageOrder).toFixed(2)}</p>
                    <p className="text-sm opacity-90">Per transaction</p>
                  </div>
                  <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-lg">
                    <h3 className="text-lg font-semibold mb-2">Items Sold</h3>
                    <p className="text-2xl font-bold">{itemsSold}</p>
                    <p className="text-sm opacity-90">Products</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="font-semibold mb-4 text-lg">
                      Recent Transactions
                    </h3>
                    <div className="space-y-3">
                      {recentTransactions.map((transaction) => (
                        <div
                          key={transaction.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{transaction.id}</span>
                              <Badge
                                variant={
                                  transaction.status === "completed"
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
                              ${Number(transaction.total).toFixed(2)}
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
              </>
            );
          })()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
