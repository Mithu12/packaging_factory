"use client";

import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Factory,
  Package,
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Activity,
  Zap,
  Target,
  DollarSign,
  Wallet,
  FileText,
  Users,
  Layers,
  RefreshCw,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFormatting } from "@/hooks/useFormatting";
import { FactoryDashboardApiService, factoryDashboardQueryKeys } from "@/services/factory-dashboard-api";
import { useQuery } from "@tanstack/react-query";

// Tailwind class pairs per accent. Kept as static strings so the JIT compiler
// can see every class literally (dynamic `bg-${color}-50` would be purged).
const STAT_STYLES = {
  blue: { card: "bg-blue-50/60 border-blue-100 dark:bg-blue-950/20 dark:border-blue-900", chip: "bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300" },
  indigo: { card: "bg-indigo-50/60 border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900", chip: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-300" },
  purple: { card: "bg-purple-50/60 border-purple-100 dark:bg-purple-950/20 dark:border-purple-900", chip: "bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-300" },
  sky: { card: "bg-sky-50/60 border-sky-100 dark:bg-sky-950/20 dark:border-sky-900", chip: "bg-sky-100 text-sky-600 dark:bg-sky-900/40 dark:text-sky-300" },
  green: { card: "bg-green-50/60 border-green-100 dark:bg-green-950/20 dark:border-green-900", chip: "bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-300" },
  emerald: { card: "bg-emerald-50/60 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900", chip: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300" },
  amber: { card: "bg-amber-50/60 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900", chip: "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-300" },
  yellow: { card: "bg-yellow-50/60 border-yellow-100 dark:bg-yellow-950/20 dark:border-yellow-900", chip: "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/40 dark:text-yellow-300" },
  orange: { card: "bg-orange-50/60 border-orange-100 dark:bg-orange-950/20 dark:border-orange-900", chip: "bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300" },
  red: { card: "bg-red-50/60 border-red-100 dark:bg-red-950/20 dark:border-red-900", chip: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300" },
  rose: { card: "bg-rose-50/60 border-rose-100 dark:bg-rose-950/20 dark:border-rose-900", chip: "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300" },
} as const;

type StatColor = keyof typeof STAT_STYLES;

interface StatCardProps {
  title: string;
  value: ReactNode;
  subtitle?: ReactNode;
  icon: LucideIcon;
  color: StatColor;
  loading?: boolean;
  /** Renders a dashed, de-emphasised card (e.g. an unconfigured slot). */
  muted?: boolean;
  /** When set, the whole card becomes a keyboard-accessible button. */
  onClick?: () => void;
}

function StatCard({ title, value, subtitle, icon: Icon, color, loading, muted, onClick }: StatCardProps) {
  const styles = STAT_STYLES[color];
  return (
    <Card
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        "border-2 shadow-sm transition-all duration-300 group overflow-hidden",
        muted ? "border-dashed bg-muted/30" : styles.card,
        onClick &&
          "cursor-pointer hover:shadow-lg hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      )}
    >
      <CardContent className="pt-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            {loading ? (
              <div className="h-8 w-24 mt-2 rounded-md bg-muted animate-pulse" />
            ) : (
              <p className="text-2xl font-bold text-foreground mt-1 truncate">{value}</p>
            )}
            {!loading && subtitle ? (
              <p className="text-xs text-muted-foreground/80 mt-1 truncate">{subtitle}</p>
            ) : null}
          </div>
          <div
            className={cn(
              "p-3 rounded-xl shrink-0 transition-transform duration-300 group-hover:scale-110",
              muted ? "bg-muted text-muted-foreground" : styles.chip
            )}
          >
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </h2>
  );
}

export default function FactoryDashboard() {
  const { formatCurrency, formatDate, formatNumber } = useFormatting();
  const router = useRouter();

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading, isFetching, refetch } = useQuery({
    queryKey: factoryDashboardQueryKeys.stats(),
    queryFn: () => FactoryDashboardApiService.getDashboardStats(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Render one of the four admin-mapped stock cards. Unmapped slots become a
  // dashed, clickable card that deep-links to Settings → Dashboard.
  const renderStockCard = (
    title: string,
    value: number | null | undefined,
    color: StatColor
  ) => {
    const configured = value != null;
    return (
      <StatCard
        title={title}
        icon={Layers}
        color={color}
        loading={statsLoading}
        value={configured ? formatNumber(value as number) : "Not set"}
        subtitle={configured ? "In stock" : "Tap to configure"}
        muted={!statsLoading && !configured}
        onClick={
          !statsLoading && !configured
            ? () => router.push("/settings?tab=dashboard")
            : undefined
        }
      />
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "in_progress":
      case "approved":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
      case "shipped":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Factory className="h-8 w-8 text-blue-600" />
            Factory Dashboard
          </h1>
          <p className="text-muted-foreground">
            Real-time overview of factory operations
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-2"
        >
          <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
          {isFetching ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {/* Production & People */}
      <div className="space-y-3">
        <SectionHeading>Production &amp; People</SectionHeading>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Customer Orders Qty"
            icon={Package}
            color="blue"
            loading={statsLoading}
            value={formatNumber(stats?.total_order_qty || 0)}
            subtitle="Units ordered across all orders"
          />
          <StatCard
            title="Today Production"
            icon={Target}
            color="purple"
            loading={statsLoading}
            value={formatNumber(Math.round(stats?.total_produced_today || 0))}
            subtitle="Units completed today"
          />
          <StatCard
            title="Pending Orders"
            icon={FileText}
            color="indigo"
            loading={statsLoading}
            value={formatNumber(stats?.pending_orders || 0)}
            subtitle={`${stats?.active_orders || 0} in progress`}
          />
          <StatCard
            title="Present Workers"
            icon={Users}
            color="sky"
            loading={statsLoading}
            value={`${formatNumber(stats?.present_workers || 0)} / ${formatNumber(stats?.total_workers || 0)}`}
            subtitle="Present today"
          />
        </div>
      </div>

      {/* Materials & Stock */}
      <div className="space-y-3">
        <SectionHeading>Materials &amp; Stock</SectionHeading>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {renderStockCard("Media Paper Stock", stats?.named_stock?.media_paper, "green")}
          {renderStockCard("Liner Paper Stock", stats?.named_stock?.liner_paper, "orange")}
          {renderStockCard("Silicate Gum Stock", stats?.named_stock?.silicate_gum, "amber")}
          {renderStockCard("Stitching Wire Stock", stats?.named_stock?.stitching_wire, "yellow")}
          <StatCard
            title="Low Stock Items"
            icon={Package}
            color="emerald"
            loading={statsLoading}
            value={formatNumber(stats?.low_stock_count || 0)}
            subtitle={`${stats?.out_of_stock_count || 0} out of stock`}
          />
          <StatCard
            title="Material Shortages"
            icon={AlertTriangle}
            color="red"
            loading={statsLoading}
            value={formatNumber(stats?.material_shortages || 0)}
            subtitle={`${stats?.wastage_pending_approval || 0} pending approval`}
          />
        </div>
      </div>

      {/* Finance */}
      <div className="space-y-3">
        <SectionHeading>Finance</SectionHeading>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <StatCard
            title="Daily Revenue"
            icon={TrendingUp}
            color="green"
            loading={statsLoading}
            value={formatCurrency(stats?.daily_revenue || 0)}
            subtitle="Invoiced today"
          />
          <StatCard
            title="Daily Expenses"
            icon={DollarSign}
            color="red"
            loading={statsLoading}
            value={formatCurrency(stats?.daily_expenses || 0)}
            subtitle="Spent today"
          />
          <StatCard
            title="Electricity Bill"
            icon={Zap}
            color="yellow"
            loading={statsLoading}
            value={formatCurrency(stats?.electricity_bill_month || 0)}
            subtitle="Utilities this month"
          />
          <StatCard
            title="Outstanding Dues"
            icon={Wallet}
            color="purple"
            loading={statsLoading}
            value={formatCurrency(stats?.total_outstanding_dues || 0)}
            subtitle={`${stats?.customers_with_dues || 0} customers`}
          />
          <StatCard
            title="Total Supplier Dues"
            icon={Wallet}
            color="rose"
            loading={statsLoading}
            value={formatCurrency(stats?.total_supplier_dues || 0)}
            subtitle="Payable to suppliers"
          />
        </div>
      </div>

      {/* Inventory Overview & Customer Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-orange-50/50 border-orange-100 dark:bg-orange-950/20 dark:border-orange-900 shadow-md hover:shadow-lg transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-300">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                Inventory Overview
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/inventory")}
                className="border-orange-200 hover:bg-orange-50 text-orange-700 dark:border-orange-800 dark:hover:bg-orange-950/40 dark:text-orange-300"
              >
                Manage
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-lg bg-white/60 border border-orange-100/50 shadow-sm dark:bg-orange-950/30 dark:border-orange-900/40">
                  <p className="text-2xl font-bold text-foreground">
                    {statsLoading ? "..." : stats?.total_products || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Products</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-white/60 border border-amber-200/50 shadow-sm dark:bg-amber-950/30 dark:border-amber-900/40">
                  <p className="text-2xl font-bold text-amber-600">
                    {statsLoading ? "..." : stats?.low_stock_count || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Low Stock</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-white/60 border border-red-200/50 shadow-sm dark:bg-red-950/30 dark:border-red-900/40">
                  <p className="text-2xl font-bold text-red-600">
                    {statsLoading ? "..." : stats?.out_of_stock_count || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Out of Stock</p>
                </div>
              </div>
              {(stats?.low_stock_count || 0) > 0 && (
                <div className="p-3 mt-4 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    <AlertTriangle className="w-4 h-4 inline mr-2" />
                    {stats?.low_stock_count} products need restocking soon
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-violet-50/50 border-violet-100 dark:bg-violet-950/20 dark:border-violet-900 shadow-md hover:shadow-lg transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-violet-100 text-violet-600 dark:bg-violet-900/40 dark:text-violet-300">
                  <Users className="w-5 h-5" />
                </div>
                Customer Payments
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/factory/customers")}
                className="border-violet-200 hover:bg-violet-50 text-violet-700 dark:border-violet-800 dark:hover:bg-violet-950/40 dark:text-violet-300"
              >
                View All
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 rounded-lg bg-white/60 border border-violet-100/50 shadow-sm dark:bg-violet-950/30 dark:border-violet-900/40">
                  <p className="text-2xl font-bold text-foreground">
                    {statsLoading ? "..." : formatCurrency(stats?.total_outstanding_dues || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Outstanding</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-white/60 border border-violet-100/50 shadow-sm dark:bg-violet-950/30 dark:border-violet-900/40">
                  <p className="text-2xl font-bold text-violet-600">
                    {statsLoading ? "..." : stats?.customers_with_dues || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Customers with Dues</p>
                </div>
              </div>
              {(stats?.total_outstanding_dues || 0) > 0 && (
                <div className="p-3 mt-4 rounded-lg bg-violet-50 border border-violet-200 dark:bg-violet-950/30 dark:border-violet-800">
                  <p className="text-sm text-violet-800 dark:text-violet-200">
                    <Wallet className="w-4 h-4 inline mr-2" />
                    Collect outstanding dues to improve cash flow
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Avg Efficiency
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading
                ? "..."
                : `${stats?.average_efficiency.toFixed(1) || 0}%`}
            </div>
            <p className="text-xs text-gray-500">Production efficiency</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Avg Quality
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading
                ? "..."
                : `${stats?.average_quality.toFixed(1) || 0}%`}
            </div>
            <p className="text-xs text-gray-500">Quality rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Material Allocations
            </CardTitle>
            <Package className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : stats?.total_allocations || 0}
            </div>
            <p className="text-xs text-gray-500">Active allocations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Wastage Cost
            </CardTitle>
            <DollarSign className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading
                ? "..."
                : formatCurrency(stats?.total_wastage_cost || 0)}
            </div>
            <p className="text-xs text-gray-500">Total wastage</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {stats && (stats.material_shortages > 0 || stats.overdue_orders > 0 || stats.quality_issues > 0 || stats.wastage_pending_approval > 0) && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Alerts & Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.material_shortages > 0 && (
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5" />
                  <div>
                    <div className="font-medium">Material Shortages</div>
                    <div className="text-sm text-gray-600">
                      {stats.material_shortages} materials need attention
                    </div>
                  </div>
                </div>
              )}
              {stats.overdue_orders > 0 && (
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-red-600 mt-0.5" />
                  <div>
                    <div className="font-medium">Overdue Orders</div>
                    <div className="text-sm text-gray-600">
                      {stats.overdue_orders} orders past due date
                    </div>
                  </div>
                </div>
              )}
              {stats.quality_issues > 0 && (
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div>
                    <div className="font-medium">Quality Issues</div>
                    <div className="text-sm text-gray-600">
                      {stats.quality_issues} runs below 90% quality
                    </div>
                  </div>
                </div>
              )}
              {stats.wastage_pending_approval > 0 && (
                <div className="flex items-start gap-2">
                  <Clock className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div>
                    <div className="font-medium">Pending Approvals</div>
                    <div className="text-sm text-gray-600">
                      {stats.wastage_pending_approval} wastage records
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Recent Orders</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/factory/orders")}
              >
                View All
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : !stats?.recent_orders || stats.recent_orders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No recent orders
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recent_orders.map((order: any) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer"
                    onClick={() =>
                      router.push("/factory/customer-orders")
                    }
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {order.order_number}
                      </div>
                      <div className="text-xs text-gray-500">
                        {order.customer_name}
                      </div>
                    </div>
                    <Badge className={getStatusColor(order.status)}>
                      {order.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Work Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Recent Work Orders</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/factory/work-orders")}
              >
                View All
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : !stats?.recent_work_orders || stats.recent_work_orders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No recent work orders
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recent_work_orders.map((wo: any) => (
                  <div
                    key={wo.id}
                    className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer"
                    onClick={() =>
                      router.push(`/factory/work-orders`)
                    }
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {wo.work_order_number}
                      </div>
                      <div className="text-xs text-gray-500">
                        {wo.product_name}
                      </div>
                    </div>
                    <Badge className={getStatusColor(wo.status)}>
                      {wo.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Production Runs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Active Production</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/factory/production")}
              >
                View All
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : !stats?.recent_production_runs || stats.recent_production_runs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No active production runs
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recent_production_runs.map((run: any) => (
                  <div
                    key={run.id}
                    className="p-2 hover:bg-gray-50 rounded cursor-pointer"
                    onClick={() =>
                      router.push("/factory/production")
                    }
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-medium text-sm">
                        {run.run_number}
                      </div>
                      <Badge className={getStatusColor(run.status)}>
                        {run.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500 mb-2">
                      {run.work_order_number}
                    </div>
                    <div className="text-xs text-gray-600">
                      {run.produced_quantity} / {run.target_quantity} units (
                      {Number(run.efficiency_percentage || 0).toFixed(0)}%)
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="h-20 flex flex-col gap-2"
              onClick={() => router.push("/factory/orders")}
            >
              <Package className="h-6 w-6" />
              <span>Review Orders</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex flex-col gap-2"
              onClick={() => router.push("/factory/work-orders")}
            >
              <Activity className="h-6 w-6" />
              <span>Plan Work Orders</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex flex-col gap-2"
              onClick={() => router.push("/factory/mrp")}
            >
              <AlertTriangle className="h-6 w-6" />
              <span>Material Planning</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex flex-col gap-2"
              onClick={() => router.push("/factory/production")}
            >
              <Zap className="h-6 w-6" />
              <span>Production Floor</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
