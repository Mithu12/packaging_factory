"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { DashboardLayout } from "@/components/DashboardLayout";
import EnhancedLeaveCalendar from "../components/EnhancedLeaveCalendar";
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
  Calendar,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  Printer,
  Info,
} from "lucide-react";
import { HRMApiService } from "../services/hrm-api";

const LeaveCalendarPage: React.FC = () => {
  const { view, departmentId, employeeId } = useParams<{
    view?: string;
    departmentId?: string;
    employeeId?: string;
  }>();

  const [leaveApplications, setLeaveApplications] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    try {
      const [appsRes, empsRes, deptsRes, typesRes] = await Promise.all([
        HRMApiService.getLeaveApplications(),
        HRMApiService.getEmployees({ limit: 500 }),
        HRMApiService.getDepartments(),
        HRMApiService.getLeaveTypes(),
      ]);
      setLeaveApplications(appsRes.leave_applications || []);
      setEmployees(empsRes.employees || []);
      setDepartments(deptsRes.departments || []);
      setLeaveTypes(typesRes.leave_types || []);
    } catch (err) {
      // Silently fail - calendar still renders
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Convert URL params to component props
  const getInitialView = ():
    | "monthly"
    | "weekly"
    | "yearly"
    | "department"
    | "employee" => {
    if (view === "weekly") return "weekly";
    if (view === "yearly") return "yearly";
    if (view === "department") return "department";
    if (view === "employee") return "employee";
    return "monthly";
  };

  const getInitialDepartmentId = (): number | undefined => {
    if (departmentId) {
      const id = parseInt(departmentId);
      return isNaN(id) ? undefined : id;
    }
    return undefined;
  };

  const getInitialEmployeeId = (): number | undefined => {
    if (employeeId) {
      const id = parseInt(employeeId);
      return isNaN(id) ? undefined : id;
    }
    return undefined;
  };

  // Calculate summary statistics from real data
  const stats = React.useMemo(() => {
    const approvedLeaves = leaveApplications.filter(
      (app) => app.status === "approved"
    ).length;
    const pendingLeaves = leaveApplications.filter(
      (app) => app.status === "pending"
    ).length;
    const totalEmployees = employees.length;
    const employeesOnLeave = new Set(
      leaveApplications
        .filter((app) => app.status === "approved")
        .map((app) => app.employee_id)
    ).size;

    return {
      approvedLeaves,
      pendingLeaves,
      totalEmployees,
      employeesOnLeave,
      averageAvailability: totalEmployees > 0
        ? Math.round(((totalEmployees - employeesOnLeave) / totalEmployees) * 100)
        : 100,
      criticalDays: 0,
    };
  }, [leaveApplications, employees]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leave Calendar</h1>
          <p className="text-muted-foreground">
            Visual representation of team leave schedules and availability
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm">
            <Info className="h-4 w-4 mr-2" />
            Help
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Approved Leaves
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.approvedLeaves}
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Approvals
            </CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats.pendingLeaves}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Team Availability
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.averageAvailability}%
            </div>
            <p className="text-xs text-muted-foreground">Average this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Days</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.criticalDays}
            </div>
            <p className="text-xs text-muted-foreground">Low staffing days</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Department Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {departments.map((dept) => {
              const deptEmployees = employees.filter(
                (emp) => emp.department_id === dept.id
              ).length;
              const deptOnLeave = leaveApplications.filter((app) => {
                const employee = employees.find(
                  (emp) => emp.id === app.employee_id
                );
                return (
                  employee?.department_id === dept.id &&
                  app.status === "approved"
                );
              }).length;

              return (
                <div
                  key={dept.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="font-medium">{dept.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {deptEmployees - deptOnLeave}/{deptEmployees}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Leave Type Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {leaveTypes.slice(0, 5).map((leaveType) => {
              const usageCount = leaveApplications.filter(
                (app) => app.leave_type_id === leaveType.id
              ).length;

              return (
                <div
                  key={leaveType.id}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: leaveType.color_code }}
                    />
                    <span className="font-medium">{leaveType.code}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {usageCount}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Upcoming Holidays</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* Public holidays not yet available from API */}
            <p className="text-sm text-muted-foreground">No upcoming holidays configured.</p>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Calendar Component */}
      <EnhancedLeaveCalendar
        initialView={getInitialView()}
        initialDepartmentId={getInitialDepartmentId()}
        initialEmployeeId={getInitialEmployeeId()}
      />

      {/* Calendar Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Calendar Legend</CardTitle>
          <CardDescription>
            Understanding the visual indicators in the calendar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span>Approved Leave</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-orange-500 rounded"></div>
              <span>Pending Leave</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span>Public Holiday</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-300 rounded"></div>
              <span>Weekend</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span>Critical Staffing</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              <span>Team Availability</span>
            </div>
          </div>

          <div className="mt-4 p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Tip:</strong> Click on any date to view detailed
              information about leave events and team availability. Hover over
              leave badges to see quick details. Use the filters above to
              customize your view.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeaveCalendarPage;
