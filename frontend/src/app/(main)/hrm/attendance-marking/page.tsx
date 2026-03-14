"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Clock, Users, CheckCircle, XCircle, Timer, Home, Save, RefreshCw, Search, AlertTriangle,
} from "lucide-react";
import { HRMApiService } from "@/modules/hrm/services/hrm-api";
import { useToast } from "@/components/ui/use-toast";

const ATTENDANCE_STATUSES = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "late", label: "Late" },
  { value: "half_day", label: "Half Day" },
  { value: "work_from_home", label: "Work from Home" },
  { value: "early_going", label: "Early Going" },
  { value: "on_leave", label: "On Leave" },
];

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

/** Extract HH:MM from time value (handles "09:00", "09:00:00", ISO strings, etc.) */
const formatTimeDisplay = (value: unknown): string | null => {
  if (value == null || value === "") return null;
  const s = String(value);
  const timeMatch = s.match(/(\d{1,2}):(\d{2})/);
  if (timeMatch) return `${timeMatch[1].padStart(2, "0")}:${timeMatch[2]}`;
  return null;
};

/** Compute hours between two time strings when total_hours_worked is missing */
const computeHoursFromTimes = (checkIn: string | null, checkOut: string | null): number | null => {
  if (!checkIn || !checkOut) return null;
  const parse = (t: string) => {
    const m = String(t).match(/(\d{1,2}):(\d{2})/);
    return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : NaN;
  };
  const inMins = parse(checkIn);
  const outMins = parse(checkOut);
  if (isNaN(inMins) || isNaN(outMins)) return null;
  const diffMins = outMins - inMins;
  return diffMins > 0 ? Math.round((diffMins / 60) * 10) / 10 : null;
};

