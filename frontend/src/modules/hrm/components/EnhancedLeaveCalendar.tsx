"use client";

import React, { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  Download,
  Printer,
  Filter,
  Search,
  CalendarDays,
  MapPin,
  Phone,
  FileText,
  TrendingUp,
} from "lucide-react";
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
} from "date-fns";
import {
  mockLeaveCalendarEvents,
  mockEmployees,
  mockDepartments,
  mockLeaveTypes,
  mockPublicHolidays,
  mockTeamAvailability,
  calendarViewOptions,
  departmentOptions,
  employeeOptions,
  leaveTypeOptions,
  statusFilterOptions,
  holidayTypeOptions,
  isWeekend,
  isHoliday,
  getHolidayInfo,
  getLeaveTypeById,
  getEmployeeById,
  getDepartmentById,
  getHeadcountAnalysis,
} from "../data/leave-calendar-data";
import {
  LeaveCalendarEvent,
  TeamAvailability,
  Employee,
  Department,
  LeaveType,
} from "../types";

interface EnhancedLeaveCalendarProps {
  initialView?: "monthly" | "weekly" | "yearly" | "department" | "employee";
  initialDepartmentId?: number;
  initialEmployeeId?: number;
}

const EnhancedLeaveCalendar: React.FC<EnhancedLeaveCalendarProps> = ({
  initialView = "monthly",
  initialDepartmentId,
  initialEmployeeId,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<
    "monthly" | "weekly" | "yearly" | "department" | "employee"
  >(initialView);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string>(
    initialDepartmentId?.toString() || "all"
  );
  const [selectedEmployee, setSelectedEmployee] = useState<string>(
    initialEmployeeId?.toString() || "all"
  );
  const [selectedLeaveTypes, setSelectedLeaveTypes] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [holidayFilter, setHolidayFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [showDetails, setShowDetails] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<LeaveCalendarEvent | null>(
    null
  );

  // Function definitions (moved before useMemo hooks)
  const generateMonthlyCalendar = (date: Date) => {
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    return eachDayOfInterval({ start, end });
  };

  const generateWeeklyCalendar = (date: Date) => {
    const start = startOfWeek(date);
    const end = endOfWeek(date);
    return eachDayOfInterval({ start, end });
  };

  const generateYearlyCalendar = (date: Date) => {
    const year = date.getFullYear();
    const months = [];
    for (let month = 0; month < 12; month++) {
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0);
      months.push({
        month: month + 1,
        name: format(monthStart, "MMMM"),
        days: eachDayOfInterval({ start: monthStart, end: monthEnd }),
      });
    }
    return months;
  };

  // Filter events based on current filters
  const filteredEvents = useMemo(() => {
    let events = mockLeaveCalendarEvents;

    // Filter by department
    if (selectedDepartment !== "all") {
      const deptId = parseInt(selectedDepartment);
      events = events.filter((event) => {
        const employee = getEmployeeById(event.employee_id);
        return employee?.department_id === deptId;
      });
    }

    // Filter by employee
    if (selectedEmployee !== "all") {
      const empId = parseInt(selectedEmployee);
      events = events.filter((event) => event.employee_id === empId);
    }

    // Filter by leave types
    if (selectedLeaveTypes.length > 0) {
      events = events.filter((event) =>
        selectedLeaveTypes.includes(event.leave_type_id.toString())
      );
    }

    // Filter by status
    if (statusFilter !== "all") {
      events = events.filter((event) => event.status === statusFilter);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      events = events.filter((event) => {
        const employee = getEmployeeById(event.employee_id);
        const leaveType = getLeaveTypeById(event.leave_type_id);
        return (
          employee?.full_name?.toLowerCase().includes(term) ||
          leaveType?.name?.toLowerCase().includes(term) ||
          event.title.toLowerCase().includes(term)
        );
      });
    }

    return events;
  }, [
    selectedDepartment,
    selectedEmployee,
    selectedLeaveTypes,
    statusFilter,
    searchTerm,
  ]);

  // Generate calendar days for different views
  const calendarDays = useMemo(() => {
    if (viewMode === "monthly") {
      return generateMonthlyCalendar(currentDate);
    } else if (viewMode === "weekly") {
      return generateWeeklyCalendar(currentDate);
    } else if (viewMode === "yearly") {
      return generateYearlyCalendar(currentDate);
    }
    return [];
  }, [currentDate, viewMode]);

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return filteredEvents.filter((event) => {
      const start = new Date(event.start_date);
      const end = new Date(event.end_date);
      return date >= start && date <= end;
    });
  };

  // Get availability for a date
  const getAvailabilityForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return mockTeamAvailability.find(
      (availability) => availability.date === dateStr
    );
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(format(date, "yyyy-MM-dd"));
    setShowDetails(true);
  };

  const handleEventClick = (event: LeaveCalendarEvent) => {
    setSelectedEvent(event);
    setShowDetails(true);
  };

  const navigateMonth = (direction: "prev" | "next") => {
    if (viewMode === "monthly") {
      setCurrentDate((prev) =>
        direction === "prev" ? subMonths(prev, 1) : addMonths(prev, 1)
      );
    } else if (viewMode === "weekly") {
      setCurrentDate((prev) => {
        const newDate = new Date(prev);
        newDate.setDate(newDate.getDate() + (direction === "prev" ? -7 : 7));
        return newDate;
      });
    } else if (viewMode === "yearly") {
      setCurrentDate((prev) => {
        const newDate = new Date(prev);
        newDate.setFullYear(
          newDate.getFullYear() + (direction === "prev" ? -1 : 1)
        );
        return newDate;
      });
    }
  };

  const getEventBadge = (event: LeaveCalendarEvent) => {
    const leaveType = getLeaveTypeById(event.leave_type_id);
    const employee = getEmployeeById(event.employee_id);

    return (
      <TooltipProvider key={event.id}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className="text-xs truncate max-w-24 cursor-pointer hover:bg-muted"
              style={{
                backgroundColor:
                  event.status === "approved"
                    ? event.background_color
                    : "#f3f4f6",
                color:
                  event.status === "approved" ? event.text_color : "#374151",
                borderColor: event.background_color,
              }}
              onClick={() => handleEventClick(event as any)}
            >
              {employee?.full_name?.split(" ")[0]} - {leaveType?.code}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-medium">{employee?.full_name}</p>
              <p className="text-sm">{leaveType?.name}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(event.start_date), "MMM dd")} -{" "}
                {format(new Date(event.end_date), "MMM dd")}
              </p>
              <p className="text-xs capitalize">{event.status}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const renderDayCell = (date: Date, index: number) => {
    const dayEvents = getEventsForDate(date);
    const availability = getAvailabilityForDate(date);
    const dayIsToday = isToday(date);
    const dayIsWeekend = isWeekend(date);
    const dayIsHoliday = isHoliday(format(date, "yyyy-MM-dd"));
    const holidayInfo = getHolidayInfo(format(date, "yyyy-MM-dd"));

    return (
      <div
        key={index}
        className={`min-h-24 p-1 border rounded cursor-pointer hover:bg-muted/50 transition-colors ${
          dayIsToday ? "ring-2 ring-primary bg-primary/5" : ""
        } ${
          !isSameMonth(date, currentDate) && viewMode === "monthly"
            ? "bg-muted/30"
            : ""
        } ${dayIsWeekend ? "bg-muted/20" : ""} ${
          dayIsHoliday ? "bg-red-50 border-red-200" : ""
        }`}
        onClick={() => handleDateClick(date)}
      >
        {/* Date Number */}
        <div
          className={`text-sm font-medium mb-1 flex items-center justify-between ${
            dayIsToday ? "text-primary" : ""
          }`}
        >
          <span>{format(date, "d")}</span>
          {dayIsHoliday && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{holidayInfo?.name}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* Leave Events */}
        <div className="space-y-1">
          {dayEvents.slice(0, 2).map((event) => getEventBadge(event as LeaveCalendarEvent))}
          {dayEvents.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{dayEvents.length - 2} more
            </Badge>
          )}
        </div>

        {/* Availability Summary */}
        {availability && (
          <div className="mt-auto pt-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span
                className={`${
                  availability.available < availability.total_employees * 0.7
                    ? "text-orange-600"
                    : "text-green-600"
                }`}
              >
                {availability.available}/{availability.total_employees}
              </span>
            </div>
          </div>
        )}

        {/* Critical Staffing Alert */}
        {availability?.critical_staffing && (
          <div className="absolute top-1 right-1">
            <AlertTriangle className="h-3 w-3 text-red-500" />
          </div>
        )}
      </div>
    );
  };

  const renderMonthlyView = () => (
    <div className="space-y-4">
      {/* Calendar Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Leave Calendar - {format(currentDate, "MMMM yyyy")}
            </CardTitle>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth("prev")}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="text-lg font-semibold min-w-32 text-center">
                {format(currentDate, "MMMM yyyy")}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth("next")}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(new Date())}
              >
                Today
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {/* Day Headers */}
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div
                key={day}
                className="p-2 text-center text-sm font-medium text-muted-foreground border-b"
              >
                {day}
              </div>
            ))}

            {/* Calendar Days */}
            {calendarDays.map((date, index) => renderDayCell(date, index))}
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>Approved Leave</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded"></div>
              <span>Pending Leave</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span>Public Holiday</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span>Critical Staffing</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderWeeklyView = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Weekly View - Week of{" "}
          {format(startOfWeek(currentDate), "MMM dd, yyyy")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((date, index) => renderDayCell(date, index))}
        </div>
      </CardContent>
    </Card>
  );

  const renderYearlyView = () => (
    <div className="grid grid-cols-3 gap-4">
      {calendarDays.map(
        (monthData: { month: number; name: string; days: Date[] }, index) => (
          <Card key={index}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{monthData.name}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-7 gap-1 text-xs">
                {["S", "M", "T", "W", "T", "F", "S"].map((day) => (
                  <div
                    key={day}
                    className="text-center text-muted-foreground p-1"
                  >
                    {day}
                  </div>
                ))}
                {monthData.days.map((date: Date, dayIndex: number) => {
                  const dayEvents = getEventsForDate(date);
                  const dayIsToday = isToday(date);
                  const dayIsWeekend = isWeekend(date);
                  const dayIsHoliday = isHoliday(format(date, "yyyy-MM-dd"));

                  return (
                    <div
                      key={dayIndex}
                      className={`h-8 flex items-center justify-center rounded cursor-pointer hover:bg-muted/50 ${
                        dayIsToday ? "bg-primary text-primary-foreground" : ""
                      } ${dayIsWeekend ? "bg-muted/20" : ""} ${
                        dayIsHoliday ? "bg-red-100" : ""
                      } ${dayEvents.length > 0 ? "ring-1 ring-blue-200" : ""}`}
                      onClick={() => handleDateClick(date)}
                    >
                      <span className="text-xs">{format(date, "d")}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );

  const renderDepartmentView = () => {
    const selectedDept =
      selectedDepartment !== "all"
        ? getDepartmentById(parseInt(selectedDepartment))
        : null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Department Calendar {selectedDept && `- ${selectedDept.name}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((date, index) => renderDayCell(date, index))}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderEmployeeView = () => {
    const selectedEmp =
      selectedEmployee !== "all"
        ? getEmployeeById(parseInt(selectedEmployee))
        : null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Employee Calendar {selectedEmp && `- ${selectedEmp.full_name}`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((date, index) => renderDayCell(date, index))}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderSelectedDateDetails = () => {
    if (!selectedDate) return null;

    const date = new Date(selectedDate);
    const dayEvents = getEventsForDate(date);
    const availability = getAvailabilityForDate(date);
    const holidayInfo = getHolidayInfo(selectedDate);

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            {format(date, "EEEE, MMMM dd, yyyy")}
            {holidayInfo && (
              <Badge variant="destructive" className="ml-2">
                {holidayInfo.name}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Availability Overview */}
            {availability && (
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-lg font-bold">
                    {availability.available}
                  </div>
                  <div className="text-sm text-muted-foreground">Available</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-lg font-bold text-orange-600">
                    {availability.on_leave}
                  </div>
                  <div className="text-sm text-muted-foreground">On Leave</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-lg font-bold text-blue-600">
                    {availability.total_employees}
                  </div>
                  <div className="text-sm text-muted-foreground">Total</div>
                </div>
              </div>
            )}

            {/* Leave Events for Selected Date */}
            {dayEvents.length > 0 ? (
              <div className="space-y-2">
                <h4 className="font-medium">Leave Events:</h4>
                <div className="space-y-2">
                  {dayEvents.map((event) => {
                    const employee = getEmployeeById(event.employee_id);
                    const leaveType = getLeaveTypeById(event.leave_type_id);

                    return (
                      <div
                        key={event.id}
                        className="flex items-center justify-between p-3 bg-muted rounded cursor-pointer hover:bg-muted/80"
                        onClick={() => handleEventClick(event as any)}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: event.background_color }}
                          />
                          <div>
                            <div className="font-medium">
                              {employee?.full_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {leaveType?.name}
                            </div>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            event.status === "approved"
                              ? "text-green-600"
                              : event.status === "pending"
                              ? "text-orange-600"
                              : "text-red-600"
                          }`}
                        >
                          {event.status}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No leave events on this date</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderEventDetails = () => {
    if (!selectedEvent) return null;

    const employee = getEmployeeById(selectedEvent.employee_id);
    const leaveType = getLeaveTypeById(selectedEvent.leave_type_id);

    return (
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: selectedEvent.background_color }}
              />
              Leave Details
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Employee
                </Label>
                <p className="font-medium">{employee?.full_name}</p>
                <p className="text-sm text-muted-foreground">
                  {(employee as any)?.department?.name || 'N/A'} • {(employee as any)?.designation?.title || 'N/A'}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Leave Type
                </Label>
                <p className="font-medium">{leaveType?.name}</p>
                <Badge variant="outline" className="text-xs">
                  {leaveType?.code}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Start Date
                </Label>
                <p className="font-medium">
                  {format(new Date(selectedEvent.start_date), "PPP")}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  End Date
                </Label>
                <p className="font-medium">
                  {format(new Date(selectedEvent.end_date), "PPP")}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Duration
                </Label>
                <p className="font-medium">
                  {selectedEvent.is_half_day ? "Half Day" : "Full Day"}
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Status
                </Label>
                <Badge
                  variant="outline"
                  className={`${
                    selectedEvent.status === "approved"
                      ? "text-green-600"
                      : selectedEvent.status === "pending"
                      ? "text-orange-600"
                      : "text-red-600"
                  }`}
                >
                  {selectedEvent.status}
                </Badge>
              </div>
            </div>

            {(employee as any)?.phone && (
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Contact
                </Label>
                <p className="font-medium flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  {(employee as any).phone}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="space-y-6">
      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & View Options
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="view-mode">View Mode</Label>
              <Select
                value={viewMode}
                onValueChange={(value) =>
                  setViewMode(
                    value as
                      | "monthly"
                      | "weekly"
                      | "yearly"
                      | "department"
                      | "employee"
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select view mode" />
                </SelectTrigger>
                <SelectContent>
                  {calendarViewOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="department">Department</Label>
              <Select
                value={selectedDepartment}
                onValueChange={setSelectedDepartment}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Departmentsnts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departmentsnts</SelectItem>
                  {departmentOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="employee">Employee</Label>
              <Select
                value={selectedEmployee}
                onValueChange={setSelectedEmployee}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employeeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button variant="outline" size="sm">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" size="sm">
              <TrendingUp className="h-4 w-4 mr-2" />
              Headcount Analysis
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Views */}
      {viewMode === "monthly" && renderMonthlyView()}
      {viewMode === "weekly" && renderWeeklyView()}
      {viewMode === "yearly" && renderYearlyView()}
      {viewMode === "department" && renderDepartmentView()}
      {viewMode === "employee" && renderEmployeeView()}

      {/* Selected Date Details */}
      {selectedDate && renderSelectedDateDetails()}

      {/* Event Details Dialog */}
      {renderEventDetails()}
    </div>
  );
};

export default EnhancedLeaveCalendar;
