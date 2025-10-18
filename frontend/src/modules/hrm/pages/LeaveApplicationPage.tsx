import React, { useState } from "react";
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
import {
  mockEmployees,
  mockDepartments,
  mockDesignations,
} from "../data/salary-update-data";
import { mockLeaveTypes } from "../data/leave-configuration-data";
import {
  mockLeaveApplications,
  mockLeaveBalances,
  mockApprovalWorkflows,
  mockLeaveCalendarEvents,
  mockTeamAvailability,
} from "../data/leave-application-data";

// Mock current user (in real app, this would come from auth context)
const mockCurrentUser = mockEmployees[0]; // CEO

const LeaveApplicationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState("applications");
  const [selectedApplication, setSelectedApplication] =
    useState<LeaveApplication | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [applications, setApplications] = useState<LeaveApplication[]>(
    mockLeaveApplications
  );
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  // Role-based access control
  const isEmployee = mockCurrentUser.id !== 1; // CEO is admin, others are employees/managers
  const isManager = [2, 3].includes(mockCurrentUser.id); // CTO and HR Manager are managers
  const isAdmin = mockCurrentUser.id === 1; // CEO is admin

  // Mock handlers for form submissions
  const handleCreateApplication = async (data: CreateLeaveApplicationForm) => {
    setLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Create new application
    const maxId =
      applications.length > 0
        ? Math.max(...applications.map((app) => app.id))
        : 0;
    const newApplication: LeaveApplication = {
      id: maxId + 1,
      employee_id: mockCurrentUser.id,
      leave_type_id: parseInt(data.leave_type_id),
      start_date: data.start_date,
      end_date: data.end_date,
      total_days: data.total_days,
      half_day: data.half_day,
      half_day_date: data.half_day_date,
      reason: data.reason,
      status: "pending" as const,
      applied_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      approved_by: undefined,
      approved_at: undefined,
      rejected_reason: undefined,
      emergency_contact: data.emergency_contact,
      contact_details: data.contact_details,
      work_handover_notes: data.handover_notes,
      work_coverage_notes: data.work_coverage_notes,
      handover_notes: data.handover_notes,
      uploaded_documents: data.uploaded_documents,
    };

    setApplications((prev) => [...prev, newApplication]);
    setLoading(false);
    setShowCreateForm(false);
  };

  const handleUpdateApplication = async (
    id: number,
    data: CreateLeaveApplicationForm
  ) => {
    setLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Update existing application
    setApplications((prev) =>
      prev.map((app) =>
        app.id === id
          ? {
              ...app,
              leave_type_id: data.leave_type_id,
              start_date: data.start_date,
              end_date: data.end_date,
              total_days: data.total_days,
              half_day: data.half_day,
              half_day_date: data.half_day_date,
              reason: data.reason,
              contact_details: data.contact_details,
              handover_notes: data.handover_notes,
              emergency_contact: data.emergency_contact,
              work_coverage_notes: data.work_coverage_notes,
              uploaded_documents: data.uploaded_documents,
              updated_at: new Date().toISOString(),
            }
          : app
      )
    );
    setLoading(false);
  };

  const handleCancelApplication = async (id: number) => {
    setLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Update application status to cancelled
    setApplications((prev) =>
      prev.map((app) =>
        app.id === id
          ? {
              ...app,
              status: "cancelled",
              cancelled_at: new Date().toISOString(),
            }
          : app
      )
    );
    setLoading(false);
  };

  const handleApproveApplication = async (data: {
    application_id: number;
    comments?: string;
  }) => {
    setLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Update application status to approved
    setApplications((prev) =>
      prev.map((app) =>
        app.id === data.application_id
          ? {
              ...app,
              status: "approved",
              approved_at: new Date().toISOString(),
              approved_by: mockCurrentUser.id,
              comments: data.comments,
            }
          : app
      )
    );
    setLoading(false);
  };

  const handleRejectApplication = async (data: {
    application_id: number;
    rejection_reason: string;
    comments?: string;
  }) => {
    setLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Update application status to rejected
    setApplications((prev) =>
      prev.map((app) =>
        app.id === data.application_id
          ? {
              ...app,
              status: "rejected",
              rejection_reason: data.rejection_reason,
              comments: data.comments,
              rejected_at: new Date().toISOString(),
              rejected_by: mockCurrentUser.id,
            }
          : app
      )
    );
    setLoading(false);
  };

  const handleBulkApprove = async (applicationIds: number[]) => {
    setLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Update multiple applications to approved
    setApplications((prev) =>
      prev.map((app) =>
        applicationIds.includes(app.id)
          ? {
              ...app,
              status: "approved",
              approved_at: new Date().toISOString(),
              approved_by: mockCurrentUser.id,
            }
          : app
      )
    );
    setLoading(false);
  };

  const handleExportData = async (format: "excel" | "pdf") => {
    setLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log("Data exported:", format);
    setLoading(false);
  };

  const handleManualAdjustment = async (
    applicationId: number,
    adjustment: { field: string; value: any }
  ) => {
    setLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log("Manual adjustment applied:", applicationId, adjustment);
    setLoading(false);
  };

  const handleResetQuotas = async (year: number) => {
    setLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log("Leave quotas reset for year:", year);
    setLoading(false);
  };

  const handleProcessEncashment = async (
    employeeId: number,
    leaveTypeId: number,
    days: number
  ) => {
    setLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    console.log("Leave encashment processed:", employeeId, leaveTypeId, days);
    setLoading(false);
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
      setLoading(true);
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Remove application from state
      setApplications((prev) => prev.filter((app) => app.id !== applicationId));
      setLoading(false);
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Applications
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryStats.totalApplications}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {summaryStats.pendingApplications}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {summaryStats.approvedApplications}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {summaryStats.rejectedApplications}
            </div>
          </CardContent>
        </Card>

        {isEmployee && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  My Applications
                </CardTitle>
                <UserCheck className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {summaryStats.myApplications}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Pending Approvals
                </CardTitle>
                <Clock className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {summaryStats.myPendingApprovals}
                </div>
              </CardContent>
            </Card>
          </>
        )}
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
                  employee={mockCurrentUser}
                  leaveBalances={mockLeaveBalances.filter(
                    (balance) => balance.employee_id === mockCurrentUser.id
                  )}
                  leaveTypes={mockLeaveTypes}
                  loading={loading}
                />
              )}

              <div className="mt-6">
                <LeaveHistory
                  applications={
                    isEmployee
                      ? applications.filter(
                          (app) => app.employee_id === mockCurrentUser.id
                        )
                      : applications
                  }
                  employees={mockEmployees}
                  leaveTypes={mockLeaveTypes}
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
                  employee={mockCurrentUser}
                  leaveBalances={mockLeaveBalances.filter(
                    (balance) => balance.employee_id === mockCurrentUser.id
                  )}
                  leaveTypes={mockLeaveTypes}
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
                  currentUser={mockCurrentUser}
                  pendingApplications={applications.filter(
                    (app) => app.status === "pending"
                  )}
                  teamMembers={mockEmployees.filter(
                    (emp) => emp.reporting_manager_id === mockCurrentUser.id
                  )}
                  leaveCalendar={mockLeaveCalendarEvents}
                  approvalWorkflows={mockApprovalWorkflows}
                  onApprove={handleApproveApplication}
                  onReject={handleRejectApplication}
                  onBulkApprove={handleBulkApprove}
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
                  teamMembers={mockEmployees.filter(
                    (emp) => emp.reporting_manager_id === mockCurrentUser.id
                  )}
                  leaveEvents={mockLeaveCalendarEvents}
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
                  workflows={mockApprovalWorkflows}
                  departments={mockDepartments}
                  designations={mockDesignations}
                  onCreateWorkflow={async (data) => {
                    console.log("Workflow created:", data);
                  }}
                  onUpdateWorkflow={async (id, data) => {
                    console.log("Workflow updated:", id, data);
                  }}
                  onDeleteWorkflow={async (id) => {
                    console.log("Workflow deleted:", id);
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
                  employees={mockEmployees}
                  leaveTypes={mockLeaveTypes}
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
                employees={mockEmployees}
                leaveTypes={mockLeaveTypes}
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
            employee={mockCurrentUser}
            leaveTypes={mockLeaveTypes}
            leaveBalances={mockLeaveBalances.filter(
              (balance) => balance.employee_id === mockCurrentUser.id
            )}
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
                          const employee = mockEmployees.find(
                            (emp) => emp.id === selectedApplication.employee_id
                          );
                          return employee?.full_name || "Unknown";
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
                          const employee = mockEmployees.find(
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
                          const employee = mockEmployees.find(
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
                          const employee = mockEmployees.find(
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
                              const leaveType = mockLeaveTypes.find(
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
                            const leaveType = mockLeaveTypes.find(
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

                  {selectedApplication.comments && (
                    <div className="mt-4">
                      <span className="text-muted-foreground">Comments:</span>
                      <p className="mt-1">{selectedApplication.comments}</p>
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
                const employee = mockEmployees.find(
                  (emp) => emp.id === selectedApplication.employee_id
                );
                return employee || mockCurrentUser;
              })()}
              leaveTypes={mockLeaveTypes}
              leaveBalances={mockLeaveBalances.filter(
                (balance) =>
                  selectedApplication &&
                  balance.employee_id === selectedApplication.employee_id
              )}
              initialData={
                selectedApplication
                  ? {
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
                        selectedApplication.work_handover_notes ||
                        "",
                      emergency_contact:
                        selectedApplication.emergency_contact || "",
                      work_coverage_notes:
                        selectedApplication.work_coverage_notes || "",
                      uploaded_documents:
                        selectedApplication.uploaded_documents || [],
                    }
                  : undefined
              }
              onSubmit={(data) => {
                if (selectedApplication) {
                  handleUpdateApplication(selectedApplication.id, data);
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
