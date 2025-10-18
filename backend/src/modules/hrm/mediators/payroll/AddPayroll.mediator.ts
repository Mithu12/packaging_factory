import { PayrollPeriod, CreatePayrollPeriodRequest, PayrollComponent, CreatePayrollComponentRequest } from '../../../../types/hrm';
import pool from '../../../../database/connection';
import { MyLogger } from '@/utils/new-logger';

export class AddPayrollMediator {
  /**
   * Create a new payroll period
   */
  static async createPayrollPeriod(periodData: CreatePayrollPeriodRequest, createdBy?: number): Promise<PayrollPeriod> {
    const action = "AddPayrollMediator.createPayrollPeriod";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { periodData, createdBy });

      const insertQuery = `
        INSERT INTO payroll_periods (
          name, start_date, end_date, status, description, created_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;

      const values = [
        periodData.name,
        periodData.start_date,
        periodData.end_date,
        'open', // status defaults to open
        periodData.description,
        createdBy,
        new Date()
      ];

      const result = await client.query(insertQuery, values);
      const payrollPeriod = result.rows[0];

      MyLogger.success(action, {
        payrollPeriodId: payrollPeriod.id,
        name: payrollPeriod.name,
        createdBy
      });

      return payrollPeriod;
    } catch (error) {
      MyLogger.error(action, error, { periodData, createdBy });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create a new payroll component (earning or deduction)
   */
  static async createPayrollComponent(componentData: CreatePayrollComponentRequest, createdBy?: number): Promise<PayrollComponent> {
    const action = "AddPayrollMediator.createPayrollComponent";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { componentData, createdBy });

      const insertQuery = `
        INSERT INTO payroll_components (
          name, code, component_type, calculation_method, formula,
          is_taxable, is_mandatory, description, created_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;

      const values = [
        componentData.name,
        componentData.code,
        componentData.component_type,
        componentData.calculation_method || 'fixed',
        componentData.formula || '0',
        componentData.is_taxable !== false,
        componentData.is_mandatory !== false,
        componentData.description,
        createdBy,
        new Date()
      ];

      const result = await client.query(insertQuery, values);
      const payrollComponent = result.rows[0];

      MyLogger.success(action, {
        payrollComponentId: payrollComponent.id,
        name: payrollComponent.name,
        type: payrollComponent.component_type,
        createdBy
      });

      return payrollComponent;
    } catch (error) {
      MyLogger.error(action, error, { componentData, createdBy });
      throw error;
    } finally {
      client.release();
    }
  }
}
