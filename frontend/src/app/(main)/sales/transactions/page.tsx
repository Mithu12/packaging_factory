"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { SalesOrderApi } from "@/services/api";
import { SalesOrder } from "@/services/types";
import { useFormatting } from "@/hooks/useFormatting";
import { toast } from "@/hooks/use-toast";

export default function TransactionsPage() {
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const { formatCurrency } = useFormatting();

  useEffect(() => {
    loadSalesOrders();
  }, []);

  const loadSalesOrders = async () => {
    try {
      setLoading(true);
      const result = await SalesOrderApi.getSalesOrders({ page: 1, limit: 100 });
      setSalesOrders(result.sales_orders || []);
    } catch (error) {
      console.error("Error loading sales orders:", error);
      toast({
        title: "Error",
        description: "Failed to load transactions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Get recent transactions for display
  const recentTransactions = salesOrders.slice(0, 5).map(order => ({
    id: order.order_number,
    date: new Date(order.created_at).toLocaleString(),
    customer: order.customer_name || "Walk-in Customer",
    items: order.product_count,
    total: order.total_amount,
    status: order.status,
    paymentMethod: order.payment_method
  }));

  // Calculate today's stats
  const today = new Date().toDateString();
  const todayOrders = salesOrders.filter(order =>
    new Date(order.created_at).toDateString() === today
  );
  const todaySales = todayOrders.reduce((sum, order) => sum + Number(order.total_amount), 0);
  const averageOrder = todayOrders.length > 0 ? todaySales / todayOrders.length : 0;
  const itemsSold = todayOrders.reduce((sum, order) => sum + Number(order.product_count), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Transactions</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Today's Sales</h3>
          <p className="text-2xl font-bold">{formatCurrency(todaySales)}</p>
          <p className="text-sm opacity-90">{todayOrders.length} transactions</p>
        </div>
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Average Order</h3>
          <p className="text-2xl font-bold">{formatCurrency(averageOrder)}</p>
          <p className="text-sm opacity-90">Per transaction</p>
        </div>
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Items Sold</h3>
          <p className="text-2xl font-bold">{itemsSold}</p>
          <p className="text-sm opacity-90">Products</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
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
                    {formatCurrency(transaction.total)}
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
        </Card>

        <Card className="p-6">
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
        </Card>
      </div>
    </div>
  );
}
