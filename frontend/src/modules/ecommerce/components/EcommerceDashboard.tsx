"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, Plus } from "lucide-react";
import { DashboardStats } from "./DashboardStats";
import { RecentOrdersTable } from "./RecentOrdersTable";
import { SalesChart } from "./SalesChart";
import { RevenueByCategoryChart } from "./RevenueByCategoryChart";
import { cn } from "@/lib/utils";

export function EcommerceDashboard() {
  const [activeFilter, setActiveFilter] = React.useState("Today");
  const filters = ["Today", "YTD", "7D", "15D", "30D"];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Ecommerce Dashboard
          </h2>
          <p className="text-muted-foreground">
            Overview of your business operations
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={cn(
                  "px-3 py-1 text-sm font-medium rounded-md transition-all",
                  activeFilter === filter
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {filter}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="bg-background gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4" />
              Quick Actions
            </Button>
          </div>
        </div>
      </div>

      <DashboardStats />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <SalesChart />
        <RevenueByCategoryChart />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <RecentOrdersTable />
      </div>
    </div>
  );
}
