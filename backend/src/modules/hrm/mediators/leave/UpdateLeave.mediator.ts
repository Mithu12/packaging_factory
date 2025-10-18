import { LeaveApplication } from '../../../../types/hrm';
import pool from '../../../../database/connection';
import { AuditService } from '../../../../services/audit-service';
import { eventBus } from '../../../../utils/eventBus';
import { MyLogger } from '@/utils/new-logger';

export class UpdateLeaveMediator {

  /**
   * Process leave application (approve/reject)
   */
  static async processLeaveApplication(
    applicationId: number,
    action: 'approve' | 'reject',
    processedBy?: number,
    notes?: string
  ): Promise<LeaveApplication> {
    const actionName = "UpdateLeaveMediator.processLeaveApplication";
    const client = await pool.connect();

    try {
      MyLogger.info(actionName, { applicationId, action, processedBy, notes });

      // Get current application
      const applicationQuery = `
        SELECT
          la.*,
          lt.name as leave_type_name,
          lt.code as leave_type_code,
          e.first_name,
          e.last_name,
          CONCAT(e.first_name, ' ', e.last_name) as employee_name
        FROM leave_applications la
        JOIN leave_types lt ON la.leave_type_id = lt.id
        JOIN employees e ON la.employee_id = e.id
        WHERE la.id = $1
      `;

      const applicationResult = await client.query(applicationQuery, [applicationId]);

      if (applicationResult.rows.length === 0) {
        throw new Error('Leave application not found');
      }

      const application = applicationResult.rows[0];

      // Check if application is in correct status for processing
      if (application.status !== 'submitted') {
        throw new Error(`Cannot ${action} application with status: ${application.status}`);
      }

      // Update application status
      const updateQuery = `
        UPDATE leave_applications
        SET status = $1, ${action === 'approve' ? 'approved_by' : 'rejected_by'} = $2, ${action === 'approve' ? 'approved_at' : 'rejected_at'} = $3, notes = $4, updated_at = $5
        WHERE id = $6
        RETURNING *
      `;

      const updateResult = await client.query(updateQuery, [
        action === 'approve' ? 'approved' : 'rejected',
        processedBy,
        new Date(),
        notes,
        new Date(),
        applicationId
      ]);

      const updatedApplication = updateResult.rows[0];

      // Create audit log
      if (processedBy) {
        const auditService = new AuditService();
        await auditService.logActivity({
          userId: processedBy,
          action: 'UPDATE_LEAVE_APPLICATION',
          resourceType: 'leave_application',
          resourceId: applicationId,
          endpoint: '/api/hrm/leave/applications',
          method: 'PUT',
          responseStatus: 200,
          success: true,
          durationMs: 0,
          oldValues: { status: application.status },
          newValues: { status: updatedApplication.status, notes }
        });
      }

      // Publish event
      eventBus.emit('leave.application.processed', {
        applicationId,
        employeeId: application.employee_id,
        action,
        leaveType: application.leave_type_name,
        leaveDays: application.leave_days,
        processedBy,
        notes
      });

      MyLogger.success(actionName, {
        applicationId,
        employeeId: application.employee_id,
        action,
        leaveDays: application.leave_days,
        processedBy
      });

      return updatedApplication;
    } catch (error) {
      MyLogger.error(actionName, error, { applicationId, action, processedBy });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Bulk process leave applications
   */
  static async bulkProcessLeaveApplications(
    applicationIds: number[],
    action: 'approve' | 'reject',
    processedBy?: number,
    notes?: string
  ): Promise<{
    success: number;
    failed: number;
    errors: Array<{ applicationId: number; error: string }>;
    processedApplications: LeaveApplication[];
  }> {
    const actionName = "UpdateLeaveMediator.bulkProcessLeaveApplications";
    const client = await pool.connect();

    try {
      MyLogger.info(actionName, {
        applicationIdsCount: applicationIds.length,
        action,
        processedBy,
        notes
      });

      const results = {
        success: 0,
        failed: 0,
        errors: [] as Array<{ applicationId: number; error: string }>,
        processedApplications: [] as LeaveApplication[]
      };

      await client.query('BEGIN');

      for (let i = 0; i < applicationIds.length; i++) {
        const applicationId = applicationIds[i];

        try {
          const application = await this.processLeaveApplication(applicationId, action, processedBy, notes);
          results.processedApplications.push(application);
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            applicationId,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }

      await client.query('COMMIT');

      MyLogger.success(actionName, {
        total: applicationIds.length,
        success: results.success,
        failed: results.failed,
        action,
        processedBy
      });

      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      MyLogger.error(actionName, error, { applicationIds, action, processedBy });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Cancel leave application
   */
  static async cancelLeaveApplication(applicationId: number, cancelledBy?: number, reason?: string): Promise<LeaveApplication> {
    const actionName = "UpdateLeaveMediator.cancelLeaveApplication";
    const client = await pool.connect();

    try {
      MyLogger.info(actionName, { applicationId, cancelledBy, reason });

      // Get current application
      const applicationQuery = `
        SELECT
          la.*,
          lt.name as leave_type_name,
          e.first_name,
          e.last_name
        FROM leave_applications la
        JOIN leave_types lt ON la.leave_type_id = lt.id
        JOIN employees e ON la.employee_id = e.id
        WHERE la.id = $1
      `;

      const applicationResult = await client.query(applicationQuery, [applicationId]);

      if (applicationResult.rows.length === 0) {
        throw new Error('Leave application not found');
      }

      const application = applicationResult.rows[0];

      // Check if application can be cancelled
      if (application.status === 'cancelled') {
        throw new Error('Application is already cancelled');
      }

      if (application.status === 'approved') {
        throw new Error('Cannot cancel an approved application');
      }

      // Update application status
      const updateQuery = `
        UPDATE leave_applications
        SET status = $1, cancelled_by = $2, cancelled_at = $3, cancellation_reason = $4, updated_at = $5
        WHERE id = $6
        RETURNING *
      `;

      const updateResult = await client.query(updateQuery, [
        'cancelled',
        cancelledBy,
        new Date(),
        reason,
        new Date(),
        applicationId
      ]);

      const updatedApplication = updateResult.rows[0];

      // Create audit log
      if (cancelledBy) {
        const auditService = new AuditService();
        await auditService.logActivity({
          userId: cancelledBy,
          action: 'CANCEL_LEAVE_APPLICATION',
          resourceType: 'leave_application',
          resourceId: applicationId,
          endpoint: '/api/hrm/leave/applications',
          method: 'PUT',
          responseStatus: 200,
          success: true,
          durationMs: 0,
          oldValues: { status: application.status },
          newValues: { status: 'cancelled', cancellation_reason: reason }
        });
      }

      // Publish event
      eventBus.emit('leave.application.cancelled', {
        applicationId,
        employeeId: application.employee_id,
        leaveType: application.leave_type_name,
        leaveDays: application.leave_days,
        cancelledBy,
        reason
      });

      MyLogger.success(actionName, {
        applicationId,
        employeeId: application.employee_id,
        leaveDays: application.leave_days,
        cancelledBy
      });

      return updatedApplication;
    } catch (error) {
      MyLogger.error(actionName, error, { applicationId, cancelledBy, reason });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update leave application details
   */
  static async updateLeaveApplication(
    applicationId: number,
    updateData: {
      start_date?: string;
      end_date?: string;
      application_type?: string;
      reason?: string;
      contact_number?: string;
      emergency_contact?: string;
    },
    updatedBy?: number
  ): Promise<LeaveApplication> {
    const actionName = "UpdateLeaveMediator.updateLeaveApplication";
    const client = await pool.connect();

    try {
      MyLogger.info(actionName, { applicationId, updateData, updatedBy });

      // Get current application
      const applicationQuery = `
        SELECT
          la.*,
          lt.name as leave_type_name,
          e.first_name,
          e.last_name
        FROM leave_applications la
        JOIN leave_types lt ON la.leave_type_id = lt.id
        JOIN employees e ON la.employee_id = e.id
        WHERE la.id = $1
      `;

      const applicationResult = await client.query(applicationQuery, [applicationId]);

      if (applicationResult.rows.length === 0) {
        throw new Error('Leave application not found');
      }

      const application = applicationResult.rows[0];

      // Check if application can be updated
      if (application.status !== 'draft' && application.status !== 'submitted') {
        throw new Error(`Cannot update application with status: ${application.status}`);
      }

      // Recalculate leave days if dates are being updated
      let leaveDays = application.leave_days;
      if (updateData.start_date && updateData.end_date) {
        const startDate = new Date(updateData.start_date);
        const endDate = new Date(updateData.end_date);
        leaveDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      }

      // Build update query dynamically
      const updateFields = Object.keys(updateData);
      const updateValues = Object.values(updateData);

      if (updateFields.length > 0) {
        const setClause = updateFields.map((field, index) => `${field} = $${index + 1}`).join(', ');
        const updateQuery = `
          UPDATE leave_applications
          SET ${setClause}, leave_days = $${updateValues.length + 1}, updated_at = $${updateValues.length + 2}
          WHERE id = $${updateValues.length + 3}
          RETURNING *
        `;

        const queryResult = await client.query(updateQuery, [
          ...updateValues,
          leaveDays,
          new Date(),
          applicationId
        ]);

        const updatedApplication = queryResult.rows[0];

        // Create audit log
        if (updatedBy) {
          const auditService = new AuditService();
        await auditService.logActivity({
          userId: updatedBy,
          action: 'UPDATE_LEAVE_APPLICATION',
          resourceType: 'leave_application',
          resourceId: applicationId,
          endpoint: '/api/hrm/leave/applications',
          method: 'PUT',
          responseStatus: 200,
          success: true,
          durationMs: 0,
          oldValues: application,
          newValues: updateData
        });
        }

        // Publish event
        eventBus.emit('leave.application.updated', {
          applicationId,
          employeeId: application.employee_id,
          updates: updateData,
          updatedBy
        });

        MyLogger.success(actionName, {
          applicationId,
          employeeId: application.employee_id,
          updatedFields: updateFields,
          updatedBy
        });

        return updatedApplication;
      }

      return application;
    } catch (error) {
      MyLogger.error(actionName, error, { applicationId, updateData, updatedBy });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update leave type
   */
  static async updateLeaveType(
    leaveTypeId: number,
    updateData: {
      name?: string;
      code?: string;
      days_per_year?: number;
      max_consecutive_days?: number;
      requires_approval?: boolean;
      is_active?: boolean;
      description?: string;
    },
    updatedBy?: number
  ): Promise<any> {
    const actionName = "UpdateLeaveMediator.updateLeaveType";
    const client = await pool.connect();

    try {
      MyLogger.info(actionName, { leaveTypeId, updateData, updatedBy });

      // Get current leave type
      const leaveTypeQuery = 'SELECT * FROM leave_types WHERE id = $1';
      const leaveTypeResult = await client.query(leaveTypeQuery, [leaveTypeId]);

      if (leaveTypeResult.rows.length === 0) {
        throw new Error('Leave type not found');
      }

      const leaveType = leaveTypeResult.rows[0];

      // Check if code already exists (if being updated)
      if (updateData.code && updateData.code !== leaveType.code) {
        const existingCodeQuery = 'SELECT id FROM leave_types WHERE code = $1 AND id != $2';
        const existingCodeResult = await client.query(existingCodeQuery, [updateData.code, leaveTypeId]);

        if (existingCodeResult.rows.length > 0) {
          throw new Error('Leave type code already exists');
        }
      }

      // Build update query dynamically
      const updateFields = Object.keys(updateData);
      const updateValues = Object.values(updateData);

      if (updateFields.length > 0) {
        const setClause = updateFields.map((field, index) => `${field} = $${index + 1}`).join(', ');
        const updateQuery = `
          UPDATE leave_types
          SET ${setClause}, updated_at = $${updateValues.length + 1}
          WHERE id = $${updateValues.length + 2}
          RETURNING *
        `;

        const queryResult = await client.query(updateQuery, [
          ...updateValues,
          new Date(),
          leaveTypeId
        ]);

        const updatedLeaveType = queryResult.rows[0];

      // Create audit log
      if (updatedBy) {
        const auditService = new AuditService();
        await auditService.logActivity({
          userId: updatedBy,
          action: 'UPDATE_LEAVE_TYPE',
          resourceType: 'leave_type',
          resourceId: leaveTypeId,
          endpoint: '/api/hrm/leave/types',
          method: 'PUT',
          responseStatus: 200,
          success: true,
          durationMs: 0,
          oldValues: leaveType,
          newValues: updateData
        });
      }

      // Publish event
      eventBus.emit('leave.type.updated', {
        leaveTypeId,
        updates: updateData,
        updatedBy
      });

        MyLogger.success(actionName, {
          leaveTypeId,
          code: updatedLeaveType.code,
          updatedFields: updateFields,
          updatedBy
        });

        return updatedLeaveType;
      }

      return leaveType;
    } catch (error) {
      MyLogger.error(actionName, error, { leaveTypeId, updateData, updatedBy });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete leave type (soft delete)
   */
  static async deleteLeaveType(leaveTypeId: number, deletedBy?: number): Promise<void> {
    const actionName = "UpdateLeaveMediator.deleteLeaveType";
    const client = await pool.connect();

    try {
      MyLogger.info(actionName, { leaveTypeId, deletedBy });

      // Get current leave type
      const leaveTypeQuery = 'SELECT * FROM leave_types WHERE id = $1';
      const leaveTypeResult = await client.query(leaveTypeQuery, [leaveTypeId]);

      if (leaveTypeResult.rows.length === 0) {
        throw new Error('Leave type not found');
      }

      const leaveType = leaveTypeResult.rows[0];

      // Check if leave type is being used in applications
      const usageQuery = 'SELECT COUNT(*) as count FROM leave_applications WHERE leave_type_id = $1';
      const usageResult = await client.query(usageQuery, [leaveTypeId]);

      if (parseInt(usageResult.rows[0].count) > 0) {
        throw new Error('Cannot delete leave type that is being used in applications');
      }

      // Soft delete leave type
      await client.query(
        'UPDATE leave_types SET is_active = false, updated_at = $1 WHERE id = $2',
        [new Date(), leaveTypeId]
      );

      // Create audit log
      if (deletedBy) {
        const auditService = new AuditService();
        await auditService.logActivity({
          userId: deletedBy,
          action: 'DELETE_LEAVE_TYPE',
          resourceType: 'leave_type',
          resourceId: leaveTypeId,
          endpoint: '/api/hrm/leave/types',
          method: 'DELETE',
          responseStatus: 200,
          success: true,
          durationMs: 0,
          oldValues: leaveType,
          newValues: { is_active: false }
        });
      }

      // Publish event
      eventBus.emit('leave.type.deleted', {
        leaveTypeId,
        code: leaveType.code,
        deletedBy
      });

      MyLogger.success(actionName, {
        leaveTypeId,
        code: leaveType.code,
        deletedBy
      });

    } catch (error) {
      MyLogger.error(actionName, error, { leaveTypeId, deletedBy });
      throw error;
    } finally {
      client.release();
    }
  }
}