const AttendanceMarkingPage: React.FC = () => {
  const { toast } = useToast();
  const today = new Date().toISOString().split("T")[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);
  const [markingMode, setMarkingMode] = useState<"check_in" | "check_out">("check_in");
  const [individualForm, setIndividualForm] = useState({
    employee_id: 0,
    time: "",
    location: "",
    notes: "",
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [empRes, deptRes, attRes] = await Promise.all([
        HRMApiService.getEmployees({ limit: 500 }),
        HRMApiService.getDepartments(),
        HRMApiService.getAttendanceRecords({ attendance_date: selectedDate }),
      ]);
      setEmployees(empRes.employees || []);
      setDepartments(deptRes.departments || []);
      setAttendanceRecords(attRes.attendance_records || []);
    } catch (err) {
      toast({ title: "Error", description: "Failed to load data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employee_id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept =
      selectedDepartment === "all" || emp.department_id?.toString() === selectedDepartment;
    return matchesSearch && matchesDept;
  });

  const handleIndividualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!individualForm.employee_id) return;
    try {
      setSubmitting(true);
      const checkInTime = markingMode === "check_in" && individualForm.time ? individualForm.time : undefined;
      const checkOutTime = markingMode === "check_out" && individualForm.time ? individualForm.time : undefined;
      await HRMApiService.markAttendance(
        markingMode,
        individualForm.employee_id,
        individualForm.location || undefined,
        individualForm.notes || undefined,
        selectedDate,
        checkInTime,
        checkOutTime
      );
      toast({ title: "Success", description: `Employee ${markingMode === "check_in" ? "checked in" : "checked out"} successfully` });
      setIndividualForm({ employee_id: 0, time: "", location: "", notes: "" });
      await loadData();
    } catch (err) {
      toast({ title: "Error", description: `Failed to ${markingMode.replace("_", " ")}`, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const [bulkMode, setBulkMode] = useState<"check_in" | "check_out">("check_in");
  const [bulkTime, setBulkTime] = useState("");
  const [bulkNotes, setBulkNotes] = useState("");

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedEmployeeIds.length === 0) return;
    try {
      setSubmitting(true);
      const checkInTime = bulkMode === "check_in" && bulkTime ? bulkTime : undefined;
      const checkOutTime = bulkMode === "check_out" && bulkTime ? bulkTime : undefined;
      await Promise.all(
        selectedEmployeeIds.map((empId) =>
          HRMApiService.markAttendance(bulkMode, empId, undefined, bulkNotes || undefined, selectedDate, checkInTime, checkOutTime)
        )
      );
      toast({ title: "Success", description: `Attendance marked for ${selectedEmployeeIds.length} employees` });
      setSelectedEmployeeIds([]);
      setBulkTime("");
      setBulkNotes("");
      await loadData();
    } catch (err) {
      toast({ title: "Error", description: "Failed to mark bulk attendance", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const markedCount = attendanceRecords.length;
  const pendingCount = employees.length - markedCount;
  const presentCount = attendanceRecords.filter((r) => r.status === "present" || r.status === "late").length;

  const selectedEmployeeRecord = individualForm.employee_id
    ? attendanceRecords.find((r) => Number(r.employee_id) === Number(individualForm.employee_id))
    : null;
  const wouldDuplicateIndividual =
    selectedEmployeeRecord &&
    ((markingMode === "check_in" && formatTimeDisplay(selectedEmployeeRecord.check_in_time)) ||
      (markingMode === "check_out" && formatTimeDisplay(selectedEmployeeRecord.check_out_time)));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Attendance Marking</h1>
          <p className="text-muted-foreground">Mark daily attendance for employees</p>
        </div>
        <div className="flex items-center gap-4">
          <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-[150px]" />
          <Button onClick={loadData} variant="outline" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Employees", value: employees.length, icon: <Users className="h-4 w-4 text-muted-foreground" />, sub: "In system" },
          { label: "Marked Today", value: markedCount, icon: <CheckCircle className="h-4 w-4 text-green-500" />, sub: "Attendance records" },
          { label: "Pending", value: pendingCount, icon: <Clock className="h-4 w-4 text-yellow-500" />, sub: "Need marking" },
          { label: "Present", value: presentCount, icon: <Timer className="h-4 w-4 text-blue-500" />, sub: "Present / Late" },
        ].map(({ label, value, icon, sub }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
              {icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{value}</div>
              <p className="text-xs text-muted-foreground">{sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="individual" className="space-y-4">
        <TabsList>
          <TabsTrigger value="individual">Individual Marking</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Marking</TabsTrigger>
          <TabsTrigger value="view">View Records</TabsTrigger>
        </TabsList>

        {/* Individual */}
        <TabsContent value="individual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Individual Attendance Marking</CardTitle>
              <CardDescription>Mark attendance for a single employee</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleIndividualSubmit} className="space-y-4">
                <div className="flex bg-muted p-1 rounded-lg w-fit">
                  <Button 
                    type="button"
                    variant={markingMode === "check_in" ? "default" : "ghost"} 
                    size="sm"
                    onClick={() => setMarkingMode("check_in")}
                  >
                    Check In
                  </Button>
                  <Button 
                    type="button"
                    variant={markingMode === "check_out" ? "default" : "ghost"} 
                    size="sm"
                    onClick={() => setMarkingMode("check_out")}
                  >
                    Check Out
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Employee</Label>
                    <Select
                      value={individualForm.employee_id?.toString() || ""}
                      onValueChange={(v) => setIndividualForm((p) => ({ ...p, employee_id: parseInt(v) }))}
                    >
                      <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                      <SelectContent>
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id.toString()}>
                            {emp.first_name} {emp.last_name} ({emp.employee_id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {individualForm.employee_id && (() => {
                      const existing = attendanceRecords.find(
                        (r) => Number(r.employee_id) === Number(individualForm.employee_id)
                      );
                      if (!existing) {
                        return (
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Not marked for {selectedDate}
                          </p>
                        );
                      }
                      const checkIn = formatTimeDisplay(existing.check_in_time);
                      const checkOut = formatTimeDisplay(existing.check_out_time);
                      const hours =
                        existing.total_hours_worked != null && !isNaN(Number(existing.total_hours_worked))
                          ? Number(existing.total_hours_worked)
                          : checkIn && checkOut
                            ? computeHoursFromTimes(
                                String(existing.check_in_time),
                                String(existing.check_out_time)
                              )
                            : null;
                      const wouldDuplicate =
                        (markingMode === "check_in" && checkIn) ||
                        (markingMode === "check_out" && checkOut);
                      return (
                        <div className="mt-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(existing.status)}>
                              {existing.status.replace(/_/g, " ")}
                            </Badge>
                            {wouldDuplicate && (
                              <span className="text-xs text-amber-600 dark:text-amber-500 flex items-center gap-1">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                Already {markingMode === "check_in" ? "checked in" : "checked out"}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {checkIn && checkOut
                              ? `${checkIn} - ${checkOut}${hours != null ? ` (${hours}h)` : ""}`
                              : checkIn
                                ? `Check-in: ${checkIn}`
                                : checkOut
                                  ? `Check-out: ${checkOut}`
                                  : "—"}
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                  <div className="space-y-2">
                    <Label>{markingMode === "check_in" ? "Check In" : "Check Out"} Time</Label>
                    <Input type="time" value={individualForm.time} onChange={(e) => setIndividualForm((p) => ({ ...p, time: e.target.value }))} />
                    <p className="text-xs text-muted-foreground">Leave empty to use current time</p>
                  </div>
                  {markingMode === "check_in" && (
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Input value={individualForm.location} onChange={(e) => setIndividualForm((p) => ({ ...p, location: e.target.value }))} placeholder="Office / Remote" />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea value={individualForm.notes} onChange={(e) => setIndividualForm((p) => ({ ...p, notes: e.target.value }))} rows={2} />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={!individualForm.employee_id || submitting || !!wouldDuplicateIndividual}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {submitting
                    ? "Saving..."
                    : wouldDuplicateIndividual
                      ? `Already ${markingMode === "check_in" ? "checked in" : "checked out"}`
                      : markingMode === "check_in"
                        ? "Mark Check In"
                        : "Mark Check Out"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bulk */}
        <TabsContent value="bulk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Attendance Marking</CardTitle>
              <CardDescription>Mark attendance for multiple employees at once</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBulkSubmit} className="space-y-4">
                <div className="flex bg-muted p-1 rounded-lg w-fit">
                  <Button 
                    type="button"
                    variant={bulkMode === "check_in" ? "default" : "ghost"} 
                    size="sm"
                    onClick={() => setBulkMode("check_in")}
                  >
                    Bulk Check In
                  </Button>
                  <Button 
                    type="button"
                    variant={bulkMode === "check_out" ? "default" : "ghost"} 
                    size="sm"
                    onClick={() => setBulkMode("check_out")}
                  >
                    Bulk Check Out
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{bulkMode === "check_in" ? "Check In" : "Check Out"} Time</Label>
                    <Input type="time" value={bulkTime} onChange={(e) => setBulkTime(e.target.value)} />
                    <p className="text-xs text-muted-foreground">Leave empty to use current time</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea value={bulkNotes} onChange={(e) => setBulkNotes(e.target.value)} rows={2} />
                  </div>
                </div>
                <Button type="submit" disabled={selectedEmployeeIds.length === 0 || submitting}>
                  <Save className="h-4 w-4 mr-2" />
                  {submitting ? "Saving..." : `Mark ${bulkMode === "check_in" ? "Check In" : "Check Out"} (${selectedEmployeeIds.length} selected)`}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Select Employees</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search employees..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
                </div>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Departments" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedEmployeeIds.length === filteredEmployees.length && filteredEmployees.length > 0}
                          onCheckedChange={(checked) => {
                            setSelectedEmployeeIds(checked ? filteredEmployees.map((e) => e.id) : []);
                          }}
                        />
                      </TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Employee ID</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Today's Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.map((emp) => {
                      const existing = attendanceRecords.find((r) => Number(r.employee_id) === Number(emp.id));
                      return (
                        <TableRow key={emp.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedEmployeeIds.includes(emp.id)}
                              onCheckedChange={(checked) => {
                                setSelectedEmployeeIds((prev) =>
                                  checked ? [...prev, emp.id] : prev.filter((id) => id !== emp.id)
                                );
                              }}
                            />
                          </TableCell>
                          <TableCell>{emp.first_name} {emp.last_name}</TableCell>
                          <TableCell>{emp.employee_id}</TableCell>
                          <TableCell>{emp.department?.name || "—"}</TableCell>
                          <TableCell>
                            {existing ? (
                              <Badge className={getStatusColor(existing.status)}>{existing.status.replace(/_/g, " ")}</Badge>
                            ) : (
                              <Badge variant="outline">Not Marked</Badge>
                            )}
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

        {/* View Records */}
        <TabsContent value="view" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Records — {selectedDate}</CardTitle>
              <CardDescription>View attendance records for the selected date</CardDescription>
            </CardHeader>
            <CardContent>
              {attendanceRecords.length === 0 ? (
                <p className="text-sm text-muted-foreground">No records for this date.</p>
              ) : (
                <div className="space-y-4">
                  {attendanceRecords.map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">
                          {record.employee?.first_name ?? record.first_name} {record.employee?.last_name ?? record.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {record.employee?.employee_id ?? record.employee_code ?? record.employee_id} • {record.employee?.department?.name ?? record.department_name ?? "—"}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm">
                            {(() => {
                              const checkIn = formatTimeDisplay(
                                record.check_in_time ?? (record as { checkInTime?: unknown }).checkInTime
                              );
                              const checkOut = formatTimeDisplay(
                                record.check_out_time ?? (record as { checkOutTime?: unknown }).checkOutTime
                              );
                              if (checkIn && checkOut) return `${checkIn} - ${checkOut}`;
                              if (checkIn) return `Check-in: ${checkIn}`;
                              if (checkOut) return `Check-out: ${checkOut}`;
                              return "No time recorded";
                            })()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(() => {
                              const fromBackend =
                                record.total_hours_worked != null &&
                                !isNaN(Number(record.total_hours_worked))
                                  ? Number(record.total_hours_worked)
                                  : null;
                              const checkInRaw =
                                record.check_in_time ?? (record as { checkInTime?: unknown }).checkInTime;
                              const checkOutRaw =
                                record.check_out_time ?? (record as { checkOutTime?: unknown }).checkOutTime;
                              const computed =
                                fromBackend ??
                                (checkInRaw != null && checkOutRaw != null
                                  ? computeHoursFromTimes(String(checkInRaw), String(checkOutRaw))
                                  : null);
                              return computed != null ? `${computed}h` : "";
                            })()}
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
      </Tabs>
    </div>
  );
};

export default AttendanceMarkingPage;
