"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar,
  Clock,
  Users,
  AlertTriangle,
  TrendingUp,
  CheckCircle,
  XCircle,
  Timer,
  Home,
  MapPin,
  Camera,
} from "lucide-react";
import {
  mockAttendanceRecords,
  mockAttendanceSummary,
  getTodaysAttendance,
  calculateAttendanceStats,
} from "../data/attendance-data";
import { mockShifts } from "../data/shift-data";
import { mockEmployees } from "../data/salary-update-data";
import { AttendanceRecord, AttendanceSummary, Employee, Shift } from "../types";

const AttendanceDashboardPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceRecord[]
  >([]);
  const [attendanceSummary, setAttendanceSummary] =
    useState<AttendanceSummary | null>(null);
  const [employees] = useState<Employee[]>(mockEmployees);
  const [shifts] = useState<Shift[]>(mockShifts);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAttendanceData();
  }, [selectedDate]);

  const loadAttendanceData = async () => {
    try {
      setLoading(true);
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      const todaysAttendance = getTodaysAttendance();
      const summary = {
        ...mockAttendanceSummary,
        period_start: selectedDate,
        period_end: selectedDate,
      };

      setAttendanceRecords(todaysAttendance);
      setAttendanceSummary(summary);
    } catch (error) {
      console.error("Error loading attendance data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "present":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "absent":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "late":
        return <Timer className="h-4 w-4 text-yellow-500" />;
      case "half_day":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "work_from_home":
        return <Home className="h-4 w-4 text-purple-500" />;
      default:
        return <Users className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "present":
        return "bg-green-100 text-green-800";
      case "absent":
        return "bg-red-100 text-red-800";
      case "late":
        return "bg-yellow-100 text-yellow-800";
      case "half_day":
        return "bg-blue-100 text-blue-800";
      case "work_from_home":
        return "bg-purple-100 text-purple-800";
      case "early_going":
        return "bg-orange-100 text-orange-800";
      case "on_leave":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const todaysStats = calculateAttendanceStats(attendanceRecords);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Attendance Dashboard
          </h1>
          <p className="text-muted-foreground">
            Daily attendance overview and employee status tracking
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={selectedDate} onValueChange={setSelectedDate}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={new Date().toISOString().split("T")[0]}>
                Today
              </SelectItem>
              <SelectItem
                value={
                  new Date(Date.now() - 24 * 60 * 60 * 1000)
                    .toISOString()
                    .split("T")[0]
                }
              >
                Yesterday
              </SelectItem>
              <SelectItem
                value={
                  new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
                    .toISOString()
                    .split("T")[0]
                }
              >
                2 Days Ago
              </SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={loadAttendanceData} variant="outline">
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Employees
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {attendanceSummary?.total_employees || 0}
            </div>
            <p className="text-xs text-muted-foreground">Scheduled for today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {todaysStats.present}
            </div>
            <p className="text-xs text-muted-foreground">
              {attendanceSummary
                ? (
                    (todaysStats.present / attendanceSummary.total_employees) *
                    100
                  ).toFixed(1)
                : 0}
              % attendance rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Late Arrivals</CardTitle>
            <Timer className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {todaysStats.late}
            </div>
            <p className="text-xs text-muted-foreground">
              Employees arrived late
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Absent</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {todaysStats.absent}
            </div>
            <p className="text-xs text-muted-foreground">Not present today</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="details">Detailed View</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Today's Attendance Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Today's Attendance Summary</CardTitle>
                <CardDescription>Real-time attendance status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Present</span>
                    </div>
                    <Badge className={getStatusColor("present")}>
                      {todaysStats.present}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Timer className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm">Late</span>
                    </div>
                    <Badge className={getStatusColor("late")}>
                      {todaysStats.late}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">Half Day</span>
                    </div>
                    <Badge className={getStatusColor("half_day")}>
                      {todaysStats.half_day}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Home className="h-4 w-4 text-purple-500" />
                      <span className="text-sm">Work from Home</span>
                    </div>
                    <Badge className={getStatusColor("work_from_home")}>
                      {todaysStats.work_from_home}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="text-sm">Absent</span>
                    </div>
                    <Badge className={getStatusColor("absent")}>
                      {todaysStats.absent}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Department Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Department Attendance</CardTitle>
                <CardDescription>Attendance by department</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {attendanceSummary?.department_breakdown.map((dept) => (
                    <div
                      key={dept.department_id}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm">{dept.department_name}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {dept.present_count}/{dept.total_employees}
                        </Badge>
                        <Badge
                          variant={
                            dept.attendance_percentage >= 90
                              ? "default"
                              : dept.attendance_percentage >= 75
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {dept.attendance_percentage.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Employee Attendance Details</CardTitle>
              <CardDescription>
                Detailed view of all employee attendance records
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {attendanceRecords.map((record) => {
                  const employee = employees.find(
                    (emp) => emp.id === record.employee_id
                  );
                  const shift = shifts.find((s) => s.id === record.shift_id);

                  return (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        {getStatusIcon(record.status)}
                        <div>
                          <p className="font-medium">
                            {employee?.first_name} {employee?.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {employee?.designation?.title} • {shift?.name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm">
                            {record.check_in_time && record.check_out_time
                              ? `${record.check_in_time} - ${record.check_out_time}`
                              : "No time recorded"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {record.total_hours_worked
                              ? `${record.total_hours_worked}h worked`
                              : ""}
                          </p>
                        </div>
                        <Badge className={getStatusColor(record.status)}>
                          {record.status.replace("_", " ")}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Trends</CardTitle>
              <CardDescription>
                Daily attendance patterns over the last 7 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {attendanceSummary?.daily_trends.map((trend) => (
                  <div
                    key={trend.date}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {new Date(trend.date).toLocaleDateString("en-US", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {trend.total} employees scheduled
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm">
                          <span className="text-green-600">
                            {trend.present}
                          </span>{" "}
                          present
                        </p>
                        <p className="text-sm">
                          <span className="text-red-600">{trend.absent}</span>{" "}
                          absent
                        </p>
                      </div>
                      <Badge
                        variant={
                          trend.present / trend.total >= 0.9
                            ? "default"
                            : trend.present / trend.total >= 0.8
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {((trend.present / trend.total) * 100).toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AttendanceDashboardPage;
