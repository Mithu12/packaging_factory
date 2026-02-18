"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  Clock,
  Plus,
  Edit,
  Trash2,
  Users,
  Settings,
  Calendar,
  Save,
  X,
  Search,
  Filter,
} from "lucide-react";
import { HRMApiService } from "../services/hrm-api";
import { useToast } from "@/components/ui/use-toast";
import {
  Shift,
  ShiftAssignment,
  Employee,
  Department,
  CreateShiftForm,
  CreateShiftAssignmentForm,
} from "../types";

const ShiftManagementPage: React.FC = () => {
  const { toast } = useToast();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [shiftAssignments, setShiftAssignments] = useState<ShiftAssignment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");

  // Shift form state
  const [isShiftDialogOpen, setIsShiftDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [shiftForm, setShiftForm] = useState<CreateShiftForm>({
    name: "",
    code: "",
    description: "",
    start_time: "09:00",
    end_time: "18:00",
    break_start_time: "13:00",
    break_end_time: "14:00",
    working_hours: 8,
    is_flexible: false,
    grace_period_minutes: 15,
    late_threshold_minutes: 30,
    early_going_threshold_minutes: 30,
    color_code: "#3B82F6",
  });

  // Assignment form state
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] =
    useState<ShiftAssignment | null>(null);
  const [assignmentForm, setAssignmentForm] =
    useState<CreateShiftAssignmentForm>({
      employee_id: 0,
      shift_id: 0,
      effective_from: new Date().toISOString().split("T")[0],
      is_primary: true,
      notes: "",
    });

  // Load data on mount
  const loadData = useCallback(async () => {
    try {
      setDataLoading(true);
      const [shiftsRes, assignmentsRes, empsRes, deptsRes] = await Promise.all([
        HRMApiService.getShifts(),
        HRMApiService.getShiftAssignments(),
        HRMApiService.getEmployees({ limit: 500 }),
        HRMApiService.getDepartments(),
      ]);
      setShifts(shiftsRes.shifts || []);
      setShiftAssignments(assignmentsRes.assignments || []);
      setEmployees(empsRes.employees || []);
      setDepartments(deptsRes.departments || []);
    } catch (err) {
      toast({ title: "Error", description: "Failed to load shift data", variant: "destructive" });
    } finally {
      setDataLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

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

  const resetShiftForm = () => {
    setShiftForm({
      name: "",
      code: "",
      description: "",
      start_time: "09:00",
      end_time: "18:00",
      break_start_time: "13:00",
      break_end_time: "14:00",
      working_hours: 8,
      is_flexible: false,
      grace_period_minutes: 15,
      late_threshold_minutes: 30,
      early_going_threshold_minutes: 30,
      color_code: "#3B82F6",
    });
    setEditingShift(null);
  };

  const resetAssignmentForm = () => {
    setAssignmentForm({
      employee_id: 0,
      shift_id: 0,
      effective_from: new Date().toISOString().split("T")[0],
      is_primary: true,
      notes: "",
    });
    setEditingAssignment(null);
  };

  const handleShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (editingShift) {
        const updated = await HRMApiService.updateShift(editingShift.id, shiftForm);
        setShifts((prev) => prev.map((s) => s.id === editingShift.id ? updated.shift : s));
        toast({ title: "Success", description: "Shift updated successfully" });
      } else {
        const created = await HRMApiService.createShift(shiftForm);
        setShifts((prev) => [...prev, created.shift]);
        toast({ title: "Success", description: "Shift created successfully" });
      }
      setIsShiftDialogOpen(false);
      resetShiftForm();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Error saving shift", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (editingAssignment) {
        const updated = await HRMApiService.updateShiftAssignment(editingAssignment.id, assignmentForm);
        setShiftAssignments((prev) => prev.map((a) => a.id === editingAssignment.id ? updated.assignment : a));
        toast({ title: "Success", description: "Shift assignment updated successfully" });
      } else {
        const created = await HRMApiService.assignShift(assignmentForm);
        setShiftAssignments((prev) => [...prev, created.assignment]);
        toast({ title: "Success", description: "Shift assigned successfully" });
      }
      setIsAssignmentDialogOpen(false);
      resetAssignmentForm();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Error saving shift assignment", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleEditShift = (shift: Shift) => {
    setEditingShift(shift);
    setShiftForm({
      name: shift.name,
      code: shift.code,
      description: shift.description || "",
      start_time: shift.start_time,
      end_time: shift.end_time,
      break_start_time: shift.break_start_time || "",
      break_end_time: shift.break_end_time || "",
      working_hours: shift.working_hours,
      is_flexible: shift.is_flexible,
      grace_period_minutes: shift.grace_period_minutes,
      late_threshold_minutes: shift.late_threshold_minutes,
      early_going_threshold_minutes: shift.early_going_threshold_minutes,
      color_code: shift.color_code,
    });
    setIsShiftDialogOpen(true);
  };

  const handleDeleteShift = async (shiftId: number) => {
    if (confirm("Are you sure you want to delete this shift?")) {
      try {
        setLoading(true);
        await HRMApiService.deleteShift(shiftId);
        setShifts((prev) => prev.filter((s) => s.id !== shiftId));
        setShiftAssignments((prev) => prev.filter((a) => a.shift_id !== shiftId));
        toast({ title: "Success", description: "Shift deleted successfully" });
      } catch (error: any) {
        toast({ title: "Error", description: error.message || "Error deleting shift", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleEditAssignment = (assignment: ShiftAssignment) => {
    setEditingAssignment(assignment);
    setAssignmentForm({
      employee_id: assignment.employee_id,
      shift_id: assignment.shift_id,
      effective_from: assignment.effective_from,
      effective_to: assignment.effective_to || "",
      is_primary: assignment.is_primary,
      notes: assignment.notes || "",
    });
    setIsAssignmentDialogOpen(true);
  };

  const handleDeleteAssignment = async (assignmentId: number) => {
    if (confirm("Are you sure you want to remove this shift assignment?")) {
      try {
        setLoading(true);
        await HRMApiService.removeShiftAssignment(assignmentId);
        setShiftAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
        toast({ title: "Success", description: "Shift assignment removed successfully" });
      } catch (error: any) {
        toast({ title: "Error", description: error.message || "Error removing assignment", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }
  };

  const getEmployeeShift = (employeeId: number) => {
    const activeAssignment = shiftAssignments.find(
      (a) =>
        a.employee_id === employeeId &&
        (!a.effective_to || new Date(a.effective_to) >= new Date())
    );
    return activeAssignment
      ? shifts.find((s) => s.id === activeAssignment.shift_id)
      : null;
  };

  const getShiftEmployeeCount = (shiftId: number) => {
    return shiftAssignments.filter(
      (a) =>
        a.shift_id === shiftId &&
        (!a.effective_to || new Date(a.effective_to) >= new Date())
    ).length;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Shift Management
          </h1>
          <p className="text-muted-foreground">
            Configure shifts and assign them to employees
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isShiftDialogOpen} onOpenChange={setIsShiftDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetShiftForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Shift
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingShift ? "Edit Shift" : "Create New Shift"}
                </DialogTitle>
                <DialogDescription>
                  {editingShift
                    ? "Update shift details"
                    : "Add a new shift configuration"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleShiftSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="shift_name">Shift Name</Label>
                    <Input
                      id="shift_name"
                      value={shiftForm.name}
                      onChange={(e) =>
                        setShiftForm((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="shift_code">Shift Code</Label>
                    <Input
                      id="shift_code"
                      value={shiftForm.code}
                      onChange={(e) =>
                        setShiftForm((prev) => ({
                          ...prev,
                          code: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="start_time">Start Time</Label>
                    <Input
                      id="start_time"
                      type="time"
                      value={shiftForm.start_time}
                      onChange={(e) =>
                        setShiftForm((prev) => ({
                          ...prev,
                          start_time: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="end_time">End Time</Label>
                    <Input
                      id="end_time"
                      type="time"
                      value={shiftForm.end_time}
                      onChange={(e) =>
                        setShiftForm((prev) => ({
                          ...prev,
                          end_time: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="break_start_time">Break Start</Label>
                    <Input
                      id="break_start_time"
                      type="time"
                      value={shiftForm.break_start_time || ""}
                      onChange={(e) =>
                        setShiftForm((prev) => ({
                          ...prev,
                          break_start_time: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="break_end_time">Break End</Label>
                    <Input
                      id="break_end_time"
                      type="time"
                      value={shiftForm.break_end_time || ""}
                      onChange={(e) =>
                        setShiftForm((prev) => ({
                          ...prev,
                          break_end_time: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="working_hours">Working Hours</Label>
                    <Input
                      id="working_hours"
                      type="number"
                      min="1"
                      max="24"
                      value={shiftForm.working_hours}
                      onChange={(e) =>
                        setShiftForm((prev) => ({
                          ...prev,
                          working_hours: parseInt(e.target.value),
                        }))
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="color_code">Color Code</Label>
                    <Input
                      id="color_code"
                      type="color"
                      value={shiftForm.color_code}
                      onChange={(e) =>
                        setShiftForm((prev) => ({
                          ...prev,
                          color_code: e.target.value,
                        }))
                      }
                      className="h-10"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="grace_period_minutes">
                      Grace Period (minutes)
                    </Label>
                    <Input
                      id="grace_period_minutes"
                      type="number"
                      min="0"
                      value={shiftForm.grace_period_minutes}
                      onChange={(e) =>
                        setShiftForm((prev) => ({
                          ...prev,
                          grace_period_minutes: parseInt(e.target.value),
                        }))
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="late_threshold_minutes">
                      Late Threshold (minutes)
                    </Label>
                    <Input
                      id="late_threshold_minutes"
                      type="number"
                      min="0"
                      value={shiftForm.late_threshold_minutes}
                      onChange={(e) =>
                        setShiftForm((prev) => ({
                          ...prev,
                          late_threshold_minutes: parseInt(e.target.value),
                        }))
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="early_going_threshold_minutes">
                      Early Going Threshold (minutes)
                    </Label>
                    <Input
                      id="early_going_threshold_minutes"
                      type="number"
                      min="0"
                      value={shiftForm.early_going_threshold_minutes}
                      onChange={(e) =>
                        setShiftForm((prev) => ({
                          ...prev,
                          early_going_threshold_minutes: parseInt(
                            e.target.value
                          ),
                        }))
                      }
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={shiftForm.description}
                    onChange={(e) =>
                      setShiftForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_flexible"
                    checked={shiftForm.is_flexible}
                    onCheckedChange={(checked) =>
                      setShiftForm((prev) => ({
                        ...prev,
                        is_flexible: !!checked,
                      }))
                    }
                  />
                  <Label htmlFor="is_flexible">Flexible Hours</Label>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsShiftDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading}>
                    <Save className="h-4 w-4 mr-2" />
                    {editingShift ? "Update" : "Create"} Shift
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="shifts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="shifts">Shifts</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          <TabsTrigger value="employee-shifts">Employee Shifts</TabsTrigger>
        </TabsList>

        <TabsContent value="shifts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Shift Configuration</CardTitle>
              <CardDescription>
                Manage shift schedules and timing configurations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {shifts.map((shift) => (
                  <Card key={shift.id} className="relative">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{shift.name}</CardTitle>
                        <Badge style={{ backgroundColor: shift.color_code }}>
                          {shift.code}
                        </Badge>
                      </div>
                      <CardDescription>{shift.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {shift.start_time} - {shift.end_time}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {getShiftEmployeeCount(shift.id)} employees assigned
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Settings className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {shift.working_hours}h •{" "}
                            {shift.grace_period_minutes}min grace
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditShift(shift)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteShift(shift.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Shift Assignments</CardTitle>
              <CardDescription>
                Manage employee shift assignments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Dialog
                    open={isAssignmentDialogOpen}
                    onOpenChange={setIsAssignmentDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button onClick={resetAssignmentForm}>
                        <Plus className="h-4 w-4 mr-2" />
                        Assign Shift
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          {editingAssignment
                            ? "Edit Assignment"
                            : "Create Shift Assignment"}
                        </DialogTitle>
                        <DialogDescription>
                          {editingAssignment
                            ? "Update shift assignment"
                            : "Assign a shift to an employee"}
                        </DialogDescription>
                      </DialogHeader>
                      <form
                        onSubmit={handleAssignmentSubmit}
                        className="space-y-4"
                      >
                        <div className="space-y-2">
                          <Label htmlFor="assignment_employee">Employee</Label>
                          <Select
                            value={assignmentForm.employee_id?.toString() || ""}
                            onValueChange={(value) =>
                              setAssignmentForm((prev) => ({
                                ...prev,
                                employee_id: parseInt(value),
                              }))
                            }
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
                          <Label htmlFor="assignment_shift">Shift</Label>
                          <Select
                            value={assignmentForm.shift_id?.toString() || ""}
                            onValueChange={(value) =>
                              setAssignmentForm((prev) => ({
                                ...prev,
                                shift_id: parseInt(value),
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select shift" />
                            </SelectTrigger>
                            <SelectContent>
                              {shifts.map((shift) => (
                                <SelectItem
                                  key={shift.id}
                                  value={shift.id.toString()}
                                >
                                  {shift.name} ({shift.start_time} -{" "}
                                  {shift.end_time})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="effective_from">
                              Effective From
                            </Label>
                            <Input
                              id="effective_from"
                              type="date"
                              value={assignmentForm.effective_from}
                              onChange={(e) =>
                                setAssignmentForm((prev) => ({
                                  ...prev,
                                  effective_from: e.target.value,
                                }))
                              }
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="effective_to">
                              Effective To (Optional)
                            </Label>
                            <Input
                              id="effective_to"
                              type="date"
                              value={assignmentForm.effective_to || ""}
                              onChange={(e) =>
                                setAssignmentForm((prev) => ({
                                  ...prev,
                                  effective_to: e.target.value,
                                }))
                              }
                            />
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="is_primary"
                            checked={assignmentForm.is_primary}
                            onCheckedChange={(checked) =>
                              setAssignmentForm((prev) => ({
                                ...prev,
                                is_primary: !!checked,
                              }))
                            }
                          />
                          <Label htmlFor="is_primary">Primary Shift</Label>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="assignment_notes">Notes</Label>
                          <Textarea
                            id="assignment_notes"
                            value={assignmentForm.notes}
                            onChange={(e) =>
                              setAssignmentForm((prev) => ({
                                ...prev,
                                notes: e.target.value,
                              }))
                            }
                            rows={3}
                          />
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsAssignmentDialogOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button type="submit" disabled={loading}>
                            <Save className="h-4 w-4 mr-2" />
                            {editingAssignment ? "Update" : "Create"} Assignment
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Shift</TableHead>
                        <TableHead>Effective Period</TableHead>
                        <TableHead>Primary</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shiftAssignments.map((assignment) => {
                        const employee = employees.find(
                          (emp) => emp.id === assignment.employee_id
                        );
                        const shift = shifts.find(
                          (s) => s.id === assignment.shift_id
                        );

                        return (
                          <TableRow key={assignment.id}>
                            <TableCell>
                              {employee?.first_name} {employee?.last_name}
                            </TableCell>
                            <TableCell>
                              <Badge
                                style={{ backgroundColor: shift?.color_code }}
                              >
                                {shift?.name}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {assignment.effective_from}
                              {assignment.effective_to
                                ? ` - ${assignment.effective_to}`
                                : " (Ongoing)"}
                            </TableCell>
                            <TableCell>
                              {assignment.is_primary ? (
                                <Badge>Primary</Badge>
                              ) : (
                                <Badge variant="outline">Secondary</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleEditAssignment(assignment)
                                  }
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleDeleteAssignment(assignment.id)
                                  }
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employee-shifts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Employee Shift Overview</CardTitle>
              <CardDescription>
                Current shift assignments for all employees
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

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredEmployees.map((employee) => {
                  const currentShift = getEmployeeShift(employee.id);

                  return (
                    <Card key={employee.id}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">
                          {employee.first_name} {employee.last_name}
                        </CardTitle>
                        <CardDescription>
                          {employee.employee_id} • {employee.department?.name}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              Current Shift:
                            </span>
                            {currentShift ? (
                              <Badge
                                style={{
                                  backgroundColor: currentShift.color_code,
                                }}
                              >
                                {currentShift.name}
                              </Badge>
                            ) : (
                              <Badge variant="outline">No Shift</Badge>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              Schedule:
                            </span>
                            <span className="text-sm">
                              {currentShift
                                ? `${currentShift.start_time} - ${currentShift.end_time}`
                                : "N/A"}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              Hours:
                            </span>
                            <span className="text-sm">
                              {currentShift?.working_hours || 0}h
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
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

export default ShiftManagementPage;
