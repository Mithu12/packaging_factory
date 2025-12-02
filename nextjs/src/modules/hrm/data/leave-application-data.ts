import {
  LeaveApplication,
  LeaveBalance,
  ApprovalWorkflow,
  ApprovalLevel,
  ApprovalRecord,
  LeaveCalendarEvent,
  TeamAvailability,
  Employee,
  LeaveType,
  Department,
} from "../types";

export const mockLeaveApplications: LeaveApplication[] = [
  {
    id: 1,
    employee_id: 1,
    leave_type_id: 1,
    start_date: "2024-11-15",
    end_date: "2024-11-20",
    total_days: 6,
    half_day: false,
    reason: "Family vacation to visit relatives",
    contact_details: "+92 300 1234567",
    handover_notes:
      "All urgent tasks delegated to Fatima Ali. Please contact her for any immediate requirements.",
    status: "approved",
    workflow_stage: 2,
    total_workflow_stages: 2,
    applied_at: "2024-10-15T09:00:00Z",
    approved_at: "2024-10-18T14:30:00Z",
    approved_by: 3,
    approver_comments:
      "Approved. Please ensure all handover tasks are properly documented.",
    emergency_contact: "+92 300 9876543",
    work_coverage_notes: "Critical tasks covered by team lead",
    created_at: "2024-10-15T09:00:00Z",
    updated_at: "2024-10-18T14:30:00Z",
  },
  {
    id: 2,
    employee_id: 4,
    leave_type_id: 2,
    start_date: "2024-10-25",
    end_date: "2024-10-27",
    total_days: 3,
    half_day: false,
    reason: "Medical treatment for chronic condition",
    contact_details: "+92 301 2345678",
    handover_notes:
      "All ongoing projects documented in shared drive. Emergency contact: +92 301 8765432",
    status: "pending",
    workflow_stage: 1,
    total_workflow_stages: 2,
    applied_at: "2024-10-20T11:15:00Z",
    current_approver_id: 2,
    created_at: "2024-10-20T11:15:00Z",
    updated_at: "2024-10-20T11:15:00Z",
  },
  {
    id: 3,
    employee_id: 5,
    leave_type_id: 1,
    start_date: "2024-12-20",
    end_date: "2024-12-25",
    total_days: 6,
    half_day: false,
    reason: "Annual family gathering and holiday celebrations",
    contact_details: "+92 302 3456789",
    handover_notes:
      "Code reviews completed. All pending tasks assigned to senior developer.",
    status: "approved",
    workflow_stage: 2,
    total_workflow_stages: 2,
    applied_at: "2024-11-01T10:30:00Z",
    approved_at: "2024-11-05T16:45:00Z",
    approved_by: 2,
    approver_comments:
      "Approved. Please ensure knowledge transfer is complete.",
    emergency_contact: "+92 302 9876543",
    created_at: "2024-11-01T10:30:00Z",
    updated_at: "2024-11-05T16:45:00Z",
  },
  {
    id: 4,
    employee_id: 6,
    leave_type_id: 3,
    start_date: "2024-11-01",
    end_date: "2024-11-01",
    total_days: 1,
    half_day: true,
    half_day_date: "2024-11-01",
    reason: "Personal family matter requiring immediate attention",
    contact_details: "+92 303 4567890",
    handover_notes:
      "All accounting tasks up to date. Emergency contact available.",
    status: "approved",
    workflow_stage: 1,
    total_workflow_stages: 1,
    applied_at: "2024-10-28T14:20:00Z",
    approved_at: "2024-10-29T09:15:00Z",
    approved_by: 3,
    approver_comments: "Approved for half day.",
    created_at: "2024-10-28T14:20:00Z",
    updated_at: "2024-10-29T09:15:00Z",
  },
  {
    id: 5,
    employee_id: 7,
    leave_type_id: 1,
    start_date: "2024-11-10",
    end_date: "2024-11-12",
    total_days: 3,
    half_day: false,
    reason: "Business trip to attend industry conference",
    contact_details: "+92 304 5678901",
    handover_notes:
      "Operations team briefed on ongoing projects. Emergency protocols in place.",
    status: "rejected",
    workflow_stage: 1,
    total_workflow_stages: 2,
    applied_at: "2024-10-25T16:45:00Z",
    rejected_at: "2024-10-26T11:30:00Z",
    rejected_by: 1,
    rejection_reason: "Critical staffing during end-of-month operations",
    approver_comments: "Please reschedule for after month-end closing.",
    created_at: "2024-10-25T16:45:00Z",
    updated_at: "2024-10-26T11:30:00Z",
  },
  {
    id: 6,
    employee_id: 8,
    leave_type_id: 4,
    start_date: "2024-12-01",
    end_date: "2025-02-28",
    total_days: 90,
    half_day: false,
    reason: "Maternity leave as per company policy",
    contact_details: "+92 305 6789012",
    handover_notes:
      "Marketing campaigns handed over to senior executive. All client communications documented.",
    status: "approved",
    workflow_stage: 3,
    total_workflow_stages: 3,
    applied_at: "2024-09-15T13:00:00Z",
    approved_at: "2024-09-20T10:00:00Z",
    approved_by: 1,
    approver_comments:
      "Approved. Congratulations! Please ensure smooth handover.",
    created_at: "2024-09-15T13:00:00Z",
    updated_at: "2024-09-20T10:00:00Z",
  },
  {
    id: 7,
    employee_id: 2,
    leave_type_id: 5,
    start_date: "2024-11-05",
    end_date: "2024-11-11",
    total_days: 7,
    half_day: false,
    reason: "Paternity leave following childbirth",
    contact_details: "+92 306 7890123",
    handover_notes:
      "CTO responsibilities temporarily delegated to senior architect.",
    status: "approved",
    workflow_stage: 2,
    total_workflow_stages: 2,
    applied_at: "2024-10-10T08:30:00Z",
    approved_at: "2024-10-12T15:20:00Z",
    approved_by: 1,
    approver_comments:
      "Approved. Congratulations on the new addition to your family!",
    created_at: "2024-10-10T08:30:00Z",
    updated_at: "2024-10-12T15:20:00Z",
  },
  {
    id: 8,
    employee_id: 3,
    leave_type_id: 6,
    start_date: "2024-10-30",
    end_date: "2024-10-30",
    total_days: 1,
    half_day: false,
    reason: "Emergency family medical situation requiring immediate attention",
    contact_details: "+92 307 8901234",
    handover_notes:
      "HR operations covered by assistant manager during absence.",
    status: "approved",
    workflow_stage: 1,
    total_workflow_stages: 1,
    applied_at: "2024-10-28T12:00:00Z",
    approved_at: "2024-10-28T14:00:00Z",
    approved_by: 1,
    approver_comments: "Approved for emergency situation.",
    emergency_contact: "+92 307 6543210",
    created_at: "2024-10-28T12:00:00Z",
    updated_at: "2024-10-28T14:00:00Z",
  },
];

