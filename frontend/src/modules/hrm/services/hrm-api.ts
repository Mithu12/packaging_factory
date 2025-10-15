// HRM API Service
import { api } from '../../../../services/api';
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
  CreateLeaveApplicationForm,
  CreateAttendanceRecordForm,
  EmployeeListResponse,
  HRDashboardData,
  PayrollSummary,
  AttendanceSummary
} from '../types';

export class HRMApiService {
  // Employee Management
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
    return api.get('/hrm/employees', { params });
  }

  static async getEmployeeById(id: number): Promise<{ employee: Employee }> {
    return api.get(`/hrm/employees/${id}`);
  }

  static async createEmployee(data: CreateEmployeeForm): Promise<{ employee: Employee }> {
    return api.post('/hrm/employees', data);
  }

  static async updateEmployee(id: number, data: Partial<CreateEmployeeForm>): Promise<{ employee: Employee }> {
    return api.put(`/hrm/employees/${id}`, data);
  }

  static async deleteEmployee(id: number): Promise<void> {
    return api.delete(`/hrm/employees/${id}`);
  }

  static async getEmployeeDashboard(factoryId?: number): Promise<{ stats: HRDashboardData }> {
    return api.get('/hrm/employees/dashboard', { params: { factory_id: factoryId } });
  }

  static async searchEmployees(query: string, limit: number = 10): Promise<{ employees: Employee[] }> {
    return api.get('/hrm/employees/search', { params: { q: query, limit } });
  }

  static async bulkImportEmployees(employees: CreateEmployeeForm[]): Promise<{ successful: number; failed: number; errors: string[] }> {
    return api.post('/hrm/employees/bulk-import', { employees });
  }

  static async exportEmployees(params?: Record<string, any>): Promise<Blob> {
    return api.get('/hrm/employees/export', { params, responseType: 'blob' });
  }

  static async getEmployeeDocuments(employeeId: number): Promise<{ documents: any[] }> {
    return api.get(`/hrm/employees/${employeeId}/documents`);
  }

  static async uploadEmployeeDocument(employeeId: number, file: File, documentType: string): Promise<{ document: any }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);

    return api.post(`/hrm/employees/${employeeId}/documents`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  static async getEmployeeSalaryHistory(employeeId: number): Promise<{ history: any[] }> {
    return api.get(`/hrm/employees/${employeeId}/salary-history`);
  }

  static async updateEmployeeSalary(
    employeeId: number,
    newSalary: number,
    effectiveDate: string,
    reason: string
  ): Promise<{ result: any }> {
    return api.put(`/hrm/employees/${employeeId}/salary`, {
      new_salary: newSalary,
      effective_date: effectiveDate,
      reason
    });
  }

  // Payroll Management
  static async getPayrollPeriods(filters?: {
    status?: string;
    period_type?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<{ periods: PayrollPeriod[] }> {
    return api.get('/hrm/payroll/periods', { params: filters });
  }

  static async createPayrollPeriod(data: {
    name: string;
    start_date: string;
    end_date: string;
    period_type: string;
    description?: string;
  }): Promise<{ period: PayrollPeriod }> {
    return api.post('/hrm/payroll/periods', data);
  }

  static async getPayrollComponents(type?: 'earning' | 'deduction'): Promise<{ components: PayrollComponent[] }> {
    return api.get('/hrm/payroll/components', { params: { type } });
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
    return api.post('/hrm/payroll/components', data);
  }

  static async calculatePayroll(data: {
    payroll_period_id: number;
    employee_ids?: number[];
    include_overtime?: boolean;
    include_loans?: boolean;
    dry_run?: boolean;
  }): Promise<{ payroll_run: PayrollRun }> {
    return api.post('/hrm/payroll/calculate', data);
  }

  static async getPayrollRuns(params?: {
    payroll_period_id?: number;
    status?: string;
    processed_by?: number;
  }): Promise<{ runs: PayrollRun[] }> {
    return api.get('/hrm/payroll/runs', { params });
  }

  static async getPayrollRunById(id: number): Promise<{ run: PayrollRun }> {
    return api.get(`/hrm/payroll/runs/${id}`);
  }

  static async approvePayrollRun(id: number): Promise<{ payroll_run: PayrollRun }> {
    return api.post(`/hrm/payroll/runs/${id}/approve`);
  }

  static async getPayrollSummary(periodId: number): Promise<{ summary: PayrollSummary }> {
    return api.get(`/hrm/payroll/summary/${periodId}`);
  }

  static async setupEmployeeSalaryStructure(
    employeeId: number,
    components: { component_id: number; amount: number; percentage?: number }[]
  ): Promise<{ structures: any[] }> {
    return api.post(`/hrm/payroll/employees/${employeeId}/structure`, { components });
  }

  static async getPayrollDashboard(): Promise<{ dashboard: any }> {
    return api.get('/hrm/payroll/dashboard');
  }

  static async exportPayroll(runId: number, format: string = 'excel'): Promise<Blob> {
    return api.get(`/hrm/payroll/export/${runId}`, {
      params: { format },
      responseType: 'blob'
    });
  }

  // Leave Management
  static async getLeaveTypes(): Promise<{ leave_types: LeaveType[] }> {
    return api.get('/hrm/leave/types');
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
    return api.post('/hrm/leave/types', data);
  }

  static async getLeaveApplications(params?: {
    employee_id?: number;
    status?: string;
    leave_type_id?: number;
    start_date?: string;
    end_date?: string;
  }): Promise<{ leave_applications: LeaveApplication[] }> {
    return api.get('/hrm/leave/applications', { params });
  }

  static async createLeaveApplication(data: CreateLeaveApplicationForm): Promise<{ leave_application: LeaveApplication }> {
    return api.post('/hrm/leave/applications', data);
  }

  static async processLeaveApplication(
    applicationId: number,
    action: 'approve' | 'reject',
    rejectedReason?: string
  ): Promise<{ leave_application: LeaveApplication }> {
    return api.post(`/hrm/leave/applications/${applicationId}/process`, {
      action,
      rejected_reason: rejectedReason
    });
  }

  static async getLeaveDashboard(): Promise<{ dashboard: any }> {
    return api.get('/hrm/leave/dashboard');
  }

  static async getLeaveCalendar(year: number, month: number): Promise<{ calendar: any }> {
    return api.get(`/hrm/leave/calendar/${year}/${month}`);
  }

  static async getMyLeaveApplications(): Promise<{ leave_applications: LeaveApplication[] }> {
    return api.get('/hrm/leave/my-applications');
  }

  static async getLeaveApplicationById(id: number): Promise<{ leave_application: LeaveApplication }> {
    return api.get(`/hrm/leave/applications/${id}`);
  }

  static async cancelLeaveApplication(id: number): Promise<void> {
    return api.delete(`/hrm/leave/applications/${id}`);
  }

  static async getLeaveBalances(employeeId: number, year?: number): Promise<{ leave_balances: LeaveBalance[] }> {
    return api.get(`/hrm/employees/${employeeId}/leave-balances`, { params: { year } });
  }

  static async calculateLeaveBalances(employeeId: number, year?: number): Promise<{ leave_balances: LeaveBalance[] }> {
    return api.post(`/hrm/employees/${employeeId}/leave-balances/calculate`, { year });
  }

  static async getLeaveSummary(employeeId: number, year?: number): Promise<{ summary: any }> {
    return api.get(`/hrm/leave/employees/${employeeId}/summary`, { params: { year } });
  }

  static async exportLeaveData(year?: number, format: string = 'excel'): Promise<Blob> {
    return api.get('/hrm/leave/export', {
      params: { year, format },
      responseType: 'blob'
    });
  }

  // Attendance Management
  static async getWorkSchedules(includeInactive?: boolean): Promise<{ work_schedules: WorkSchedule[] }> {
    return api.get('/hrm/attendance/schedules', { params: { include_inactive: includeInactive } });
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
    return api.post('/hrm/attendance/schedules', data);
  }

  static async getAttendanceRecords(params?: {
    employee_id?: number;
    attendance_date?: string;
    start_date?: string;
    end_date?: string;
    status?: string;
  }): Promise<{ attendance_records: AttendanceRecord[] }> {
    return api.get('/hrm/attendance/records', { params });
  }

  static async createAttendanceRecord(employeeId: number, data: CreateAttendanceRecordForm): Promise<{ attendance_record: AttendanceRecord }> {
    return api.post(`/hrm/attendance/records`, data); // Note: This might need employeeId in the request body or params
  }

  static async updateAttendanceRecord(id: number, data: Partial<CreateAttendanceRecordForm>): Promise<{ attendance_record: AttendanceRecord }> {
    return api.put(`/hrm/attendance/records/${id}`, data);
  }

  static async markAttendance(
    action: 'check_in' | 'check_out' | 'break_start' | 'break_end',
    location?: string,
    notes?: string
  ): Promise<{ attendance_record: AttendanceRecord }> {
    return api.post('/hrm/attendance/mark', {
      action,
      location,
      notes
    });
  }

  static async getAttendanceSummary(employeeId: number, startDate: string, endDate: string): Promise<{ attendance_summary: AttendanceSummary }> {
    return api.get(`/hrm/attendance/summary/${employeeId}`, {
      params: { start_date: startDate, end_date: endDate }
    });
  }

  static async getAttendanceDashboard(): Promise<{ dashboard: any }> {
    return api.get('/hrm/attendance/dashboard');
  }

  static async getAttendanceReport(startDate: string, endDate: string): Promise<{ attendance_report: any }> {
    return api.get('/hrm/attendance/report', {
      params: { start_date: startDate, end_date: endDate }
    });
  }

  static async getMyAttendanceRecords(params?: {
    start_date?: string;
    end_date?: string;
    status?: string;
  }): Promise<{ attendance_records: AttendanceRecord[] }> {
    return api.get('/hrm/attendance/my-records', { params });
  }

  static async getAttendanceRecordById(id: number): Promise<{ attendance_record: AttendanceRecord }> {
    return api.get(`/hrm/attendance/records/${id}`);
  }

  static async deleteAttendanceRecord(id: number): Promise<void> {
    return api.delete(`/hrm/attendance/records/${id}`);
  }

  static async exportAttendanceData(startDate: string, endDate: string, format: string = 'excel'): Promise<Blob> {
    return api.get('/hrm/attendance/export', {
      params: { start_date: startDate, end_date: endDate, format },
      responseType: 'blob'
    });
  }

  static async getAttendanceCalendar(year: number, month: number): Promise<{ calendar: any }> {
    return api.get(`/hrm/attendance/calendar/${year}/${month}`);
  }

  // Utility functions
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
}

export default HRMApiService;
