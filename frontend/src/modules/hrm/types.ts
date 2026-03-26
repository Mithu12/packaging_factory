// HRM Frontend Types

export interface Employee {
  id: number;
  factory_id?: number;
  user_id?: number;
  employee_id: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  date_of_birth?: string;
  gender?: "male" | "female" | "other";
  marital_status?: "single" | "married" | "divorced" | "widowed";
  nationality?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  blood_group?: string;
  cnic?: string;
  passport_number?: string;
  tax_id?: string;
  designation_id?: number;
  designation?: Designation;
  reporting_manager_id?: number;
  reporting_manager?: Employee;
  department_id?: number;
  department?: Department;
  employment_type: "permanent" | "contract" | "intern" | "consultant";
  join_date?: string;
  confirmation_date?: string;
  termination_date?: string;
  probation_period_months: number;
  notice_period_days: number;
  work_location?: string;
  shift_type: "day" | "night" | "rotating";
  bank_account_number?: string;
  bank_name?: string;
  skill_level: "beginner" | "intermediate" | "expert" | "master";
  department_name?: string;
  current_work_order_id?: number;
  availability_status: "available" | "busy" | "off_duty" | "on_leave";
  hourly_rate?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: number;
  name: string;
  code: string;
  description?: string;
  manager_id?: number;
  manager?: Employee;
  parent_department_id?: number;
  parent_department?: Department;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Additional fields from API response
  manager_first_name?: string;
  manager_last_name?: string;
  manager_name?: string;
  parent_department_name?: string;
  employee_count?: number;
}

