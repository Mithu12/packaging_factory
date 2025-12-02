"use client";

import React from "react";
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
  CheckCircle,
  XCircle,
  Timer,
  Clock,
  Home,
  MapPin,
  Edit,
  Trash2,
  Eye,
  Calendar,
} from "lucide-react";
import { AttendanceRecord, Employee, Shift } from "../types";

interface AttendanceCardProps {
  attendance: AttendanceRecord;
  employee?: Employee;
  shift?: Shift;
  onEdit?: (attendance: AttendanceRecord) => void;
  onDelete?: (id: number) => void;
  onRegularize?: (attendance: AttendanceRecord) => void;
  compact?: boolean;
}

const AttendanceCard: React.FC<AttendanceCardProps> = ({
  attendance,
  employee,
  shift,
  onEdit,
  onDelete,
  onRegularize,
  compact = false,
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

  if (compact) {
    return (
      <div className="flex items-center justify-between p-3 border rounded-lg">
        <div className="flex items-center gap-3">
          {getStatusIcon(attendance.status)}
          <div>
            <p className="font-medium text-sm">
              {employee?.first_name} {employee?.last_name}
            </p>
            <p className="text-xs text-muted-foreground">
              {attendance.attendance_date} • {shift?.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(attendance.status)}>
            {attendance.status.replace("_", " ")}
          </Badge>
          {attendance.total_hours_worked && (
            <span className="text-xs text-muted-foreground">
              {attendance.total_hours_worked}h
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon(attendance.status)}
            <div>
              <CardTitle className="text-base">
                {employee?.first_name} {employee?.last_name}
              </CardTitle>
              <CardDescription>
                {employee?.employee_id} • {attendance.attendance_date}
              </CardDescription>
            </div>
          </div>
          <Badge className={getStatusColor(attendance.status)}>
            {attendance.status.replace("_", " ")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Check In</p>
              <p className="text-sm text-muted-foreground">
                {attendance.check_in_time || "Not recorded"}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Check Out</p>
              <p className="text-sm text-muted-foreground">
                {attendance.check_out_time || "Not recorded"}
              </p>
            </div>
          </div>

          {attendance.total_hours_worked && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {attendance.total_hours_worked} hours worked
              </span>
            </div>
          )}

          {attendance.location && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{attendance.location}</span>
            </div>
          )}

          {attendance.shift && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {shift.name} ({shift.start_time} - {shift.end_time})
              </span>
            </div>
          )}

          {attendance.notes && (
            <div>
              <p className="text-sm font-medium">Notes</p>
              <p className="text-sm text-muted-foreground">
                {attendance.notes}
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            {onEdit && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEdit(attendance)}
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {onRegularize && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRegularize(attendance)}
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onDelete(attendance.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AttendanceCard;
