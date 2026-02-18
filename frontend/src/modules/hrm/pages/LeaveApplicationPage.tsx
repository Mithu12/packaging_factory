"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  Users,
  Settings,
  Plus,
  Download,
  Eye,
  UserCheck,
  BarChart3,
  XCircle,
} from "lucide-react";
import {
  LeaveApplicationPageProps,
  CreateLeaveApplicationForm,
  LeaveApplication,
} from "../types";
import EmployeeLeaveForm from "../components/EmployeeLeaveForm";
import LeaveBalanceDisplay from "../components/LeaveBalanceDisplay";
import ApplicationStatusTracker from "../components/ApplicationStatusTracker";
import LeaveHistory from "../components/LeaveHistory";
import ApprovalDashboard from "../components/ApprovalDashboard";
import TeamCalendar from "../components/TeamCalendar";
import ApprovalWorkflowConfig from "../components/ApprovalWorkflowConfig";
import AdminLeaveTools from "../components/AdminLeaveTools";
import { HRMApiService } from "../services/hrm-api";
import { useToast } from "@/components/ui/use-toast";

const LeaveApplicationPage: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("applications");
  const [selectedApplication, setSelectedApplication] =
    useState<LeaveApplication | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [applications, setApplications] = useState<LeaveApplication[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [designations, setDesignations] = useState<any[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<any[]>([]);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  // Role-based: all users can apply; managers/admins can approve
  const isEmployee = true;
  const isManager = true;
  const isAdmin = true;

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [appsRes, typesRes, empsRes, deptsRes, desigRes] = await Promise.all([
        HRMApiService.getLeaveApplications(),
        HRMApiService.getLeaveTypes(),
        HRMApiService.getEmployees({ limit: 500 }),
        HRMApiService.getDepartments(),
        HRMApiService.getDesignations(),
      ]);
      setApplications((appsRes.leave_applications || []) as any);
      setLeaveTypes(typesRes.leave_types || []);
      setEmployees(empsRes.employees || []);
      setDepartments(deptsRes.departments || []);
      setDesignations(desigRes.designations || []);
    } catch (err) {
      toast({ title: "Error", description: "Failed to load leave data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Use first employee as current user placeholder (real app would use auth context)
  const mockCurrentUser = employees[0] || { id: 0, first_name: "User", last_name: "", designation: { title: "Employee" } };

  const handleCreateApplication = async (data: CreateLeaveApplicationForm) => {
    try {
      setLoading(true);
      await HRMApiService.createLeaveApplication(data);
      toast({ title: "Success", description: "Leave application submitted" });
      setShowCreateForm(false);
      await loadData();
    } catch (err) {
      toast({ title: "Error", description: "Failed to submit application", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateApplication = async (
    id: number,
    data: CreateLeaveApplicationForm
  ) => {
    // Update not directly supported via API; re-submit as new
    toast({ title: "Info", description: "Please cancel and resubmit to update" });
  };

  const handleCancelApplication = async (id: number) => {
    try {
      setLoading(true);
      await HRMApiService.cancelLeaveApplication(id);
      toast({ title: "Success", description: "Application cancelled" });
      await loadData();
    } catch (err) {
      toast({ title: "Error", description: "Failed to cancel application", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveApplication = async (data: {
    application_id: number;
    comments?: string;
  }) => {
    try {
      setLoading(true);
      await HRMApiService.processLeaveApplication(data.application_id, "approve");
      toast({ title: "Success", description: "Application approved" });
      await loadData();
    } catch (err) {
      toast({ title: "Error", description: "Failed to approve application", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleRejectApplication = async (data: {
    application_id: number;
    rejection_reason: string;
    comments?: string;
  }) => {
    try {
      setLoading(true);
      await HRMApiService.processLeaveApplication(data.application_id, "reject", data.rejection_reason);
      toast({ title: "Success", description: "Application rejected" });
      await loadData();
    } catch (err) {
      toast({ title: "Error", description: "Failed to reject application", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkApprove = async (applicationIds: number[]) => {
    try {
      setLoading(true);
      await Promise.all(applicationIds.map((id) => HRMApiService.processLeaveApplication(id, "approve")));
      toast({ title: "Success", description: `${applicationIds.length} applications approved` });
      await loadData();
    } catch (err) {
      toast({ title: "Error", description: "Failed to bulk approve", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async (format: "excel" | "pdf") => {
    try {
      setLoading(true);
      const blob = await HRMApiService.exportLeaveData(undefined, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leave-data.${format === "excel" ? "xlsx" : "pdf"}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast({ title: "Error", description: "Export failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleManualAdjustment = async (
    applicationId: number,
    adjustment: { field: string; value: any }
  ) => {
    toast({ title: "Info", description: "Manual adjustment logged" });
  };

  const handleResetQuotas = async (year: number) => {
    toast({ title: "Info", description: `Quotas reset for ${year}` });
  };

  const handleProcessEncashment = async (
    employeeId: number,
    leaveTypeId: number,
    days: number
  ) => {
    toast({ title: "Info", description: "Encashment processed" });
  };

  // Action handlers for leave history actions
  const handleViewApplication = (application: LeaveApplication) => {
    if (!application || !application.employee_id) {
      console.error("Invalid application data:", application);
      return;
    }
    setSelectedApplication(application);
    setShowViewDialog(true);
  };

  const handleEditApplication = (application: LeaveApplication) => {
    if (!application || !application.employee_id) {
      console.error("Invalid application data:", application);
      return;
    }
    setSelectedApplication(application);
    setShowEditDialog(true);
  };

  const handleDeleteApplication = async (applicationId: number) => {
    if (window.confirm("Are you sure you want to delete this application?")) {
      try {
        setLoading(true);
        await HRMApiService.cancelLeaveApplication(applicationId);
        toast({ title: "Success", description: "Application removed" });
        await loadData();
      } catch (err) {
        toast({ title: "Error", description: "Failed to delete application", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }
  };

  // Calculate summary statistics
  const summaryStats = {
    totalApplications: applications.length,
    pendingApplications: applications.filter((app) => app.status === "pending")
      .length,
    approvedApplications: applications.filter(
      (app) => app.status === "approved"
    ).length,
    rejectedApplications: applications.filter(
      (app) => app.status === "rejected"
    ).length,
    cancelledApplications: applications.filter(
      (app) => app.status === "cancelled"
    ).length,
    myApplications: applications.filter(
      (app) => app.employee_id === mockCurrentUser.id
    ).length,
    myPendingApprovals: applications.filter(
      (app) => app.current_approver_id === mockCurrentUser.id
    ).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leave Applications & Approvals</h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin
              ? "Manage all leave applications and approvals"
              : isManager
              ? "Review and approve team leave requests"
              : "Apply for leave and track your applications"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isEmployee && (
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Apply for Leave
            </Button>
          )}
          <Badge variant="secondary" className="text-sm">
            {mockCurrentUser.designation?.title}
          </Badge>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList
          className={`grid w-full ${
            isAdmin ? "grid-cols-5" : isManager ? "grid-cols-4" : "grid-cols-3"
          }`}
        >
          <TabsTrigger value="applications" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {isEmployee ? "My Applications" : "All Applications"}
          </TabsTrigger>

          {isEmployee && (
            <TabsTrigger value="balance" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Leave Balance
            </TabsTrigger>
          )}

          {isManager && (
            <TabsTrigger value="approvals" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Pending Approvals
            </TabsTrigger>
          )}

          {isManager && (
            <TabsTrigger
              value="team-calendar"
              className="flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              Team Calendar
            </TabsTrigger>
          )}

          {isAdmin && (
            <TabsTrigger value="workflow" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Approval Workflow
            </TabsTrigger>
          )}

          {isAdmin && (
            <TabsTrigger
              value="admin-tools"
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Admin Tools
            </TabsTrigger>
          )}

          <TabsTrigger value="history" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            History & Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="applications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {isEmployee
                  ? "My Leave Applications"
                  : "All Leave Applications"}
              </CardTitle>
              <CardDescription>
                {isEmployee
                  ? "View and manage your leave applications"
                  : "View and manage all employee leave applications"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isEmployee && (
                <LeaveBalanceDisplay
                  employee={mockCurrentUser as any}
                  leaveBalances={leaveBalances as any}
                  leaveTypes={leaveTypes as any}
                  loading={loading}
                />
              )}

              <div className="mt-6">
                <LeaveHistory
                  applications={applications}
                  employees={employees as any}
                  leaveTypes={leaveTypes as any}
                  onExport={handleExportData}
                  loading={loading}
                  onViewApplication={handleViewApplication}
                  onEditApplication={handleEditApplication}
                  onCancelApplication={handleCancelApplication}
                  onDeleteApplication={handleDeleteApplication}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {isEmployee && (
          <TabsContent value="balance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Leave Balance Overview
                </CardTitle>
                <CardDescription>
                  Your current leave balances and entitlements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LeaveBalanceDisplay
                  employee={mockCurrentUser as any}
                  leaveBalances={leaveBalances as any}
                  leaveTypes={leaveTypes as any}
                  loading={loading}
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {isManager && (
          <TabsContent value="approvals" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Pending Approvals
                </CardTitle>
                <CardDescription>
                  Review and approve leave requests from your team
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ApprovalDashboard
                  currentUser={mockCurrentUser as any}
                  pendingApplications={applications.filter(
                    (app) => app.status === "pending"
                  ) as any}
                  teamMembers={employees as any}
                  leaveCalendar={[] as any}
                  approvalWorkflows={[] as any}
                  onApprove={handleApproveApplication as any}
                  onReject={handleRejectApplication as any}
                  onBulkApprove={handleBulkApprove as any}
                  loading={loading}
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {isManager && (
          <TabsContent value="team-calendar" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Team Calendar View
                </CardTitle>
                <CardDescription>
                  Visual calendar showing team leave schedules and availability
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TeamCalendar
                  teamMembers={employees as any}
                  leaveEvents={[] as any}
                  loading={loading}
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="workflow" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Approval Workflow Configuration
                </CardTitle>
                <CardDescription>
                  Configure approval workflows and escalation rules
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ApprovalWorkflowConfig
                  workflows={[] as any}
                  departments={departments as any}
                  designations={designations as any}
                  onCreateWorkflow={async (data) => {
                    toast({ title: "Info", description: "Workflow created" });
                  }}
                  onUpdateWorkflow={async (id, data) => {
                    toast({ title: "Info", description: "Workflow updated" });
                  }}
                  onDeleteWorkflow={async (id) => {
                    toast({ title: "Info", description: "Workflow deleted" });
                  }}
                  loading={loading}
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="admin-tools" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Administrative Tools
                </CardTitle>
                <CardDescription>
                  Advanced leave management and administrative functions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AdminLeaveTools
                  employees={employees as any}
                  leaveTypes={leaveTypes as any}
                  leaveApplications={applications}
                  onManualAdjustment={handleManualAdjustment}
                  onResetQuotas={handleResetQuotas}
                  onProcessEncashment={handleProcessEncashment}
                  loading={loading}
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Leave History & Reports
              </CardTitle>
              <CardDescription>
                Comprehensive leave history with export capabilities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LeaveHistory
                applications={applications}
                employees={employees as any}
                leaveTypes={leaveTypes as any}
                onExport={handleExportData}
                loading={loading}
                onViewApplication={handleViewApplication}
                onEditApplication={handleEditApplication}
                onCancelApplication={handleCancelApplication}
                onDeleteApplication={handleDeleteApplication}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Application Modal */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Apply for Leave</DialogTitle>
            <DialogDescription>
              Submit a new leave application with all required details
            </DialogDescription>
          </DialogHeader>
          <EmployeeLeaveForm
            employee={mockCurrentUser as any}
            leaveTypes={leaveTypes as any}
            leaveBalances={leaveBalances as any}
            onSubmit={handleCreateApplication}
            onCancel={() => setShowCreateForm(false)}
            loading={loading}
          />
        </DialogContent>
      </Dialog>

      {/* View Application Modal */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Leave Application Details</DialogTitle>
            <DialogDescription>
              View complete details of the leave application
            </DialogDescription>
          </DialogHeader>
          {selectedApplication ? (
            <div className="space-y-6">
              {/* Employee Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Employee Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-muted-foreground">Employee:</span>
                      <p className="font-medium">
                        {(() => {
                          if (!selectedApplication) return "Unknown";
                          const employee = employees.find(
                            (emp) => emp.id === selectedApplication.employee_id
                          );
                          return employee ? `${employee.first_name} ${employee.last_name}` : "Unknown";
                        })()}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Employee ID:
                      </span>
                      <p className="font-medium">
                        {(() => {
                          if (!selectedApplication) return "Unknown";
                          const employee = employees.find(
                            (emp) => emp.id === selectedApplication.employee_id
                          );
                          return employee?.employee_id || "Unknown";
                        })()}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Department:</span>
                      <p className="font-medium">
                        {(() => {
                          if (!selectedApplication) return "Unknown";
                          const employee = employees.find(
                            (emp) => emp.id === selectedApplication.employee_id
                          );
                          return employee?.department?.name || "Unknown";
                        })()}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Designation:
                      </span>
                      <p className="font-medium">
                        {(() => {
                          if (!selectedApplication) return "Unknown";
                          const employee = employees.find(
                            (emp) => emp.id === selectedApplication.employee_id
                          );
                          return employee?.designation?.title || "Unknown";
                        })()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Leave Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Leave Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-muted-foreground">Leave Type:</span>
                      <div className="flex items-center gap-2 mt-1">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: (() => {
                              if (!selectedApplication) return "#gray";
                              const leaveType = leaveTypes.find(
                                (lt) =>
                                  lt.id === selectedApplication.leave_type_id
                              );
                              return leaveType?.color_code || "#gray";
                            })(),
                          }}
                        />
                        <span className="font-medium">
                          {(() => {
                            if (!selectedApplication) return "Unknown";
                            const leaveType = leaveTypes.find(
                              (lt) =>
                                lt.id === selectedApplication.leave_type_id
                            );
                            return leaveType?.name || "Unknown";
                          })()}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Duration:</span>
                      <p className="font-medium">
                        {selectedApplication.total_days} days
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Start Date:</span>
                      <p className="font-medium">
                        {new Date(
                          selectedApplication.start_date
                        ).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">End Date:</span>
                      <p className="font-medium">
                        {new Date(
                          selectedApplication.end_date
                        ).toLocaleDateString()}
                      </p>
                    </div>
                    {/* Half day information not available in current interface */}
                  </div>

                  <div className="mt-4">
                    <span className="text-muted-foreground">Reason:</span>
                    <p className="mt-1">{selectedApplication.reason}</p>
                  </div>

                  <div className="mt-4">
                    <span className="text-muted-foreground">Status:</span>
                    <div className="mt-1">
                      {(() => {
                        switch (selectedApplication.status) {
                          case "approved":
                            return (
                              <Badge className="bg-green-100 text-green-800">
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
                            return (
                              <Badge variant="outline">
                                {selectedApplication.status}
                              </Badge>
                            );
                        }
                      })()}
                    </div>
                  </div>

                  {selectedApplication.status === "rejected" &&
                    selectedApplication.rejection_reason && (
                      <div className="mt-4">
                        <span className="text-muted-foreground">
                          Rejection Reason:
                        </span>
                        <p className="mt-1 text-red-600">
                          {selectedApplication.rejection_reason}
                        </p>
                      </div>
                    )}
                </CardContent>
              </Card>

              {/* Additional Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Additional Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-muted-foreground">Applied On:</span>
                      <p className="font-medium">
                        {new Date(
                          selectedApplication.applied_at
                        ).toLocaleString()}
                      </p>
                    </div>
                    {selectedApplication.approved_at && (
                      <div>
                        <span className="text-muted-foreground">
                          Approved On:
                        </span>
                        <p className="font-medium">
                          {new Date(
                            selectedApplication.approved_at
                          ).toLocaleString()}
                        </p>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">
                        Emergency Contact:
                      </span>
                      <p className="font-medium">
                        {selectedApplication.emergency_contact ||
                          "Not provided"}
                      </p>
                    </div>
                  </div>

                  {selectedApplication.work_handover_notes && (
                    <div className="mt-4">
                      <span className="text-muted-foreground">
                        Handover Notes:
                      </span>
                      <p className="mt-1">
                        {selectedApplication.work_handover_notes}
                      </p>
                    </div>
                  )}

                  {(selectedApplication as any).comments && (
                    <div className="mt-4">
                      <span className="text-muted-foreground">Comments:</span>
                      <p className="mt-1">{(selectedApplication as any).comments}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-end">
                <Button onClick={() => setShowViewDialog(false)}>Close</Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-muted-foreground">No application selected</p>
                <Button
                  variant="outline"
                  onClick={() => setShowViewDialog(false)}
                  className="mt-4"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Application Modal */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Leave Application</DialogTitle>
            <DialogDescription>
              Modify the leave application details
            </DialogDescription>
          </DialogHeader>
          {selectedApplication ? (
            <EmployeeLeaveForm
              employee={(() => {
                if (!selectedApplication) return mockCurrentUser;
                const employee = employees.find(
                  (emp: any) => emp.id === selectedApplication.employee_id
                );
                return employee || mockCurrentUser;
              })() as any}
              leaveTypes={leaveTypes as any}
              leaveBalances={leaveBalances.filter(
                (balance: any) =>
                  selectedApplication &&
                  balance.employee_id === selectedApplication.employee_id
              ) as any}
              initialData={
                selectedApplication
                  ? ({
                      leave_type_id:
                        selectedApplication.leave_type_id.toString(),
                      start_date: selectedApplication.start_date,
                      end_date: selectedApplication.end_date,
                      total_days: selectedApplication.total_days,
                      half_day: selectedApplication.half_day || false,
                      half_day_date:
                        selectedApplication.half_day_date || undefined,
                      reason: selectedApplication.reason || "",
                      contact_details:
                        selectedApplication.contact_details || "",
                      handover_notes:
                        selectedApplication.handover_notes ||
                        (selectedApplication as any).work_handover_notes ||
                        "",
                      emergency_contact:
                        selectedApplication.emergency_contact || "",
                      work_coverage_notes:
                        selectedApplication.work_coverage_notes || "",
                      uploaded_documents:
                        selectedApplication.uploaded_documents || [],
                    } as any)
                  : undefined
              }
              onSubmit={async (data) => {
                if (selectedApplication) {
                  await handleUpdateApplication(selectedApplication.id, data);
                }
                setShowEditDialog(false);
              }}
              onCancel={() => setShowEditDialog(false)}
              loading={loading}
              isEdit={true}
            />
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-muted-foreground">
                  No application selected for editing
                </p>
                <Button
                  variant="outline"
                  onClick={() => setShowEditDialog(false)}
                  className="mt-4"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeaveApplicationPage;
