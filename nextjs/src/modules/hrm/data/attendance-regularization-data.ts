import { AttendanceRegularizationRequest, Employee } from "../types";

export const mockAttendanceRegularizationRequests =
  [
    {
      id: 1,
      employee_id: 2,
      request_date: "2024-10-19",
      original_date: "2024-10-18",
      original_check_in_time: "09:15",
      original_check_out_time: "17:45",
      requested_check_in_time: "09:00",
      requested_check_out_time: "18:00",
      reason: "Traffic jam caused late arrival. Requesting to adjust timing.",
      supporting_document_urls: [
        "traffic-report.pdf",
        "google-maps-screenshot.png",
      ],
      status: "pending",
      manager_id: 3,
      created_at: "2024-10-19T10:00:00Z",
      updated_at: "2024-10-19T10:00:00Z",
    },
    {
      id: 2,
      employee_id: 5,
      request_date: "2024-10-18",
      original_date: "2024-10-17",
      original_check_in_time: "09:30",
      original_check_out_time: "16:30",
      requested_check_in_time: "09:00",
      requested_check_out_time: "18:00",
      reason:
        "Power outage at home affected work schedule. Need to regularize attendance.",
      supporting_document_urls: ["electricity-bill.pdf"],
      status: "approved",
      reviewed_by: 3,
      reviewed_at: "2024-10-18T14:00:00Z",
      review_comments: "Approved - Valid reason provided",
      manager_id: 3,
      created_at: "2024-10-18T09:00:00Z",
      updated_at: "2024-10-18T14:00:00Z",
    },
    {
      id: 3,
      employee_id: 4,
      request_date: "2024-10-17",
      original_date: "2024-10-16",
      requested_check_in_time: "09:00",
      requested_check_out_time: "18:00",
      reason: "Biometric device malfunction. Manual entry needed.",
      supporting_document_urls: [
        "device-error-log.pdf",
        "witness-statement.pdf",
      ],
      status: "rejected",
      reviewed_by: 3,
      reviewed_at: "2024-10-17T16:00:00Z",
      review_comments: "Rejected - Insufficient documentation",
      rejection_reason: "Device malfunction not properly documented",
      manager_id: 3,
      created_at: "2024-10-17T11:00:00Z",
      updated_at: "2024-10-17T16:00:00Z",
    },
    {
      id: 4,
      employee_id: 6,
      request_date: "2024-10-16",
      original_date: "2024-10-15",
      original_check_in_time: "09:45",
      original_check_out_time: "17:15",
      requested_check_in_time: "09:00",
      requested_check_out_time: "18:00",
      reason:
        "Medical appointment in the morning. Late arrival due to doctor visit.",
      supporting_document_urls: [
        "doctor-appointment.pdf",
        "medical-certificate.pdf",
      ],
      status: "pending",
      manager_id: 3,
      created_at: "2024-10-16T13:00:00Z",
      updated_at: "2024-10-16T13:00:00Z",
    },
    {
      id: 5,
      employee_id: 8,
      request_date: "2024-10-15",
      original_date: "2024-10-14",
      original_check_in_time: "10:00",
      original_check_out_time: "18:30",
      requested_check_in_time: "09:00",
      requested_check_out_time: "18:00",
      reason: "Client meeting ran longer than expected. Overtime work.",
      supporting_document_urls: [
        "client-meeting-notes.pdf",
        "overtime-approval.pdf",
      ],
      status: "approved",
      reviewed_by: 7,
      reviewed_at: "2024-10-15T10:00:00Z",
      review_comments: "Approved - Valid client meeting documentation",
      manager_id: 7,
      created_at: "2024-10-15T09:00:00Z",
      updated_at: "2024-10-15T10:00:00Z",
    },
    {
      id: 6,
      employee_id: 1,
      request_date: "2024-10-14",
      original_date: "2024-10-13",
      original_check_in_time: "09:00",
      original_check_out_time: "15:00",
      requested_check_in_time: "09:00",
      requested_check_out_time: "18:00",
      reason: "System crash caused early logout. Completed work remotely.",
      supporting_document_urls: [
        "system-log.pdf",
        "remote-work-screenshot.png",
      ],
      status: "pending",
      manager_id: 1, // Self-approval for CEO
      created_at: "2024-10-14T12:00:00Z",
      updated_at: "2024-10-14T12:00:00Z",
    },
    {
      id: 7,
      employee_id: 7,
      request_date: "2024-10-13",
      original_date: "2024-10-12",
      original_check_in_time: "14:15",
      original_check_out_time: "22:45",
      requested_check_in_time: "14:00",
      requested_check_out_time: "23:00",
      reason: "Emergency maintenance work required late arrival adjustment.",
      supporting_document_urls: [
        "maintenance-report.pdf",
        "emergency-call-log.pdf",
      ],
      status: "approved",
      reviewed_by: 1,
      reviewed_at: "2024-10-13T15:00:00Z",
      review_comments: "Approved - Emergency situation properly documented",
      manager_id: 1,
      created_at: "2024-10-13T14:00:00Z",
      updated_at: "2024-10-13T15:00:00Z",
    },
    {
      id: 8,
      employee_id: 3,
      request_date: "2024-10-12",
      original_date: "2024-10-11",
      original_check_in_time: "09:00",
      original_check_out_time: "13:00",
      requested_check_in_time: "09:00",
      requested_check_out_time: "18:00",
      reason: "Half day due to family emergency. Completed remaining work.",
      supporting_document_urls: ["emergency-contact.pdf"],
      status: "rejected",
      reviewed_by: 1,
      reviewed_at: "2024-10-12T11:00:00Z",
      review_comments: "Rejected - Work completion not verified",
      rejection_reason: "Insufficient evidence of work completion",
      manager_id: 1,
      created_at: "2024-10-12T10:00:00Z",
      updated_at: "2024-10-12T11:00:00Z",
    },
  ];

// Helper functions
export const getRegularizationRequestsByEmployee = (employeeId: number) =>
  mockAttendanceRegularizationRequests.filter(
    (request) => request.employee_id === employeeId
  );

export const getPendingRegularizationRequests = () =>
  mockAttendanceRegularizationRequests.filter(
    (request) => request.status === "pending"
  );

export const getRegularizationRequestsByManager = (managerId: number) =>
  mockAttendanceRegularizationRequests.filter(
    (request) => request.manager_id === managerId
  );

export const getRegularizationRequestOptions = () => [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
];

export const getRegularizationReasonOptions = () => [
  { value: "traffic_delay", label: "Traffic Delay" },
  { value: "medical_appointment", label: "Medical Appointment" },
  { value: "family_emergency", label: "Family Emergency" },
  { value: "device_malfunction", label: "Device Malfunction" },
  { value: "system_issue", label: "System Issue" },
  { value: "client_meeting", label: "Client Meeting" },
  { value: "maintenance_work", label: "Maintenance Work" },
  { value: "power_outage", label: "Power Outage" },
  { value: "internet_issue", label: "Internet Issue" },
  { value: "other", label: "Other" },
];
