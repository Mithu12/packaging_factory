"use client";

import { Suspense } from "react";
import DeliveryReturns from "@/modules/factory/pages/DeliveryReturns";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <DeliveryReturns />
    </Suspense>
  );
}