export const mockLeaveBalances: LeaveBalance[] = [
  {
    employee_id: 1,
    leave_type_id: 1,
    allocated_days: 25,
    used_days: 6,
    pending_days: 0,
    available_days: 19,
    carried_forward_days: 0,
    period_start: "2024-01-01",
    period_end: "2024-12-31",
    last_updated: "2024-10-18T14:30:00Z",
  },
  {
    employee_id: 1,
    leave_type_id: 2,
    allocated_days: 12,
    used_days: 3,
    pending_days: 0,
    available_days: 9,
    carried_forward_days: 2,
    period_start: "2024-01-01",
    period_end: "2024-12-31",
    last_updated: "2024-10-18T14:30:00Z",
  },
  {
    employee_id: 1,
    leave_type_id: 3,
    allocated_days: 10,
    used_days: 1,
    pending_days: 0,
    available_days: 9,
    carried_forward_days: 1,
    period_start: "2024-01-01",
    period_end: "2024-12-31",
    last_updated: "2024-10-18T14:30:00Z",
  },
  {
    employee_id: 2,
    leave_type_id: 1,
    allocated_days: 25,
    used_days: 7,
    pending_days: 0,
    available_days: 18,
    carried_forward_days: 0,
    period_start: "2024-01-01",
    period_end: "2024-12-31",
    last_updated: "2024-10-12T15:20:00Z",
  },
  {
    employee_id: 3,
    leave_type_id: 1,
    allocated_days: 25,
    used_days: 1,
    pending_days: 0,
    available_days: 24,
    carried_forward_days: 5,
    period_start: "2024-01-01",
    period_end: "2024-12-31",
    last_updated: "2024-10-28T14:00:00Z",
  },
  {
    employee_id: 4,
    leave_type_id: 1,
    allocated_days: 25,
    used_days: 0,
    pending_days: 3,
    available_days: 22,
    carried_forward_days: 0,
    period_start: "2024-01-01",
    period_end: "2024-12-31",
    last_updated: "2024-10-20T11:15:00Z",
  },
  {
    employee_id: 5,
    leave_type_id: 1,
    allocated_days: 25,
    used_days: 0,
    pending_days: 0,
    available_days: 25,
    carried_forward_days: 2,
    period_start: "2024-01-01",
    period_end: "2024-12-31",
    last_updated: "2024-10-01T00:00:00Z",
  },
  {
    employee_id: 6,
    leave_type_id: 1,
    allocated_days: 25,
    used_days: 0,
    pending_days: 0,
    available_days: 25,
    carried_forward_days: 3,
    period_start: "2024-01-01",
    period_end: "2024-12-31",
    last_updated: "2024-10-01T00:00:00Z",
  },
  {
    employee_id: 7,
    leave_type_id: 1,
    allocated_days: 25,
    used_days: 0,
    pending_days: 0,
    available_days: 25,
    carried_forward_days: 0,
    period_start: "2024-01-01",
    period_end: "2024-12-31",
    last_updated: "2024-10-01T00:00:00Z",
  },
  {
    employee_id: 8,
    leave_type_id: 1,
    allocated_days: 25,
    used_days: 0,
    pending_days: 0,
    available_days: 25,
    carried_forward_days: 4,
    period_start: "2024-01-01",
    period_end: "2024-12-31",
    last_updated: "2024-10-01T00:00:00Z",
  },
];

