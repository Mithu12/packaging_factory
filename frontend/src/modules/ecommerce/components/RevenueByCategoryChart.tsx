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
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";

const data = [
  { name: "Electronics", value: 4500, color: "#3b82f6" },
  { name: "Clothing", value: 3200, color: "#10b981" },
  { name: "Home", value: 2100, color: "#f59e0b" },
  { name: "Books", value: 1500, color: "#ef4444" },
  { name: "Other", value: 950, color: "#8b5cf6" },
];

const totalRevenue = data.reduce((acc, curr) => acc + curr.value, 0);

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: payload[0].payload.color }}
          />
          <span className="font-medium">{payload[0].name}</span>
        </div>
        <div className="mt-1 font-bold">
          ৳{payload[0].value.toLocaleString()} (
          {((payload[0].value / totalRevenue) * 100).toFixed(1)}%)
        </div>
      </div>
    );
  }
  return null;
};

export function RevenueByCategoryChart() {
  return (
    <Card className="col-span-3 border shadow-sm bg-white">
      <CardHeader>
        <CardTitle>Revenue by Category</CardTitle>
        <CardDescription>Breakdown of revenue streams</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[350px] relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={110}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                formatter={(value) => (
                  <span className="text-sm text-muted-foreground ml-1">
                    {value}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-[60%] text-center pointer-events-none">
            <div className="text-2xl font-bold">
              ৳{(totalRevenue / 1000).toFixed(1)}k
            </div>
            <div className="text-xs text-muted-foreground">Total Revenue</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
