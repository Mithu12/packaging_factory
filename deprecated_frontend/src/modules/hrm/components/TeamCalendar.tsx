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
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
} from "lucide-react";
import { TeamCalendarProps } from "../types";

const TeamCalendar: React.FC<TeamCalendarProps> = ({
  teamMembers,
  leaveEvents,
  selectedDate,
  onDateSelect,
  loading = false,
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week">("month");

  // Generate calendar days for the current month
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday

    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay())); // End on Saturday

    const days = [];
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return days;
  }, [currentMonth]);

  // Get leave events for a specific date
  const getEventsForDate = (date: Date) => {
    return leaveEvents.filter((event) => {
      const eventStart = new Date(event.start_date);
      const eventEnd = new Date(event.end_date);
      return date >= eventStart && date <= eventEnd;
    });
  };

  // Get team availability for a date
  const getTeamAvailability = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    const eventsForDate = getEventsForDate(date);

    const onLeave = eventsForDate.filter(
      (event) => event.status === "approved"
    ).length;
    const pending = eventsForDate.filter(
      (event) => event.status === "pending"
    ).length;

    return {
      total: teamMembers.length,
      available: teamMembers.length - onLeave,
      onLeave,
      pending,
      utilization: (onLeave / teamMembers.length) * 100,
    };
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentMonth.getMonth();
  };

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      if (direction === "prev") {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const getEventBadge = (event: any) => {
    const leaveType = event.leave_type;
    return (
      <Badge
        variant="outline"
        className="text-xs truncate max-w-24"
        style={{
          backgroundColor:
            event.status === "approved" ? leaveType?.color_code : "#f3f4f6",
          color: event.status === "approved" ? "#ffffff" : "#374151",
          borderColor: leaveType?.color_code,
        }}
      >
        {event.employee?.full_name?.split(" ")[0]} - {leaveType?.code}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Loading team calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Calendar Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Team Calendar
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
                {currentMonth.toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
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
                onClick={() => setCurrentMonth(new Date())}
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
            {calendarDays.map((date, index) => {
              const events = getEventsForDate(date);
              const availability = getTeamAvailability(date);
              const isCurrentMonthDay = isCurrentMonth(date);

              return (
                <div
                  key={index}
                  className={`min-h-24 p-1 border rounded cursor-pointer hover:bg-muted/50 ${
                    isToday(date) ? "ring-2 ring-primary" : ""
                  } ${!isCurrentMonthDay ? "bg-muted/30" : ""}`}
                  onClick={() =>
                    onDateSelect?.(date.toISOString().split("T")[0])
                  }
                >
                  {/* Date Number */}
                  <div
                    className={`text-sm font-medium mb-1 ${
                      isToday(date) ? "text-primary" : ""
                    }`}
                  >
                    {date.getDate()}
                  </div>

                  {/* Availability Summary */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-xs">
                      <Users className="h-3 w-3" />
                      <span
                        className={
                          availability.available < availability.total * 0.7
                            ? "text-orange-600"
                            : "text-green-600"
                        }
                      >
                        {availability.available}/{availability.total}
                      </span>
                    </div>

                    {/* Leave Events */}
                    <div className="space-y-1">
                      {events.slice(0, 2).map((event, eventIndex) => (
                        <div key={eventIndex}>{getEventBadge(event)}</div>
                      ))}
                      {events.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{events.length - 2} more
                        </Badge>
                      )}
                    </div>

                    {/* Critical Staffing Alert */}
                    {availability.onLeave >=
                      Math.ceil(availability.total * 0.3) && (
                      <AlertTriangle className="h-3 w-3 text-orange-600" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>Approved Leave</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-600" />
              <span>Pending Leave</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span>Critical Staffing</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {teamMembers.length}
              </div>
              <div className="text-sm text-muted-foreground">Total Members</div>
            </div>

            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {
                  leaveEvents.filter((event) => event.status === "approved")
                    .length
                }
              </div>
              <div className="text-sm text-muted-foreground">
                Approved Leaves
              </div>
            </div>

            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {
                  leaveEvents.filter((event) => event.status === "pending")
                    .length
                }
              </div>
              <div className="text-sm text-muted-foreground">
                Pending Leaves
              </div>
            </div>

            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(
                  (leaveEvents.filter((event) => event.status === "approved")
                    .length /
                    teamMembers.length) *
                    100
                )}
                %
              </div>
              <div className="text-sm text-muted-foreground">Leave Rate</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Date Details */}
      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              {new Date(selectedDate).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const selectedDateObj = new Date(selectedDate);
              const dayEvents = getEventsForDate(selectedDateObj);
              const dayAvailability = getTeamAvailability(selectedDateObj);

              return (
                <div className="space-y-4">
                  {/* Availability Overview */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-lg font-bold">
                        {dayAvailability.available}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Available
                      </div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-lg font-bold text-orange-600">
                        {dayAvailability.onLeave}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        On Leave
                      </div>
                    </div>
                    <div className="text-center p-3 bg-muted rounded-lg">
                      <div className="text-lg font-bold text-blue-600">
                        {dayAvailability.pending}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Pending
                      </div>
                    </div>
                  </div>

                  {/* Leave Events for Selected Date */}
                  {dayEvents.length > 0 ? (
                    <div className="space-y-2">
                      <h4 className="font-medium">Leave Events:</h4>
                      <div className="space-y-2">
                        {dayEvents.map((event, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 bg-muted rounded"
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{
                                  backgroundColor: event.leave_type?.color_code,
                                }}
                              />
                              <span className="font-medium">
                                {event.employee?.full_name}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {event.leave_type?.name}
                              </Badge>
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
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No leave events on this date</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Team Member List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members
          </CardTitle>
          <CardDescription>
            Overview of team members and their leave status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {teamMembers.map((member) => {
              const memberLeaves = leaveEvents.filter(
                (event) =>
                  event.employee_id === member.id &&
                  new Date(event.start_date) <= new Date() &&
                  new Date(event.end_date) >= new Date()
              );

              const currentLeave = memberLeaves.find(
                (leave) => leave.status === "approved"
              );
              const pendingLeave = memberLeaves.find(
                (leave) => leave.status === "pending"
              );

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 border rounded"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        currentLeave ? "bg-green-500" : "bg-gray-300"
                      }`}
                    />
                    <div>
                      <div className="font-medium">{member.full_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {member.designation?.title} • {member.department?.name}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {currentLeave && (
                      <Badge
                        variant="default"
                        className="bg-green-100 text-green-800"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        On Leave
                      </Badge>
                    )}
                    {pendingLeave && (
                      <Badge variant="secondary">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    )}
                    {!currentLeave && !pendingLeave && (
                      <Badge variant="outline" className="text-green-600">
                        Available
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TeamCalendar;
