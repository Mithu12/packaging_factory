"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Search,
  Filter,
  Download,
  FileText,
  Calendar,
  Eye,
  MoreHorizontal,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Edit,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LeaveHistoryProps } from "../types";
import { getApplicationStatusOptions } from "../data/leave-application-data";
import { getLeaveTypeOptions } from "../data/leave-configuration-data";

interface ExtendedLeaveHistoryProps extends LeaveHistoryProps {
  onViewApplication?: (application: any) => void;
  onEditApplication?: (application: any) => void;
  onCancelApplication?: (applicationId: number) => void;
  onDeleteApplication?: (applicationId: number) => void;
}

const LeaveHistory: React.FC<ExtendedLeaveHistoryProps> = ({
  applications,
  employees,
  leaveTypes,
  filters,
  onFilterChange,
  onExport,
  loading = false,
  onViewApplication,
  onEditApplication,
  onCancelApplication,
  onDeleteApplication,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterData, setFilterData] = useState({
    leave_type_ids: filters?.leave_type_ids || [],
    status: filters?.status || [],
    date_from: filters?.date_from || "",
    date_to: filters?.date_to || "",
    search_term: filters?.search_term || "",
  });

  const statusOptions = getApplicationStatusOptions();
  const leaveTypeOptions = getLeaveTypeOptions();

  // Filter applications based on search and filters
  const filteredApplications = applications.filter((app) => {
    const employee = employees.find((emp) => emp.id === app.employee_id);
    const leaveType = leaveTypes.find((lt) => lt.id === app.leave_type_id);

    // Search filter
    const matchesSearch =
      !searchTerm &&
      (!filterData.search_term ||
        employee?.full_name
          ?.toLowerCase()
          .includes(filterData.search_term.toLowerCase()) ||
        employee?.employee_id
          ?.toLowerCase()
          .includes(filterData.search_term.toLowerCase()) ||
        app.reason
          ?.toLowerCase()
          .includes(filterData.search_term.toLowerCase()));

    // Leave type filter
    const matchesLeaveType =
      filterData.leave_type_ids.length === 0 ||
      filterData.leave_type_ids.includes(app.leave_type_id);

    // Status filter
    const matchesStatus =
      filterData.status.length === 0 || filterData.status.includes(app.status);

    // Date range filter
    const appStartDate = new Date(app.start_date);
    const fromDate = filterData.date_from
      ? new Date(filterData.date_from)
      : null;
    const toDate = filterData.date_to ? new Date(filterData.date_to) : null;
    const matchesDateRange =
      (!fromDate || appStartDate >= fromDate) &&
      (!toDate || appStartDate <= toDate);

    return (
      matchesSearch && matchesLeaveType && matchesStatus && matchesDateRange
    );
  });

  const handleFilterChange = (field: string, value: any) => {
    const updatedFilters = { ...filterData, [field]: value };
    setFilterData(updatedFilters);

    if (onFilterChange) {
      onFilterChange({
        leave_type_ids: updatedFilters.leave_type_ids,
        status: updatedFilters.status,
        date_from: updatedFilters.date_from,
        date_to: updatedFilters.date_to,
        search_term: updatedFilters.search_term,
      });
    }
  };

  const handleLeaveTypeFilter = (leaveTypeId: number, checked: boolean) => {
    const updated = checked
      ? [...filterData.leave_type_ids, leaveTypeId]
      : filterData.leave_type_ids.filter((id) => id !== leaveTypeId);
    handleFilterChange("leave_type_ids", updated);
  };

  const handleStatusFilter = (status: string, checked: boolean) => {
    const updated = checked
      ? [...filterData.status, status]
      : filterData.status.filter((s) => s !== status);
    handleFilterChange("status", updated);
  };

  const handleExport = (format: "excel" | "pdf") => {
    if (onExport) {
      onExport(format);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "cancelled":
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calculateSummaryStats = () => {
    const total = filteredApplications.length;
    const approved = filteredApplications.filter(
      (app) => app.status === "approved"
    ).length;
    const rejected = filteredApplications.filter(
      (app) => app.status === "rejected"
    ).length;
    const pending = filteredApplications.filter(
      (app) => app.status === "pending"
    ).length;
    const cancelled = filteredApplications.filter(
      (app) => app.status === "cancelled"
    ).length;

    const totalDays = filteredApplications.reduce(
      (sum, app) => sum + app.total_days,
      0
    );
    const avgDays = total > 0 ? Math.round(totalDays / total) : 0;

    return {
      total,
      approved,
      rejected,
      pending,
      cancelled,
      totalDays,
      avgDays,
    };
  };

  const summaryStats = calculateSummaryStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Loading leave history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">
              {summaryStats.total}
            </div>
            <p className="text-xs text-muted-foreground">Total Applications</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">
              {summaryStats.approved}
            </div>
            <p className="text-xs text-muted-foreground">Approved</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-orange-600">
              {summaryStats.pending}
            </div>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600">
              {summaryStats.rejected}
            </div>
            <p className="text-xs text-muted-foreground">Rejected</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-gray-600">
              {summaryStats.cancelled}
            </div>
            <p className="text-xs text-muted-foreground">Cancelled</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-purple-600">
              {summaryStats.totalDays}
            </div>
            <p className="text-xs text-muted-foreground">Total Days</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-indigo-600">
              {summaryStats.avgDays}
            </div>
            <p className="text-xs text-muted-foreground">Avg Days</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="search">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search by employee name, ID, or reason..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  handleFilterChange("search_term", e.target.value);
                }}
                className="pl-10"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Date Range */}
            <div className="space-y-2">
              <Label htmlFor="date_from">From Date</Label>
              <Input
                id="date_from"
                type="date"
                value={filterData.date_from}
                onChange={(e) =>
                  handleFilterChange("date_from", e.target.value)
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date_to">To Date</Label>
              <Input
                id="date_to"
                type="date"
                value={filterData.date_to}
                onChange={(e) => handleFilterChange("date_to", e.target.value)}
              />
            </div>

            {/* Export Buttons */}
            <div className="flex items-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport("excel")}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport("pdf")}
              >
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>

          {/* Leave Type Filters */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Leave Types</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {leaveTypeOptions.map((leaveType) => (
                <div
                  key={leaveType.value}
                  className="flex items-center space-x-2"
                >
                  <Checkbox
                    id={`leave-type-${leaveType.value}`}
                    checked={filterData.leave_type_ids.includes(
                      parseInt(leaveType.value)
                    )}
                    onCheckedChange={(checked) =>
                      handleLeaveTypeFilter(
                        parseInt(leaveType.value),
                        checked as boolean
                      )
                    }
                  />
                  <Label
                    htmlFor={`leave-type-${leaveType.value}`}
                    className="text-sm"
                  >
                    {leaveType.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Status Filters */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Application Status</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {statusOptions.map((status) => (
                <div key={status.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${status.value}`}
                    checked={filterData.status.includes(status.value)}
                    onCheckedChange={(checked) =>
                      handleStatusFilter(status.value, checked as boolean)
                    }
                  />
                  <Label htmlFor={`status-${status.value}`} className="text-sm">
                    {status.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Results Info */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Showing {filteredApplications.length} of {applications.length}{" "}
              applications
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Applications Table */}
      <Card>
        <CardHeader>
          <CardTitle>Leave Applications</CardTitle>
          <CardDescription>
            Detailed history of all leave applications
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredApplications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No applications found</p>
              <p className="text-sm mt-1">
                Try adjusting your search or filter criteria
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Leave Type</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Applied</TableHead>
                    <TableHead>Approved</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApplications.map((application) => {
                    const employee = employees.find(
                      (emp) => emp.id === application.employee_id
                    );
                    const leaveType = leaveTypes.find(
                      (lt) => lt.id === application.leave_type_id
                    );

                    return (
                      <TableRow key={application.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {employee?.full_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {employee?.employee_id}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: leaveType?.color_code }}
                            />
                            <span className="font-medium">
                              {leaveType?.name}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="text-sm">
                            <div>{formatDate(application.start_date)}</div>
                            <div className="text-muted-foreground">
                              to {formatDate(application.end_date)}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">
                              {application.total_days} days
                            </div>
                            {application.half_day && (
                              <Badge variant="outline" className="text-xs">
                                Half Day
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          {getStatusBadge(application.status)}
                        </TableCell>

                        <TableCell>
                          <div className="text-sm">
                            {formatDateTime(application.applied_at)}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="text-sm">
                            {application.approved_at
                              ? formatDateTime(application.approved_at)
                              : "N/A"}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onViewApplication?.(application)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() =>
                                    onEditApplication?.(application)
                                  }
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                {application.status === "pending" && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      onCancelApplication?.(application.id)
                                    }
                                    className="text-orange-600"
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Cancel
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() =>
                                    onDeleteApplication?.(application.id)
                                  }
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LeaveHistory;
