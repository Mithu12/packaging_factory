import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DollarSign,
  ShoppingBag,
  Clock,
  CheckCircle,
  Users,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

export function DashboardStats() {
  const stats = [
    {
      title: "Revenue",
      value: "৳45,231.89",
      change: "+20.1%",
      trend: "up",
      description: "from last month",
      icon: DollarSign,
      color: "bg-purple-500",
      textColor: "text-purple-500",
      bgColor: "bg-purple-50",
      darkBgColor: "dark:bg-purple-900/20",
      darkTextColor: "dark:text-purple-400",
    },
    {
      title: "Total Orders",
      value: "2,350",
      change: "+15%",
      trend: "up",
      description: "from last month",
      icon: ShoppingBag,
      color: "bg-blue-500",
      textColor: "text-blue-500",
      bgColor: "bg-blue-50",
      darkBgColor: "dark:bg-blue-900/20",
      darkTextColor: "dark:text-blue-400",
    },
    {
      title: "Pending Orders",
      value: "45",
      change: "-5%",
      trend: "down",
      description: "needs attention",
      icon: Clock,
      color: "bg-orange-500",
      textColor: "text-orange-500",
      bgColor: "bg-orange-50",
      darkBgColor: "dark:bg-orange-900/20",
      darkTextColor: "dark:text-orange-400",
    },
    {
      title: "Delivered Orders",
      value: "1,203",
      change: "+12%",
      trend: "up",
      description: "successfully delivered",
      icon: CheckCircle,
      color: "bg-green-500",
      textColor: "text-green-500",
      bgColor: "bg-green-50",
      darkBgColor: "dark:bg-green-900/20",
      darkTextColor: "dark:text-green-400",
    },
    {
      title: "Total Customers",
      value: "8,942",
      change: "+8%",
      trend: "up",
      description: "new customers",
      icon: Users,
      color: "bg-indigo-500",
      textColor: "text-indigo-500",
      bgColor: "bg-indigo-50",
      darkBgColor: "dark:bg-indigo-900/20",
      darkTextColor: "dark:text-indigo-400",
    },
    {
      title: "Low Stock Products",
      value: "12",
      change: "+2",
      trend: "up",
      description: "restock needed",
      icon: AlertTriangle,
      color: "bg-red-500",
      textColor: "text-red-500",
      bgColor: "bg-red-50",
      darkBgColor: "dark:bg-red-900/20",
      darkTextColor: "dark:text-red-400",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {stats.map((stat, index) => (
        <Card
          key={index}
          className="overflow-hidden border shadow-sm hover:shadow-md transition-shadow bg-white"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <div
              className={`p-2 rounded-full ${stat.bgColor} ${stat.textColor} ${stat.darkBgColor} ${stat.darkTextColor}`}
            >
              <stat.icon className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center">
              <span
                className={`flex items-center ${stat.trend === "up" ? "text-green-600" : "text-red-600"} mr-1 font-medium`}
              >
                {stat.trend === "up" ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                {stat.change}
              </span>
              {stat.description}
            </p>
          </CardContent>
          <div className={`h-1 w-full ${stat.color}`} />
        </Card>
      ))}
    </div>
  );
}
