import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Factory,
  Package,
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Users,
  Calendar,
  BarChart3,
  Activity,
  Zap,
  Target,
} from "lucide-react";
import { useFormatting } from "@/hooks/useFormatting";

interface FactoryStats {
  totalOrders: number;
  activeWorkOrders: number;
  completedToday: number;
  pendingApprovals: number;
  efficiency: number;
  onTimeDelivery: number;
}

interface WorkOrder {
  id: string;
  orderNumber: string;
  product: string;
  quantity: number;
  deadline: string;
  status: "pending" | "in_progress" | "completed" | "overdue";
  priority: "low" | "medium" | "high" | "urgent";
  progress: number;
}

interface RecentActivity {
  id: string;
  type:
    | "order_accepted"
    | "wo_created"
    | "production_started"
    | "production_completed"
    | "wastage_recorded";
  description: string;
  timestamp: string;
  user: string;
}

export default function FactoryDashboard() {
  const { formatCurrency, formatDate } = useFormatting();
  const [stats, setStats] = useState<FactoryStats>({
    totalOrders: 0,
    activeWorkOrders: 0,
    completedToday: 0,
    pendingApprovals: 0,
    efficiency: 0,
    onTimeDelivery: 0,
  });

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

  useEffect(() => {
    // Mock data - in real app, fetch from API
    setStats({
      totalOrders: 24,
      activeWorkOrders: 8,
      completedToday: 12,
      pendingApprovals: 3,
      efficiency: 87,
      onTimeDelivery: 92,
    });

    setWorkOrders([
      {
        id: "WO-001",
        orderNumber: "ORD-2024-001",
        product: "Premium Widget A",
        quantity: 500,
        deadline: "2024-03-15",
        status: "in_progress",
        priority: "high",
        progress: 65,
      },
      {
        id: "WO-002",
        orderNumber: "ORD-2024-002",
        product: "Standard Widget B",
        quantity: 1000,
        deadline: "2024-03-12",
        status: "overdue",
        priority: "urgent",
        progress: 90,
      },
      {
        id: "WO-003",
        orderNumber: "ORD-2024-003",
        product: "Custom Widget C",
        quantity: 250,
        deadline: "2024-03-18",
        status: "pending",
        priority: "medium",
        progress: 0,
      },
    ]);

    setRecentActivity([
      {
        id: "1",
        type: "order_accepted",
        description: "Order ORD-2024-001 accepted by Factory Manager",
        timestamp: "2024-03-10T10:30:00Z",
        user: "John Smith",
      },
      {
        id: "2",
        type: "wo_created",
        description: "Work Order WO-001 created for Premium Widget A",
        timestamp: "2024-03-10T11:15:00Z",
        user: "Jane Doe",
      },
      {
        id: "3",
        type: "production_started",
        description: "Production started for WO-001",
        timestamp: "2024-03-10T14:00:00Z",
        user: "Mike Johnson",
      },
    ]);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "order_accepted":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "wo_created":
        return <Package className="h-4 w-4 text-blue-600" />;
      case "production_started":
        return <Zap className="h-4 w-4 text-yellow-600" />;
      case "production_completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "wastage_recorded":
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Factory Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor production activities and work orders
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            View Calendar
          </Button>
          <Button>
            <Package className="h-4 w-4 mr-2" />
            New Work Order
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Work Orders
            </CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeWorkOrders}</div>
            <p className="text-xs text-muted-foreground">In production</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Completed Today
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedToday}</div>
            <p className="text-xs text-muted-foreground">
              Work orders completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Approvals
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingApprovals}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Production Efficiency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Current Efficiency</span>
                <span className="font-medium">{stats.efficiency}%</span>
              </div>
              <Progress value={stats.efficiency} className="h-2" />
              <p className="text-xs text-muted-foreground">Target: 90%</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              On-Time Delivery
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Delivery Rate</span>
                <span className="font-medium">{stats.onTimeDelivery}%</span>
              </div>
              <Progress value={stats.onTimeDelivery} className="h-2" />
              <p className="text-xs text-muted-foreground">Target: 95%</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="work-orders" className="space-y-4">
        <TabsList>
          <TabsTrigger value="work-orders">Work Orders</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="work-orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Work Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {workOrders.map((wo) => (
                  <div key={wo.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge className={getStatusColor(wo.status)}>
                          {wo.status.replace("_", " ").toUpperCase()}
                        </Badge>
                        <Badge className={getPriorityColor(wo.priority)}>
                          {wo.priority.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Due: {formatDate(wo.deadline)}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-medium">{wo.product}</h3>
                      <p className="text-sm text-muted-foreground">
                        Order: {wo.orderNumber} • Qty: {wo.quantity}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{wo.progress}%</span>
                      </div>
                      <Progress value={wo.progress} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 border rounded-lg"
                  >
                    {getActivityIcon(activity.type)}
                    <div className="flex-1">
                      <p className="text-sm">{activity.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(activity.timestamp)}
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          {activity.user}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alerts & Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 border border-red-200 rounded-lg bg-red-50">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-900">
                      Overdue Work Order
                    </p>
                    <p className="text-sm text-red-700">
                      WO-002 is 2 days overdue
                    </p>
                    <p className="text-xs text-red-600 mt-1">
                      Due: March 12, 2024
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 border border-yellow-200 rounded-lg bg-yellow-50">
                  <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-900">
                      Approaching Deadline
                    </p>
                    <p className="text-sm text-yellow-700">
                      WO-001 due in 3 days
                    </p>
                    <p className="text-xs text-yellow-600 mt-1">
                      Due: March 15, 2024
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
