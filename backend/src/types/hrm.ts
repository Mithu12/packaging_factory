// HRM (Human Resource Management) Type Definitions

// Core Employee Types
export interface Employee {
    id: number;
    factory_id?: number;
    user_id?: number;
    employee_id: string;

    // Personal Information
    first_name?: string;
    last_name?: string;
    full_name?: string; // Computed field
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

    // Employment Information
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

    // Banking Information
    bank_account_number?: string;
    bank_name?: string;

    // Legacy fields (for backward compatibility)
    skill_level: 'beginner' | 'intermediate' | 'expert' | 'master';
    department_name?: string; // Legacy field
    current_work_order_id?: number;
    availability_status: 'available' | 'busy' | 'off_duty' | 'on_leave';
    hourly_rate?: number;
    is_active: boolean;

    created_at: string;
    updated_at: string;
}

// Department Types
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

// Designation Types
export interface Designation {
    id: number;
    title: string;
    code: string;
    department_id?: number;
    department?: Department;
    description?: string;
    min_salary?: number;
    max_salary?: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

// Employee Contract Types
export interface EmployeeContract {
    id: number;
    employee_id: number;
    employee?: Employee;
    contract_type: string;
    start_date: string;
    end_date?: string;
    salary: number;
    currency: string;
    working_hours_per_week: number;
    working_days_per_week: number;
    notice_period_days: number;
    probation_period_months: number;
    contract_document_url?: string;
    status: 'active' | 'terminated' | 'expired' | 'suspended';
    created_by?: number;
    created_at: string;
    updated_at: string;
}

// Payroll Types
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

export interface EmployeeSalaryStructure {
    id: number;
    employee_id: number;
    employee?: Employee;
    payroll_component_id: number;
    component?: PayrollComponent;
    amount: number;
    percentage?: number;
    effective_from: string;
    effective_to?: string;
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

export interface PayrollDetail {
    id: number;
    payroll_run_id: number;
    run?: PayrollRun;
    employee_id: number;
    employee?: Employee;
    basic_salary: number;
    total_earnings: number;
    total_deductions: number;
    net_salary: number;
    working_days: number;
    paid_days: number;
    absent_days: number;
    overtime_hours: number;
    overtime_amount: number;
    leave_deductions: number;
    loan_deductions: number;
    tax_deduction: number;
    status: 'calculated' | 'approved' | 'paid' | 'cancelled';
    approved_by?: number;
    approved_at?: string;
    payment_date?: string;
    payment_reference?: string;
    notes?: string;
    created_at: string;
    updated_at: string;
}

export interface PayrollComponentDetail {
    id: number;
    payroll_detail_id: number;
    detail?: PayrollDetail;
    payroll_component_id: number;
    component?: PayrollComponent;
    amount: number;
    quantity?: number;
    rate?: number;
    notes?: string;
    created_at: string;
}

export interface EmployeeLoan {
    id: number;
    employee_id: number;
    employee?: Employee;
    loan_type: string;
    amount: number;
    monthly_installment: number;
    total_installments: number;
    paid_installments: number;
    remaining_amount: number;
    start_date: string;
    end_date?: string;
    status: 'active' | 'completed' | 'cancelled';
    approved_by?: number;
    approved_at?: string;
    notes?: string;
    created_by?: number;
    created_at: string;
    updated_at: string;
}

// Attendance Types
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

export interface Holiday {
    id: number;
    name: string;
    holiday_date: string;
    holiday_type: 'national' | 'religious' | 'company' | 'optional';
    description?: string;
    is_paid: boolean;
    is_mandatory: boolean;
    applicable_departments?: number[];
    created_by?: number;
    created_at: string;
    updated_at: string;
}

export interface EmployeeTransfer {
    id: number;
    employee_id: number;
    employee?: Employee;
    from_department_id?: number;
    from_department?: Department;
    to_department_id?: number;
    to_department?: Department;
    from_designation_id?: number;
    from_designation?: Designation;
    to_designation_id?: number;
    to_designation?: Designation;
    transfer_date: string;
    transfer_type: 'internal' | 'promotion' | 'demotion' | 'lateral';
    reason?: string;
    salary_change?: number;
    new_salary?: number;
    effective_date: string;
    status: 'pending' | 'approved' | 'rejected' | 'completed';
    approved_by?: number;
    approved_at?: string;
    notes?: string;
    created_by?: number;
    created_at: string;
    updated_at: string;
}

// Request/Response Types for Payroll
export interface CreatePayrollPeriodRequest {
  name: string;
  start_date: string;
  end_date: string;
  period_type: 'monthly' | 'bi-weekly' | 'weekly' | 'daily';
  description?: string;
}

export interface CreatePayrollComponentRequest {
  name: string;
  code: string;
  component_type: 'earning' | 'deduction';
  category?: string;
  is_taxable?: boolean;
  is_mandatory?: boolean;
  calculation_method?: string;
  formula?: string;
  description?: string;
}

export interface CreatePayrollRunRequest {
  payroll_period_id: number;
  run_number: string;
  status?: 'draft' | 'processing' | 'completed' | 'cancelled' | 'posted';
  total_employees?: number;
  total_gross_salary?: number;
  total_deductions?: number;
  total_net_salary?: number;
  processed_by?: number;
  processed_at?: string;
  posted_to_accounting?: boolean;
  accounting_reference?: string;
  notes?: string;
}

export interface CreateLeaveTypeRequest {
  name: string;
  code: string;
  description?: string;
  max_days_per_year?: number;
  max_consecutive_days?: number;
  requires_approval?: boolean;
  is_paid?: boolean;
  is_carry_forward?: boolean;
  max_carry_forward_days?: number;
  accrual_rate?: number;
}

export interface CreateAttendanceRecordRequest {
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

export interface CreateWorkScheduleRequest {
  name: string;
  description?: string;
  schedule_type?: 'fixed' | 'flexible' | 'rotating';
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
  is_default?: boolean;
}

// Request/Response Types
export interface CreateEmployeeRequest {
    factory_id?: number;
    user_id?: number;
    employee_id: string;
    first_name?: string;
    last_name?: string;
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
    employment_type?: 'permanent' | 'contract' | 'intern' | 'consultant';
    join_date?: string;
    probation_period_months?: number;
    notice_period_days?: number;
    work_location?: string;
    shift_type?: 'day' | 'night' | 'rotating';
    bank_account_number?: string;
    bank_name?: string;
    skill_level?: 'beginner' | 'intermediate' | 'expert' | 'master';
    availability_status?: 'available' | 'busy' | 'off_duty' | 'on_leave';
    hourly_rate?: number;
}

export interface UpdateEmployeeRequest {
    first_name?: string;
    last_name?: string;
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
    passport_number?: string;
    tax_id?: string;
    designation_id?: number;
    reporting_manager_id?: number;
    department_id?: number;
    employment_type?: 'permanent' | 'contract' | 'intern' | 'consultant';
    confirmation_date?: string;
    termination_date?: string;
    probation_period_months?: number;
    notice_period_days?: number;
    work_location?: string;
    shift_type?: 'day' | 'night' | 'rotating';
    bank_account_number?: string;
    bank_name?: string;
    skill_level?: 'beginner' | 'intermediate' | 'expert' | 'master';
    availability_status?: 'available' | 'busy' | 'off_duty' | 'on_leave';
    hourly_rate?: number;
    is_active?: boolean;
}

export interface EmployeeQueryParams {
    factory_id?: number;
    department_id?: number;
    designation_id?: number;
    employment_type?: string;
    is_active?: boolean;
    search?: string;
    page?: number;
    limit?: number;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
}

export interface PayrollCalculationRequest {
    payroll_period_id: number;
    employee_ids?: number[];
    include_overtime?: boolean;
    include_loans?: boolean;
    dry_run?: boolean;
}

export interface LeaveApplicationRequest {
    leave_type_id: number;
    start_date: string;
    end_date: string;
    total_days: number;
    reason?: string;
    emergency_contact?: string;
    work_handover_notes?: string;
}

// Dashboard and Reporting Types
export interface HRDashboardStats {
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

// Export types for use in other modules
export * from './rbac';
