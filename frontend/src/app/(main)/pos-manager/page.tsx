"use client";

﻿import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Gift } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

// Components
import { ProductSearch } from "@/modules/sales/components/pos/ProductSearch";
import { Cart } from "@/modules/sales/components/pos/Cart";
// import { SalesReceiptRecording } from "@/modules/sales/components/pos/SalesReceiptRecording";
import { Receipt } from "@/modules/sales/components/pos/Receipt";
import { BarcodeScanner } from "@/modules/inventory/components/BarcodeScanner";

// API Services
import { ProductApi, CustomerApi, SalesOrderApi, DistributionApi } from "@/services/api";
import { Product, Customer, SalesOrder } from "@/services/types";
import { useFormatting } from "@/hooks/useFormatting";
import { useAuth } from "@/contexts/AuthContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
  stock: number;
  discount?: number;
  discountType?: 'percentage' | 'fixed';
  isGift: boolean;
}

export default function POSManager() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [cashAmount, setCashAmount] = useState("");
  const [partialPaymentAmount, setPartialPaymentAmount] = useState("");
  const [overallDiscount, setOverallDiscount] = useState("");
  const [overallDiscountType, setOverallDiscountType] = useState<'percentage' | 'flat'>('percentage');
  const [overallTax, setOverallTax] = useState("");
  const [loading, setLoading] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [isGiftMode, setIsGiftMode] = useState(false);
  const { user } = useAuth();
  const [distributionCenters, setDistributionCenters] = useState<any[]>([]);
  const [selectedDistributionCenterId, setSelectedDistributionCenterId] = useState<string>("");

  const { formatCurrency } = useFormatting();

  // Helper function to get product price based on customer type
  const getProductPrice = (product: Product, customerType?: string): number => {
    if (customerType === 'wholesale' && product.wholesale_price !== undefined && product.wholesale_price !== null) {
      return product.wholesale_price;
    }
    return product.selling_price;
  };

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Recalculate cart prices when customer changes
  useEffect(() => {
    if (cart.length > 0 && selectedCustomer) {
      setCart(prevCart => 
        prevCart.map(item => {
          const product = products.find(p => p.id.toString() === item.id);
          if (!product) return item;
          
          const newPrice = getProductPrice(product, selectedCustomer.customer_type);
          if (newPrice !== item.price) {
            return {
              ...item,
              price: newPrice,
              total: item.isGift ? 0 : newPrice * item.quantity,
            };
          }
          return item;
        })
      );
    }
  }, [selectedCustomer?.customer_type, products]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [productsData, customersData, salesOrdersData, distributionData] = await Promise.all([
        ProductApi.getProducts({ page: 1, limit: 100 }),
        CustomerApi.getCustomers({ page: 1, limit: 100 }),
        SalesOrderApi.getSalesOrders({ page: 1, limit: 100 }),
        DistributionApi.getDistributionCenters({ page: 1, limit: 100 })
      ]);

      setProducts(productsData.products || []);
      setCustomers(customersData.customers || []);
      setSalesOrders(salesOrdersData.sales_orders || []);
      setDistributionCenters(distributionData.centers || []);
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
    // For gifts, we don't need to check stock (since they're free)
    if (!isGiftMode && product.current_stock <= 0) {
      toast({
        title: "Out of Stock",
        description: `${product.name} is currently out of stock`,
        variant: "destructive",
      });
      return;
    }

    // Find existing item considering both product id and gift status
    const existingItem = cart.find((item) =>
      item.id === product.id.toString() && item.isGift === isGiftMode
    );

    if (existingItem) {
      if (isGiftMode || existingItem.quantity < product.current_stock) {
        setCart(
          cart.map((item) =>
            item.id === product.id.toString() && item.isGift === isGiftMode
              ? {
                ...item,
                quantity: item.quantity + 1,
                total: isGiftMode ? 0 : (item.quantity + 1) * item.price,
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
      const productPrice = getProductPrice(product, selectedCustomer?.customer_type);
      setCart([
        ...cart,
        {
          id: product.id.toString(),
          name: product.name,
          price: productPrice,
          quantity: 1,
          total: isGiftMode ? 0 : productPrice,
          stock: product.current_stock,
          isGift: isGiftMode,
          discount: isGiftMode ? 100 : undefined,
          discountType: isGiftMode ? 'percentage' : undefined,
        },
      ]);
    }

    toast({
      title: isGiftMode ? "Gift Added" : "Added to Cart",
      description: `${product.name} ${isGiftMode ? 'added as gift' : 'added to cart'}`,
    });
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

    // Credit payment validation
    if (paymentMethod === "credit") {
      if (selectedCustomer.customer_type === 'walk_in') {
        toast({
          title: "Credit Not Allowed",
          description: "Walk-in customers cannot use credit",
          variant: "destructive",
        });
        return;
      }

      const currentDue = Number(selectedCustomer.due_amount) || 0;
      const creditLimit = Number(selectedCustomer.credit_limit) || 0;
      const newTotalDue = currentDue + total;

      if (newTotalDue > creditLimit) {
        toast({
          title: "Credit Limit Exceeded",
          description: `This order would exceed the credit limit by $${Number(newTotalDue - creditLimit).toFixed(2)}`,
          variant: "destructive",
        });
        return;
      }
    }

    // Partial payment validation
    if (paymentMethod === "partial") {
      if (selectedCustomer.customer_type === 'walk_in') {
        toast({
          title: "Partial Payment Not Allowed",
          description: "Walk-in customers cannot use partial payment",
          variant: "destructive",
        });
        return;
      }

      if (!partialPaymentAmount || parseFloat(partialPaymentAmount) <= 0) {
        toast({
          title: "Invalid Payment Amount",
          description: "Please enter a valid payment amount",
          variant: "destructive",
        });
        return;
      }

      if (parseFloat(partialPaymentAmount) > total) {
        toast({
          title: "Payment Too High",
          description: "Payment amount cannot exceed order total",
          variant: "destructive",
        });
        return;
      }

      const currentDue = Number(selectedCustomer.due_amount) || 0;
      const creditLimit = Number(selectedCustomer.credit_limit) || 0;
      const remainingDue = total - parseFloat(partialPaymentAmount);
      const newTotalDue = currentDue + remainingDue;

      console.log({ creditLimit, currentDue, newTotalDue });
      if (newTotalDue > creditLimit) {
        toast({
          title: "Credit Limit Exceeded",
          description: `This order would exceed the credit limit by $${Number(newTotalDue - creditLimit).toFixed(2)}`,
          variant: "destructive",
        });
        return;
      }
    }

    try {
      setLoading(true);

      // Create sales order
      const getDueAmount = () => {
        if (paymentMethod === "credit") return total;
        if (paymentMethod === "partial") return total - parseFloat(partialPaymentAmount);
        return 0;
      };

      const getCashReceived = () => {
        if (paymentMethod === "cash") return parseFloat(cashAmount) || total;
        if (paymentMethod === "partial") return parseFloat(partialPaymentAmount);
        return undefined;
      };

      const salesOrderData = {
        customer_id: selectedCustomer.id,
        cashier_id: user?.id || 1,
        distribution_center_id: user?.role === 'admin' && selectedDistributionCenterId
          ? parseInt(selectedDistributionCenterId)
          : undefined,
        payment_method: paymentMethod === "partial" ? "cash" : paymentMethod as "cash" | "card" | "credit" | "check" | "bank_transfer",
        cash_received: getCashReceived(),
        due_amount: getDueAmount(),
        notes: paymentMethod === "partial"
          ? `Partial payment: $${Number(partialPaymentAmount).toFixed(2)} paid, $${Number(total - parseFloat(partialPaymentAmount)).toFixed(2)} due`
          : `Payment processed via ${paymentMethod}`,
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
            total_price: itemTotal,
            is_gift: item.isGift || false
          };
        })
      };

      const newOrder = await SalesOrderApi.createSalesOrder(salesOrderData);

      // Update customer due amount locally for credit/partial sales
      if ((paymentMethod === "credit" || paymentMethod === "partial") && selectedCustomer) {
        const dueAmount = paymentMethod === "credit" ? total : total - parseFloat(partialPaymentAmount);
        const updatedCustomer = {
          ...selectedCustomer,
          due_amount: (Number(selectedCustomer.due_amount) || 0) + dueAmount
        };
        setSelectedCustomer(updatedCustomer);

        // Update the customer in the customers list as well
        setCustomers(prev => prev.map(customer =>
          customer.id === selectedCustomer.id ? updatedCustomer : customer
        ));
      }

      // Prepare receipt data
      const receiptInfo = {
        orderNumber: newOrder.order_number,
        customer: selectedCustomer,
        cart: [...cart], // Copy cart before clearing
        subtotal: subtotal,
        overallDiscount: parseFloat(overallDiscount) || 0,
        overallDiscountType: overallDiscountType,
        tax: tax,
        total: total,
        paymentMethod: paymentMethod,
        cashReceived: paymentMethod === "cash" ? parseFloat(cashAmount) || total : undefined,
        changeGiven: paymentMethod === "cash" ? Math.max(0, (parseFloat(cashAmount) || total) - total) : undefined,
        orderDate: newOrder.order_date,
        notes: `Payment processed via ${paymentMethod}`
      };

      // Show receipt
      setReceiptData(receiptInfo);
      setShowReceipt(true);

      toast({
        title: paymentMethod === "credit"
          ? "Credit Sale Processed"
          : paymentMethod === "partial"
            ? "Partial Payment Processed"
            : "Payment Processed",
        description: paymentMethod === "credit"
          ? `$${Number(total).toFixed(2)} added to ${selectedCustomer.name}'s account`
          : paymentMethod === "partial"
            ? `$${Number(partialPaymentAmount).toFixed(2)} paid, $${Number(total - parseFloat(partialPaymentAmount)).toFixed(2)} added to ${selectedCustomer.name}'s account`
            : `Transaction completed successfully - ${paymentMethod}`,
      });

      // Clear cart and reset form
      setCart([]);
      setSelectedCustomer(null);
      setPaymentMethod("");
      setCashAmount("");
      setPartialPaymentAmount("");
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

        {user?.role === 'admin' && (
          <div className="w-[250px]">
            <Select
              value={selectedDistributionCenterId}
              onValueChange={setSelectedDistributionCenterId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Distribution Center" />
              </SelectTrigger>
              <SelectContent>
                {distributionCenters.map((dc) => (
                  <SelectItem key={dc.id} value={dc.id.toString()}>
                    {dc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* Gift Mode Toggle */}
        <div className="flex items-center justify-between bg-card border rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="gift-mode"
              checked={isGiftMode}
              onCheckedChange={setIsGiftMode}
            />
            <Label htmlFor="gift-mode" className="flex items-center gap-2 cursor-pointer">
              <Gift className={`h-4 w-4 ${isGiftMode ? 'text-yellow-600' : 'text-muted-foreground'}`} />
              Gift Mode
            </Label>
          </div>
          {isGiftMode && (
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
              Products will be added as gifts (100% discount)
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Product Selection */}
          <div className="space-y-4">
            <BarcodeScanner onProductFound={addToCart} />
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
              partialPaymentAmount={partialPaymentAmount}
              overallDiscount={overallDiscount}
              overallDiscountType={overallDiscountType}
              overallTax={overallTax}
              onUpdateQuantity={updateQuantity}
              onRemoveFromCart={removeFromCart}
              onClearCart={clearCart}
              onCustomerChange={setSelectedCustomer}
              onPaymentMethodChange={setPaymentMethod}
              onCashAmountChange={setCashAmount}
              onPartialPaymentAmountChange={setPartialPaymentAmount}
              onOverallDiscountChange={handleOverallDiscountChange}
              onOverallTaxChange={setOverallTax}
              onProcessPayment={processPayment}
              onAddCustomer={handleAddCustomer}
              onUpdateItemDiscount={updateItemDiscount}
              loading={loading}
            />
          </div>
        </div>
      </div>

      {/* Receipt Dialog */}
      {showReceipt && receiptData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Payment Successful!</h2>
            <p className="text-gray-600 mb-4">
              Order #{receiptData.orderNumber} has been processed successfully.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Would you like to print or download the receipt?
            </p>

            <Receipt {...receiptData} />

            <div className="mt-4">
              <Button
                onClick={() => setShowReceipt(false)}
                variant="outline"
                className="w-full"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
