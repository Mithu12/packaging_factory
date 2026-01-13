"use client";

import { CustomerManagement } from "@/modules/sales/components/pos/CustomerManagement";

export default function CustomersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Customer Management</h1>
      </div>
      <CustomerManagement />
    </div>
  );
}
