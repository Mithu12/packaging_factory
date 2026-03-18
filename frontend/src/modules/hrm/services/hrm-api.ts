// HRM API Service
import { makeRequest } from '@/services/api-utils';
import {
  Employee,
  Department,
  Designation,
  PayrollPeriod,
  PayrollComponent,
  PayrollRun,
  LeaveType,
  LeaveApplication,
  LeaveBalance,
  AttendanceRecord,
  WorkSchedule,
  CreateEmployeeForm,
  CreateDepartmentForm,
  CreateDesignationForm,
  CreateLeaveApplicationForm,
  CreateAttendanceRecordForm,
  EmployeeListResponse,
  DepartmentListResponse,
  DesignationListResponse,
  DesignationHierarchyNode,
  HRDashboardData,
  PayrollSummary,
  AttendanceSummary
} from '../types';

// Helper function to build query string
function buildQueryString(params?: Record<string, any>): string {
  if (!params) return '';
  
  const queryParams = new URLSearchParams(
    Object.entries(params).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null) {
        acc[key] = String(value);
      }
      return acc;
    }, {} as Record<string, string>)
  );
  
  const queryString = queryParams.toString();
  return queryString ? `?${queryString}` : '';
}

export class HRMApiService {
  private static readonly BASE_URL = '/hrm';

  // ========== Department Management ==========
  
  static async getDepartments(params?: {
    search?: string;
    is_active?: boolean;
    page?: number;
    limit?: number;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
  }): Promise<DepartmentListResponse> {
    const queryString = buildQueryString(params);
    return makeRequest<DepartmentListResponse>(`${this.BASE_URL}/departments${queryString}`);
  }

  static async getDepartmentById(id: number): Promise<{ department: Department }> {
    return makeRequest<{ department: Department }>(`${this.BASE_URL}/departments/${id}`);
  }

