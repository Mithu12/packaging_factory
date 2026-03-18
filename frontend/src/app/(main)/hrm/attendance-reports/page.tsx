"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Download, FileText, TrendingUp, Clock, Users, RefreshCw, AlertTriangle, Search,
} from "lucide-react";
import { HRMApiService } from "@/modules/hrm/services/hrm-api";
import { useToast } from "@/components/ui/use-toast";

const getStatusColor = (status: string) => {
  switch (status) {
    case "present": return "bg-green-100 text-green-800";
    case "absent": return "bg-red-100 text-red-800";
    case "late": return "bg-yellow-100 text-yellow-800";
    case "half_day": return "bg-blue-100 text-blue-800";
    case "work_from_home": return "bg-purple-100 text-purple-800";
    default: return "bg-gray-100 text-gray-800";
  }
};

/** Compute hours between two time strings (handles "HH:MM", "HH:MM:SS", or ISO datetime) */
const computeHoursFromTimes = (checkIn: string | null | undefined, checkOut: string | null | undefined): number | null => {
  if (!checkIn || !checkOut) return null;
  const extractTime = (t: string) => {
    const s = String(t).trim();
    const afterT = s.includes("T") ? s.split("T")[1] : s;
    const m = (afterT || s).match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) + (parseInt(m[3] || "0", 10) / 60) : NaN;
  };
  const inMins = extractTime(checkIn);
  const outMins = extractTime(checkOut);
  if (isNaN(inMins) || isNaN(outMins)) return null;
  const diffMins = outMins - inMins;
  return diffMins > 0 ? Math.round((diffMins / 60) * 100) / 100 : null;
};

/** Format hours for display - never shows NaN */
const formatHours = (r: { total_hours_worked?: number | string | null; check_in_time?: string | null; check_out_time?: string | null }) => {
  const fromBackend = r.total_hours_worked != null && !isNaN(Number(r.total_hours_worked))
    ? Number(r.total_hours_worked)
    : null;
  const computed = fromBackend ?? computeHoursFromTimes(r.check_in_time, r.check_out_time);
  if (computed == null || isNaN(computed)) return "—";
  return `${computed.toFixed(2)}h`;
};

