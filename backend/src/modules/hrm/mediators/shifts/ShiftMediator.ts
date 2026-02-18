import pool from '../../../../database/connection';
import { MyLogger } from '@/utils/new-logger';
import { eventBus } from '../../../../utils/eventBus';

export interface Shift {
  id: number;
  name: string;
  code: string;
  description?: string;
  start_time: string;
  end_time: string;
  break_start_time?: string;
  break_end_time?: string;
  working_hours: number;
  is_flexible: boolean;
  grace_period_minutes: number;
  late_threshold_minutes: number;
  early_going_threshold_minutes: number;
  color_code: string;
  is_active: boolean;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export interface ShiftAssignment {
  id: number;
  employee_id: number;
  shift_id: number;
  shift?: Shift;
  effective_from: string;
  effective_to?: string;
  is_primary: boolean;
  assigned_by?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateShiftRequest {
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
}

export interface CreateShiftAssignmentRequest {
  employee_id: number;
  shift_id: number;
  effective_from: string;
  effective_to?: string;
  is_primary?: boolean;
  notes?: string;
}

class ShiftMediator {
  /**
   * Get all shifts
   */
  static async getShifts(filters?: { is_active?: boolean }): Promise<Shift[]> {
    const action = 'ShiftMediator.getShifts';
    const client = await pool.connect();
    try {
      MyLogger.info(action, { filters });

      let query = 'SELECT * FROM shifts';
      const values: any[] = [];

      if (filters?.is_active !== undefined) {
        query += ' WHERE is_active = $1';
        values.push(filters.is_active);
      }

      query += ' ORDER BY name';

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
   * Get shift by ID
   */
  static async getShiftById(id: number): Promise<Shift> {
    const action = 'ShiftMediator.getShiftById';
    const client = await pool.connect();
    try {
      MyLogger.info(action, { id });

      const result = await client.query('SELECT * FROM shifts WHERE id = $1', [id]);
      const shift = result.rows[0];

      if (!shift) {
        throw new Error('Shift not found');
      }

      MyLogger.success(action, { id });
      return shift;
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create a new shift
   */
  static async createShift(data: CreateShiftRequest, createdBy?: number): Promise<Shift> {
    const action = 'ShiftMediator.createShift';
    const client = await pool.connect();
    try {
      MyLogger.info(action, { data, createdBy });

      // Check for duplicate code
      const existing = await client.query('SELECT id FROM shifts WHERE code = $1', [data.code]);
      if (existing.rows.length > 0) {
        throw new Error(`Shift with code '${data.code}' already exists`);
      }

      const newShift = {
        name: data.name,
        code: data.code,
        description: data.description || null,
        start_time: data.start_time,
        end_time: data.end_time,
        break_start_time: data.break_start_time || null,
        break_end_time: data.break_end_time || null,
        working_hours: data.working_hours ?? 8,
        is_flexible: data.is_flexible ?? false,
        grace_period_minutes: data.grace_period_minutes ?? 15,
        late_threshold_minutes: data.late_threshold_minutes ?? 30,
        early_going_threshold_minutes: data.early_going_threshold_minutes ?? 30,
        color_code: data.color_code ?? '#3B82F6',
        is_active: true,
        created_by: createdBy || null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const keys = Object.keys(newShift);
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const insertQuery = `INSERT INTO shifts (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`;

      const result = await client.query(insertQuery, Object.values(newShift));
      const shift = result.rows[0];

      eventBus.emit('shift.created', { shift, createdBy });
      MyLogger.success(action, { shiftId: shift.id, name: shift.name });
      return shift;
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update a shift
   */
  static async updateShift(
    id: number,
    data: Partial<CreateShiftRequest> & { is_active?: boolean },
    updatedBy?: number
  ): Promise<Shift> {
    const action = 'ShiftMediator.updateShift';
    const client = await pool.connect();
    try {
      MyLogger.info(action, { id, data, updatedBy });

      const updateData = { ...data, updated_at: new Date() };
      const keys = Object.keys(updateData);
      const values = Object.values(updateData);
      const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');

      const result = await client.query(
        `UPDATE shifts SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`,
        [...values, id]
      );

      const shift = result.rows[0];
      if (!shift) throw new Error('Shift not found');

      eventBus.emit('shift.updated', { shift, updatedBy });
      MyLogger.success(action, { shiftId: shift.id });
      return shift;
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Soft-delete a shift (set is_active = false)
   */
  static async deleteShift(id: number): Promise<void> {
    const action = 'ShiftMediator.deleteShift';
    const client = await pool.connect();
    try {
      MyLogger.info(action, { id });

      const result = await client.query(
        'UPDATE shifts SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id',
        [id]
      );

      if (result.rows.length === 0) throw new Error('Shift not found');

      MyLogger.success(action, { id });
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get shift assignments
   */
  static async getShiftAssignments(filters?: {
    employee_id?: number;
    shift_id?: number;
  }): Promise<ShiftAssignment[]> {
    const action = 'ShiftMediator.getShiftAssignments';
    const client = await pool.connect();
    try {
      MyLogger.info(action, { filters });

      let query = `
        SELECT
          sa.*,
          s.name as shift_name,
          s.code as shift_code,
          s.start_time,
          s.end_time,
          s.color_code,
          e.first_name,
          e.last_name,
          e.employee_id as employee_code
        FROM shift_assignments sa
        JOIN shifts s ON sa.shift_id = s.id
        JOIN employees e ON sa.employee_id = e.id
      `;

      const conditions: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (filters?.employee_id) {
        conditions.push(`sa.employee_id = $${paramIndex++}`);
        values.push(filters.employee_id);
      }

      if (filters?.shift_id) {
        conditions.push(`sa.shift_id = $${paramIndex++}`);
        values.push(filters.shift_id);
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      query += ' ORDER BY sa.effective_from DESC';

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
   * Assign a shift to an employee
   */
  static async assignShift(
    data: CreateShiftAssignmentRequest,
    assignedBy?: number
  ): Promise<ShiftAssignment> {
    const action = 'ShiftMediator.assignShift';
    const client = await pool.connect();
    try {
      MyLogger.info(action, { data, assignedBy });

      // If this is a primary assignment, deactivate other primary assignments for this employee
      if (data.is_primary !== false) {
        await client.query(
          'UPDATE shift_assignments SET is_primary = false WHERE employee_id = $1 AND is_primary = true',
          [data.employee_id]
        );
      }

      const newAssignment = {
        employee_id: data.employee_id,
        shift_id: data.shift_id,
        effective_from: data.effective_from,
        effective_to: data.effective_to || null,
        is_primary: data.is_primary ?? true,
        assigned_by: assignedBy || null,
        notes: data.notes || null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const keys = Object.keys(newAssignment);
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const result = await client.query(
        `INSERT INTO shift_assignments (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`,
        Object.values(newAssignment)
      );

      const assignment = result.rows[0];
      eventBus.emit('shift.assigned', { assignment, assignedBy });
      MyLogger.success(action, { assignmentId: assignment.id });
      return assignment;
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update a shift assignment
   */
  static async updateShiftAssignment(
    id: number,
    data: Partial<CreateShiftAssignmentRequest>
  ): Promise<ShiftAssignment> {
    const action = 'ShiftMediator.updateShiftAssignment';
    const client = await pool.connect();
    try {
      MyLogger.info(action, { id, data });

      const updateData = { ...data, updated_at: new Date() };
      const keys = Object.keys(updateData);
      const values = Object.values(updateData);
      const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');

      const result = await client.query(
        `UPDATE shift_assignments SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`,
        [...values, id]
      );

      const assignment = result.rows[0];
      if (!assignment) throw new Error('Shift assignment not found');

      MyLogger.success(action, { assignmentId: assignment.id });
      return assignment;
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Remove a shift assignment
   */
  static async removeShiftAssignment(id: number): Promise<void> {
    const action = 'ShiftMediator.removeShiftAssignment';
    const client = await pool.connect();
    try {
      MyLogger.info(action, { id });

      const result = await client.query(
        'DELETE FROM shift_assignments WHERE id = $1 RETURNING id',
        [id]
      );

      if (result.rows.length === 0) throw new Error('Shift assignment not found');

      MyLogger.success(action, { id });
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }
}

export default ShiftMediator;