  static async createDepartment(data: CreateDepartmentForm): Promise<{ department: Department }> {
    return makeRequest<{ department: Department }>(`${this.BASE_URL}/departments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async updateDepartment(id: number, data: Partial<CreateDepartmentForm>): Promise<{ department: Department }> {
    return makeRequest<{ department: Department }>(`${this.BASE_URL}/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async deleteDepartment(id: number): Promise<void> {
    return makeRequest<void>(`${this.BASE_URL}/departments/${id}`, {
      method: 'DELETE',
    });
  }

  static async toggleDepartmentStatus(id: number): Promise<{ department: Department }> {
    return makeRequest<{ department: Department }>(`${this.BASE_URL}/departments/${id}/toggle-status`, {
      method: 'PATCH',
    });
  }

  static async bulkUpdateDepartments(action: string, departmentIds: number[]): Promise<{ message: string; updated_count: number }> {
    return makeRequest<{ message: string; updated_count: number }>(`${this.BASE_URL}/departments/bulk-update`, {
      method: 'PATCH',
      body: JSON.stringify({ action, department_ids: departmentIds }),
    });
  }

  static async exportDepartments(params?: Record<string, any>): Promise<Blob> {
    const queryString = buildQueryString(params);
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000/api'}${this.BASE_URL}/departments/export${queryString}`, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }
    
    return response.blob();
  }

  // ========== Designation Management ==========
  
  static async getDesignations(params?: {
    search?: string;
    department_id?: number;
    grade_level?: string;
    is_active?: boolean;
    page?: number;
    limit?: number;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
  }): Promise<DesignationListResponse> {
    const queryString = buildQueryString(params);
    return makeRequest<DesignationListResponse>(`${this.BASE_URL}/designations${queryString}`);
  }

  static async getDesignationById(id: number): Promise<{ designation: Designation }> {
    return makeRequest<{ designation: Designation }>(`${this.BASE_URL}/designations/${id}`);
  }

  static async createDesignation(data: CreateDesignationForm): Promise<{ designation: Designation }> {
    return makeRequest<{ designation: Designation }>(`${this.BASE_URL}/designations`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async updateDesignation(id: number, data: Partial<CreateDesignationForm>): Promise<{ designation: Designation }> {
    return makeRequest<{ designation: Designation }>(`${this.BASE_URL}/designations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async deleteDesignation(id: number): Promise<void> {
    return makeRequest<void>(`${this.BASE_URL}/designations/${id}`, {
      method: 'DELETE',
    });
  }

  static async toggleDesignationStatus(id: number): Promise<{ designation: Designation }> {
    return makeRequest<{ designation: Designation }>(`${this.BASE_URL}/designations/${id}/toggle-status`, {
      method: 'PATCH',
    });
  }

  static async bulkUpdateDesignations(action: string, designationIds: number[]): Promise<{ message: string; updated_count: number }> {
    return makeRequest<{ message: string; updated_count: number }>(`${this.BASE_URL}/designations/bulk-update`, {
      method: 'PATCH',
      body: JSON.stringify({ action, designation_ids: designationIds }),
    });
  }

  static async exportDesignations(params?: Record<string, any>): Promise<Blob> {
    const queryString = buildQueryString(params);
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000/api'}${this.BASE_URL}/designations/export${queryString}`, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }
    
    return response.blob();
  }

  static async getDesignationHierarchy(): Promise<{ hierarchy: DesignationHierarchyNode[] }> {
    return makeRequest<{ hierarchy: DesignationHierarchyNode[] }>(`${this.BASE_URL}/designations/hierarchy`);
  }

  // ========== Employee Management ==========
  
  static async getEmployees(params?: {
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
  }): Promise<EmployeeListResponse> {
    const queryString = buildQueryString(params);
    return makeRequest<EmployeeListResponse>(`${this.BASE_URL}/employees${queryString}`);
  }

  static async getEmployeeById(id: number): Promise<{ employee: Employee }> {
    return makeRequest<{ employee: Employee }>(`${this.BASE_URL}/employees/${id}`);
  }

  static async createEmployee(data: CreateEmployeeForm): Promise<{ employee: Employee }> {
    return makeRequest<{ employee: Employee }>(`${this.BASE_URL}/employees`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async updateEmployee(id: number, data: Partial<CreateEmployeeForm>): Promise<{ employee: Employee }> {
    return makeRequest<{ employee: Employee }>(`${this.BASE_URL}/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async deleteEmployee(id: number): Promise<void> {
    return makeRequest<void>(`${this.BASE_URL}/employees/${id}`, {
      method: 'DELETE',
    });
  }

  static async getEmployeeDashboard(factoryId?: number): Promise<{ stats: HRDashboardData }> {
    const queryString = buildQueryString({ factory_id: factoryId });
    return makeRequest<{ stats: HRDashboardData }>(`${this.BASE_URL}/employees/dashboard${queryString}`);
  }

  static async searchEmployees(query: string, limit: number = 10): Promise<{ employees: Employee[] }> {
    const queryString = buildQueryString({ q: query, limit });
    return makeRequest<{ employees: Employee[] }>(`${this.BASE_URL}/employees/search${queryString}`);
  }

  static async bulkImportEmployees(employees: CreateEmployeeForm[]): Promise<{ successful: number; failed: number; errors: string[] }> {
    return makeRequest<{ successful: number; failed: number; errors: string[] }>(`${this.BASE_URL}/employees/bulk-import`, {
      method: 'POST',
      body: JSON.stringify({ employees }),
    });
  }

  static async exportEmployees(params?: Record<string, any>): Promise<Blob> {
    const queryString = buildQueryString(params);
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000/api'}${this.BASE_URL}/employees/export${queryString}`, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }
    
    return response.blob();
  }

  static async getEmployeeDocuments(employeeId: number): Promise<{ documents: any[] }> {
    return makeRequest<{ documents: any[] }>(`${this.BASE_URL}/employees/${employeeId}/documents`);
  }

  static async uploadEmployeeDocument(employeeId: number, file: File, documentType: string): Promise<{ document: any }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);

    return makeRequest<{ document: any }>(`${this.BASE_URL}/employees/${employeeId}/documents`, {
      method: 'POST',
      body: formData,
    });
  }

  static async getEmployeeSalaryHistory(employeeId: number): Promise<{ history: any[] }> {
    return makeRequest<{ history: any[] }>(`${this.BASE_URL}/employees/${employeeId}/salary-history`);
  }

  static async updateEmployeeSalary(
    employeeId: number,
    newSalary: number,
    effectiveDate: string,
    reason: string
  ): Promise<{ result: any }> {
    return makeRequest<{ result: any }>(`${this.BASE_URL}/employees/${employeeId}/salary`, {
      method: 'PUT',
      body: JSON.stringify({
        new_salary: newSalary,
        effective_date: effectiveDate,
        reason
      }),
    });
  }

  static async getGlobalSalaryHistory(params?: { limit?: number; offset?: number; }): Promise<{ history: any[], total: number }> {
    const queryString = buildQueryString(params);
    return makeRequest<{ history: any[], total: number }>(`${this.BASE_URL}/employees/salary-history/all${queryString}`);
  }

  // ========== Payroll Management ==========
  
  static async getPayrollPeriods(filters?: {
    status?: string;
    period_type?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<{ periods: PayrollPeriod[] }> {
    const queryString = buildQueryString(filters);
    return makeRequest<{ periods: PayrollPeriod[] }>(`${this.BASE_URL}/payroll/periods${queryString}`);
  }

  static async createPayrollPeriod(data: {
    name: string;
    start_date: string;
    end_date: string;
    period_type: string;
    description?: string;
  }): Promise<{ period: PayrollPeriod }> {
    return makeRequest<{ period: PayrollPeriod }>(`${this.BASE_URL}/payroll/periods`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async getPayrollComponents(type?: 'earning' | 'deduction'): Promise<{ components: PayrollComponent[] }> {
    const queryString = buildQueryString({ type });
    return makeRequest<{ components: PayrollComponent[] }>(`${this.BASE_URL}/payroll/components${queryString}`);
  }

  static async createPayrollComponent(data: {
    name: string;
    code: string;
    component_type: 'earning' | 'deduction';
    category?: string;
    is_taxable?: boolean;
    is_mandatory?: boolean;
    calculation_method?: string;
    formula?: string;
    description?: string;
  }): Promise<{ component: PayrollComponent }> {
    return makeRequest<{ component: PayrollComponent }>(`${this.BASE_URL}/payroll/components`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async calculatePayroll(data: {
    payroll_period_id: number;
    employee_ids?: number[];
    include_overtime?: boolean;
    include_loans?: boolean;
    dry_run?: boolean;
  }): Promise<{ payroll_run: PayrollRun }> {
    return makeRequest<{ payroll_run: PayrollRun }>(`${this.BASE_URL}/payroll/calculate`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async getPayrollRuns(params?: {
    payroll_period_id?: number;
    status?: string;
    processed_by?: number;
  }): Promise<{ runs: PayrollRun[] }> {
    const queryString = buildQueryString(params);
    return makeRequest<{ runs: PayrollRun[] }>(`${this.BASE_URL}/payroll/runs${queryString}`);
  }

  static async getPayrollRunById(id: number): Promise<{ run: PayrollRun }> {
    return makeRequest<{ run: PayrollRun }>(`${this.BASE_URL}/payroll/runs/${id}`);
  }

  static async approvePayrollRun(id: number): Promise<{ payroll_run: PayrollRun }> {
    return makeRequest<{ payroll_run: PayrollRun }>(`${this.BASE_URL}/payroll/runs/${id}/approve`, {
      method: 'POST',
    });
  }

  static async getPayrollSummary(periodId: number): Promise<{ summary: PayrollSummary }> {
    return makeRequest<{ summary: PayrollSummary }>(`${this.BASE_URL}/payroll/summary/${periodId}`);
  }

  static async setupEmployeeSalaryStructure(
    employeeId: number,
    components: { component_id: number; amount: number; percentage?: number }[]
  ): Promise<{ structures: any[] }> {
    return makeRequest<{ structures: any[] }>(`${this.BASE_URL}/payroll/employees/${employeeId}/structure`, {
      method: 'POST',
      body: JSON.stringify({ components }),
    });
  }

  static async getPayrollDashboard(): Promise<{ dashboard: any }> {
    return makeRequest<{ dashboard: any }>(`${this.BASE_URL}/payroll/dashboard`);
  }

  static async exportPayroll(periodId: number, format: string = 'excel'): Promise<Blob> {
    const queryString = buildQueryString({ format });
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000/api'}${this.BASE_URL}/payroll/export/period/${periodId}${queryString}`, {
      credentials: 'include',
    });

    if (!response.ok) {
      const errText = await response.text();
      let errMsg = `Export failed: ${response.statusText}`;
      try {
        const errJson = JSON.parse(errText);
        if (errJson.error) errMsg = errJson.error;
      } catch {
        // use default
      }
      throw new Error(errMsg);
    }

    return response.blob();
  }

  // ========== Leave Management ==========
  
  static async getLeaveTypes(): Promise<{ leave_types: LeaveType[] }> {
    return makeRequest<{ leave_types: LeaveType[] }>(`${this.BASE_URL}/leave/types`);
  }

  static async createLeaveType(data: {
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
  }): Promise<{ leave_type: LeaveType }> {
    return makeRequest<{ leave_type: LeaveType }>(`${this.BASE_URL}/leave/types`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async getLeaveApplications(params?: {
    employee_id?: number;
    status?: string;
    leave_type_id?: number;
    start_date?: string;
    end_date?: string;
  }): Promise<{ leave_applications: LeaveApplication[] }> {
    const queryString = buildQueryString(params);
    return makeRequest<{ leave_applications: LeaveApplication[] }>(`${this.BASE_URL}/leave/applications${queryString}`);
  }

  static async createLeaveApplication(data: CreateLeaveApplicationForm): Promise<{ leave_application: LeaveApplication }> {
    return makeRequest<{ leave_application: LeaveApplication }>(`${this.BASE_URL}/leave/applications`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async processLeaveApplication(
    applicationId: number,
    action: 'approve' | 'reject',
    rejectedReason?: string
  ): Promise<{ leave_application: LeaveApplication }> {
    return makeRequest<{ leave_application: LeaveApplication }>(`${this.BASE_URL}/leave/applications/${applicationId}/process`, {
      method: 'POST',
      body: JSON.stringify({
        action,
        rejected_reason: rejectedReason
      }),
    });
  }

  static async getLeaveDashboard(): Promise<{ dashboard: any }> {
    return makeRequest<{ dashboard: any }>(`${this.BASE_URL}/leave/dashboard`);
  }

  static async getLeaveCalendar(year: number, month: number): Promise<{ calendar: any }> {
    return makeRequest<{ calendar: any }>(`${this.BASE_URL}/leave/calendar/${year}/${month}`);
  }

  static async getMyLeaveApplications(): Promise<{ leave_applications: LeaveApplication[] }> {
    return makeRequest<{ leave_applications: LeaveApplication[] }>(`${this.BASE_URL}/leave/my-applications`);
  }

  static async getLeaveApplicationById(id: number): Promise<{ leave_application: LeaveApplication }> {
    return makeRequest<{ leave_application: LeaveApplication }>(`${this.BASE_URL}/leave/applications/${id}`);
  }

  static async cancelLeaveApplication(id: number): Promise<void> {
    return makeRequest<void>(`${this.BASE_URL}/leave/applications/${id}`, {
      method: 'DELETE',
    });
  }

  static async getLeaveBalances(employeeId: number, year?: number): Promise<{ leave_balances: LeaveBalance[] }> {
    const queryString = buildQueryString({ year });
    return makeRequest<{ leave_balances: LeaveBalance[] }>(`${this.BASE_URL}/employees/${employeeId}/leave-balances${queryString}`);
  }

  static async calculateLeaveBalances(employeeId: number, year?: number): Promise<{ leave_balances: LeaveBalance[] }> {
    return makeRequest<{ leave_balances: LeaveBalance[] }>(`${this.BASE_URL}/employees/${employeeId}/leave-balances/calculate`, {
      method: 'POST',
      body: JSON.stringify({ year }),
    });
  }

  static async getLeaveSummary(employeeId: number, year?: number): Promise<{ summary: any }> {
    const queryString = buildQueryString({ year });
    return makeRequest<{ summary: any }>(`${this.BASE_URL}/leave/employees/${employeeId}/summary${queryString}`);
  }

  static async exportLeaveData(year?: number, format: string = 'excel'): Promise<Blob> {
    const queryString = buildQueryString({ year, format });
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000/api'}${this.BASE_URL}/leave/export${queryString}`, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }
    
    return response.blob();
  }

  // ========== Attendance Management ==========
  
  static async getWorkSchedules(includeInactive?: boolean): Promise<{ work_schedules: WorkSchedule[] }> {
    const queryString = buildQueryString({ include_inactive: includeInactive });
    return makeRequest<{ work_schedules: WorkSchedule[] }>(`${this.BASE_URL}/attendance/schedules${queryString}`);
  }

  static async createWorkSchedule(data: {
    name: string;
    description?: string;
    schedule_type?: string;
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
  }): Promise<{ work_schedule: WorkSchedule }> {
    return makeRequest<{ work_schedule: WorkSchedule }>(`${this.BASE_URL}/attendance/schedules`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async getAttendanceRecords(params?: {
    employee_id?: number;
    attendance_date?: string;
    start_date?: string;
    end_date?: string;
    status?: string;
  }): Promise<{ attendance_records: AttendanceRecord[] }> {
    const queryString = buildQueryString(params);
    return makeRequest<{ attendance_records: AttendanceRecord[] }>(`${this.BASE_URL}/attendance/records${queryString}`);
  }

  static async createAttendanceRecord(employeeId: number, data: CreateAttendanceRecordForm): Promise<{ attendance_record: AttendanceRecord }> {
    return makeRequest<{ attendance_record: AttendanceRecord }>(`${this.BASE_URL}/attendance/records`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async updateAttendanceRecord(id: number, data: Partial<CreateAttendanceRecordForm>): Promise<{ attendance_record: AttendanceRecord }> {
    return makeRequest<{ attendance_record: AttendanceRecord }>(`${this.BASE_URL}/attendance/records/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async markAttendance(
    action: 'check_in' | 'check_out' | 'break_start' | 'break_end',
    employeeId?: number,
    location?: string,
    notes?: string,
    recordDate?: string,
    checkInTime?: string,
    checkOutTime?: string
  ): Promise<{ attendance_record: AttendanceRecord }> {
    const url = employeeId
      ? `${this.BASE_URL}/attendance/${employeeId}/mark`
      : `${this.BASE_URL}/attendance/mark`;

    const body: Record<string, unknown> = { action, location, notes };
    if (recordDate) body.record_date = recordDate;
    if (checkInTime) body.check_in_time = checkInTime;
    if (checkOutTime) body.check_out_time = checkOutTime;

    return makeRequest<{ attendance_record: AttendanceRecord }>(url, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  static async getAttendanceSummary(employeeId: number, startDate: string, endDate: string): Promise<{ attendance_summary: AttendanceSummary }> {
    const queryString = buildQueryString({ start_date: startDate, end_date: endDate });
    return makeRequest<{ attendance_summary: AttendanceSummary }>(`${this.BASE_URL}/attendance/summary/${employeeId}${queryString}`);
  }

   static async getAttendanceDashboard(): Promise<{ dashboard: AttendanceSummary }> {
    return makeRequest<{ dashboard: AttendanceSummary }>(`${this.BASE_URL}/attendance/dashboard`);
  }

  static async getAttendanceReport(startDate: string, endDate: string): Promise<{ attendance_report: any }> {
    const queryString = buildQueryString({ start_date: startDate, end_date: endDate });
    return makeRequest<{ attendance_report: any }>(`${this.BASE_URL}/attendance/report${queryString}`);
  }

  static async getMyAttendanceRecords(params?: {
    start_date?: string;
    end_date?: string;
    status?: string;
  }): Promise<{ attendance_records: AttendanceRecord[] }> {
    const queryString = buildQueryString(params);
    return makeRequest<{ attendance_records: AttendanceRecord[] }>(`${this.BASE_URL}/attendance/my-records${queryString}`);
  }

  static async getAttendanceRecordById(id: number): Promise<{ attendance_record: AttendanceRecord }> {
    return makeRequest<{ attendance_record: AttendanceRecord }>(`${this.BASE_URL}/attendance/records/${id}`);
  }

  static async deleteAttendanceRecord(id: number): Promise<void> {
    return makeRequest<void>(`${this.BASE_URL}/attendance/records/${id}`, {
      method: 'DELETE',
    });
  }

  static async exportAttendanceData(startDate: string, endDate: string, format: string = 'excel'): Promise<Blob> {
    const queryString = buildQueryString({ start_date: startDate, end_date: endDate, format });
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000/api'}${this.BASE_URL}/attendance/export${queryString}`, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }
    
    return response.blob();
  }

  static async getAttendanceCalendar(year: number, month: number): Promise<{ calendar: any }> {
    return makeRequest<{ calendar: any }>(`${this.BASE_URL}/attendance/calendar/${year}/${month}`);
  }

  // ========== Utility Functions ==========
  
  static async downloadFile(url: string, filename: string): Promise<void> {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const urlObj = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = urlObj;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(urlObj);
    } catch (error) {
      throw new Error(`Failed to download file: ${error}`);
    }
  }

  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  static formatDate(date: string | Date): string {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(date));
  }

  static formatDateTime(date: string | Date): string {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  }

  // ========== Role-Based User Management ==========

  static async getUsersByRole(roleId: number): Promise<{ users: any[] }> {
    return makeRequest<{ users: any[] }>(`/rbac/roles/${roleId}/users`);
  }

  static async getEmployeesByUserRole(roleId: number): Promise<{ employees: any[] }> {
    return makeRequest<{ employees: any[] }>(`/rbac/roles/${roleId}/employees`);
  }

  // ========== Shifts Management ==========

  static async getShifts(params?: { include_inactive?: boolean }): Promise<{ shifts: any[] }> {
    const queryString = buildQueryString(params);
    return makeRequest<{ shifts: any[] }>(`${this.BASE_URL}/shifts${queryString}`);
  }

  static async getShiftById(id: number): Promise<{ shift: any }> {
    return makeRequest<{ shift: any }>(`${this.BASE_URL}/shifts/${id}`);
  }

  static async createShift(data: {
    name: string;
    code: string;
    description?: string;
    start_time: string;
    end_time: string;
    break_start_time?: string;
    break_end_time?: string;
    working_hours?: number;
    is_flexible?: boolean;
    grace_period_minutes?: number;
    late_threshold_minutes?: number;
    early_going_threshold_minutes?: number;
    color_code?: string;
  }): Promise<{ shift: any }> {
    return makeRequest<{ shift: any }>(`${this.BASE_URL}/shifts`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async updateShift(id: number, data: Partial<{
    name: string;
    code: string;
    description: string;
    start_time: string;
    end_time: string;
    break_start_time: string;
    break_end_time: string;
    working_hours: number;
    is_flexible: boolean;
    grace_period_minutes: number;
    late_threshold_minutes: number;
    early_going_threshold_minutes: number;
    color_code: string;
    is_active: boolean;
  }>): Promise<{ shift: any }> {
    return makeRequest<{ shift: any }>(`${this.BASE_URL}/shifts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async deleteShift(id: number): Promise<void> {
    return makeRequest<void>(`${this.BASE_URL}/shifts/${id}`, { method: 'DELETE' });
  }

  static async getShiftAssignments(params?: {
    employee_id?: number;
    shift_id?: number;
  }): Promise<{ assignments: any[] }> {
    const queryString = buildQueryString(params);
    return makeRequest<{ assignments: any[] }>(`${this.BASE_URL}/shifts/assignments/list${queryString}`);
  }

  static async assignShift(data: {
    employee_id: number;
    shift_id: number;
    effective_from: string;
    effective_to?: string;
    is_primary?: boolean;
    notes?: string;
  }): Promise<{ assignment: any }> {
    return makeRequest<{ assignment: any }>(`${this.BASE_URL}/shifts/assignments`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async updateShiftAssignment(id: number, data: Partial<{
    shift_id: number;
    effective_from: string;
    effective_to: string;
    is_primary: boolean;
    notes: string;
  }>): Promise<{ assignment: any }> {
    return makeRequest<{ assignment: any }>(`${this.BASE_URL}/shifts/assignments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async removeShiftAssignment(id: number): Promise<void> {
    return makeRequest<void>(`${this.BASE_URL}/shifts/assignments/${id}`, { method: 'DELETE' });
  }

  // ========== Attendance Regularization ==========

  static async getRegularizationRequests(params?: {
    employee_id?: number;
    status?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<{ regularization_requests: any[] }> {
    const queryString = buildQueryString(params);
    return makeRequest<{ regularization_requests: any[] }>(`${this.BASE_URL}/attendance-regularization${queryString}`);
  }

  static async getRegularizationRequestById(id: number): Promise<{ regularization_request: any }> {
    return makeRequest<{ regularization_request: any }>(`${this.BASE_URL}/attendance-regularization/${id}`);
  }

  static async createRegularizationRequest(data: {
    employee_id: number;
    original_date: string;
    original_check_in_time?: string;
    original_check_out_time?: string;
    requested_check_in_time?: string;
    requested_check_out_time?: string;
    reason: string;
    supporting_document_urls?: string[];
  }): Promise<{ regularization_request: any }> {
    return makeRequest<{ regularization_request: any }>(`${this.BASE_URL}/attendance-regularization`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async updateRegularizationRequest(id: number, data: {
    original_date?: string;
    original_check_in_time?: string;
    original_check_out_time?: string;
    requested_check_in_time?: string;
    requested_check_out_time?: string;
    reason?: string;
    supporting_document_urls?: string[];
  }): Promise<{ regularization_request: any }> {
    return makeRequest<{ regularization_request: any }>(`${this.BASE_URL}/attendance-regularization/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async reviewRegularizationRequest(id: number, data: {
    status: 'approved' | 'rejected';
    review_comments?: string;
    rejection_reason?: string;
  }): Promise<{ regularization_request: any }> {
    return makeRequest<{ regularization_request: any }>(`${this.BASE_URL}/attendance-regularization/${id}/review`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async cancelRegularizationRequest(id: number): Promise<{ regularization_request: any }> {
    return makeRequest<{ regularization_request: any }>(`${this.BASE_URL}/attendance-regularization/${id}/cancel`, {
      method: 'POST',
    });
  }
}

export default HRMApiService;
