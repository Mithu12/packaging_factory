import pool from '../../../database/connection';
import { MyLogger } from '@/utils/new-logger';

/**
 * Payroll utility functions for common operations
 */
export class PayrollUtils {
  /**
   * Calculate payroll for an employee
   */
  static async calculateEmployeePayroll(
    employeeId: number,
    periodStart: string,
    periodEnd: string,
    includeBonuses: boolean = true,
    includeDeductions: boolean = true
  ): Promise<{
    baseSalary: number;
    bonuses: number;
    deductions: number;
    overtime: number;
    grossPay: number;
    netPay: number;
    tax: number;
  }> {
    const client = await pool.connect();

    try {
      // Get employee base salary
      const employeeQuery = 'SELECT hourly_rate FROM employees WHERE id = $1';
      const employeeResult = await client.query(employeeQuery, [employeeId]);
      const baseSalary = parseFloat(employeeResult.rows[0]?.hourly_rate || '0');

      // Get attendance records for the period
      const attendanceQuery = `
        SELECT * FROM attendance_records
        WHERE employee_id = $1 AND record_date BETWEEN $2 AND $3
        ORDER BY record_date, record_time
      `;
      const attendanceResult = await client.query(attendanceQuery, [employeeId, periodStart, periodEnd]);

      // Calculate overtime hours
      let overtime = 0;
      const regularHoursPerDay = 8; // Standard 8-hour workday

      for (const record of attendanceResult.rows) {
        if (record.record_type === 'overtime_start' || record.record_type === 'overtime_end') {
          // Calculate overtime hours based on attendance records
          overtime += 1; // Simplified calculation
        }
      }

      // Get bonuses for the period
      let bonuses = 0;
      if (includeBonuses) {
        const bonusQuery = `
          SELECT COALESCE(SUM(amount), 0) as total_bonuses
          FROM employee_bonuses
          WHERE employee_id = $1 AND effective_date BETWEEN $2 AND $3
        `;
        const bonusResult = await client.query(bonusQuery, [employeeId, periodStart, periodEnd]);
        bonuses = parseFloat(bonusResult.rows[0]?.total_bonuses || '0');
      }

      // Get deductions for the period
      let deductions = 0;
      if (includeDeductions) {
        const deductionQuery = `
          SELECT COALESCE(SUM(amount), 0) as total_deductions
          FROM employee_deductions
          WHERE employee_id = $1 AND effective_date BETWEEN $2 AND $3
        `;
        const deductionResult = await client.query(deductionQuery, [employeeId, periodStart, periodEnd]);
        deductions = parseFloat(deductionResult.rows[0]?.total_deductions || '0');
      }

      // Calculate tax (simplified calculation)
      const grossPay = baseSalary + bonuses + (overtime * baseSalary * 1.5); // Overtime at 1.5x rate
      const tax = grossPay * 0.1; // 10% tax rate (simplified)

      const netPay = grossPay - deductions - tax;

      return {
        baseSalary,
        bonuses,
        deductions,
        overtime,
        grossPay,
        netPay,
        tax
      };
    } catch (error) {
      MyLogger.error('PayrollUtils.calculateEmployeePayroll', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get payroll summary for a period
   */
  static async getPayrollSummary(periodId: number): Promise<{
    totalEmployees: number;
    totalGrossPay: number;
    totalNetPay: number;
    totalTax: number;
    totalDeductions: number;
    totalBonuses: number;
    averageSalary: number;
  }> {
    const client = await pool.connect();

    try {
      // Get all payroll runs for the period
      const payrollRunsQuery = `
        SELECT * FROM payroll_runs
        WHERE period_id = $1 AND status IN ('calculated', 'approved', 'paid')
      `;
      const payrollRunsResult = await client.query(payrollRunsQuery, [periodId]);

      let totalGrossPay = 0;
      let totalNetPay = 0;
      let totalTax = 0;
      let totalDeductions = 0;
      let totalBonuses = 0;

      for (const run of payrollRunsResult.rows) {
        // Parse payroll data from the run
        const payrollData = run.payroll_data || {};

        if (payrollData.grossPay) totalGrossPay += parseFloat(payrollData.grossPay);
        if (payrollData.netPay) totalNetPay += parseFloat(payrollData.netPay);
        if (payrollData.tax) totalTax += parseFloat(payrollData.tax);
        if (payrollData.deductions) totalDeductions += parseFloat(payrollData.deductions);
        if (payrollData.bonuses) totalBonuses += parseFloat(payrollData.bonuses);
      }

      const totalEmployees = payrollRunsResult.rows.length;
      const averageSalary = totalEmployees > 0 ? totalNetPay / totalEmployees : 0;

      return {
        totalEmployees,
        totalGrossPay,
        totalNetPay,
        totalTax,
        totalDeductions,
        totalBonuses,
        averageSalary
      };
    } catch (error) {
      MyLogger.error('PayrollUtils.getPayrollSummary', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Validate payroll period dates
   */
  static validatePayrollPeriodDates(startDate: string, endDate: string): { isValid: boolean; error?: string } {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      return { isValid: false, error: 'End date must be after start date' };
    }

    // Check if period is not too long (max 1 month)
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 31) {
      return { isValid: false, error: 'Payroll period cannot exceed 31 days' };
    }

    return { isValid: true };
  }

  /**
   * Calculate working days between two dates
   */
  static calculateWorkingDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let workingDays = 0;

    const current = new Date(start);

    while (current <= end) {
      const dayOfWeek = current.getDay();
      // Skip weekends (Saturday = 6, Sunday = 0)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }
      current.setDate(current.getDate() + 1);
    }

    return workingDays;
  }

  /**
   * Format currency amount
   */
  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  /**
   * Calculate tax for an employee
   */
  static calculateTax(grossPay: number, taxBrackets?: Array<{ min: number; max: number; rate: number }>): number {
    if (!taxBrackets || taxBrackets.length === 0) {
      // Default tax calculation (simplified)
      return grossPay * 0.1;
    }

    let tax = 0;
    let remainingIncome = grossPay;

    for (const bracket of taxBrackets) {
      if (remainingIncome <= 0) break;

      const taxableInBracket = Math.min(remainingIncome, bracket.max - bracket.min);
      tax += taxableInBracket * bracket.rate;
      remainingIncome -= taxableInBracket;
    }

    return tax;
  }

  /**
   * Generate payroll report data
   */
  static async generatePayrollReportData(periodId: number): Promise<any[]> {
    const client = await pool.connect();

    try {
      const query = `
        SELECT
          e.id as employee_id,
          e.employee_id as employee_code,
          CONCAT(e.first_name, ' ', e.last_name) as employee_name,
          d.name as department_name,
          des.title as designation_title,
          pr.payroll_data,
          pr.status,
          pr.created_at
        FROM payroll_runs pr
        JOIN employees e ON pr.employee_id = e.id
        LEFT JOIN departments d ON e.department_id = d.id
        LEFT JOIN designations des ON e.designation_id = des.id
        WHERE pr.period_id = $1
        ORDER BY e.first_name, e.last_name
      `;

      const result = await client.query(query, [periodId]);
      return result.rows;
    } catch (error) {
      MyLogger.error('PayrollUtils.generatePayrollReportData', error);
      throw error;
    } finally {
      client.release();
    }
  }
}