const AttendanceReportsPage: React.FC = () => {
  const { toast } = useToast();
  const [records, setRecords] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [dateTo, setDateTo] = useState(new Date().toISOString().split("T")[0]);
  const [deptFilter, setDeptFilter] = useState("all");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [attRes, deptRes] = await Promise.all([
        HRMApiService.getAttendanceRecords({ start_date: dateFrom, end_date: dateTo }),
        HRMApiService.getDepartments(),
      ]);
      setRecords(attRes.attendance_records || []);
      setDepartments(deptRes.departments || []);
    } catch (err) {
      toast({ title: "Error", description: "Failed to load attendance data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredRecords = records.filter((r) => {
    const firstName = r.first_name ?? r.employee?.first_name ?? "";
    const lastName = r.last_name ?? r.employee?.last_name ?? "";
    const empId = r.employee_code ?? r.employee?.employee_id ?? "";
    const deptId = r.department_id ?? r.employee?.department_id;
    const matchesSearch =
      !searchTerm ||
      firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(empId).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept =
      deptFilter === "all" || deptId?.toString() === deptFilter;
    return matchesSearch && matchesDept;
  });

  const calcStats = (recs: any[]) => {
    return recs.reduce(
      (acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        acc.total++;
        return acc;
      },
      { present: 0, absent: 0, late: 0, half_day: 0, work_from_home: 0, total: 0 }
    );
  };

  const stats = calcStats(filteredRecords);
  const attendanceRate = stats.total > 0 ? ((stats.present / stats.total) * 100).toFixed(1) : "0";

  const deptStats = departments.map((dept) => {
    const deptRecs = filteredRecords.filter((r) => (r.department_id ?? r.employee?.department_id) === dept.id);
    const s = calcStats(deptRecs);
    return { ...dept, ...s, rate: s.total > 0 ? ((s.present / s.total) * 100).toFixed(1) : "0" };
  }).filter((d) => d.total > 0);

  const trendData = (() => {
    const byDate: Record<string, any[]> = {};
    filteredRecords.forEach((r) => {
      if (!byDate[r.attendance_date]) byDate[r.attendance_date] = [];
      byDate[r.attendance_date].push(r);
    });
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, recs]) => ({ date, ...calcStats(recs) }));
  })();

  const handleExport = async (format: "excel" | "pdf") => {
    try {
      setExporting(true);
      const blob = await HRMApiService.exportAttendanceData(dateFrom, dateTo, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance-report-${dateFrom}-${dateTo}.${format === "excel" ? "xlsx" : "pdf"}`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast({ title: "Success", description: `${format.toUpperCase()} exported successfully` });
    } catch (err) {
      toast({ title: "Error", description: `Failed to export ${format.toUpperCase()}`, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Attendance Reports</h1>
          <p className="text-muted-foreground">Analytics and reporting for attendance data</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => handleExport("excel")} variant="outline" disabled={exporting}>
            <Download className="h-4 w-4 mr-2" />Export Excel
          </Button>
          <Button onClick={() => handleExport("pdf")} variant="outline" disabled={exporting}>
            <Download className="h-4 w-4 mr-2" />Export PDF
          </Button>
          <Button onClick={loadData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader><CardTitle className="text-base">Filters</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>From Date</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>To Date</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search employees..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={deptFilter} onValueChange={setDeptFilter}>
                <SelectTrigger><SelectValue placeholder="All Departments" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={loadData} className="mt-4">Apply Filters</Button>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Records", value: stats.total, icon: <FileText className="h-4 w-4 text-muted-foreground" />, sub: "In selected period" },
          { label: "Avg Attendance", value: `${attendanceRate}%`, icon: <TrendingUp className="h-4 w-4 text-green-500" />, sub: "Average rate", cls: "text-green-600" },
          { label: "Late Arrivals", value: stats.late, icon: <Clock className="h-4 w-4 text-yellow-500" />, sub: "Employees arrived late", cls: "text-yellow-600" },
          { label: "Absent", value: stats.absent, icon: <Users className="h-4 w-4 text-red-500" />, sub: "Employees absent", cls: "text-red-600" },
        ].map(({ label, value, icon, sub, cls }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
              {icon}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${cls || ""}`}>{value}</div>
              <p className="text-xs text-muted-foreground">{sub}</p>
            </CardContent>
          </Card>
        ))}
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
                <CardDescription>Distribution of attendance statuses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { label: "Present", key: "present", cls: "bg-green-100 text-green-800" },
                    { label: "Absent", key: "absent", cls: "bg-red-100 text-red-800" },
                    { label: "Late", key: "late", cls: "bg-yellow-100 text-yellow-800" },
                    { label: "Half Day", key: "half_day", cls: "bg-blue-100 text-blue-800" },
                    { label: "Work from Home", key: "work_from_home", cls: "bg-purple-100 text-purple-800" },
                  ].map(({ label, key, cls }) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm">{label}</span>
                      <Badge className={cls}>{stats[key] || 0}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Departments</CardTitle>
                <CardDescription>Departments with highest attendance rates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {deptStats.sort((a, b) => parseFloat(b.rate) - parseFloat(a.rate)).slice(0, 5).map((dept) => (
                    <div key={dept.id} className="flex items-center justify-between">
                      <span className="text-sm">{dept.name}</span>
                      <Badge variant={parseFloat(dept.rate) >= 90 ? "default" : parseFloat(dept.rate) >= 80 ? "secondary" : "destructive"}>
                        {dept.rate}%
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
              <CardDescription>Detailed attendance statistics by department</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {deptStats.map((dept) => (
                  <div key={dept.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium">{dept.name}</h3>
                      <Badge variant={parseFloat(dept.rate) >= 90 ? "default" : parseFloat(dept.rate) >= 80 ? "secondary" : "destructive"}>
                        {dept.rate}%
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div><p className="text-muted-foreground">Total Records</p><p className="font-medium">{dept.total}</p></div>
                      <div><p className="text-muted-foreground">Present</p><p className="font-medium text-green-600">{dept.present}</p></div>
                      <div><p className="text-muted-foreground">Absent</p><p className="font-medium text-red-600">{dept.absent}</p></div>
                      <div><p className="text-muted-foreground">Late</p><p className="font-medium text-yellow-600">{dept.late}</p></div>
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
              <CardDescription>Daily attendance patterns over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trendData.slice(-14).map((day) => (
                  <div key={day.date} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">
                        {new Date(day.date).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                      </p>
                      <p className="text-sm text-muted-foreground">{day.total} records</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm"><span className="text-green-600">{day.present}</span> present</p>
                        <p className="text-sm"><span className="text-red-600">{day.absent}</span> absent</p>
                      </div>
                      <Badge variant={day.total > 0 && day.present / day.total >= 0.9 ? "default" : day.total > 0 && day.present / day.total >= 0.8 ? "secondary" : "destructive"}>
                        {day.total > 0 ? ((day.present / day.total) * 100).toFixed(1) : 0}%
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
              <CardTitle>Detailed Records</CardTitle>
              <CardDescription>{filteredRecords.length} records found</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Check In</TableHead>
                      <TableHead>Check Out</TableHead>
                      <TableHead>Hours</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.slice(0, 100).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{r.first_name ?? r.employee?.first_name} {r.last_name ?? r.employee?.last_name}</p>
                            <p className="text-xs text-muted-foreground">{r.employee_code ?? r.employee?.employee_id ?? "—"}</p>
                          </div>
                        </TableCell>
                        <TableCell>{r.attendance_date}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(r.status)}>{r.status.replace(/_/g, " ")}</Badge>
                        </TableCell>
                        <TableCell>{r.check_in_time || "—"}</TableCell>
                        <TableCell>{r.check_out_time || "—"}</TableCell>
                        <TableCell>{formatHours(r)}</TableCell>
                      </TableRow>
                    ))}
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
