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
import { Textarea } from "@/components/ui/textarea";
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
  Calendar,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  Timer,
  Home,
  MapPin,
  Camera,
  FileSpreadsheet,
  Save,
  RefreshCw,
  Search,
  Filter,
} from "lucide-react";
import {
  mockAttendanceRecords,
  getAttendanceStatusOptions,
  getAttendanceByDate,
  calculateAttendanceStats,
} from "../data/attendance-data";
import { mockShifts, getShiftOptions } from "../data/shift-data";
import { mockEmployees } from "../data/salary-update-data";
import { mockDepartments } from "../data/salary-update-data";
import {
  AttendanceRecord,
  Employee,
  Department,
  Shift,
  CreateAttendanceRecordForm,
  BulkAttendanceMarkForm,
} from "../types";

const AttendanceMarkingPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceRecord[]
  >([]);
  const [employees] = useState<Employee[]>(mockEmployees);
  const [departments] = useState<Department[]>(mockDepartments);
  const [shifts] = useState<Shift[]>(mockShifts);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedShift, setSelectedShift] = useState<string>("all");

  // Individual attendance form state
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null
  );
  const [attendanceForm, setAttendanceForm] =
    useState<CreateAttendanceRecordForm>({
      employee_id: 0,
      attendance_date: selectedDate,
      status: "present",
      recorded_by: "HR Admin",
      is_manual_entry: true,
    });

  // Bulk attendance state
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);
  const [bulkAttendanceForm, setBulkAttendanceForm] =
    useState<BulkAttendanceMarkForm>({
      employee_ids: [],
      attendance_date: selectedDate,
      status: "present",
    });

  useEffect(() => {
    loadAttendanceData();
  }, [selectedDate]);

  useEffect(() => {
    setAttendanceForm((prev) => ({ ...prev, attendance_date: selectedDate }));
    setBulkAttendanceForm((prev) => ({
      ...prev,
      attendance_date: selectedDate,
    }));
  }, [selectedDate]);

  const loadAttendanceData = async () => {
    try {
      setLoading(true);
      // Simulate API call delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      const records = getAttendanceByDate(selectedDate);
      setAttendanceRecords(records);
    } catch (error) {
      console.error("Error loading attendance data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter((employee) => {
    const matchesSearch =
      employee.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.employee_id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDepartment =
      selectedDepartment === "all" ||
      employee.department_id?.toString() === selectedDepartment;

    return matchesSearch && matchesDepartment;
  });

  const handleIndividualAttendanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Add the new record to the list
      const newRecord: AttendanceRecord = {
        id: Math.max(...attendanceRecords.map((r) => r.id)) + 1,
        ...attendanceForm,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setAttendanceRecords((prev) => [...prev, newRecord]);

      // Reset form
      setAttendanceForm({
        employee_id: 0,
        attendance_date: selectedDate,
        status: "present",
        recorded_by: "HR Admin",
        is_manual_entry: true,
      });
      setSelectedEmployee(null);

      alert("Attendance marked successfully!");
    } catch (error) {
      alert("Error marking attendance");
    }
  };

  const handleBulkAttendanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Create records for selected employees
      const newRecords: AttendanceRecord[] = selectedEmployeeIds.map(
        (employeeId, index) => ({
          id: Math.max(...attendanceRecords.map((r) => r.id)) + index + 1,
          employee_id: employeeId,
          attendance_date: selectedDate,
          status: bulkAttendanceForm.status,
          check_in_time: bulkAttendanceForm.check_in_time,
          check_out_time: bulkAttendanceForm.check_out_time,
          notes: bulkAttendanceForm.notes,
          recorded_by: "HR Admin",
          is_manual_entry: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      );

      setAttendanceRecords((prev) => [...prev, ...newRecords]);

      // Reset form
      setSelectedEmployeeIds([]);
      setBulkAttendanceForm({
        employee_ids: [],
        attendance_date: selectedDate,
        status: "present",
      });

      alert("Bulk attendance marked successfully!");
    } catch (error) {
      alert("Error marking bulk attendance");
    }
  };

  const markAllPresent = async () => {
    try {
      const employeeIds = filteredEmployees.map((emp) => emp.id);
      setSelectedEmployeeIds(employeeIds);

      setBulkAttendanceForm((prev) => ({
        ...prev,
        employee_ids: employeeIds,
        status: "present",
      }));

      alert(
        `Selected ${employeeIds.length} employees for bulk present marking`
      );
    } catch (error) {
      alert("Error selecting employees");
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
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const currentStats = calculateAttendanceStats(attendanceRecords);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Attendance Marking
          </h1>
          <p className="text-muted-foreground">
            Mark daily attendance for employees
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-[150px]"
          />
          <Button onClick={loadAttendanceData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Employees
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
            <p className="text-xs text-muted-foreground">In selected filters</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Marked Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceRecords.length}</div>
            <p className="text-xs text-muted-foreground">Attendance records</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {employees.length - attendanceRecords.length}
            </div>
            <p className="text-xs text-muted-foreground">Need marking</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Attendance Rate
            </CardTitle>
            <Timer className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {employees.length > 0
                ? ((attendanceRecords.length / employees.length) * 100).toFixed(
                    1
                  )
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">For today</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="individual" className="space-y-4">
        <TabsList>
          <TabsTrigger value="individual">Individual Marking</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Marking</TabsTrigger>
          <TabsTrigger value="view">View Records</TabsTrigger>
        </TabsList>

        <TabsContent value="individual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Individual Attendance Marking</CardTitle>
              <CardDescription>
                Mark attendance for individual employees
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={handleIndividualAttendanceSubmit}
                className="space-y-4"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="employee">Employee</Label>
                    <Select
                      value={attendanceForm.employee_id?.toString() || ""}
                      onValueChange={(value) => {
                        const employee = employees.find(
                          (emp) => emp.id === parseInt(value)
                        );
                        setSelectedEmployee(employee || null);
                        setAttendanceForm((prev) => ({
                          ...prev,
                          employee_id: parseInt(value),
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((employee) => (
                          <SelectItem
                            key={employee.id}
                            value={employee.id.toString()}
                          >
                            {employee.first_name} {employee.last_name} (
                            {employee.employee_id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={attendanceForm.status}
                      onValueChange={(value: AttendanceRecord["status"]) =>
                        setAttendanceForm((prev) => ({
                          ...prev,
                          status: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAttendanceStatusOptions().map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="check_in_time">Check In Time</Label>
                    <Input
                      id="check_in_time"
                      type="time"
                      value={attendanceForm.check_in_time || ""}
                      onChange={(e) =>
                        setAttendanceForm((prev) => ({
                          ...prev,
                          check_in_time: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="check_out_time">Check Out Time</Label>
                    <Input
                      id="check_out_time"
                      type="time"
                      value={attendanceForm.check_out_time || ""}
                      onChange={(e) =>
                        setAttendanceForm((prev) => ({
                          ...prev,
                          check_out_time: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      value={attendanceForm.location || ""}
                      onChange={(e) =>
                        setAttendanceForm((prev) => ({
                          ...prev,
                          location: e.target.value,
                        }))
                      }
                      placeholder="Office location or remote"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={attendanceForm.notes || ""}
                      onChange={(e) =>
                        setAttendanceForm((prev) => ({
                          ...prev,
                          notes: e.target.value,
                        }))
                      }
                      placeholder="Additional notes"
                      rows={3}
                    />
                  </div>
                </div>

                <Button type="submit" disabled={!attendanceForm.employee_id}>
                  <Save className="h-4 w-4 mr-2" />
                  Mark Attendance
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Attendance Marking</CardTitle>
              <CardDescription>
                Mark attendance for multiple employees at once
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBulkAttendanceSubmit} className="space-y-4">
                <div className="flex items-center gap-4">
                  <Button
                    type="button"
                    onClick={markAllPresent}
                    variant="outline"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark All Present
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {selectedEmployeeIds.length} employees selected
                  </span>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="bulk_status">Status</Label>
                    <Select
                      value={bulkAttendanceForm.status}
                      onValueChange={(value: AttendanceRecord["status"]) =>
                        setBulkAttendanceForm((prev) => ({
                          ...prev,
                          status: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAttendanceStatusOptions().map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bulk_check_in_time">Check In Time</Label>
                    <Input
                      id="bulk_check_in_time"
                      type="time"
                      value={bulkAttendanceForm.check_in_time || ""}
                      onChange={(e) =>
                        setBulkAttendanceForm((prev) => ({
                          ...prev,
                          check_in_time: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bulk_check_out_time">Check Out Time</Label>
                    <Input
                      id="bulk_check_out_time"
                      type="time"
                      value={bulkAttendanceForm.check_out_time || ""}
                      onChange={(e) =>
                        setBulkAttendanceForm((prev) => ({
                          ...prev,
                          check_out_time: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bulk_notes">Notes</Label>
                    <Textarea
                      id="bulk_notes"
                      value={bulkAttendanceForm.notes || ""}
                      onChange={(e) =>
                        setBulkAttendanceForm((prev) => ({
                          ...prev,
                          notes: e.target.value,
                        }))
                      }
                      placeholder="Notes for all selected employees"
                      rows={3}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={selectedEmployeeIds.length === 0}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Mark Bulk Attendance ({selectedEmployeeIds.length} employees)
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Employee Selection Table */}
          <Card>
            <CardHeader>
              <CardTitle>Select Employees</CardTitle>
              <CardDescription>
                Choose employees for bulk attendance marking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select
                  value={selectedDepartment}
                  onValueChange={setSelectedDepartment}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id.toString()}>
                        {dept.name}
                      </SelectItem>
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
                          checked={
                            selectedEmployeeIds.length ===
                              filteredEmployees.length &&
                            filteredEmployees.length > 0
                          }
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedEmployeeIds(
                                filteredEmployees.map((emp) => emp.id)
                              );
                            } else {
                              setSelectedEmployeeIds([]);
                            }
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
                    {filteredEmployees.map((employee) => {
                      const existingRecord = attendanceRecords.find(
                        (r) => r.employee_id === employee.id
                      );
                      const isSelected = selectedEmployeeIds.includes(
                        employee.id
                      );

                      return (
                        <TableRow key={employee.id}>
                          <TableCell>
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedEmployeeIds((prev) => [
                                    ...prev,
                                    employee.id,
                                  ]);
                                } else {
                                  setSelectedEmployeeIds((prev) =>
                                    prev.filter((id) => id !== employee.id)
                                  );
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            {employee.first_name} {employee.last_name}
                          </TableCell>
                          <TableCell>{employee.employee_id}</TableCell>
                          <TableCell>
                            {employee.department?.name || "No Department"}
                          </TableCell>
                          <TableCell>
                            {existingRecord ? (
                              <Badge
                                className={getStatusColor(
                                  existingRecord.status
                                )}
                              >
                                {existingRecord.status.replace("_", " ")}
                              </Badge>
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

        <TabsContent value="view" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Attendance Records - {selectedDate}</CardTitle>
              <CardDescription>
                View and manage attendance records for the selected date
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {attendanceRecords.map((record) => {
                  const employee = employees.find(
                    (emp) => emp.id === record.employee_id
                  );

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
                            {employee?.employee_id} •{" "}
                            {employee?.department?.name}
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
                              ? `${record.total_hours_worked}h`
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
      </Tabs>
    </div>
  );
};

export default AttendanceMarkingPage;
