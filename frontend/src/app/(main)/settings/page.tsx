"use client";

import { Suspense } from "react";
import Settings from "@/views/Settings";

export default function SettingsPage() {
  return (
    <Suspense fallback={null}>
      <Settings />
    </Suspense>
  );
}

