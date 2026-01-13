"use client";

import { SalesPriceConfiguration } from "@/modules/sales/components/pos/SalesPriceConfiguration";

export default function PricingPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Sales Price Configuration</h1>
      </div>
      <SalesPriceConfiguration />
    </div>
  );
}