export const mockApprovalWorkflows: ApprovalWorkflow[] = [
  {
    id: 1,
    name: "Standard Employee Leave",
    description: "Default approval workflow for regular employees",
    workflow_type: "sequential",
    max_approval_days: 7,
    auto_escalate: true,
    escalation_days: 3,
    approval_levels: [
      {
        id: 1,
        workflow_id: 1,
        level_number: 1,
        level_name: "Manager Approval",
        approver_type: "manager",
        requires_all_approvals: false,
        min_approvals_required: 1,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
      {
        id: 2,
        workflow_id: 1,
        level_number: 2,
        level_name: "HR Approval",
        approver_type: "hr_manager",
        requires_all_approvals: false,
        min_approvals_required: 1,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
    ],
    is_active: true,
    created_by: 1,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 2,
    name: "Executive Leave",
    description: "Approval workflow for managers and executives",
    workflow_type: "parallel",
    max_approval_days: 5,
    auto_escalate: false,
    escalation_days: 2,
    approval_levels: [
      {
        id: 3,
        workflow_id: 2,
        level_number: 1,
        level_name: "CEO Approval",
        approver_type: "specific_employee",
        approver_id: 1,
        requires_all_approvals: true,
        min_approvals_required: 1,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
    ],
    is_active: true,
    created_by: 1,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 3,
    name: "Emergency Leave",
    description: "Fast-track approval for emergency situations",
    workflow_type: "sequential",
    max_approval_days: 2,
    auto_escalate: true,
    escalation_days: 1,
    approval_levels: [
      {
        id: 4,
        workflow_id: 3,
        level_number: 1,
        level_name: "Immediate Manager",
        approver_type: "manager",
        requires_all_approvals: false,
        min_approvals_required: 1,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      },
    ],
    is_active: true,
    created_by: 1,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
];

export const mockApprovalRecords: ApprovalRecord[] = [
  {
    id: 1,
    application_id: 1,
    approver_id: 3,
    level_number: 1,
    decision: "approved",
    comments: "Approved - handover plan looks comprehensive",
    action_date: "2024-10-16T10:30:00Z",
    response_time_hours: 25.5,
    created_at: "2024-10-16T10:30:00Z",
  },
  {
    id: 2,
    application_id: 1,
    approver_id: 1,
    level_number: 2,
    decision: "approved",
    comments: "Final approval granted",
    action_date: "2024-10-18T14:30:00Z",
    response_time_hours: 52,
    created_at: "2024-10-18T14:30:00Z",
  },
  {
    id: 3,
    application_id: 5,
    approver_id: 1,
    level_number: 1,
    decision: "rejected",
    comments: "Please reschedule for after month-end",
    rejection_reason: "Critical staffing during end-of-month operations",
    action_date: "2024-10-26T11:30:00Z",
    response_time_hours: 18.75,
    created_at: "2024-10-26T11:30:00Z",
  },
];

export const mockLeaveCalendarEvents: LeaveCalendarEvent[] = [
  {
    id: "1",
    employee_id: 1,
    leave_type_id: 1,
    application_id: 1,
    title: "Ahmed Khan - Annual Leave",
    start_date: "2024-11-15",
    end_date: "2024-11-20",
    is_half_day: false,
    status: "approved",
    background_color: "#22c55e",
    text_color: "#ffffff",
  },
  {
    id: "2",
    employee_id: 4,
    leave_type_id: 2,
    application_id: 2,
    title: "Ayesha Siddiqui - Sick Leave",
    start_date: "2024-10-25",
    end_date: "2024-10-27",
    is_half_day: false,
    status: "pending",
    background_color: "#ef4444",
    text_color: "#ffffff",
  },
  {
    id: "3",
    employee_id: 5,
    leave_type_id: 1,
    application_id: 3,
    title: "Bilal Hassan - Annual Leave",
    start_date: "2024-12-20",
    end_date: "2024-12-25",
    is_half_day: false,
    status: "approved",
    background_color: "#22c55e",
    text_color: "#ffffff",
  },
  {
    id: "4",
    employee_id: 6,
    leave_type_id: 3,
    application_id: 4,
    title: "Sara Malik - Casual Leave (Half Day)",
    start_date: "2024-11-01",
    end_date: "2024-11-01",
    is_half_day: true,
    status: "approved",
    background_color: "#f59e0b",
    text_color: "#ffffff",
  },
  {
    id: "5",
    employee_id: 7,
    leave_type_id: 1,
    application_id: 5,
    title: "Omar Farooq - Annual Leave (Rejected)",
    start_date: "2024-11-10",
    end_date: "2024-11-12",
    is_half_day: false,
    status: "rejected",
    background_color: "#ef4444",
    text_color: "#ffffff",
  },
  {
    id: "6",
    employee_id: 8,
    leave_type_id: 4,
    application_id: 6,
    title: "Zahra Noor - Maternity Leave",
    start_date: "2024-12-01",
    end_date: "2025-02-28",
    is_half_day: false,
    status: "approved",
    background_color: "#ec4899",
    text_color: "#ffffff",
  },
  {
    id: "7",
    employee_id: 2,
    leave_type_id: 5,
    application_id: 7,
    title: "Fatima Ali - Paternity Leave",
    start_date: "2024-11-05",
    end_date: "2024-11-11",
    is_half_day: false,
    status: "approved",
    background_color: "#3b82f6",
    text_color: "#ffffff",
  },
  {
    id: "8",
    employee_id: 3,
    leave_type_id: 6,
    application_id: 8,
    title: "Usman Ahmed - Emergency Leave",
    start_date: "2024-10-30",
    end_date: "2024-10-30",
    is_half_day: false,
    status: "approved",
    background_color: "#8b5cf6",
    text_color: "#ffffff",
  },
];

export const mockTeamAvailability: TeamAvailability[] = [
  {
    date: "2024-10-25",
    total_employees: 8,
    on_leave: 1,
    available: 7,
    critical_staffing: false,
    leave_events: [mockLeaveCalendarEvents[1]],
  },
  {
    date: "2024-11-01",
    total_employees: 8,
    on_leave: 2,
    available: 6,
    critical_staffing: false,
    leave_events: [mockLeaveCalendarEvents[3], mockLeaveCalendarEvents[7]],
  },
  {
    date: "2024-11-15",
    total_employees: 8,
    on_leave: 2,
    available: 6,
    critical_staffing: false,
    leave_events: [mockLeaveCalendarEvents[0]],
  },
  {
    date: "2024-11-20",
    total_employees: 8,
    on_leave: 2,
    available: 6,
    critical_staffing: false,
    leave_events: [mockLeaveCalendarEvents[0]],
  },
];

// Helper functions
export const getApplicationStatusOptions = () => [
  { value: "draft", label: "Draft" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
  { value: "partially_approved", label: "Partially Approved" },
];

export const getWorkflowTypeOptions = () => [
  { value: "sequential", label: "Sequential" },
  { value: "parallel", label: "Parallel" },
  { value: "hybrid", label: "Hybrid" },
];

export const getApproverTypeOptions = () => [
  { value: "specific_employee", label: "Specific Employee" },
  { value: "manager", label: "Manager" },
  { value: "department_head", label: "Department Head" },
  { value: "hr_manager", label: "HR Manager" },
  { value: "role_based", label: "Role Based" },
];

// Utility functions
export const calculateLeaveDays = (
  startDate: string,
  endDate: string,
  excludeWeekends: boolean = true,
  excludeHolidays: boolean = true
): number => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let days = 0;

  for (
    let date = new Date(start);
    date <= end;
    date.setDate(date.getDate() + 1)
  ) {
    if (excludeWeekends && (date.getDay() === 0 || date.getDay() === 6)) {
      continue; // Skip weekends
    }

    // Skip major holidays (simplified - in real app would check holiday calendar)
    if (excludeHolidays) {
      const month = date.getMonth() + 1;
      const day = date.getDate();

      // Skip major Pakistani holidays
      if (
        (month === 8 && day === 14) || // Independence Day
        (month === 3 && day === 23) || // Pakistan Day
        (month === 12 && day === 25) || // Quaid-e-Azam Day
        (month === 5 && day === 1)
      ) {
        // Labour Day
        continue;
      }
    }

    days++;
  }

  return days;
};

export const getLeaveBalanceByEmployeeAndType = (
  employeeId: number,
  leaveTypeId: number
): LeaveBalance | undefined => {
  return mockLeaveBalances.find(
    (balance) =>
      balance.employee_id === employeeId &&
      balance.leave_type_id === leaveTypeId
  );
};

export const getPendingApplications = (): LeaveApplication[] => {
  return mockLeaveApplications.filter((app) => app.status === "pending");
};

export const getApplicationsByStatus = (status: string): LeaveApplication[] => {
  return mockLeaveApplications.filter((app) => app.status === status);
};

export const getApplicationsByEmployee = (
  employeeId: number
): LeaveApplication[] => {
  return mockLeaveApplications.filter((app) => app.employee_id === employeeId);
};

export const getApplicationsByApprover = (
  approverId: number
): LeaveApplication[] => {
  return mockLeaveApplications.filter(
    (app) => app.current_approver_id === approverId
  );
};

export const generateLeaveReportData = (
  applications: LeaveApplication[],
  employees: Employee[],
  leaveTypes: LeaveType[]
) => {
  return applications.map((app) => {
    const employee = employees.find((emp) => emp.id === app.employee_id);
    const leaveType = leaveTypes.find((lt) => lt.id === app.leave_type_id);

    return {
      employee_id: app.employee_id,
      employee_name: employee?.full_name || "Unknown",
      employee_code: employee?.employee_id || "N/A",
      leave_type: leaveType?.name || "Unknown",
      start_date: app.start_date,
      end_date: app.end_date,
      total_days: app.total_days,
      half_day: app.half_day ? "Yes" : "No",
      reason: app.reason,
      status: app.status,
      applied_date: app.applied_at,
      approved_date: app.approved_at || "N/A",
      approver:
        employees.find((emp) => emp.id === app.approved_by)?.full_name || "N/A",
      department: employee?.department?.name || "N/A",
      designation: employee?.designation?.title || "N/A",
    };
  });
};
