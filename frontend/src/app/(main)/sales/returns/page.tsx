"use client";

import { useState, useEffect } from "react";
import { ReturnsManager } from "@/modules/sales/components/pos/ReturnsManager";
import { SalesOrderApi } from "@/services/api";
import { SalesOrder } from "@/services/types";
import { toast } from "@/hooks/use-toast";

export default function ReturnsPage() {
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);

  useEffect(() => {
    loadSalesOrders();
  }, []);

  const loadSalesOrders = async () => {
    try {
      const result = await SalesOrderApi.getSalesOrders({ page: 1, limit: 100 });
      setSalesOrders(result.sales_orders || []);
    } catch (error) {
      console.error("Error loading sales orders:", error);
      toast({
        title: "Error",
        description: "Failed to load sales orders",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Returns Management</h1>
      </div>
      <ReturnsManager
        salesOrders={salesOrders}
        onRefresh={loadSalesOrders}
      />
    </div>
  );
}
