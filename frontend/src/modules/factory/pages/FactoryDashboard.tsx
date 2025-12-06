"use client";

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
  Calendar,
} from "lucide-react";
import { useFormatting } from "@/hooks/useFormatting";
import { FactoryDashboardApiService, factoryDashboardQueryKeys } from "@/services/factory-dashboard-api";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function FactoryDashboard() {
  const { formatCurrency, formatDate } = useFormatting();
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
                      router.push(`/factory/orders/${order.id}`)
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
                onClick={() => router.push("/factory/work-order-planning")}
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
                      router.push(`/factory/work-order-planning`)
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
                onClick={() => router.push("/factory/production-execution")}
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
                      router.push("/factory/production-execution")
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
                      {run.efficiency_percentage.toFixed(0)}%)
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
              onClick={() => router.push("/factory/order-acceptance")}
            >
              <Package className="h-6 w-6" />
              <span>Review Orders</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex flex-col gap-2"
              onClick={() => router.push("/factory/work-order-planning")}
            >
              <Activity className="h-6 w-6" />
              <span>Plan Work Orders</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex flex-col gap-2"
              onClick={() => router.push("/factory/material-requirements")}
            >
              <AlertTriangle className="h-6 w-6" />
              <span>Material Planning</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex flex-col gap-2"
              onClick={() => router.push("/factory/production-execution")}
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
