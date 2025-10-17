import { Employee, UpdateEmployeeRequest } from '../../../../../types/hrm';
import pool from '../../../../../database/connection';
import { AuditService } from '../../../../../services/audit-service';
import { eventBus } from '../../../../../utils/eventBus';
import { MyLogger } from '@/utils/new-logger';

export class UpdateEmployeeMediator {
  private auditService: AuditService;
  private eventBus: any;

  constructor() {
    this.auditService = new AuditService();
    this.eventBus = eventBus;
  }

  /**
   * Update employee information
   */
  static async updateEmployee(employeeId: number, updateData: UpdateEmployeeRequest, updatedBy?: number): Promise<Employee> {
    const action = "UpdateEmployeeMediator.updateEmployee";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { employeeId, updateData, updatedBy });

      // Get current employee data
      const currentEmployee = await this.getEmployeeById(employeeId);

      // Check if CNIC already exists (if being updated)
      if (updateData.cnic && updateData.cnic !== currentEmployee.cnic) {
        const existingCnicQuery = 'SELECT id FROM employees WHERE cnic = $1 AND id != $2';
        const existingCnicResult = await client.query(existingCnicQuery, [updateData.cnic, employeeId]);

        if (existingCnicResult.rows.length > 0) {
          throw new Error('CNIC already exists');
        }
      }

      const updatedEmployeeData = {
        ...updateData,
        updated_at: new Date()
      };

      const updateFields = Object.keys(updatedEmployeeData);
      const updateValues = Object.values(updatedEmployeeData);

      const setClause = updateFields.map((field, index) => `${field} = $${index + 1}`).join(', ');
      const updateQuery = `
        UPDATE employees
        SET ${setClause}
        WHERE id = $${updateValues.length + 1}
        RETURNING *
      `;

      const updateResult = await client.query(updateQuery, [...updateValues, employeeId]);
      const employee = updateResult.rows[0];

      // Create audit log
      if (updatedBy) {
        await this.auditService.createAuditLog({
          table_name: 'employees',
          record_id: employee.id,
          action: 'UPDATE',
          old_values: currentEmployee,
          new_values: updateData,
          user_id: updatedBy,
          timestamp: new Date()
        });
      }

      // Emit event
      this.eventBus.publish('employee.updated', { employee, updatedBy });

      MyLogger.success(action, {
        employeeId: employee.id,
        employeeCode: employee.employee_id,
        updatedBy
      });

      return employee;
    } catch (error) {
      MyLogger.error(action, error, { employeeId, updateData, updatedBy });
      throw new Error(`Failed to update employee: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Delete employee (soft delete)
   */
  static async deleteEmployee(employeeId: number, deletedBy?: number): Promise<void> {
    const action = "UpdateEmployeeMediator.deleteEmployee";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { employeeId, deletedBy });

      const employee = await this.getEmployeeById(employeeId);

      const updateQuery = `
        UPDATE employees
        SET is_active = false, termination_date = $1, updated_at = $2
        WHERE id = $3
      `;

      await client.query(updateQuery, [new Date(), new Date(), employeeId]);

      // Create audit log
      if (deletedBy) {
        await this.auditService.createAuditLog({
          table_name: 'employees',
          record_id: employeeId,
          action: 'DELETE',
          old_values: employee,
          new_values: { is_active: false, termination_date: new Date() },
          user_id: deletedBy,
          timestamp: new Date()
        });
      }

      // Emit event
      this.eventBus.publish('employee.deleted', { employee, deletedBy });

      MyLogger.success(action, {
        employeeId,
        employeeCode: employee.employee_id,
        deletedBy
      });

    } catch (error) {
      MyLogger.error(action, error, { employeeId, deletedBy });
      throw new Error(`Failed to delete employee: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Get employee by ID (helper method)
   */
  private static async getEmployeeById(employeeId: number): Promise<Employee> {
    const query = `
      SELECT
        e.*,
        d.name as department_name,
        d.code as department_code,
        des.title as designation_title,
        des.code as designation_code,
        rm.first_name as reporting_manager_first_name,
        rm.last_name as reporting_manager_last_name,
        CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, '')) as full_name,
        CONCAT(COALESCE(rm.first_name, ''), ' ', COALESCE(rm.last_name, '')) as reporting_manager_name
      FROM employees as e
      LEFT JOIN departments as d ON e.department_id = d.id
      LEFT JOIN designations as des ON e.designation_id = des.id
      LEFT JOIN employees as rm ON e.reporting_manager_id = rm.id
      WHERE e.id = $1 AND e.is_active = true
    `;

    const result = await pool.query(query, [employeeId]);

    if (result.rows.length === 0) {
      throw new Error('Employee not found');
    }

    return result.rows[0];
  }
}