export interface Designation {
  id: number;
  title: string;
  code: string;
  department_id?: number;
  department?: Department;
  grade_level?: string;
  description?: string;
  min_salary?: number;
  max_salary?: number;
  reports_to_id?: number;
  reports_to?: Designation;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DesignationHierarchyNode {
  designation: Designation;
  children: DesignationHierarchyNode[];
  employee_count?: number;
}

export interface PayrollPeriod {
  id: number;
  name: string;
  start_date?: string;
  end_date?: string;
  period_type?: "monthly" | "bi-weekly" | "weekly" | "daily";
  status: "draft" | "open" | "processing" | "calculated" | "approved" | "processed" | "closed" | "cancelled";
  description?: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export interface PayrollComponent {
  id: number;
  name: string;
  code: string;
  component_type: "earning" | "deduction";
  category?: string;
  is_taxable: boolean;
  is_mandatory: boolean;
  calculation_method: "fixed" | "percentage" | "formula" | string;
  default_value?: number;
  formula?: string;
  description?: string;
  is_active: boolean;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export interface PayrollRun {
  id: number;
  payroll_period_id: number;
  period?: PayrollPeriod;
  run_number: string;
  status: "draft" | "processing" | "completed" | "cancelled" | "posted";
  total_employees: number;
  total_gross_salary: number;
  total_deductions: number;
  total_net_salary: number;
  processed_by?: number;
  processed_at?: string;
  posted_to_accounting: boolean;
  accounting_reference?: string;
  notes?: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export interface LeaveType {
  id: number;
  name: string;
  code: string;
  description?: string;
  max_days_per_year?: number;
  max_consecutive_days?: number;
  requires_approval: boolean;
  is_paid: boolean;
  is_carry_forward: boolean;
  max_carry_forward_days?: number;
  accrual_rate?: number;
  is_active: boolean;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export interface LeaveApplication {
  id: number;
  employee_id: number;
  employee?: Employee;
  leave_type_id: number;
  leave_type?: LeaveType;
  start_date: string;
  end_date: string;
  total_days: number;
  half_day?: boolean;
  half_day_date?: string;
  reason?: string;
  status: "draft" | "pending" | "approved" | "rejected" | "cancelled" | "partially_approved";
  approved_by?: number;
  approved_at?: string;
  rejected_reason?: string;
  emergency_contact?: string;
  contact_details?: string;
  work_handover_notes?: string;
  work_coverage_notes?: string;
  handover_notes?: string;
  uploaded_documents?: string[];
  applied_at: string;
  updated_at: string;
}

export interface LeaveBalance {
  id: number;
  employee_id: number;
  employee?: Employee;
  leave_type_id: number;
  leave_type?: LeaveType;
  year: number;
  allocated_days: number;
  used_days: number;
  pending_days: number;
  remaining_days: number;
  carried_forward_days: number;
  last_updated: string;
}

export interface AttendanceRecord {
  id: number;
  employee_id: number;
  employee?: Employee;
  attendance_date: string;
  check_in_time?: string;
  check_out_time?: string;
  break_start_time?: string;
  break_end_time?: string;
  total_hours_worked?: number;
  overtime_hours?: number;
  status:
    | "present"
    | "absent"
    | "late"
    | "half_day"
    | "early_going"
    | "work_from_home"
    | "on_leave"
    | "holiday"
    | "week_off"
    | "compensatory_off";
  location?: string;
  ip_address?: string;
  device_info?: string;
  selfie_url?: string;
  qr_code_scanned?: boolean;
  notes?: string;
  recorded_by: string;
  is_manual_entry: boolean;
  approved_by?: number;
  shift_id?: number;
  shift?: Shift;
  created_at: string;
  updated_at: string;
}

export interface Shift {
  id: number;
  name: string;
  code: string;
  description?: string;
  start_time: string;
  end_time: string;
  break_start_time?: string;
  break_end_time?: string;
  working_hours: number;
  is_flexible: boolean;
  grace_period_minutes: number;
  late_threshold_minutes: number;
  early_going_threshold_minutes: number;
  is_active: boolean;
  color_code: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export interface ShiftAssignment {
  id: number;
  employee_id: number;
  employee?: Employee;
  shift_id: number;
  shift?: Shift;
  effective_from: string;
  effective_to?: string;
  is_primary: boolean;
  assigned_by?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AttendanceConfiguration {
  id: number;
  name: string;
  working_days_per_week: number;
  working_hours_per_day: number;
  grace_period_late_minutes: number;
  grace_period_early_going_minutes: number;
  half_day_hours_threshold: number;
  full_day_hours_threshold: number;
  overtime_start_after_hours: number;
  week_off_pattern: "fixed" | "rotating";
  fixed_week_off_days?: number[]; // 0-6 (Sunday-Saturday)
  auto_approve_absent: boolean;
  require_location_check: boolean;
  require_selfie: boolean;
  allow_qr_code: boolean;
  ip_restriction_enabled: boolean;
  allowed_ip_ranges?: string[];
  geofencing_enabled: boolean;
  office_latitude?: number;
  office_longitude?: number;
  geofence_radius_meters?: number;
  is_active: boolean;
  effective_from: string;
  effective_to?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface AttendanceRegularizationRequest {
  id: number;
  employee_id: number;
  employee?: Employee;
  request_date: string;
  original_date: string;
  original_check_in_time?: string;
  original_check_out_time?: string;
  requested_check_in_time?: string;
  requested_check_out_time?: string;
  reason: string;
  supporting_document_urls?: string[];
  status: "pending" | "approved" | "rejected" | "cancelled";
  reviewed_by?: number;
  reviewed_at?: string;
  review_comments?: string;
  rejection_reason?: string;
  manager_id?: number;
  manager?: Employee;
  created_at: string;
  updated_at: string;
}

export interface AttendanceSummary {
  period_start: string;
  period_end: string;
  total_employees: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  half_day_count: number;
  work_from_home_count: number;
  on_leave_count: number;
  total_attendance_percentage: number;
  department_breakdown: {
    department_id: number;
    department_name: string;
    total_employees: number;
    present_count: number;
    absent_count: number;
    attendance_percentage: number;
  }[];
  daily_trends: {
    date: string;
    present: number;
    absent: number;
    late: number;
    total: number;
  }[];
}

export interface AttendanceReport {
  id: number;
  name: string;
  type: "daily" | "weekly" | "monthly" | "custom";
  start_date: string;
  end_date: string;
  filters: {
    employee_ids?: number[];
    department_ids?: number[];
    designation_ids?: number[];
    status?: string[];
  };
  generated_by: number;
  generated_at: string;
  file_url?: string;
  status: "generating" | "completed" | "failed";
  created_at: string;
  updated_at: string;
}

export interface WorkSchedule {
  id: number;
  name: string;
  description?: string;
  schedule_type: "fixed" | "flexible" | "rotating";
  monday_start?: string;
  monday_end?: string;
  tuesday_start?: string;
  tuesday_end?: string;
  wednesday_start?: string;
  wednesday_end?: string;
  thursday_start?: string;
  thursday_end?: string;
  friday_start?: string;
  friday_end?: string;
  saturday_start?: string;
  saturday_end?: string;
  sunday_start?: string;
  sunday_end?: string;
  total_hours_per_week?: number;
  is_default: boolean;
  is_active: boolean;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

// Form Types
export interface CreateEmployeeForm {
  factory_id?: number;
  user_id?: number;
  employee_id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  gender?: "male" | "female" | "other";
  marital_status?: "single" | "married" | "divorced" | "widowed";
  nationality?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  blood_group?: string;
  cnic?: string;
  passport_number?: string;
  tax_id?: string;
  designation_id?: number;
  reporting_manager_id?: number;
  department_id?: number;
  employment_type: "permanent" | "contract" | "intern" | "consultant";
  join_date?: string;
  confirmation_date?: string;
  probation_period_months: number;
  notice_period_days: number;
  work_location?: string;
  shift_type: "day" | "night" | "rotating";
  bank_account_number?: string;
  bank_name?: string;
  skill_level: "beginner" | "intermediate" | "expert" | "master";
  availability_status: "available" | "busy" | "off_duty" | "on_leave";
  hourly_rate?: number;
  // User account creation fields
  create_user_account?: boolean;
  username?: string;
  email?: string;
  password?: string;
  role_id?: number;
  // Termination fields
  termination_date?: string;
  resignation_date?: string;
  termination_reason?: string;
  // Legacy/additional fields
  department?: string;
  status?: string;
  current_work_order_id?: number;
  production_line_id?: number;
  notes?: string;
  // Allow additional dynamic fields
  [key: string]: any;
}

export interface CreateLeaveApplicationForm {
  leave_type_id: number;
  start_date: string;
  end_date: string;
  total_days: number;
  half_day?: boolean;
  half_day_date?: string;
  reason?: string;
  contact_details?: string;
  handover_notes?: string;
  emergency_contact?: string;
  work_handover_notes?: string;
  work_coverage_notes?: string;
  uploaded_documents?: string[];
}

export interface CreateAttendanceRecordForm {
  attendance_date: string;
  check_in_time?: string;
  check_out_time?: string;
  break_start_time?: string;
  break_end_time?: string;
  location?: string;
  notes?: string;
  recorded_by?: string;
  is_manual_entry?: boolean;
}

export interface CreateDepartmentForm {
  name: string;
  code: string;
  description?: string;
  manager_id?: number;
  parent_department_id?: number;
}

export interface CreateDesignationForm {
  title: string;
  code: string;
  department_id?: number;
  grade_level?: string;
  description?: string;
  min_salary?: number;
  max_salary?: number;
  reports_to_id?: number;
}

// API Response Types
export interface EmployeeListResponse {
  employees: Employee[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DepartmentListResponse {
  departments: Department[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DesignationListResponse {
  designations: Designation[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface HRDashboardData {
  total_employees: number;
  active_employees: number;
  employees_on_leave: number;
  pending_leave_applications: number;
  upcoming_payroll_runs: number;
  department_breakdown: { department: string; count: number }[];
  recent_hires: Employee[];
  upcoming_birthdays: Employee[];
  leave_balance_warnings: {
    employee: string;
    leave_type: string;
    remaining_days: number;
  }[];
}

export interface PayrollSummary {
  period_id: number;
  period_name: string;
  total_employees: number;
  total_gross_salary: number;
  total_deductions: number;
  total_net_salary: number;
  average_salary: number;
  top_earners: { employee: string; salary: number }[];
  department_salaries: {
    department: string;
    total_salary: number;
    employee_count: number;
  }[];
}


// Salary and Promotion Types
export interface SalaryIncrement {
  id: number;
  employee_id: number;
  employee?: Employee;
  current_salary: number;
  new_salary: number;
  increment_amount: number;
  increment_percentage: number;
  effective_date: string;
  reason: string;
  status: "draft" | "pending_approval" | "approved" | "rejected";
  approved_by?: number;
  approved_at?: string;
  rejection_reason?: string;
  notes?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface Promotion {
  id: number;
  employee_id: number;
  employee?: Employee;
  current_designation_id?: number;
  current_designation?: Designation;
  current_department_id?: number;
  current_department?: Department;
  new_designation_id: number;
  new_designation?: Designation;
  new_department_id?: number;
  new_department?: Department;
  current_salary: number;
  new_salary: number;
  salary_adjustment: number;
  adjustment_percentage?: number;
  effective_date: string;
  promotion_letter_content?: string;
  status: "draft" | "pending_approval" | "approved" | "rejected";
  approved_by?: number;
  approved_at?: string;
  rejection_reason?: string;
  reason: string;
  notes?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface SalaryHistory {
  id: number;
  employee_id: number;
  employee?: Employee;
  action_type: "increment" | "promotion" | "adjustment" | "initial";
  previous_salary?: number;
  new_salary: number;
  change_amount: number;
  change_percentage?: number;
  effective_date: string;
  reason?: string;
  reference_id?: number; // Reference to increment or promotion record
  reference_type?: "increment" | "promotion";
  created_by: number;
  created_at: string;
}

export interface BulkSalaryUpdate {
  id: number;
  name: string;
  description?: string;
  increment_type: "fixed_amount" | "percentage" | "custom";
  increment_value: number; // Amount or percentage
  effective_date: string;
  criteria: {
    department_ids?: number[];
    designation_ids?: number[];
    employee_ids?: number[];
    min_salary?: number;
    max_salary?: number;
    employment_types?: string[];
  };
  status: "draft" | "processing" | "completed" | "cancelled";
  total_employees_affected: number;
  total_cost_impact: number;
  applied_count: number;
  created_by: number;
  created_at: string;
  updated_at: string;
}

// Form Types for Salary Updates
export interface SalaryIncrementForm {
  employee_id: number;
  current_salary: number;
  new_salary: number;
  increment_amount?: number;
  increment_percentage?: number;
  effective_date: string;
  reason: string;
  notes?: string;
}

export interface PromotionForm {
  employee_id: number;
  current_designation_id?: number;
  current_department_id?: number;
  new_designation_id: number;
  new_department_id?: number;
  current_salary: number;
  new_salary: number;
  salary_adjustment?: number;
  adjustment_percentage?: number;
  effective_date: string;
  reason: string;
  notes?: string;
  promotion_letter_content?: string;
}

export interface BulkSalaryUpdateForm {
  name: string;
  description?: string;
  increment_type: "fixed_amount" | "percentage" | "custom";
  increment_value: number;
  effective_date: string;
  department_ids?: number[];
  designation_ids?: number[];
  employee_ids?: number[];
  min_salary?: number;
  max_salary?: number;
  employment_types?: string[];
}

// Component Props Types
export interface EmployeeFormProps {
  employee?: Employee;
  onSubmit: (data: CreateEmployeeForm) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export interface DepartmentFormProps {
  department?: Department;
  onSubmit: (data: CreateDepartmentForm) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export interface DesignationFormProps {
  designation?: Designation;
  onSubmit: (data: CreateDesignationForm) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export interface EmployeeListProps {
  employees: Employee[];
  loading: boolean;
  onEdit: (employee: Employee) => void;
  onDelete: (employeeId: number) => void;
  onView: (employee: Employee) => void;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
}

export interface LeaveApplicationFormProps {
  leaveTypes: LeaveType[];
  onSubmit: (data: CreateLeaveApplicationForm) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export interface AttendanceTrackerProps {
  employee?: Employee;
  onMarkAttendance: (
    action: "check_in" | "check_out" | "break_start" | "break_end",
    location?: string,
    notes?: string
  ) => Promise<void>;
  currentRecord?: AttendanceRecord;
  loading?: boolean;
}

export interface SalaryUpdatePageProps {
  employees: Employee[];
  departments: Department[];
  designations: Designation[];
  salaryHistory: SalaryHistory[];
  onSalaryIncrement: (data: SalaryIncrementForm) => Promise<void>;
  onPromotion: (data: PromotionForm) => Promise<void>;
  onBulkSalaryUpdate: (data: BulkSalaryUpdateForm) => Promise<void>;
  loading?: boolean;
}

export interface SalaryIncrementFormProps {
  employees: Employee[];
  onSubmit: (data: SalaryIncrementForm) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export interface PromotionFormProps {
  employees: Employee[];
  departments: Department[];
  designations: Designation[];
  onSubmit: (data: PromotionForm) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export interface BulkSalaryUpdateFormProps {
  employees: Employee[];
  departments: Department[];
  designations: Designation[];
  onSubmit: (data: BulkSalaryUpdateForm) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export interface SalaryHistoryProps {
  history: SalaryHistory[];
  employees: Employee[];
  loading?: boolean;
}

// Payroll and Payment Types
export interface PayrollPeriod {
  id: number;
  month?: number; // 1-12
  year?: number;
  name: string; // e.g., "January 2024"
  status: "draft" | "open" | "processing" | "calculated" | "approved" | "processed" | "closed" | "cancelled";
  total_employees?: number;
  total_gross_salary?: number;
  total_deductions?: number;
  total_net_salary?: number;
  processed_by?: number;
  processed_at?: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export interface PayrollComponent {
  id: number;
  name: string;
  code: string;
  component_type: "earning" | "deduction";
  category?: string;
  is_taxable: boolean;
  is_mandatory: boolean;
  calculation_method: "fixed" | "percentage" | "formula" | string;
  default_value?: number;
  formula?: string;
  description?: string;
  is_active: boolean;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export interface EmployeePayrollRecord {
  id: number;
  employee_id: number;
  employee?: Employee;
  payroll_period_id: number;
  payroll_period?: PayrollPeriod;

  // Earnings
  basic_salary: number;
  house_rent_allowance: number;
  transport_allowance: number;
  medical_allowance: number;
  bonus: number;
  overtime_pay: number;
  other_earnings: number;

  // Deductions
  income_tax: number;
  provident_fund: number;
  insurance: number;
  loan_deduction: number;
  other_deductions: number;

  // Calculated totals
  total_earnings: number;
  total_deductions: number;
  net_salary: number;

  status: "draft" | "calculated" | "approved" | "paid" | "cancelled";
  calculated_by?: number;
  calculated_at?: string;
  approved_by?: number;
  approved_at?: string;
  paid_by?: number;
  paid_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentRecord {
  id: number;
  employee_id: number;
  employee?: Employee;
  payroll_period_id: number;
  payroll_period?: PayrollPeriod;
  payroll_record_id?: number;
  payroll_record?: EmployeePayrollRecord;

  payment_method: "bank_transfer" | "check" | "cash" | "other";
  payment_date: string;
  amount: number;
  bank_account_number?: string;
  bank_name?: string;
  check_number?: string;
  transaction_reference?: string;

  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  failure_reason?: string;
  processed_by?: number;
  processed_at?: string;

  // Audit fields
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface PayrollSummary {
  period_id: number;
  period_name: string;
  total_employees: number;
  total_gross_salary: number;
  total_deductions: number;
  total_net_salary: number;
  total_paid: number;
  pending_payments: number;
  failed_payments: number;
  department_breakdown: {
    department_id: number;
    department_name: string;
    employee_count: number;
    total_salary: number;
  }[];
  payment_method_breakdown: {
    method: string;
    count: number;
    total_amount: number;
  }[];
}

// Form Types
export interface PayrollCalculationForm {
  employee_ids?: number[];
  recalculate_all?: boolean;
}

export interface PaymentProcessingForm {
  payroll_period_id: number;
  employee_ids: number[];
  payment_method: "bank_transfer" | "check" | "cash" | "other";
  payment_date: string;
  bank_account_number?: string;
  bank_name?: string;
  check_number?: string;
  notes?: string;
}

export interface PayrollFilter {
  department_ids?: number[];
  designation_ids?: number[];
  payment_status?: string[];
  date_from?: string;
  date_to?: string;
  min_salary?: number;
  max_salary?: number;
  search_term?: string;
}

// Component Props Types
export interface PayrollPageProps {
  employees: Employee[];
  departments: Department[];
  payrollPeriods: PayrollPeriod[];
  payrollRecords: EmployeePayrollRecord[];
  paymentRecords: PaymentRecord[];
  onCalculatePayroll: (data: PayrollCalculationForm) => Promise<void>;
  onProcessPayments: (data: PaymentProcessingForm) => Promise<void>;
  onExportData: (
    format: "excel" | "pdf",
    filters?: PayrollFilter
  ) => Promise<void>;
  loading?: boolean;
}

export interface EmployeePayrollCardProps {
  employee: Employee;
  payrollRecord?: EmployeePayrollRecord;
  paymentRecord?: PaymentRecord;
  isSelected?: boolean;
  onSelect?: (selected: boolean) => void;
  onViewPayslip?: () => void;
  loading?: boolean;
  currency?: string;
}

/** Row model for payroll employee table pickers (calculate / pay) */
export interface PayrollPickerRow {
  employeeId: number;
  displayName: string;
  employeeCode: string;
  departmentLabel: string;
  designationLabel: string;
  netSalary?: number;
  payrollStatus?: string;
}

export interface PayrollCalculatorProps {
  employees: Employee[];
  selectedEmployeeIds: number[];
  onCalculate: (data: PayrollCalculationForm) => Promise<void>;
  /** Table picker selection (full list replace) */
  onSelectionChange: (employeeIds: number[]) => void;
  onGeneratePayslips?: (employeeIds: number[]) => void;
  loading?: boolean;
  /** When false, disables Calculate Payroll (e.g. no period selected) */
  canCalculate?: boolean;
  currency?: string;
  /** Rows for employee table; built in parent from employees + period payroll */
  pickerRows: PayrollPickerRow[];
  /** Period selected on the payroll page (read-only context for calculate) */
  selectedPeriod?: PayrollPeriod | null;
}

export interface PaymentFormProps {
  selectedEmployees: Employee[];
  selectedPayrollRecords: EmployeePayrollRecord[];
  onSubmit: (data: PaymentProcessingForm) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  currency?: string;
}

export interface PayrollHistoryProps {
  payrollRecords: EmployeePayrollRecord[];
  paymentRecords: PaymentRecord[];
  employees: Employee[];
  departments: Department[];
  filters?: PayrollFilter;
  onFilterChange?: (filters: PayrollFilter) => void;
  onExport?: (format: "excel" | "pdf") => Promise<void>;
  /** When true, salary sheet export buttons are disabled (e.g. no period selected on payroll page) */
  exportDisabled?: boolean;
  loading?: boolean;
  currency?: string;
}

// Leave Type Configuration Types
export interface LeaveType {
  id: number;
  name: string;
  code: string;
  description?: string;
  color_code: string; // Hex color for calendar display
  is_active: boolean;

  // Entitlement Rules
  annual_allocation_days: number;
  accrual_method:
    | "beginning_of_year"
    | "monthly_accrual"
    | "anniversary_based"
    | "custom";
  prorated_for_new_joiners: boolean;
  max_accumulation_days?: number;
  max_carry_forward_days?: number;
  encashment_eligible: boolean;
  min_days_per_request?: number;
  max_days_per_request?: number;

  // Applicability
  applicable_department_ids?: number[];
  applicable_designation_ids?: number[];
  gender_restriction?: "male" | "female" | "both";
  employment_type_restrictions?: string[];

  // Documentation
  requires_documentation: boolean;
  mandatory_document_types?: string[];
  optional_document_types?: string[];

  created_by?: number;
  created_at: string;
  updated_at: string;
}

export interface LeaveEntitlementRule {
  id: number;
  leave_type_id: number;
  leave_type?: LeaveType;

  // Entitlement Rules
  annual_allocation_days: number;
  accrual_method:
    | "beginning_of_year"
    | "monthly_accrual"
    | "anniversary_based"
    | "custom";
  prorated_for_new_joiners: boolean;
  max_accumulation_days?: number;
  max_carry_forward_days?: number;
  encashment_eligible: boolean;
  min_days_per_request?: number;
  max_days_per_request?: number;

  // Applicability Rules
  applicable_department_ids?: number[];
  applicable_designation_ids?: number[];
  gender_restriction?: "male" | "female" | "both";
  employment_type_restrictions?: string[];

  effective_from: string;
  effective_to?: string;
  is_active: boolean;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface LeaveDocumentationRequirement {
  id: number;
  leave_type_id: number;
  leave_type?: LeaveType;

  requires_documentation: boolean;
  mandatory_document_types: string[];
  optional_document_types: string[];

  is_active: boolean;
  created_by: number;
  created_at: string;
  updated_at: string;
}

// Form Types
export interface CreateLeaveTypeForm {
  name: string;
  code: string;
  description?: string;
  color_code: string;

  // Entitlement Rules
  annual_allocation_days: number;
  accrual_method:
    | "beginning_of_year"
    | "monthly_accrual"
    | "anniversary_based"
    | "custom";
  prorated_for_new_joiners: boolean;
  max_accumulation_days?: number;
  max_carry_forward_days?: number;
  encashment_eligible: boolean;
  min_days_per_request?: number;
  max_days_per_request?: number;

  // Applicability
  applicable_department_ids?: number[];
  applicable_designation_ids?: number[];
  gender_restriction?: "male" | "female" | "both";
  employment_type_restrictions?: string[];

  // Documentation
  requires_documentation: boolean;
  mandatory_document_types?: string[];
  optional_document_types?: string[];
}

export interface LeaveTypeConfigurationPageProps {
  leaveTypes: LeaveType[];
  departments: Department[];
  designations: Designation[];
  onCreateLeaveType: (data: CreateLeaveTypeForm) => Promise<void>;
  onUpdateLeaveType: (
    id: number,
    data: Partial<CreateLeaveTypeForm>
  ) => Promise<void>;
  onDeleteLeaveType: (id: number) => Promise<void>;
  loading?: boolean;
}

export interface LeaveTypeFormProps {
  leaveType?: LeaveType;
  departments: Department[];
  designations: Designation[];
  onSubmit: (data: CreateLeaveTypeForm) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export interface LeaveTypeListProps {
  leaveTypes: LeaveType[];
  onEdit: (leaveType: LeaveType) => void;
  onDelete: (id: number) => void;
  onToggleStatus: (id: number, isActive: boolean) => Promise<void>;
  loading?: boolean;
}

export interface LeaveEntitlementRulesProps {
  leaveType: LeaveType;
  onUpdate: (rules: Partial<CreateLeaveTypeForm>) => Promise<void>;
  loading?: boolean;
}

export interface LeaveApplicabilityProps {
  leaveType: LeaveType;
  departments: Department[];
  designations: Designation[];
  onUpdate: (applicability: Partial<CreateLeaveTypeForm>) => Promise<void>;
  loading?: boolean;
}

export interface LeaveDocumentationProps {
  leaveType: LeaveType;
  onUpdate: (documentation: Partial<CreateLeaveTypeForm>) => Promise<void>;
  loading?: boolean;
}

// Leave Application and Approval Types
export interface LeaveApplication {
  id: number;
  employee_id: number;
  employee?: Employee;
  leave_type_id: number;
  leave_type?: LeaveType;

  // Application Details
  start_date: string;
  end_date: string;
  total_days: number;
  half_day?: boolean;
  half_day_date?: string;
  reason?: string;
  contact_details?: string;
  handover_notes?: string;

  // Document Uploads
  uploaded_documents?: string[];

  // Status and Workflow
  status:
    | "draft"
    | "pending"
    | "approved"
    | "rejected"
    | "cancelled"
    | "partially_approved";
  current_approver_id?: number;
  current_approver?: Employee;
  workflow_stage?: number;
  total_workflow_stages?: number;

  // Timestamps
  applied_at: string;
  approved_at?: string;
  rejected_at?: string;
  cancelled_at?: string;

  // Approval Details
  approved_by?: number;
  rejected_by?: number;
  rejection_reason?: string;
  approver_comments?: string;

  // Additional Info
  emergency_contact?: string;
  work_coverage_notes?: string;
  created_at?: string;
  updated_at: string;
}

export interface LeaveBalance {
  employee_id: number;
  employee?: Employee;
  leave_type_id: number;
  leave_type?: LeaveType;

  // Balance Information
  allocated_days: number;
  used_days: number;
  pending_days: number;
  available_days: number;
  carried_forward_days: number;

  // Period Information
  period_start: string;
  period_end: string;

  last_updated: string;
}

export interface ApprovalWorkflow {
  id: number;
  name: string;
  description?: string;

  // Workflow Configuration
  workflow_type: "sequential" | "parallel" | "hybrid";
  max_approval_days: number;
  auto_escalate: boolean;
  escalation_days: number;

  // Approval Levels
  approval_levels: ApprovalLevel[];
  is_active: boolean;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface ApprovalLevel {
  id: number;
  workflow_id: number;
  level_number: number;
  level_name: string;

  // Approver Configuration
  approver_type:
    | "specific_employee"
    | "manager"
    | "department_head"
    | "hr_manager"
    | "role_based";
  approver_id?: number; // For specific employee
  approver_role?: string; // For role-based
  department_id?: number; // For department head

  // Conditions
  requires_all_approvals: boolean;
  min_approvals_required: number;

  created_at: string;
  updated_at: string;
}

export interface ApprovalRecord {
  id: number;
  application_id: number;
  application?: LeaveApplication;
  approver_id: number;
  approver?: Employee;
  level_number: number;

  // Decision
  decision: "approved" | "rejected" | "pending";
  comments?: string;
  rejection_reason?: string;

  // Timestamps
  action_date: string;
  response_time_hours?: number;

  created_at: string;
}

export interface LeaveCalendarEvent {
  id: string;
  employee_id: number;
  employee?: Employee;
  leave_type_id: number;
  leave_type?: LeaveType;
  application_id: number;

  // Event Details
  title: string;
  start_date: string;
  end_date: string;
  is_half_day: boolean;
  status: "pending" | "approved" | "rejected";

  // Styling
  background_color: string;
  text_color: string;
}

export interface TeamAvailability {
  date: string;
  total_employees: number;
  on_leave: number;
  available: number;
  critical_staffing: boolean;
  leave_events: LeaveCalendarEvent[];
}

// Form Types
export interface CreateLeaveApplicationForm {
  leave_type_id: number;
  start_date: string;
  end_date: string;
  total_days: number;
  half_day?: boolean;
  half_day_date?: string;
  reason?: string;
  contact_details?: string;
  handover_notes?: string;
  emergency_contact?: string;
  work_coverage_notes?: string;
  uploaded_documents?: string[];
}

export interface LeaveApplicationFilter {
  employee_id?: number;
  leave_type_ids?: number[];
  status?: string[];
  date_from?: string;
  date_to?: string;
  department_ids?: number[];
  approver_id?: number;
  search_term?: string;
}

export interface ApprovalActionForm {
  application_id: number;
  decision: "approved" | "rejected";
  comments?: string;
  rejection_reason?: string;
}

// Component Props Types
export interface LeaveApplicationPageProps {
  currentUser: Employee;
  employees: Employee[];
  departments: Department[];
  designations: Designation[];
  leaveTypes: LeaveType[];
  leaveApplications: LeaveApplication[];
  leaveBalances: LeaveBalance[];
  approvalWorkflows: ApprovalWorkflow[];
  onCreateApplication: (data: CreateLeaveApplicationForm) => Promise<void>;
  onUpdateApplication: (
    id: number,
    data: Partial<CreateLeaveApplicationForm>
  ) => Promise<void>;
  onCancelApplication: (id: number) => Promise<void>;
  onApproveApplication: (data: ApprovalActionForm) => Promise<void>;
  onRejectApplication: (data: ApprovalActionForm) => Promise<void>;
  loading?: boolean;
}

export interface EmployeeLeaveFormProps {
  employee: Employee;
  leaveTypes: LeaveType[];
  leaveBalances: LeaveBalance[];
  onSubmit: (data: CreateLeaveApplicationForm) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  initialData?: Partial<CreateLeaveApplicationForm>;
  isEdit?: boolean;
}

export interface LeaveBalanceDisplayProps {
  employee: Employee;
  leaveBalances: LeaveBalance[];
  leaveTypes: LeaveType[];
  loading?: boolean;
}

export interface ApplicationStatusTrackerProps {
  application: LeaveApplication;
  approvalRecords: ApprovalRecord[];
  loading?: boolean;
}

export interface LeaveHistoryProps {
  applications: LeaveApplication[];
  employees: Employee[];
  leaveTypes: LeaveType[];
  filters?: LeaveApplicationFilter;
  onFilterChange?: (filters: LeaveApplicationFilter) => void;
  onExport?: (format: "excel" | "pdf") => Promise<void>;
  onViewApplication?: (application: LeaveApplication) => void;
  onEditApplication?: (application: LeaveApplication) => void;
  onCancelApplication?: (applicationId: number) => void;
  onAddComment?: (applicationId: number) => void;
  loading?: boolean;
}

export interface ApprovalDashboardProps {
  currentUser: Employee;
  pendingApplications: LeaveApplication[];
  teamMembers: Employee[];
  leaveCalendar: LeaveCalendarEvent[];
  approvalWorkflows: ApprovalWorkflow[];
  onApprove: (data: ApprovalActionForm) => Promise<void>;
  onReject: (data: ApprovalActionForm) => Promise<void>;
  onBulkApprove: (applicationIds: number[]) => Promise<void>;
  loading?: boolean;
}

export interface TeamCalendarProps {
  teamMembers: Employee[];
  leaveEvents: LeaveCalendarEvent[];
  selectedDate?: string;
  onDateSelect?: (date: string) => void;
  loading?: boolean;
}

export interface ApprovalWorkflowConfigProps {
  workflows: ApprovalWorkflow[];
  departments: Department[];
  designations: Designation[];
  onCreateWorkflow: (
    data: Omit<ApprovalWorkflow, "id" | "created_at" | "updated_at">
  ) => Promise<void>;
  onUpdateWorkflow: (
    id: number,
    data: Partial<ApprovalWorkflow>
  ) => Promise<void>;
  onDeleteWorkflow: (id: number) => Promise<void>;
  loading?: boolean;
}

export interface AdminLeaveToolsProps {
  employees: Employee[];
  leaveTypes: LeaveType[];
  leaveApplications: LeaveApplication[];
  onManualAdjustment: (applicationId: number, adjustment: any) => Promise<void>;
  onResetQuotas: (year: number) => Promise<void>;
  onProcessEncashment: (
    employeeId: number,
    leaveTypeId: number,
    days: number
  ) => Promise<void>;
  loading?: boolean;
}

// Attendance Form Types
export interface CreateAttendanceRecordForm {
  employee_id: number;
  attendance_date: string;
  check_in_time?: string;
  check_out_time?: string;
  break_start_time?: string;
  break_end_time?: string;
  status: AttendanceRecord["status"];
  location?: string;
  ip_address?: string;
  notes?: string;
  recorded_by?: string;
  is_manual_entry?: boolean;
  shift_id?: number;
}

export interface CreateShiftForm {
  name: string;
  code: string;
  description?: string;
  start_time: string;
  end_time: string;
  break_start_time?: string;
  break_end_time?: string;
  working_hours: number;
  is_flexible: boolean;
  grace_period_minutes: number;
  late_threshold_minutes: number;
  early_going_threshold_minutes: number;
  color_code: string;
}

export interface CreateShiftAssignmentForm {
  employee_id: number;
  shift_id: number;
  effective_from: string;
  effective_to?: string;
  is_primary: boolean;
  notes?: string;
}

export interface CreateAttendanceConfigurationForm {
  name: string;
  working_days_per_week: number;
  working_hours_per_day: number;
  grace_period_late_minutes: number;
  grace_period_early_going_minutes: number;
  half_day_hours_threshold: number;
  full_day_hours_threshold: number;
  overtime_start_after_hours: number;
  week_off_pattern: "fixed" | "rotating";
  fixed_week_off_days?: number[];
  auto_approve_absent: boolean;
  require_location_check: boolean;
  require_selfie: boolean;
  allow_qr_code: boolean;
  ip_restriction_enabled: boolean;
  allowed_ip_ranges?: string[];
  geofencing_enabled: boolean;
  office_latitude?: number;
  office_longitude?: number;
  geofence_radius_meters?: number;
  effective_from: string;
  effective_to?: string;
}

export interface CreateAttendanceRegularizationForm {
  employee_id: number;
  original_date: string;
  original_check_in_time?: string;
  original_check_out_time?: string;
  requested_check_in_time?: string;
  requested_check_out_time?: string;
  reason: string;
  supporting_document_urls?: string[];
}

export interface BulkAttendanceMarkForm {
  employee_ids: number[];
  attendance_date: string;
  status: AttendanceRecord["status"];
  check_in_time?: string;
  check_out_time?: string;
  notes?: string;
}

// Component Props Types
export interface AttendanceDashboardProps {
  employees: Employee[];
  attendanceRecords: AttendanceRecord[];
  shifts: Shift[];
  attendanceSummary: AttendanceSummary;
  onMarkAttendance: (data: CreateAttendanceRecordForm) => Promise<void>;
  onBulkMarkAttendance: (data: BulkAttendanceMarkForm) => Promise<void>;
  loading?: boolean;
}

export interface AttendanceMarkingProps {
  employees: Employee[];
  departments: Department[];
  shifts: Shift[];
  attendanceRecords: AttendanceRecord[];
  onMarkAttendance: (data: CreateAttendanceRecordForm) => Promise<void>;
  onBulkMarkAttendance: (data: BulkAttendanceMarkForm) => Promise<void>;
  onRegularizeAttendance: (
    data: CreateAttendanceRegularizationForm
  ) => Promise<void>;
  loading?: boolean;
}

export interface ShiftManagementProps {
  shifts: Shift[];
  shiftAssignments: ShiftAssignment[];
  employees: Employee[];
  onCreateShift: (data: CreateShiftForm) => Promise<void>;
  onUpdateShift: (id: number, data: Partial<CreateShiftForm>) => Promise<void>;
  onDeleteShift: (id: number) => Promise<void>;
  onAssignShift: (data: CreateShiftAssignmentForm) => Promise<void>;
  onUpdateAssignment: (
    id: number,
    data: Partial<CreateShiftAssignmentForm>
  ) => Promise<void>;
  onDeleteAssignment: (id: number) => Promise<void>;
  loading?: boolean;
}

export interface AttendanceRegularizationProps {
  regularizationRequests: AttendanceRegularizationRequest[];
  employees: Employee[];
  onCreateRequest: (data: CreateAttendanceRegularizationForm) => Promise<void>;
  onApproveRequest: (id: number, comments?: string) => Promise<void>;
  onRejectRequest: (id: number, reason: string) => Promise<void>;
  onCancelRequest: (id: number) => Promise<void>;
  loading?: boolean;
}

export interface AttendanceReportsProps {
  employees: Employee[];
  departments: Department[];
  attendanceRecords: AttendanceRecord[];
  attendanceReports: AttendanceReport[];
  onGenerateReport: (data: {
    name: string;
    type: "daily" | "weekly" | "monthly" | "custom";
    start_date: string;
    end_date: string;
    filters: AttendanceReport["filters"];
  }) => Promise<void>;
  onDownloadReport: (reportId: number) => Promise<void>;
  onExportData: (format: "excel" | "pdf", filters: any) => Promise<void>;
  loading?: boolean;
}

// Attendance Component Props
export interface AttendanceCardProps {
  attendance: AttendanceRecord;
  employee?: Employee;
  shift?: Shift;
  onEdit?: (attendance: AttendanceRecord) => void;
  onDelete?: (id: number) => void;
  onRegularize?: (attendance: AttendanceRecord) => void;
  compact?: boolean;
}

export interface AttendanceTableProps {
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
  onEdit?: (attendance: AttendanceRecord) => void;
  onDelete?: (id: number) => void;
  onRegularize?: (attendance: AttendanceRecord) => void;
}

export interface ShiftFormProps {
  shift?: Shift;
  onSubmit: (data: CreateShiftForm) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export interface ShiftAssignmentFormProps {
  employees: Employee[];
  shifts: Shift[];
  assignment?: ShiftAssignment;
  onSubmit: (data: CreateShiftAssignmentForm) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export interface AttendanceConfigurationFormProps {
  configuration?: AttendanceConfiguration;
  onSubmit: (data: CreateAttendanceConfigurationForm) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export interface AttendanceRegularizationFormProps {
  employees: Employee[];
  attendanceRecords: AttendanceRecord[];
  onSubmit: (data: CreateAttendanceRegularizationForm) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export interface AttendanceFilter {
  employee_id?: number;
  department_ids?: number[];
  designation_ids?: number[];
  status?: string[];
  date_from?: string;
  date_to?: string;
  shift_ids?: number[];
  is_manual_entry?: boolean;
  search_term?: string;
}
