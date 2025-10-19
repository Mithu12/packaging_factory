import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CheckCircle,
  XCircle,
  Timer,
  Clock,
  Home,
  Calendar,
  Edit,
  Trash2,
  Eye,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AttendanceRecord, Employee, Shift } from "../types";

interface AttendanceTableProps {
  attendanceRecords: AttendanceRecord[];
  employees: Employee[];
  shifts: Shift[];
  loading?: boolean;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  selectedIds?: number[];
  onSelect?: (ids: number[]) => void;
  onSelectAll?: (selected: boolean) => void;
  onEdit?: (attendance: AttendanceRecord) => void;
  onDelete?: (id: number) => void;
  onRegularize?: (attendance: AttendanceRecord) => void;
}

const AttendanceTable: React.FC<AttendanceTableProps> = ({
  attendanceRecords,
  employees,
  shifts,
  loading = false,
  pagination,
  selectedIds = [],
  onSelect,
  onSelectAll,
  onEdit,
  onDelete,
  onRegularize,
}) => {
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
      case "early_going":
        return <Timer className="h-4 w-4 text-orange-500" />;
      case "on_leave":
        return <Calendar className="h-4 w-4 text-gray-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-gray-500" />;
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

  const handleSelect = (id: number, selected: boolean) => {
    if (onSelect) {
      if (selected) {
        onSelect([...selectedIds, id]);
      } else {
        onSelect(selectedIds.filter((selectedId) => selectedId !== id));
      }
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (onSelectAll) {
      if (selected) {
        onSelectAll(true);
      } else {
        onSelectAll(false);
      }
    }
  };

  const isAllSelected =
    attendanceRecords.length > 0 &&
    selectedIds.length === attendanceRecords.length;
  const isIndeterminate =
    selectedIds.length > 0 && selectedIds.length < attendanceRecords.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              {onSelect && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isIndeterminate;
                    }}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
              )}
              <TableHead>Employee</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Check In</TableHead>
              <TableHead>Check Out</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Shift</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead>Location</TableHead>
              {onEdit || onDelete || onRegularize ? (
                <TableHead>Actions</TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {attendanceRecords.map((record) => {
              const employee = employees.find(
                (emp) => emp.id === record.employee_id
              );
              const shift = shifts.find((s) => s.id === record.shift_id);
              const isSelected = selectedIds.includes(record.id);

              return (
                <TableRow key={record.id}>
                  {onSelect && (
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) =>
                          handleSelect(record.id, !!checked)
                        }
                      />
                    </TableCell>
                  )}
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
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {record.check_in_time ? (
                        <>
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {record.check_in_time}
                        </>
                      ) : (
                        "-"
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {record.check_out_time ? (
                        <>
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {record.check_out_time}
                        </>
                      ) : (
                        "-"
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(record.status)}
                      <Badge className={getStatusColor(record.status)}>
                        {record.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    {shift ? (
                      <Badge variant="outline">{shift.name}</Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {record.total_hours_worked ? (
                      <span className="font-mono">
                        {record.total_hours_worked}h
                      </span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {record.location ? (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{record.location}</span>
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  {(onEdit || onDelete || onRegularize) && (
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {onEdit && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onEdit(record)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {onRegularize && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onRegularize(record)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        {(onEdit || onDelete || onRegularize) && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="outline">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {onEdit && (
                                <DropdownMenuItem
                                  onClick={() => onEdit(record)}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                              )}
                              {onRegularize && (
                                <DropdownMenuItem
                                  onClick={() => onRegularize(record)}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                              )}
                              {onDelete && (
                                <DropdownMenuItem
                                  onClick={() => onDelete(record.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {pagination && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
            {pagination.total} results
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceTable;
