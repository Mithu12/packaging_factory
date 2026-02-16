"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Button } from "@/components/ui/button";
import { ArrowUpRight } from "lucide-react";

const data = [
  { name: "Jan", total: 1200, revenue: 2400 },
  { name: "Feb", total: 2100, revenue: 3800 },
  { name: "Mar", total: 800, revenue: 1600 },
  { name: "Apr", total: 1600, revenue: 3200 },
  { name: "May", total: 900, revenue: 1800 },
  { name: "Jun", total: 1700, revenue: 3400 },
  { name: "Jul", total: 2400, revenue: 4800 },
  { name: "Aug", total: 2800, revenue: 5600 },
  { name: "Sep", total: 2600, revenue: 5200 },
  { name: "Oct", total: 3100, revenue: 6200 },
  { name: "Nov", total: 3400, revenue: 6800 },
  { name: "Dec", total: 3800, revenue: 7600 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-medium mb-2">{label}</p>
        <div className="flex flex-col gap-1">
          <p className="text-primary font-medium">
            Revenue:{" "}
            <span className="text-foreground">৳{payload[0].value}</span>
          </p>
          <p className="text-muted-foreground text-xs">
            Orders: {payload[0].payload.total}
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export function SalesChart() {
  return (
    <Card className="col-span-4 border shadow-sm bg-white">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Sales Overview</CardTitle>
          <CardDescription>
            Monthly revenue performance for 2024
          </CardDescription>
        </div>
        <Button variant="ghost" size="sm" className="h-8 gap-1">
          View Report <ArrowUpRight className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="pl-2">
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="name"
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                padding={{ left: 10, right: 10 }}
              />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `৳${value}`}
              />
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="hsl(var(--border))"
                opacity={0.4}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{
                  stroke: "#3b82f6",
                  strokeWidth: 1,
                  strokeDasharray: "4 4",
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorRevenue)"
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
