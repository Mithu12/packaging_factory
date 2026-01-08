"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { useRouter } from "next/navigation";
import { useFormatting } from "@/hooks/useFormatting";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardApi, DashboardStats, ServiceDueItem, DateFilter } from "@/services/dashboard-api";
import { 
  ShoppingCart, 
  Package, 
  Users, 
  DollarSign, 
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Plus,
  Loader2,
  Wrench,
  Shield,
  Calendar,
  RefreshCcw,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Receipt,
  Clock
} from "lucide-react";

type DateFilterType = 'today' | 'ytd' | '7d' | '15d' | '30d';

const filterOptions: { value: DateFilterType; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'ytd', label: 'YTD' },
  { value: '7d', label: '7D' },
  { value: '15d', label: '15D' },
  { value: '30d', label: '30D' },
];

function getDateRange(filterType: DateFilterType): DateFilter {
  const today = new Date();
  const endDate = today.toISOString().split('T')[0];
  
  switch (filterType) {
    case 'today':
      return { startDate: endDate, endDate };
    case 'ytd':
      const yearStart = new Date(today.getFullYear(), 0, 1);
      return { startDate: yearStart.toISOString().split('T')[0], endDate };
    case '7d':
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 6);
      return { startDate: sevenDaysAgo.toISOString().split('T')[0], endDate };
    case '15d':
      const fifteenDaysAgo = new Date(today);
      fifteenDaysAgo.setDate(today.getDate() - 14);
      return { startDate: fifteenDaysAgo.toISOString().split('T')[0], endDate };
    case '30d':
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 29);
      return { startDate: thirtyDaysAgo.toISOString().split('T')[0], endDate };
    default:
      return { startDate: endDate, endDate };
  }
}

