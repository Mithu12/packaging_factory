"use client";

import { SalesOrderProcessing } from "@/modules/sales/components/pos/SalesOrderProcessing";

export default function SalesOrdersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Sales Orders</h1>
      </div>
      <SalesOrderProcessing />
    </div>
  );
}
