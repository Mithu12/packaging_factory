"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus,
  Eye,
} from "lucide-react";
import { LeaveBalanceDisplayProps } from "../types";

const LeaveBalanceDisplay: React.FC<LeaveBalanceDisplayProps> = ({
  employee,
  leaveBalances,
  leaveTypes,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
                <div className="h-2 bg-muted rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (leaveBalances.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No leave balance information available</p>
        <p className="text-sm mt-1">Contact HR for leave balance setup</p>
      </div>
    );
  }

  const getBalanceStatus = (balance: any) => {
    const usagePercentage = (balance.used_days / balance.allocated_days) * 100;

    if (balance.available_days <= 0) {
      return {
        status: "critical",
        color: "text-red-600",
        bgColor: "bg-red-100",
        icon: AlertTriangle,
        message: "No leave available",
      };
    } else if (usagePercentage >= 80) {
      return {
        status: "warning",
        color: "text-orange-600",
        bgColor: "bg-orange-100",
        icon: AlertTriangle,
        message: "Low balance",
      };
    } else if (balance.pending_days > 0) {
      return {
        status: "pending",
        color: "text-blue-600",
        bgColor: "bg-blue-100",
        icon: Clock,
        message: `${balance.pending_days} days pending approval`,
      };
    } else {
      return {
        status: "good",
        color: "text-green-600",
        bgColor: "bg-green-100",
        icon: CheckCircle,
        message: "Good balance",
      };
    }
  };

  const formatDays = (days: number) => {
    return `${days} days`;
  };

  return (
    <div className="space-y-6">
      {/* Summary Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">
              {leaveBalances.reduce(
                (sum, balance) => sum + balance.allocated_days,
                0
              )}
            </div>
            <p className="text-xs text-muted-foreground">Total Allocated</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-orange-600">
              {leaveBalances.reduce(
                (sum, balance) => sum + balance.used_days,
                0
              )}
            </div>
            <p className="text-xs text-muted-foreground">Used This Year</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-purple-600">
              {leaveBalances.reduce(
                (sum, balance) => sum + balance.pending_days,
                0
              )}
            </div>
            <p className="text-xs text-muted-foreground">Pending Approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">
              {leaveBalances.reduce(
                (sum, balance) => sum + balance.available_days,
                0
              )}
            </div>
            <p className="text-xs text-muted-foreground">Available</p>
          </CardContent>
        </Card>
      </div>

      {/* Individual Leave Type Balances */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {leaveBalances.map((balance) => {
          const leaveType = leaveTypes.find(
            (lt) => lt.id === balance.leave_type_id
          );
          const balanceStatus = getBalanceStatus(balance);
          const usagePercentage =
            (balance.used_days / balance.allocated_days) * 100;

          return (
            <Card key={balance.leave_type_id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: leaveType?.color_code || "#gray",
                      }}
                    />
                    <CardTitle className="text-base">
                      {leaveType?.name || "Unknown"}
                    </CardTitle>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-xs ${balanceStatus.color}`}
                  >
                    {balanceStatus.message}
                  </Badge>
                </div>
                <CardDescription className="text-sm">
                  {leaveType?.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Balance Overview */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Allocated</div>
                    <div className="font-medium">
                      {formatDays(balance.allocated_days)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Used</div>
                    <div className="font-medium text-orange-600">
                      {formatDays(balance.used_days)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Pending</div>
                    <div className="font-medium text-blue-600">
                      {formatDays(balance.pending_days)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Available</div>
                    <div
                      className={`font-medium ${
                        balance.available_days <= 0
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      {formatDays(balance.available_days)}
                    </div>
                  </div>
                </div>

                {/* Usage Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Usage</span>
                    <span className="text-muted-foreground">
                      {Math.round(usagePercentage)}%
                    </span>
                  </div>
                  <Progress value={usagePercentage} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0</span>
                    <span>{formatDays(balance.allocated_days)}</span>
                  </div>
                </div>

                {/* Status Indicator */}
                <div
                  className={`flex items-center gap-2 p-2 rounded-lg ${balanceStatus.bgColor}`}
                >
                  <balanceStatus.icon
                    className={`h-4 w-4 ${balanceStatus.color}`}
                  />
                  <span
                    className={`text-sm font-medium ${balanceStatus.color}`}
                  >
                    {balanceStatus.message}
                  </span>
                </div>

                {/* Period Information */}
                <div className="pt-2 border-t">
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>
                      Period:{" "}
                      {new Date(balance.period_start).toLocaleDateString()} -{" "}
                      {new Date(balance.period_end).toLocaleDateString()}
                    </div>
                    <div>
                      Last Updated:{" "}
                      {new Date(balance.last_updated).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <Button variant="outline" size="sm" className="w-full">
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Balance Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detailed Balance Summary</CardTitle>
          <CardDescription>
            Complete overview of all leave type balances
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Leave Type</th>
                  <th className="text-center p-2">Allocated</th>
                  <th className="text-center p-2">Used</th>
                  <th className="text-center p-2">Pending</th>
                  <th className="text-center p-2">Available</th>
                  <th className="text-center p-2">Usage %</th>
                  <th className="text-center p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {leaveBalances.map((balance) => {
                  const leaveType = leaveTypes.find(
                    (lt) => lt.id === balance.leave_type_id
                  );
                  const usagePercentage =
                    (balance.used_days / balance.allocated_days) * 100;
                  const balanceStatus = getBalanceStatus(balance);

                  return (
                    <tr key={balance.leave_type_id} className="border-b">
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: leaveType?.color_code }}
                          />
                          <span className="font-medium">{leaveType?.name}</span>
                        </div>
                      </td>
                      <td className="text-center p-2">
                        {balance.allocated_days}
                      </td>
                      <td className="text-center p-2 text-orange-600">
                        {balance.used_days}
                      </td>
                      <td className="text-center p-2 text-blue-600">
                        {balance.pending_days}
                      </td>
                      <td
                        className={`text-center p-2 font-medium ${
                          balance.available_days <= 0
                            ? "text-red-600"
                            : "text-green-600"
                        }`}
                      >
                        {balance.available_days}
                      </td>
                      <td className="text-center p-2">
                        <span
                          className={`font-medium ${
                            usagePercentage >= 80
                              ? "text-orange-600"
                              : usagePercentage >= 50
                              ? "text-yellow-600"
                              : "text-green-600"
                          }`}
                        >
                          {Math.round(usagePercentage)}%
                        </span>
                      </td>
                      <td className="text-center p-2">
                        <Badge
                          variant="outline"
                          className={`text-xs ${balanceStatus.color}`}
                        >
                          {balanceStatus.message}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Balance Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Balance Insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Leave Usage Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Most Used:</span>
                  <span className="font-medium">
                    {leaveBalances.length > 0
                      ? leaveTypes.find(
                          (lt) =>
                            lt.id ===
                            leaveBalances.reduce(
                              (max, balance) =>
                                balance.used_days >
                                (leaveBalances.find(
                                  (b) => b.leave_type_id === max
                                )?.used_days || 0)
                                  ? balance.leave_type_id
                                  : max,
                              leaveBalances[0]?.leave_type_id
                            )
                        )?.name || "N/A"
                      : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Least Used:</span>
                  <span className="font-medium">
                    {leaveBalances.length > 0
                      ? leaveTypes.find(
                          (lt) =>
                            lt.id ===
                            leaveBalances.reduce(
                              (min, balance) =>
                                balance.used_days <
                                (leaveBalances.find(
                                  (b) => b.leave_type_id === min
                                )?.used_days || Infinity)
                                  ? balance.leave_type_id
                                  : min,
                              leaveBalances[0]?.leave_type_id
                            )
                        )?.name || "N/A"
                      : "N/A"}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Upcoming Renewals</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Annual Leave:</span>
                  <span className="font-medium">Jan 1, 2025</span>
                </div>
                <div className="flex justify-between">
                  <span>Sick Leave:</span>
                  <span className="font-medium">Jan 1, 2025</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeaveBalanceDisplay;