export default function Dashboard() {
  const router = useRouter();
  const { formatCurrency, formatNumber } = useFormatting();
  const { user } = useAuth();
  
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<DateFilterType>('today');

  const dateFilter = useMemo(() => getDateRange(activeFilter), [activeFilter]);

  const fetchDashboardStats = async (filter: DateFilter) => {
    try {
      setLoading(true);
      setError(null);
      const data = await DashboardApi.getStats(filter);
      setStats(data);
    } catch (err: any) {
      console.error('Failed to fetch dashboard stats:', err);
      setError(err.message || 'Failed to load dashboard data');
      toast.error("Failed to load dashboard data", {
        description: "Please try refreshing the page."
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats(dateFilter);
  }, [dateFilter]);

  const handleRefresh = () => {
    fetchDashboardStats(dateFilter);
    toast.success("Dashboard refreshed");
  };

  const handleFilterChange = (filter: DateFilterType) => {
    setActiveFilter(filter);
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case "create-po":
        router.push("/purchase-orders");
        toast.success("Redirected to Purchase Orders", {
          description: "Click 'Create Purchase Order' to get started."
        });
        break;
      case "add-product":
        router.push("/products");
        toast.success("Redirected to Products", {
          description: "Click 'Add Product' to add a new item."
        });
        break;
      case "add-supplier":
        router.push("/suppliers");
        toast.success("Redirected to Suppliers", {
          description: "Click 'Add Supplier' to add a new vendor."
        });
        break;
      case "record-payment":
        router.push("/payments");
        toast.success("Redirected to Payments", {
          description: "Click 'Record Payment' to log a payment."
        });
        break;
      case "new-sale":
        router.push("/pos");
        toast.success("Redirected to POS", {
          description: "Start a new sale."
        });
        break;
      default:
        toast.info("Quick action selected", {
          description: `${action} functionality coming soon!`
        });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCcw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const mainStats = [
    {
      title: "Total Sales",
      value: formatCurrency(stats?.total_sales || 0),
      change: `${formatCurrency(stats?.today_sales || 0)} today`,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "from-green-500/10 to-green-500/5"
    },
    {
      title: "Total Profit",
      value: formatCurrency(stats?.total_profit || 0),
      change: `${stats?.total_orders || 0} total orders`,
      icon: TrendingUp,
      color: "text-blue-600",
      bgColor: "from-blue-500/10 to-blue-500/5"
    },
    {
      title: "Total Expenses",
      value: formatCurrency(stats?.total_expenses || 0),
      change: `${formatCurrency(stats?.today_expenses || 0)} today`,
      icon: Receipt,
      color: "text-orange-600",
      bgColor: "from-orange-500/10 to-orange-500/5"
    },
    {
      title: "Net Profit",
      value: formatCurrency(stats?.net_profit || 0),
      change: (stats?.net_profit || 0) >= 0 ? "Positive" : "Negative",
      icon: (stats?.net_profit || 0) >= 0 ? ArrowUpRight : ArrowDownRight,
      color: (stats?.net_profit || 0) >= 0 ? "text-emerald-600" : "text-red-600",
      bgColor: (stats?.net_profit || 0) >= 0 ? "from-emerald-500/10 to-emerald-500/5" : "from-red-500/10 to-red-500/5"
    }
  ];

  const secondaryStats = [
    {
      title: "Today's Orders",
      value: formatNumber(stats?.today_orders || 0),
      subtitle: `${stats?.pending_orders || 0} pending`,
      icon: ShoppingCart,
      color: "text-purple-600"
    },
    {
      title: "Low Stock Items",
      value: formatNumber(stats?.low_stock_count || 0),
      subtitle: `${stats?.out_of_stock_count || 0} out of stock`,
      icon: Package,
      color: "text-amber-600"
    },
    {
      title: "Outstanding Dues",
      value: formatCurrency(stats?.total_outstanding_dues || 0),
      subtitle: `${stats?.customers_with_dues || 0} customers`,
      icon: Wallet,
      color: "text-red-600"
    },
    {
      title: "Service Alerts",
      value: formatNumber((stats?.warranty_due_count || 0) + (stats?.service_due_count || 0)),
      subtitle: "Due in 30 days",
      icon: Wrench,
      color: "text-cyan-600"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your business operations</p>
        </div>
        
        {/* Date Filter Tabs */}
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-muted rounded-lg p-1 gap-0.5">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleFilterChange(option.value)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                  activeFilter === option.value
                    ? 'bg-background text-primary shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCcw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <div className="relative group">
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Quick Actions
            </Button>
            <div className="absolute right-0 top-full mt-2 w-48 bg-popover border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
              <div className="p-2 space-y-1">
                <button 
                  onClick={() => handleQuickAction("new-sale")}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded-md transition-colors"
                >
                  New Sale
                </button>
                <button 
                  onClick={() => handleQuickAction("create-po")}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded-md transition-colors"
                >
                  Create Purchase Order
                </button>
                <button 
                  onClick={() => handleQuickAction("add-product")}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded-md transition-colors"
                >
                  Add Product
                </button>
                <button 
                  onClick={() => handleQuickAction("add-supplier")}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded-md transition-colors"
                >
                  Add Supplier
                </button>
                <button 
                  onClick={() => handleQuickAction("record-payment")}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded-md transition-colors"
                >
                  Record Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Stats Cards - Financial Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {mainStats.map((stat, index) => (
          <Card key={index} className={`bg-gradient-to-br ${stat.bgColor} hover:shadow-lg transition-all duration-300 border-0`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg bg-background/50 ${stat.color}`}>
                <stat.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <p className="text-xs text-muted-foreground flex items-center mt-1">
                <Clock className="w-3 h-3 mr-1" />
                {stat.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {secondaryStats.map((stat, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
                </div>
                <div className={`p-3 rounded-full bg-muted ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Service Overview Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Warranty Due */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-500" />
                Warranty Expiring Soon
              </span>
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                {stats?.warranty_due_count || 0} items
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(stats?.warranty_due_items?.length || 0) > 0 ? (
              <div className="space-y-3">
                {stats?.warranty_due_items.map((item, index) => (
                  <div key={index} className="p-3 rounded-lg border border-blue-200 bg-blue-50/50 hover:bg-blue-50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{item.product_name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {item.customer_name || 'Walk-in Customer'} • {item.order_number}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant={item.days_until_due <= 7 ? "destructive" : "secondary"}
                          className="text-xs"
                        >
                          {item.days_until_due <= 0 ? 'Expired' : `${item.days_until_due} days`}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">{item.due_date}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>No warranties expiring in the next 30 days</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Service Due */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-amber-500" />
                Service Due Soon
              </span>
              <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                {stats?.service_due_count || 0} items
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(stats?.service_due_items?.length || 0) > 0 ? (
              <div className="space-y-3">
                {stats?.service_due_items.map((item, index) => (
                  <div key={index} className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 hover:bg-amber-50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{item.product_name}</h4>
                        <p className="text-xs text-muted-foreground">
                          {item.customer_name || 'Walk-in Customer'} • {item.order_number}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant={item.days_until_due <= 7 ? "destructive" : "secondary"}
                          className="text-xs"
                        >
                          {item.days_until_due <= 0 ? 'Overdue' : `${item.days_until_due} days`}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">{item.due_date}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Wrench className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>No services due in the next 30 days</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Low Stock & Inventory Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning" />
                Inventory Overview
              </span>
              <Button variant="outline" size="sm" onClick={() => router.push("/inventory")}>
                Manage
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold text-foreground">{stats?.total_products || 0}</p>
                  <p className="text-xs text-muted-foreground">Total Products</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-2xl font-bold text-amber-600">{stats?.low_stock_count || 0}</p>
                  <p className="text-xs text-muted-foreground">Low Stock</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-2xl font-bold text-red-600">{stats?.out_of_stock_count || 0}</p>
                  <p className="text-xs text-muted-foreground">Out of Stock</p>
                </div>
              </div>
              {(stats?.low_stock_count || 0) > 0 && (
                <div className="p-3 mt-4 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-sm text-amber-800">
                    <AlertTriangle className="w-4 h-4 inline mr-2" />
                    {stats?.low_stock_count} products need restocking soon
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Customer Dues Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-500" />
                Customer Payments
              </span>
              <Button variant="outline" size="sm" onClick={() => router.push("/customers")}>
                View All
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(stats?.total_outstanding_dues || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Outstanding</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-purple-50 border border-purple-200">
                  <p className="text-2xl font-bold text-purple-600">{stats?.customers_with_dues || 0}</p>
                  <p className="text-xs text-muted-foreground">Customers with Dues</p>
                </div>
              </div>
              {(stats?.total_outstanding_dues || 0) > 0 && (
                <div className="p-3 mt-4 rounded-lg bg-purple-50 border border-purple-200">
                  <p className="text-sm text-purple-800">
                    <Wallet className="w-4 h-4 inline mr-2" />
                    Collect outstanding dues to improve cash flow
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}