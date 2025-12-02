"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  ShoppingCart,
  FileText,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertCircle,
  CheckCircle,
  Package,
  DollarSign,
  Calendar,
  Eye,
} from "lucide-react";
import { salesRepApi } from "../services/salesrep-api";
import type { SalesRepOrder, SalesRepDelivery, SalesRepNotification } from "../types";
import { format } from "date-fns";

const SalesRepDashboard = () => {
  const { data: dashboardStats, isLoading } = useQuery({
    queryKey: ["salesrep-dashboard"],
    queryFn: () => salesRepApi.getDashboardStats(),
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  const { data: notifications } = useQuery({
    queryKey: ["salesrep-notifications"],
    queryFn: () => salesRepApi.getNotifications(true, { page: 1, limit: 5 }),
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "outline",
      confirmed: "default",
      processing: "secondary",
      shipped: "default",
      delivered: "default",
      cancelled: "destructive",
      pending: "outline",
      in_transit: "secondary",
    };

    return (
      <Badge variant={variants[status] || "default"}>
        {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
      </Badge>
    );
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mb-1" />
                <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const stats = dashboardStats?.data || {
    total_customers: 0,
    active_orders: 0,
    pending_invoices: 0,
    overdue_payments: 0,
    monthly_sales: 0,
    monthly_target: 0,
    recent_orders: [],
    upcoming_deliveries: [],
    unread_notifications: 0,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales Rep Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's your sales performance overview.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            {format(new Date(), 'MMM dd, yyyy')}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_customers}</div>
            <p className="text-xs text-muted-foreground">
              Active customer accounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active_orders}</div>
            <p className="text-xs text-muted-foreground">
              Orders in progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending_invoices}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting payment
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.monthly_sales?.toLocaleString()}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              {stats.monthly_target > 0 && (
                <>
                  {stats.monthly_sales >= stats.monthly_target ? (
                    <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
                  )}
                  Target: ${stats.monthly_target?.toLocaleString()}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="orders">Recent Orders</TabsTrigger>
          <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common tasks and shortcuts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full justify-start" variant="outline">
                  <Users className="h-4 w-4 mr-2" />
                  Add New Customer
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Create New Order
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Invoice
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Package className="h-4 w-4 mr-2" />
                  Schedule Delivery
                </Button>
              </CardContent>
            </Card>

            {/* Performance Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Summary</CardTitle>
                <CardDescription>
                  This month's achievements
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Sales Target</span>
                  <span className="text-sm font-medium">
                    {stats.monthly_target > 0
                      ? `${Math.round((stats.monthly_sales / stats.monthly_target) * 100)}%`
                      : '0%'
                    }
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{
                      width: `${Math.min((stats.monthly_sales / stats.monthly_target) * 100, 100)}%`
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Overdue Payments</span>
                  <span className="font-medium text-red-600">
                    {stats.overdue_payments} items
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>
                Your latest customer orders
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats.recent_orders?.length > 0 ? (
                <div className="space-y-4">
                  {stats.recent_orders?.slice(0, 5).map((order: SalesRepOrder) => (
                    <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="space-y-1">
                        <p className="font-medium">{order.order_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.customer?.name || 'Unknown Customer'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(order.order_date), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="font-medium">${order.final_amount?.toLocaleString()}</p>
                        {getStatusBadge(order.status)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No recent orders found
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deliveries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Deliveries</CardTitle>
              <CardDescription>
                Deliveries scheduled for today and tomorrow
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats.upcoming_deliveries?.length > 0 ? (
                <div className="space-y-4">
                  {stats.upcoming_deliveries?.slice(0, 5).map((delivery: SalesRepDelivery) => (
                    <div key={delivery.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="space-y-1">
                        <p className="font-medium">{delivery.delivery_number}</p>
                        <p className="text-sm text-muted-foreground">
                          {delivery.order?.customer?.name || 'Unknown Customer'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(delivery.delivery_date), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-sm font-medium">{delivery.courier_service}</p>
                        {getStatusBadge(delivery.status)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No upcoming deliveries
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Notifications</CardTitle>
              <CardDescription>
                Latest updates and alerts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {notifications?.data && notifications.data?.length > 0 ? (
                <div className="space-y-4">
                  {notifications.data.slice(0, 5).map((notification: SalesRepNotification) => (
                    <div key={notification.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1 space-y-1">
                        <p className="font-medium">{notification.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(notification.created_at), 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No notifications
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SalesRepDashboard;
