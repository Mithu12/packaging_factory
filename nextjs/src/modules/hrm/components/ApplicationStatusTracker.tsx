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
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  User,
  Calendar,
  MessageSquare,
  FileText,
  Eye,
  Download,
} from "lucide-react";
import { ApplicationStatusTrackerProps } from "../types";

const ApplicationStatusTracker: React.FC<ApplicationStatusTrackerProps> = ({
  application,
  approvalRecords,
  loading = false,
}) => {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-8 bg-muted rounded"></div>
            <div className="space-y-2">
              <div className="h-3 bg-muted rounded"></div>
              <div className="h-3 bg-muted rounded w-3/4"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "rejected":
        return <XCircle className="h-5 w-5 text-red-600" />;
      case "pending":
        return <Clock className="h-5 w-5 text-orange-600" />;
      case "cancelled":
        return <XCircle className="h-5 w-5 text-gray-600" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-orange-100 text-orange-800";
      case "cancelled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  const getStatusBadge = (status: string) => {
    return (
      <Badge className={getStatusColor(status)}>
        {getStatusIcon(status)}
        <span className="ml-2 capitalize">{status.replace("_", " ")}</span>
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTimeDifference = (startDate: string, endDate?: string) => {
    if (!endDate) return null;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffHours = Math.floor(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60)
    );

    if (diffHours < 24) {
      return `${diffHours}h`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      const remainingHours = diffHours % 24;
      return `${diffDays}d ${remainingHours}h`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Application Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Application Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Application ID:</span>
                <span className="font-medium">#{application.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Applied Date:</span>
                <span className="font-medium">
                  {formatDate(application.applied_at)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Leave Type:</span>
                <Badge variant="outline">{application.leave_type?.name}</Badge>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duration:</span>
                <span className="font-medium">
                  {application.total_days} day
                  {application.total_days !== 1 ? "s" : ""}
                  {application.half_day && " (Half Day)"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Leave Period:</span>
                <span className="font-medium">
                  {formatDate(application.start_date)} -{" "}
                  {formatDate(application.end_date)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                {getStatusBadge(application.status)}
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <h4 className="font-medium">Reason for Leave:</h4>
            <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
              {application.reason}
            </p>
          </div>

          {application.handover_notes && (
            <div className="space-y-2">
              <h4 className="font-medium">Handover Notes:</h4>
              <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                {application.handover_notes}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approval Workflow Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Approval Workflow
          </CardTitle>
          <CardDescription>
            Track the approval process and timeline
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Workflow Progress */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Progress:</span>
              <span className="text-sm text-muted-foreground">
                Stage {application.workflow_stage} of{" "}
                {application.total_workflow_stages}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${
                    (application.workflow_stage /
                      application.total_workflow_stages) *
                    100
                  }%`,
                }}
              />
            </div>

            {/* Timeline Steps */}
            <div className="space-y-3">
              {Array.from(
                { length: application.total_workflow_stages },
                (_, index) => {
                  const stageNumber = index + 1;
                  const isCompleted = stageNumber < application.workflow_stage;
                  const isCurrent = stageNumber === application.workflow_stage;
                  const isPending = stageNumber > application.workflow_stage;

                  // Find approval record for this stage
                  const stageRecord = approvalRecords.find(
                    (record) => record.level_number === stageNumber
                  );

                  return (
                    <div key={stageNumber} className="flex items-start gap-3">
                      {/* Status Icon */}
                      <div
                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                          isCompleted
                            ? "bg-green-100"
                            : isCurrent
                            ? "bg-orange-100"
                            : "bg-gray-100"
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : isCurrent ? (
                          <Clock className="h-4 w-4 text-orange-600" />
                        ) : (
                          <div className="w-2 h-2 bg-gray-400 rounded-full" />
                        )}
                      </div>

                      {/* Stage Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4
                            className={`font-medium ${
                              isCurrent ? "text-orange-600" : ""
                            }`}
                          >
                            Stage {stageNumber}:{" "}
                            {isCurrent
                              ? "Current Approver"
                              : isCompleted
                              ? "Approved"
                              : "Pending"}
                          </h4>
                          {stageRecord && (
                            <Badge variant="outline" className="text-xs">
                              {getTimeDifference(stageRecord.action_date)}
                            </Badge>
                          )}
                        </div>

                        {stageRecord && (
                          <div className="mt-1 space-y-1">
                            <p className="text-sm text-muted-foreground">
                              Action by:{" "}
                              {stageRecord.approver?.full_name || "Unknown"}
                            </p>
                            {stageRecord.comments && (
                              <p className="text-sm text-muted-foreground">
                                Comment: {stageRecord.comments}
                              </p>
                            )}
                            {stageRecord.rejection_reason && (
                              <p className="text-sm text-red-600">
                                Rejection Reason: {stageRecord.rejection_reason}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {formatDate(stageRecord.action_date)}
                            </p>
                          </div>
                        )}

                        {isCurrent && application.current_approver && (
                          <div className="mt-2 p-2 bg-orange-50 rounded">
                            <p className="text-sm">
                              <User className="h-4 w-4 inline mr-1" />
                              Current Approver:{" "}
                              {application.current_approver.full_name}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Application Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Application Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>

            <Button variant="outline" size="sm">
              <MessageSquare className="h-4 w-4 mr-2" />
              Add Comment
            </Button>

            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>

            {application.status === "pending" && (
              <Button variant="outline" size="sm" className="text-orange-600">
                <Clock className="h-4 w-4 mr-2" />
                Request Update
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Important Information */}
      {(application.status === "approved" ||
        application.status === "rejected") && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {application.status === "approved" ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              {application.status === "approved"
                ? "Approval Details"
                : "Rejection Details"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Final Decision:</span>
                  {getStatusBadge(application.status)}
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Approved By:</span>
                  <span className="font-medium">
                    {application.approved_by ? "Manager Name" : "N/A"}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Decision Date:</span>
                  <span className="font-medium">
                    {application.approved_at
                      ? formatDate(application.approved_at)
                      : "N/A"}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {application.approver_comments && (
                  <div>
                    <span className="text-muted-foreground">
                      Approver Comments:
                    </span>
                    <p className="text-sm mt-1 p-2 bg-muted rounded">
                      {application.approver_comments}
                    </p>
                  </div>
                )}

                {application.rejection_reason && (
                  <div>
                    <span className="text-muted-foreground">
                      Rejection Reason:
                    </span>
                    <p className="text-sm mt-1 p-2 bg-red-50 text-red-700 rounded">
                      {application.rejection_reason}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Contact During Leave:
                </span>
                <span className="font-medium">
                  {application.contact_details}
                </span>
              </div>

              {application.emergency_contact && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Emergency Contact:
                  </span>
                  <span className="font-medium">
                    {application.emergency_contact}
                  </span>
                </div>
              )}
            </div>

            {application.work_coverage_notes && (
              <div className="space-y-2">
                <span className="text-muted-foreground">Work Coverage:</span>
                <p className="text-sm p-2 bg-muted rounded">
                  {application.work_coverage_notes}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ApplicationStatusTracker;
