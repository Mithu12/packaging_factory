import pool from '../../../../database/connection';
import { MyLogger } from '@/utils/new-logger';
import { eventBus } from '../../../../utils/eventBus';

export interface AttendanceRegularizationRequest {
  id: number;
  employee_id: number;
  request_date: string;
  original_date: string;
  original_check_in_time?: string;
  original_check_out_time?: string;
  requested_check_in_time?: string;
  requested_check_out_time?: string;
  reason: string;
  supporting_document_urls?: string[];
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  reviewed_by?: number;
  reviewed_at?: string;
  review_comments?: string;
  rejection_reason?: string;
  manager_id?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateRegularizationRequest {
  employee_id: number;
  original_date: string;
  original_check_in_time?: string;
  original_check_out_time?: string;
  requested_check_in_time?: string;
  requested_check_out_time?: string;
  reason: string;
  supporting_document_urls?: string[];
  manager_id?: number;
}

export interface ReviewRegularizationRequest {
  status: 'approved' | 'rejected';
  review_comments?: string;
  rejection_reason?: string;
}

class AttendanceRegularizationMediator {
  /**
   * Get all regularization requests with optional filters
   */
  static async getRegularizationRequests(filters?: {
    employee_id?: number;
    status?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<AttendanceRegularizationRequest[]> {
    const action = 'AttendanceRegularizationMediator.getRegularizationRequests';
    const client = await pool.connect();
    try {
      MyLogger.info(action, { filters });

      let query = `
        SELECT
          r.*,
          e.first_name,
          e.last_name,
          e.employee_id as employee_code
        FROM attendance_regularization_requests r
        JOIN employees e ON r.employee_id = e.id
      `;

      const conditions: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (filters?.employee_id) {
        conditions.push(`r.employee_id = $${paramIndex++}`);
        values.push(filters.employee_id);
      }
      if (filters?.status && filters.status !== 'all') {
        conditions.push(`r.status = $${paramIndex++}`);
        values.push(filters.status);
      }
      if (filters?.start_date) {
        conditions.push(`r.original_date >= $${paramIndex++}`);
        values.push(filters.start_date);
      }
      if (filters?.end_date) {
        conditions.push(`r.original_date <= $${paramIndex++}`);
        values.push(filters.end_date);
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      query += ' ORDER BY r.request_date DESC, r.created_at DESC';

      const result = await client.query(query, values);
      MyLogger.success(action, { count: result.rows.length });
      return result.rows;
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get a single regularization request by ID
   */
  static async getRegularizationRequestById(id: number): Promise<AttendanceRegularizationRequest> {
    const action = 'AttendanceRegularizationMediator.getRegularizationRequestById';
    const client = await pool.connect();
    try {
      MyLogger.info(action, { id });

      const result = await client.query(
        `SELECT r.*, e.first_name, e.last_name, e.employee_id as employee_code
         FROM attendance_regularization_requests r
         JOIN employees e ON r.employee_id = e.id
         WHERE r.id = $1`,
        [id]
      );

      const request = result.rows[0];
      if (!request) throw new Error('Regularization request not found');

      MyLogger.success(action, { id });
      return request;
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create a new regularization request
   */
  static async createRegularizationRequest(
    data: CreateRegularizationRequest,
    createdBy?: number
  ): Promise<AttendanceRegularizationRequest> {
    const action = 'AttendanceRegularizationMediator.createRegularizationRequest';
    const client = await pool.connect();
    try {
      MyLogger.info(action, { data, createdBy });

      const newRequest = {
        employee_id: data.employee_id,
        request_date: new Date().toISOString().split('T')[0],
        original_date: data.original_date,
        original_check_in_time: data.original_check_in_time || null,
        original_check_out_time: data.original_check_out_time || null,
        requested_check_in_time: data.requested_check_in_time || null,
        requested_check_out_time: data.requested_check_out_time || null,
        reason: data.reason,
        supporting_document_urls: data.supporting_document_urls || null,
        status: 'pending',
        manager_id: data.manager_id || null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const keys = Object.keys(newRequest);
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const result = await client.query(
        `INSERT INTO attendance_regularization_requests (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`,
        Object.values(newRequest)
      );

      const request = result.rows[0];
      eventBus.emit('attendance.regularization.created', { request, createdBy });
      MyLogger.success(action, { requestId: request.id });
      return request;
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update a regularization request (only pending requests can be updated)
   */
  static async updateRegularizationRequest(
    id: number,
    data: Partial<CreateRegularizationRequest>
  ): Promise<AttendanceRegularizationRequest> {
    const action = 'AttendanceRegularizationMediator.updateRegularizationRequest';
    const client = await pool.connect();
    try {
      MyLogger.info(action, { id, data });

      // Verify it's still pending
      const existing = await client.query(
        'SELECT status FROM attendance_regularization_requests WHERE id = $1',
        [id]
      );
      if (!existing.rows[0]) throw new Error('Regularization request not found');
      if (existing.rows[0].status !== 'pending') {
        throw new Error('Only pending requests can be updated');
      }

      const updateData = { ...data, updated_at: new Date() };
      const keys = Object.keys(updateData);
      const values = Object.values(updateData);
      const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');

      const result = await client.query(
        `UPDATE attendance_regularization_requests SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`,
        [...values, id]
      );

      MyLogger.success(action, { id });
      return result.rows[0];
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Review a regularization request (approve or reject)
   */
  static async reviewRegularizationRequest(
    id: number,
    reviewData: ReviewRegularizationRequest,
    reviewedBy?: number
  ): Promise<AttendanceRegularizationRequest> {
    const action = 'AttendanceRegularizationMediator.reviewRegularizationRequest';
    const client = await pool.connect();
    try {
      MyLogger.info(action, { id, reviewData, reviewedBy });

      const existing = await client.query(
        'SELECT status FROM attendance_regularization_requests WHERE id = $1',
        [id]
      );
      if (!existing.rows[0]) throw new Error('Regularization request not found');
      if (existing.rows[0].status !== 'pending') {
        throw new Error('Only pending requests can be reviewed');
      }

      const result = await client.query(
        `UPDATE attendance_regularization_requests
         SET status = $1,
             reviewed_by = $2,
             reviewed_at = NOW(),
             review_comments = $3,
             rejection_reason = $4,
             updated_at = NOW()
         WHERE id = $5
         RETURNING *`,
        [
          reviewData.status,
          reviewedBy || null,
          reviewData.review_comments || null,
          reviewData.status === 'rejected' ? (reviewData.rejection_reason || null) : null,
          id,
        ]
      );

      const request = result.rows[0];
      eventBus.emit(`attendance.regularization.${reviewData.status}`, { request, reviewedBy });
      MyLogger.success(action, { id, status: reviewData.status });
      return request;
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Cancel a regularization request
   */
  static async cancelRegularizationRequest(id: number): Promise<AttendanceRegularizationRequest> {
    const action = 'AttendanceRegularizationMediator.cancelRegularizationRequest';
    const client = await pool.connect();
    try {
      MyLogger.info(action, { id });

      const existing = await client.query(
        'SELECT status FROM attendance_regularization_requests WHERE id = $1',
        [id]
      );
      if (!existing.rows[0]) throw new Error('Regularization request not found');
      if (existing.rows[0].status !== 'pending') {
        throw new Error('Only pending requests can be cancelled');
      }

      const result = await client.query(
        `UPDATE attendance_regularization_requests
         SET status = 'cancelled', updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id]
      );

      MyLogger.success(action, { id });
      return result.rows[0];
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }
}

export default AttendanceRegularizationMediator;
