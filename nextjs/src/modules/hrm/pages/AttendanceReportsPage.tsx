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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart3,
  Download,
  FileText,
  Calendar,
  Users,
  TrendingUp,
  TrendingDown,
  Clock,
  MapPin,
  Filter,
  Search,
  Plus,
  Eye,
  RefreshCw,
} from "lucide-react";
import {
  mockAttendanceRecords,
  calculateAttendanceStats,
  getAttendanceByDate,
} from "../data/attendance-data";
import { mockEmployees } from "../data/salary-update-data";
import { mockDepartments } from "../data/salary-update-data";
import { mockShifts } from "../data/shift-data";
import {
  AttendanceRecord,
  Employee,
  Department,
  Shift,
  AttendanceReport,
  AttendanceFilter,
} from "../types";

const AttendanceReportsPage: React.FC = () => {
  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceRecord[]
  >(mockAttendanceRecords as any);
  const [employees] = useState<Employee[]>(mockEmployees as any);
  const [departments] = useState<Department[]>(mockDepartments as any);
  const [shifts] = useState<Shift[]>(mockShifts as any);
  const [reports] = useState<AttendanceReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Report generation state
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [reportForm, setReportForm] = useState({
    name: "",
    type: "monthly" as "daily" | "weekly" | "monthly" | "custom",
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date().toISOString().split("T")[0],
    employee_ids: [] as number[],
    department_ids: [] as number[],
    designation_ids: [] as number[],
    status: [] as string[],
  });

  // Filter state
  const [filters, setFilters] = useState<AttendanceFilter>({
    date_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    date_to: new Date().toISOString().split("T")[0],
  });

  const filteredRecords = attendanceRecords.filter((record) => {
    const matchesDateRange =
      (!filters.date_from || record.attendance_date >= filters.date_from) &&
      (!filters.date_to || record.attendance_date <= filters.date_to);

    const employee = employees.find((emp) => emp.id === record.employee_id);
    const matchesEmployee =
      !filters.employee_id || record.employee_id === filters.employee_id;
    const matchesDepartment =
      !filters.department_ids?.length ||
      (employee?.department_id &&
        filters.department_ids.includes(employee.department_id));
    const matchesStatus =
      !filters.status?.length || filters.status.includes(record.status);
    const matchesShift =
      !filters.shift_ids?.length ||
      filters.shift_ids.includes(record.shift_id || 0);

    const matchesSearch =
      !searchTerm ||
      employee?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee?.employee_id.toLowerCase().includes(searchTerm.toLowerCase());

    return (
      matchesDateRange &&
      matchesEmployee &&
      matchesDepartment &&
      matchesStatus &&
      matchesShift &&
      matchesSearch
    );
  });

  const calculateReportStats = (records: AttendanceRecord[]) => {
    const stats = calculateAttendanceStats(records);

    const totalDays = new Set(records.map((r) => r.attendance_date)).size;
    const avgAttendance =
      totalDays > 0 ? (stats.present / (records.length / totalDays)) * 100 : 0;

    return {
      ...stats,
      totalRecords: records.length,
      totalDays,
      avgAttendance: Math.round(avgAttendance * 100) / 100,
    };
  };

  const generateDepartmentStats = () => {
    const deptStats: {
      [key: number]: {
        name: string;
        records: AttendanceRecord[];
        employees: number;
      };
    } = {};

    departments.forEach((dept) => {
      const deptEmployees = employees.filter(
        (emp) => emp.department_id === dept.id
      );
      const deptRecords = filteredRecords.filter((record) =>
        deptEmployees.some((emp) => emp.id === record.employee_id)
      );

      deptStats[dept.id] = {
        name: dept.name,
        records: deptRecords,
        employees: deptEmployees.length,
      };
    });

    return Object.entries(deptStats).map(([deptId, stats]) => ({
      department_id: parseInt(deptId),
      department_name: stats.name,
      total_employees: stats.employees,
      total_records: stats.records.length,
      attendance_rate:
        stats.employees > 0
          ? (stats.records.length / (stats.employees * 30)) * 100
          : 0, // Assuming 30 days period
      ...calculateAttendanceStats(stats.records),
    }));
  };

  const generateTrendData = () => {
    const dailyStats: { [date: string]: AttendanceRecord[] } = {};

    filteredRecords.forEach((record) => {
      if (!dailyStats[record.attendance_date]) {
        dailyStats[record.attendance_date] = [];
      }
      dailyStats[record.attendance_date].push(record);
    });

    return Object.entries(dailyStats)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, records]) => ({
        date,
        ...calculateAttendanceStats(records),
        total: records.length,
      }));
  };

  const handleGenerateReport = async () => {
    try {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Simulate report generation
      const newReport: AttendanceReport = {
        id: Math.max(...reports.map((r) => r.id)) + 1,
        name: reportForm.name,
        type: reportForm.type,
        start_date: reportForm.start_date,
        end_date: reportForm.end_date,
        filters: {
          employee_ids: reportForm.employee_ids,
          department_ids: reportForm.department_ids,
          designation_ids: reportForm.designation_ids,
          status: reportForm.status,
        },
        generated_by: 1,
        generated_at: new Date().toISOString(),
        status: "completed",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      alert(`Report "${newReport.name}" generated successfully!`);
      setIsReportDialogOpen(false);

      // Reset form
      setReportForm({
        name: "",
        type: "monthly",
        start_date: new Date().toISOString().split("T")[0],
        end_date: new Date().toISOString().split("T")[0],
        employee_ids: [],
        department_ids: [],
        designation_ids: [],
        status: [],
      });
    } catch (error) {
      alert("Error generating report");
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async (format: "excel" | "pdf") => {
    try {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      alert(`${format.toUpperCase()} export completed!`);
    } catch (error) {
      alert(`Error exporting ${format.toUpperCase()}`);
    } finally {
      setLoading(false);
    }
  };

  const currentStats = calculateReportStats(filteredRecords);
  const departmentStats = generateDepartmentStats();
  const trendData = generateTrendData();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Attendance Reportsrts
          </h1>
          <p className="text-muted-foreground">
            Analytics and reporting for attendance data
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => handleExportData("excel")} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
          <Button onClick={() => handleExportData("pdf")} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Dialog
            open={isReportDialogOpen}
            onOpenChange={setIsReportDialogOpen}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Generate Attendance Reportsrt</DialogTitle>
                <DialogDescription>
                  Create a custom attendance report with specific filters
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="report_name">Report Name</Label>
                    <Input
                      id="report_name"
                      value={reportForm.name}
                      onChange={(e) =>
                        setReportForm((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      placeholder="Enter report name"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="report_type">Report Type</Label>
                    <Select
                      value={reportForm.type}
                      onValueChange={(
                        value: "daily" | "weekly" | "monthly" | "custom"
                      ) => setReportForm((prev) => ({ ...prev, type: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select report type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="custom">Custom Range</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={reportForm.start_date}
                      onChange={(e) =>
                        setReportForm((prev) => ({
                          ...prev,
                          start_date: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="end_date">End Date</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={reportForm.end_date}
                      onChange={(e) =>
                        setReportForm((prev) => ({
                          ...prev,
                          end_date: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Departments</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                    {departments.map((dept) => (
                      <div
                        key={dept.id}
                        className="flex items-center space-x-2"
                      >
                        <Checkbox
                          id={`dept_${dept.id}`}
                          checked={reportForm.department_ids.includes(dept.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setReportForm((prev) => ({
                                ...prev,
                                department_ids: [
                                  ...prev.department_ids,
                                  dept.id,
                                ],
                              }));
                            } else {
                              setReportForm((prev) => ({
                                ...prev,
                                department_ids: prev.department_ids.filter(
                                  (id) => id !== dept.id
                                ),
                              }));
                            }
                          }}
                        />
                        <Label htmlFor={`dept_${dept.id}`} className="text-sm">
                          {dept.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Attendance Status</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      "present",
                      "absent",
                      "late",
                      "half_day",
                      "work_from_home",
                    ].map((status) => (
                      <div key={status} className="flex items-center space-x-2">
                        <Checkbox
                          id={`status_${status}`}
                          checked={reportForm.status.includes(status)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setReportForm((prev) => ({
                                ...prev,
                                status: [...prev.status, status],
                              }));
                            } else {
                              setReportForm((prev) => ({
                                ...prev,
                                status: prev.status.filter((s) => s !== status),
                              }));
                            }
                          }}
                        />
                        <Label
                          htmlFor={`status_${status}`}
                          className="text-sm capitalize"
                        >
                          {status.replace("_", " ")}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsReportDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleGenerateReport}
                    disabled={loading || !reportForm.name}
                  >
                    Generate Report
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="date_from">From Date</Label>
              <Input
                id="date_from"
                type="date"
                value={filters.date_from || ""}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, date_from: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date_to">To Date</Label>
              <Input
                id="date_to"
                type="date"
                value={filters.date_to || ""}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, date_to: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department_filter">Department</Label>
              <Select
                value={filters.department_ids?.[0]?.toString() || "all"}
                onValueChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    department_ids:
                      value === "all" ? undefined : [parseInt(value)],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Departmentsnts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departmentsnts</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id.toString()}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentStats.totalRecords}
            </div>
            <p className="text-xs text-muted-foreground">In selected period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Attendance
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {currentStats.avgAttendance}%
            </div>
            <p className="text-xs text-muted-foreground">
              Average attendance rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Late Arrivals</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {currentStats.late}
            </div>
            <p className="text-xs text-muted-foreground">
              Employees arrived late
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Absent</CardTitle>
            <Users className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {currentStats.absent}
            </div>
            <p className="text-xs text-muted-foreground">Employees absent</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="departments">By Department</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="details">Detailed Records</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Attendance Breakdown</CardTitle>
                <CardDescription>
                  Distribution of attendance statuses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Present</span>
                    <Badge className="bg-green-100 text-green-800">
                      {currentStats.present}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Absent</span>
                    <Badge className="bg-red-100 text-red-800">
                      {currentStats.absent}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Late</span>
                    <Badge className="bg-yellow-100 text-yellow-800">
                      {currentStats.late}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Half Day</span>
                    <Badge className="bg-blue-100 text-blue-800">
                      {currentStats.half_day}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Work from Home</span>
                    <Badge className="bg-purple-100 text-purple-800">
                      {currentStats.work_from_home}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Performing Departments</CardTitle>
                <CardDescription>
                  Departments with highest attendance rates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {departmentStats
                    .sort((a, b) => b.attendance_rate - a.attendance_rate)
                    .slice(0, 5)
                    .map((dept) => (
                      <div
                        key={dept.department_id}
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm">{dept.department_name}</span>
                        <Badge
                          variant={
                            dept.attendance_rate >= 90
                              ? "default"
                              : dept.attendance_rate >= 80
                              ? "secondary"
                              : "destructive"
                          }
                        >
                          {dept.attendance_rate.toFixed(1)}%
                        </Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="departments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Department-wise Attendance</CardTitle>
              <CardDescription>
                Detailed attendance statistics by department
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {departmentStats.map((dept) => (
                  <div
                    key={dept.department_id}
                    className="p-4 border rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium">{dept.department_name}</h3>
                      <Badge
                        variant={
                          dept.attendance_rate >= 90
                            ? "default"
                            : dept.attendance_rate >= 80
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {dept.attendance_rate.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Total Employees</p>
                        <p className="font-medium">{dept.total_employees}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Present</p>
                        <p className="font-medium text-green-600">
                          {dept.present}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Absent</p>
                        <p className="font-medium text-red-600">
                          {dept.absent}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Late</p>
                        <p className="font-medium text-yellow-600">
                          {dept.late}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Trends</CardTitle>
              <CardDescription>
                Daily attendance patterns over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trendData.slice(-14).map((day) => (
                  <div
                    key={day.date}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {new Date(day.date).toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {day.total} attendance records
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm">
                          <span className="text-green-600">{day.present}</span>{" "}
                          present
                        </p>
                        <p className="text-sm">
                          <span className="text-red-600">{day.absent}</span>{" "}
                          absent
                        </p>
                      </div>
                      <Badge
                        variant={
                          day.present / day.total >= 0.9
                            ? "default"
                            : day.present / day.total >= 0.8
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {((day.present / day.total) * 100).toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detailed Attendance Records</CardTitle>
              <CardDescription>
                Complete list of filtered attendance records
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Check In</TableHead>
                      <TableHead>Check Out</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Hours</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.slice(0, 50).map((record) => {
                      const employee = employees.find(
                        (emp) => emp.id === record.employee_id
                      );

                      return (
                        <TableRow key={record.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {employee?.first_name} {employee?.last_name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {employee?.employee_id}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>{record.attendance_date}</TableCell>
                          <TableCell>{record.check_in_time || "-"}</TableCell>
                          <TableCell>{record.check_out_time || "-"}</TableCell>
                          <TableCell>
                            <Badge
                              className={`${
                                record.status === "present"
                                  ? "bg-green-100 text-green-800"
                                  : record.status === "absent"
                                  ? "bg-red-100 text-red-800"
                                  : record.status === "late"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {record.status.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>{record.location || "-"}</TableCell>
                          <TableCell>
                            {record.total_hours_worked || 0}h
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AttendanceReportsPage;
