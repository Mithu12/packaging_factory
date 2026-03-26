"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  BarChart3,
  Wallet,
  FileText,
  Users,
} from "lucide-react";
import { useFormatting } from "@/hooks/useFormatting";
import { FactoryDashboardApiService, factoryDashboardQueryKeys } from "@/services/factory-dashboard-api";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function FactoryDashboard() {
  const { formatCurrency, formatDate, formatNumber } = useFormatting();
  const router = useRouter();

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: factoryDashboardQueryKeys.stats(),
    queryFn: () => FactoryDashboardApiService.getDashboardStats(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

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

  const chartData12Months = useMemo(() => {
    const data = stats?.monthly_income ?? [];
    return data.map(({ month, income }) => {
      const [year, m] = month.split("-");
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const label = `${monthNames[parseInt(m, 10) - 1]} ${year}`;
      return { month: label, income, fullMonth: month };
    });
  }, [stats?.monthly_income]);

  const chartData30Days = useMemo(() => {
    const data = stats?.daily_income ?? [];
    return data.map(({ date, income }) => {
      const d = new Date(date);
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const label = `${monthNames[d.getMonth()]} ${d.getDate()}`;
      return { date: label, income, fullDate: date };
    });
  }, [stats?.daily_income]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Factory className="h-8 w-8 text-blue-600" />
            Factory Dashboard
          </h1>
          <p className="text-gray-500">
            Real-time overview of factory operations
          </p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Customer Orders
            </CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : stats?.active_orders || 0}
            </div>
            <p className="text-xs text-gray-500">
              Active of {stats?.total_orders || 0} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Work Orders
            </CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : stats?.active_work_orders || 0}
            </div>
            <p className="text-xs text-gray-500">
              Active of {stats?.total_work_orders || 0} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Production Runs
            </CardTitle>
            <Zap className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : stats?.active_production_runs || 0}
            </div>
            <p className="text-xs text-gray-500">Currently running</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Produced Today
            </CardTitle>
            <Target className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading
                ? "..."
                : stats?.total_produced_today.toFixed(0) || 0}
            </div>
            <p className="text-xs text-gray-500">Units completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-blue-50/50 border-blue-100 border-2 shadow-md hover:shadow-xl transition-all duration-300 group overflow-hidden">
          <CardContent className="pt-6 relative">
            <div className="flex items-center justify-between">
              <div className="z-10">
                <p className="text-sm text-muted-foreground font-medium">Pending Orders</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {statsLoading ? "..." : formatNumber(stats?.pending_orders || 0)}
                </p>
                <p className="text-xs text-muted-foreground/80 mt-1">
                  {stats?.active_orders || 0} in progress
                </p>
              </div>
              <div className="p-3 rounded-xl bg-blue-100 text-blue-600 group-hover:scale-110 transition-transform duration-300">
                <FileText className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50/50 border-emerald-100 border-2 shadow-md hover:shadow-xl transition-all duration-300 group overflow-hidden">
          <CardContent className="pt-6 relative">
            <div className="flex items-center justify-between">
              <div className="z-10">
                <p className="text-sm text-muted-foreground font-medium">Low Stock Items</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {statsLoading ? "..." : formatNumber(stats?.low_stock_count || 0)}
                </p>
                <p className="text-xs text-muted-foreground/80 mt-1">
                  {stats?.out_of_stock_count || 0} out of stock
                </p>
              </div>
              <div className="p-3 rounded-xl bg-emerald-100 text-emerald-600 group-hover:scale-110 transition-transform duration-300">
                <Package className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-purple-50/50 border-purple-100 border-2 shadow-md hover:shadow-xl transition-all duration-300 group overflow-hidden">
          <CardContent className="pt-6 relative">
            <div className="flex items-center justify-between">
              <div className="z-10">
                <p className="text-sm text-muted-foreground font-medium">Outstanding Dues</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {statsLoading ? "..." : formatCurrency(stats?.total_outstanding_dues || 0)}
                </p>
                <p className="text-xs text-muted-foreground/80 mt-1">
                  {stats?.customers_with_dues || 0} customers
                </p>
              </div>
              <div className="p-3 rounded-xl bg-purple-100 text-purple-600 group-hover:scale-110 transition-transform duration-300">
                <Wallet className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-orange-50/50 border-orange-100 border-2 shadow-md hover:shadow-xl transition-all duration-300 group overflow-hidden">
          <CardContent className="pt-6 relative">
            <div className="flex items-center justify-between">
              <div className="z-10">
                <p className="text-sm text-muted-foreground font-medium">Material Shortages</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {statsLoading ? "..." : formatNumber(stats?.material_shortages || 0)}
                </p>
                <p className="text-xs text-muted-foreground/80 mt-1">
                  {stats?.wastage_pending_approval || 0} pending approval
                </p>
              </div>
              <div className="p-3 rounded-xl bg-orange-100 text-orange-600 group-hover:scale-110 transition-transform duration-300">
                <AlertTriangle className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Income Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-emerald-600" />
            Monthly Income
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Revenue from factory sales invoices
          </p>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="12m" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="12m">Last 12 Months</TabsTrigger>
              <TabsTrigger value="30d">Last 30 Days</TabsTrigger>
            </TabsList>
            <TabsContent value="12m">
              {statsLoading ? (
                <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                  Loading chart...
                </div>
              ) : chartData12Months.length === 0 ? (
                <div className="flex h-[300px] flex-col items-center justify-center text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mb-2 opacity-30" />
                  <p>No invoice data for the last 12 months</p>
                </div>
              ) : (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData12Months} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatCurrency(v)} />
                      <Tooltip
                        formatter={(value: number) => [formatCurrency(value), "Income"]}
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.month ?? ""}
                      />
                      <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} name="Income" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </TabsContent>
            <TabsContent value="30d">
              {statsLoading ? (
                <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                  Loading chart...
                </div>
              ) : chartData30Days.length === 0 ? (
                <div className="flex h-[300px] flex-col items-center justify-center text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mb-2 opacity-30" />
                  <p>No invoice data for the last 30 days</p>
                </div>
              ) : (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData30Days} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatCurrency(v)} />
                      <Tooltip
                        formatter={(value: number) => [formatCurrency(value), "Income"]}
                        labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""}
                      />
                      <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} name="Income" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

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
