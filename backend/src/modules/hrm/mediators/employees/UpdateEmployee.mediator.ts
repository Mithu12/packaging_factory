import { Employee, UpdateEmployeeRequest } from '../../../../types/hrm';
import pool from '../../../../database/connection';
import { AuditService } from '../../../../services/audit-service';
import { eventBus } from '../../../../utils/eventBus';
import { MyLogger } from '@/utils/new-logger';

export class UpdateEmployeeMediator {

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
        const auditService = new AuditService();
        await auditService.logActivity({
          userId: updatedBy,
          action: 'UPDATE_EMPLOYEE',
          resourceType: 'employee',
          resourceId: employee.id,
          endpoint: '/api/hrm/employees',
          method: 'PUT',
          responseStatus: 200,
          success: true,
          durationMs: 0,
          oldValues: currentEmployee,
          newValues: updateData
        });
      }

      // Emit event
      eventBus.emit('employee.updated', { employee, updatedBy });

      MyLogger.success(action, {
        employeeId: employee.id,
        employeeCode: employee.employee_id,
        updatedBy
      });

      return employee;
    } catch (error) {
      MyLogger.error(action, error, { employeeId, updateData, updatedBy });
      throw new Error(`Failed to update employee: ${error instanceof Error ? error.message : String(error)}`);
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
        const auditService = new AuditService();
        await auditService.logActivity({
          userId: deletedBy,
          action: 'DELETE_EMPLOYEE',
          resourceType: 'employee',
          resourceId: employeeId,
          endpoint: '/api/hrm/employees',
          method: 'DELETE',
          responseStatus: 200,
          success: true,
          durationMs: 0,
          oldValues: employee,
          newValues: { is_active: false, termination_date: new Date() }
        });
      }

      // Emit event
      eventBus.emit('employee.deleted', { employee, deletedBy });

      MyLogger.success(action, {
        employeeId,
        employeeCode: employee.employee_id,
        deletedBy
      });

    } catch (error) {
      MyLogger.error(action, error, { employeeId, deletedBy });
      throw new Error(`Failed to delete employee: ${error instanceof Error ? error.message : String(error)}`);
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

  /**
   * Upload employee document
   */
  static async uploadEmployeeDocument(employeeId: number, file: any, documentType: string, uploadedBy?: number): Promise<any> {
    const action = "UpdateEmployeeMediator.uploadEmployeeDocument";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { employeeId, documentType, fileName: file?.filename, uploadedBy });

      // Get current employee
      const employee = await this.getEmployeeById(employeeId);

      // Insert document record
      const insertQuery = `
        INSERT INTO employee_documents (
          employee_id, document_type, file_name, file_path, file_size, mime_type, uploaded_by, uploaded_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const documentResult = await client.query(insertQuery, [
        employeeId,
        documentType,
        file.filename,
        file.path,
        file.size,
        file.mimetype,
        uploadedBy,
        new Date()
      ]);

      // Create audit log
      if (uploadedBy) {
        const auditService = new AuditService();
        await auditService.logActivity({
          userId: uploadedBy,
          action: 'UPLOAD_EMPLOYEE_DOCUMENT',
          resourceType: 'employee_document',
          resourceId: documentResult.rows[0].id,
          endpoint: '/api/hrm/employees/documents',
          method: 'POST',
          responseStatus: 201,
          success: true,
          durationMs: 0,
          oldValues: null,
          newValues: {
            employee_id: employeeId,
            document_type: documentType,
            file_name: file.filename
          }
        });
      }

      // Emit event
      eventBus.emit('employee.document.uploaded', {
        employee,
        document: documentResult.rows[0],
        uploadedBy
      });

      MyLogger.success(action, {
        employeeId,
        employeeCode: employee.employee_id,
        documentType,
        fileName: file.filename,
        uploadedBy
      });

      return documentResult.rows[0];

    } catch (error) {
      MyLogger.error(action, error, { employeeId, documentType, uploadedBy });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update employee salary
   */
  static async updateEmployeeSalary(employeeId: number, newSalary: number, effectiveDate: string, reason: string, updatedBy?: number): Promise<any> {
    const action = "UpdateEmployeeMediator.updateEmployeeSalary";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { employeeId, newSalary, effectiveDate, reason, updatedBy });

      // Get current employee
      const employee = await this.getEmployeeById(employeeId);

      // Insert salary history record
      const insertQuery = `
        INSERT INTO employee_salary_history (
          employee_id, previous_salary, new_salary, effective_date, reason, updated_by, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;

      const historyResult = await client.query(insertQuery, [
        employeeId,
        employee.hourly_rate,
        newSalary,
        effectiveDate,
        reason,
        updatedBy,
        new Date()
      ]);

      // Update employee salary
      const updateQuery = `
        UPDATE employees
        SET hourly_rate = $1, updated_at = $2
        WHERE id = $3
        RETURNING *
      `;

      const updateResult = await client.query(updateQuery, [newSalary, new Date(), employeeId]);
      const updatedEmployee = updateResult.rows[0];

      // Create audit log
      if (updatedBy) {
        const auditService = new AuditService();
        await auditService.logActivity({
          userId: updatedBy,
          action: 'UPDATE_EMPLOYEE_SALARY',
          resourceType: 'employee',
          resourceId: employeeId,
          endpoint: '/api/hrm/employees/salary',
          method: 'PUT',
          responseStatus: 200,
          success: true,
          durationMs: 0,
          oldValues: { hourly_rate: employee.hourly_rate },
          newValues: { hourly_rate: newSalary }
        });
      }

      // Emit event
      eventBus.emit('employee.salary.updated', {
        employee: updatedEmployee,
        salaryHistory: historyResult.rows[0],
        updatedBy
      });

      MyLogger.success(action, {
        employeeId,
        employeeCode: employee.employee_id,
        newSalary,
        updatedBy
      });

      return {
        employee: updatedEmployee,
        salaryHistory: historyResult.rows[0]
      };

    } catch (error) {
      MyLogger.error(action, error, { employeeId, newSalary, effectiveDate, reason, updatedBy });
      throw error;
    } finally {
      client.release();
    }
  }
}
