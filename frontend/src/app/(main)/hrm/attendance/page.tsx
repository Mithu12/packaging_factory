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
import { Input } from "@/components/ui/input";
import {
  Calendar,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Timer,
  Home,
  RefreshCw,
} from "lucide-react";
import { HRMApiService } from "@/modules/hrm/services/hrm-api";

interface AttendanceStats {
  present: number;
  absent: number;
  late: number;
  half_day: number;
  work_from_home: number;
  early_going: number;
  on_leave: number;
}

interface DeptBreakdown {
  department_id: number;
  department_name: string;
  present_count: number;
  total_employees: number;
  attendance_percentage: number;
}

interface DailyTrend {
  date: string;
  present: number;
  absent: number;
  total: number;
}

interface AttendanceRecord {
  id: number;
  employee_id: number;
  attendance_date: string;
  status: string;
  check_in_time?: string;
  check_out_time?: string;
  total_hours_worked?: number;
  shift_id?: number;
  employee?: { first_name: string; last_name: string; designation?: { title: string } };
  shift?: { name: string };
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case "present": return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "absent": return <XCircle className="h-4 w-4 text-red-500" />;
    case "late": return <Timer className="h-4 w-4 text-yellow-500" />;
    case "half_day": return <Clock className="h-4 w-4 text-blue-500" />;
    case "work_from_home": return <Home className="h-4 w-4 text-purple-500" />;
    default: return <Users className="h-4 w-4 text-gray-500" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "present": return "bg-green-100 text-green-800";
    case "absent": return "bg-red-100 text-red-800";
    case "late": return "bg-yellow-100 text-yellow-800";
    case "half_day": return "bg-blue-100 text-blue-800";
    case "work_from_home": return "bg-purple-100 text-purple-800";
    case "early_going": return "bg-orange-100 text-orange-800";
    case "on_leave": return "bg-gray-100 text-gray-800";
    default: return "bg-gray-100 text-gray-800";
  }
};

const AttendanceDashboardPage: React.FC = () => {
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [recordsRes, dashRes] = await Promise.all([
        HRMApiService.getAttendanceRecords({ attendance_date: selectedDate }),
        HRMApiService.getAttendanceDashboard(),
      ]);
      setAttendanceRecords(recordsRes.attendance_records || []);
      setDashboard(dashRes.dashboard || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load attendance data");
    } finally {
      setLoading(false);
    }
  };

  const calcStats = (records: AttendanceRecord[]): AttendanceStats => {
    return records.reduce(
      (acc, r) => {
        const s = r.status as keyof AttendanceStats;
        if (s in acc) acc[s]++;
        return acc;
      },
      { present: 0, absent: 0, late: 0, half_day: 0, work_from_home: 0, early_going: 0, on_leave: 0 }
    );
  };

  const stats = calcStats(attendanceRecords);
  const totalEmployees = dashboard?.total_employees || attendanceRecords.length;
  const deptBreakdown: DeptBreakdown[] = dashboard?.department_breakdown || [];
  const dailyTrends: DailyTrend[] = dashboard?.daily_trends || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive">{error}</p>
          <Button onClick={loadData} className="mt-4">Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Attendance Dashboard</h1>
          <p className="text-muted-foreground">Daily attendance overview and employee status tracking</p>
        </div>
        <div className="flex items-center gap-4">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-[160px]"
          />
          <Button onClick={loadData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEmployees}</div>
            <p className="text-xs text-muted-foreground">Scheduled for today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.present}</div>
            <p className="text-xs text-muted-foreground">
              {totalEmployees > 0 ? ((stats.present / totalEmployees) * 100).toFixed(1) : 0}% attendance rate
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Late Arrivals</CardTitle>
            <Timer className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.late}</div>
            <p className="text-xs text-muted-foreground">Employees arrived late</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Absent</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.absent}</div>
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
            <Card>
              <CardHeader>
                <CardTitle>Today's Attendance Summary</CardTitle>
                <CardDescription>Real-time attendance status for {selectedDate}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { label: "Present", key: "present", icon: <CheckCircle className="h-4 w-4 text-green-500" /> },
                    { label: "Late", key: "late", icon: <Timer className="h-4 w-4 text-yellow-500" /> },
                    { label: "Half Day", key: "half_day", icon: <Clock className="h-4 w-4 text-blue-500" /> },
                    { label: "Work from Home", key: "work_from_home", icon: <Home className="h-4 w-4 text-purple-500" /> },
                    { label: "Absent", key: "absent", icon: <XCircle className="h-4 w-4 text-red-500" /> },
                    { label: "On Leave", key: "on_leave", icon: <Calendar className="h-4 w-4 text-gray-500" /> },
                  ].map(({ label, key, icon }) => (
                    <div key={key} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {icon}
                        <span className="text-sm">{label}</span>
                      </div>
                      <Badge className={getStatusColor(key)}>
                        {stats[key as keyof AttendanceStats]}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Department Attendance</CardTitle>
                <CardDescription>Attendance by department</CardDescription>
              </CardHeader>
              <CardContent>
                {deptBreakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No department data available</p>
                ) : (
                  <div className="space-y-2">
                    {deptBreakdown.map((dept) => (
                      <div key={dept.department_id} className="flex items-center justify-between">
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
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Employee Attendance Details</CardTitle>
              <CardDescription>Detailed view of all employee attendance records for {selectedDate}</CardDescription>
            </CardHeader>
            <CardContent>
              {attendanceRecords.length === 0 ? (
                <p className="text-sm text-muted-foreground">No attendance records for this date.</p>
              ) : (
                <div className="space-y-4">
                  {attendanceRecords.map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        {getStatusIcon(record.status)}
                        <div>
                          <p className="font-medium">
                            {record.employee?.first_name} {record.employee?.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {record.employee?.designation?.title} • {record.shift?.name || "No shift"}
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
                            {record.total_hours_worked ? `${record.total_hours_worked}h worked` : ""}
                          </p>
                        </div>
                        <Badge className={getStatusColor(record.status)}>
                          {record.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Trends</CardTitle>
              <CardDescription>Daily attendance patterns over the last 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              {dailyTrends.length === 0 ? (
                <p className="text-sm text-muted-foreground">No trend data available.</p>
              ) : (
                <div className="space-y-4">
                  {dailyTrends.map((trend) => (
                    <div key={trend.date} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">
                          {new Date(trend.date).toLocaleDateString("en-US", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                        <p className="text-sm text-muted-foreground">{trend.total} employees scheduled</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm">
                            <span className="text-green-600">{trend.present}</span> present
                          </p>
                          <p className="text-sm">
                            <span className="text-red-600">{trend.absent}</span> absent
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
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AttendanceDashboardPage;
