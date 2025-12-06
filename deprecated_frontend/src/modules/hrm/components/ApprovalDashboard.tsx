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
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Eye,
  MessageSquare,
  Calendar,
  Users,
  FileText,
  TrendingUp,
  User,
  MapPin,
} from "lucide-react";
import { ApprovalDashboardProps } from "../types";

const ApprovalDashboard: React.FC<ApprovalDashboardProps> = ({
  currentUser,
  pendingApplications,
  teamMembers,
  leaveCalendar,
  approvalWorkflows,
  onApprove,
  onReject,
  onBulkApprove,
  loading = false,
}) => {
  const [selectedApplications, setSelectedApplications] = useState<number[]>(
    []
  );
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [approvalComments, setApprovalComments] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  const handleSelectApplication = (
    applicationId: number,
    selected: boolean
  ) => {
    if (selected) {
      setSelectedApplications((prev) => [...prev, applicationId]);
    } else {
      setSelectedApplications((prev) =>
        prev.filter((id) => id !== applicationId)
      );
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedApplications(pendingApplications.map((app) => app.id));
    } else {
      setSelectedApplications([]);
    }
  };

  const handleApprove = async (application: any) => {
    setSelectedApplication(application);
    setShowApprovalDialog(true);
  };

  const handleReject = async (application: any) => {
    setSelectedApplication(application);
    setShowRejectionDialog(true);
  };

  const handleConfirmApproval = async () => {
    if (selectedApplication) {
      try {
        await onApprove({
          application_id: selectedApplication.id,
          decision: "approved",
          comments: approvalComments,
        });
        setShowApprovalDialog(false);
        setApprovalComments("");
        setSelectedApplication(null);
      } catch (error) {
        console.error("Approval failed:", error);
      }
    }
  };

  const handleConfirmRejection = async () => {
    if (selectedApplication && rejectionReason.trim()) {
      try {
        await onReject({
          application_id: selectedApplication.id,
          decision: "rejected",
          rejection_reason: rejectionReason,
          comments: approvalComments,
        });
        setShowRejectionDialog(false);
        setRejectionReason("");
        setApprovalComments("");
        setSelectedApplication(null);
      } catch (error) {
        console.error("Rejection failed:", error);
      }
    }
  };

  const handleBulkApproval = async () => {
    if (selectedApplications.length > 0) {
      try {
        await onBulkApprove(selectedApplications);
        setSelectedApplications([]);
      } catch (error) {
        console.error("Bulk approval failed:", error);
      }
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

  // Calculate team availability impact
  const getTeamImpact = (application: any) => {
    const overlappingLeaves = leaveCalendar.filter(
      (event) =>
        event.status === "approved" &&
        event.start_date <= application.end_date &&
        event.end_date >= application.start_date &&
        event.employee_id !== application.employee_id
    );

    return {
      overlappingLeaves: overlappingLeaves.length,
      criticalStaffing: overlappingLeaves.length >= 3, // Threshold for critical staffing
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">
            Loading approval dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-orange-600">
              {pendingApplications.length}
            </div>
            <p className="text-xs text-muted-foreground">Pending Approvals</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">
              {teamMembers.length}
            </div>
            <p className="text-xs text-muted-foreground">Team Members</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">
              {
                leaveCalendar.filter((event) => event.status === "approved")
                  .length
              }
            </div>
            <p className="text-xs text-muted-foreground">Approved Leaves</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600">
              {
                leaveCalendar.filter((event) => event.status === "pending")
                  .length
              }
            </div>
            <p className="text-xs text-muted-foreground">Pending Leaves</p>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Actions */}
      {selectedApplications.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {selectedApplications.length} application
                  {selectedApplications.length > 1 ? "s" : ""} selected
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedApplications([])}
                >
                  Clear Selection
                </Button>
                <Button size="sm" onClick={handleBulkApproval}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Applications Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Leave Requests
          </CardTitle>
          <CardDescription>
            Review and approve leave requests from your team members
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingApplications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No pending leave requests</p>
              <p className="text-sm mt-1">
                All team leave requests have been processed
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          selectedApplications.length ===
                          pendingApplications.length
                        }
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Leave Type</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Applied</TableHead>
                    <TableHead>Team Impact</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingApplications.map((application) => {
                    const employee = teamMembers.find(
                      (emp) => emp.id === application.employee_id
                    );
                    const teamImpact = getTeamImpact(application);

                    return (
                      <TableRow key={application.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedApplications.includes(
                              application.id
                            )}
                            onCheckedChange={(checked) =>
                              handleSelectApplication(
                                application.id,
                                checked as boolean
                              )
                            }
                          />
                        </TableCell>

                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {employee?.full_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {employee?.employee_id} •{" "}
                              {employee?.designation?.title}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{
                                backgroundColor:
                                  application.leave_type?.color_code,
                              }}
                            />
                            <span className="font-medium">
                              {application.leave_type?.name}
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
                          <div className="text-sm">
                            {formatDateTime(application.applied_at)}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="space-y-1">
                            {teamImpact.overlappingLeaves > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {teamImpact.overlappingLeaves} overlapping
                              </Badge>
                            )}
                            {teamImpact.criticalStaffing && (
                              <Badge variant="destructive" className="text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Critical Staffing
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleApprove(application)}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReject(application)}
                              className="text-red-600"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Reject
                            </Button>
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

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Approve Leave Application</DialogTitle>
            <DialogDescription>
              Review and approve this leave application
            </DialogDescription>
          </DialogHeader>

          {selectedApplication && (
            <div className="space-y-4">
              {/* Application Details */}
              <Card>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-muted-foreground">Employee:</span>
                      <p className="font-medium">
                        {selectedApplication.employee?.full_name}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Leave Type:</span>
                      <p className="font-medium">
                        {selectedApplication.leave_type?.name}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Duration:</span>
                      <p className="font-medium">
                        {selectedApplication.total_days} days
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Dates:</span>
                      <p className="font-medium">
                        {formatDate(selectedApplication.start_date)} -{" "}
                        {formatDate(selectedApplication.end_date)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <span className="text-muted-foreground">Reason:</span>
                    <p className="mt-1">{selectedApplication.reason}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Comments */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Approval Comments (Optional)
                </label>
                <Textarea
                  value={approvalComments}
                  onChange={(e) => setApprovalComments(e.target.value)}
                  placeholder="Add comments for the employee..."
                  rows={3}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowApprovalDialog(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleConfirmApproval}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve Application
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={showRejectionDialog} onOpenChange={setShowRejectionDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reject Leave Application</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this leave application
            </DialogDescription>
          </DialogHeader>

          {selectedApplication && (
            <div className="space-y-4">
              {/* Application Details */}
              <Card>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-muted-foreground">Employee:</span>
                      <p className="font-medium">
                        {selectedApplication.employee?.full_name}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Leave Type:</span>
                      <p className="font-medium">
                        {selectedApplication.leave_type?.name}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Duration:</span>
                      <p className="font-medium">
                        {selectedApplication.total_days} days
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Dates:</span>
                      <p className="font-medium">
                        {formatDate(selectedApplication.start_date)} -{" "}
                        {formatDate(selectedApplication.end_date)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <span className="text-muted-foreground">Reason:</span>
                    <p className="mt-1">{selectedApplication.reason}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Rejection Reason */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Rejection Reason *
                </label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please provide a clear reason for rejection..."
                  rows={3}
                  required
                />
              </div>

              {/* Comments */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Additional Comments (Optional)
                </label>
                <Textarea
                  value={approvalComments}
                  onChange={(e) => setApprovalComments(e.target.value)}
                  placeholder="Add any additional comments..."
                  rows={2}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowRejectionDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleConfirmRejection}
                  disabled={!rejectionReason.trim()}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject Application
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApprovalDashboard;
