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
  gender?: 'male' | 'female' | 'other';
  marital_status?: 'single' | 'married' | 'divorced' | 'widowed';
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
  employment_type: 'permanent' | 'contract' | 'intern' | 'consultant';
  join_date?: string;
  confirmation_date?: string;
  termination_date?: string;
  probation_period_months: number;
  notice_period_days: number;
  work_location?: string;
  shift_type: 'day' | 'night' | 'rotating';
  bank_account_number?: string;
  bank_name?: string;
  skill_level: 'beginner' | 'intermediate' | 'expert' | 'master';
  department_name?: string;
  current_work_order_id?: number;
  availability_status: 'available' | 'busy' | 'off_duty' | 'on_leave';
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
  start_date: string;
  end_date: string;
  period_type: 'monthly' | 'bi-weekly' | 'weekly' | 'daily';
  status: 'open' | 'processing' | 'closed' | 'cancelled';
  description?: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export interface PayrollComponent {
  id: number;
  name: string;
  code: string;
  component_type: 'earning' | 'deduction';
  category?: string;
  is_taxable: boolean;
  is_mandatory: boolean;
  calculation_method: string;
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
  status: 'draft' | 'processing' | 'completed' | 'cancelled' | 'posted';
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
  max_carry_forward_days: number;
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
  reason?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approved_by?: number;
  approved_at?: string;
  rejected_reason?: string;
  emergency_contact?: string;
  work_handover_notes?: string;
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
  overtime_hours: number;
  status: 'present' | 'absent' | 'late' | 'half_day' | 'holiday';
  location?: string;
  notes?: string;
  recorded_by: string;
  is_manual_entry: boolean;
  approved_by?: number;
  created_at: string;
  updated_at: string;
}

export interface WorkSchedule {
  id: number;
  name: string;
  description?: string;
  schedule_type: 'fixed' | 'flexible' | 'rotating';
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
  gender?: 'male' | 'female' | 'other';
  marital_status?: 'single' | 'married' | 'divorced' | 'widowed';
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
  employment_type: 'permanent' | 'contract' | 'intern' | 'consultant';
  join_date?: string;
  probation_period_months: number;
  notice_period_days: number;
  work_location?: string;
  shift_type: 'day' | 'night' | 'rotating';
  bank_account_number?: string;
  bank_name?: string;
  skill_level: 'beginner' | 'intermediate' | 'expert' | 'master';
  availability_status: 'available' | 'busy' | 'off_duty' | 'on_leave';
  hourly_rate?: number;
}

export interface CreateLeaveApplicationForm {
  leave_type_id: number;
  start_date: string;
  end_date: string;
  total_days: number;
  reason?: string;
  emergency_contact?: string;
  work_handover_notes?: string;
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
  leave_balance_warnings: { employee: string; leave_type: string; remaining_days: number }[];
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
  department_salaries: { department: string; total_salary: number; employee_count: number }[];
}

export interface AttendanceSummary {
  period_start: string;
  period_end: string;
  total_working_days: number;
  average_attendance_rate: number;
  total_absenteeism: number;
  overtime_hours: number;
  department_attendance: { department: string; attendance_rate: number; total_employees: number }[];
  employee_attendance: { employee: string; attendance_rate: number; total_days: number }[];
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
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected';
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
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected';
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
  action_type: 'increment' | 'promotion' | 'adjustment' | 'initial';
  previous_salary?: number;
  new_salary: number;
  change_amount: number;
  change_percentage?: number;
  effective_date: string;
  reason?: string;
  reference_id?: number; // Reference to increment or promotion record
  reference_type?: 'increment' | 'promotion';
  created_by: number;
  created_at: string;
}

export interface BulkSalaryUpdate {
  id: number;
  name: string;
  description?: string;
  increment_type: 'fixed_amount' | 'percentage' | 'custom';
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
  status: 'draft' | 'processing' | 'completed' | 'cancelled';
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
  increment_type: 'fixed_amount' | 'percentage' | 'custom';
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
  onMarkAttendance: (action: 'check_in' | 'check_out' | 'break_start' | 'break_end', location?: string, notes?: string) => Promise<void>;
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
