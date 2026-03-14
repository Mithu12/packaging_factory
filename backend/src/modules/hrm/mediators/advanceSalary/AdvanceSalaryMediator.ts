import pool from '../../../../database/connection';
import { MyLogger } from '@/utils/new-logger';

export class AdvanceSalaryMediator {

  // Get all advance salaries with pagination and filters
  async getAdvanceSalaries(filters: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    employee_id?: number;
  }) {
    const action = 'AdvanceSalaryMediator.getAdvanceSalaries';
    const client = await pool.connect();

    try {
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const offset = (page - 1) * limit;

      const conditions: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (filters.status) {
        conditions.push(`el.status = $${paramIndex++}`);
        params.push(filters.status);
      }

      if (filters.employee_id) {
        conditions.push(`el.employee_id = $${paramIndex++}`);
        params.push(filters.employee_id);
      }

      if (filters.search) {
        conditions.push(`(
          e.first_name ILIKE $${paramIndex} OR 
          e.last_name ILIKE $${paramIndex} OR 
          e.employee_id ILIKE $${paramIndex} OR
          el.advance_number ILIKE $${paramIndex}
        )`);
        params.push(`%${filters.search}%`);
        paramIndex++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Count query
      const countQuery = `
        SELECT COUNT(*) as total
        FROM employee_loans el
        JOIN employees e ON el.employee_id = e.id
        ${whereClause}
      `;
      const countResult = await client.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total);

      // Data query
      const dataQuery = `
        SELECT 
          el.id,
          el.advance_number,
          el.employee_id,
          e.employee_id as employee_code,
          COALESCE(e.first_name, '') || ' ' || COALESCE(e.last_name, '') as employee_name,
          el.loan_type,
          el.amount,
          el.monthly_installment,
          el.total_installments,
          el.paid_installments,
          el.remaining_amount,
          el.start_date,
          el.end_date,
          el.disbursement_date,
          el.status,
          el.approved_by,
          el.approved_at,
          el.notes,
          el.created_at,
          el.updated_at,
          CASE 
            WHEN el.status = 'active' AND el.remaining_amount > 0 
            THEN LEAST(el.monthly_installment, el.remaining_amount)
            ELSE 0 
          END as next_deduction
        FROM employee_loans el
        JOIN employees e ON el.employee_id = e.id
        ${whereClause}
        ORDER BY el.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      params.push(limit, offset);
      const result = await client.query(dataQuery, params);

      MyLogger.success(action, { total, page, limit });
      return {
        advances: result.rows,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get single advance salary by ID
  async getAdvanceSalaryById(id: number) {
    const action = 'AdvanceSalaryMediator.getAdvanceSalaryById';
    const client = await pool.connect();

    try {
      const query = `
        SELECT 
          el.*,
          e.employee_id as employee_code,
          COALESCE(e.first_name, '') || ' ' || COALESCE(e.last_name, '') as employee_name,
          e.department_id,
          d.name as department_name,
          CASE 
            WHEN el.status = 'active' AND el.remaining_amount > 0 
            THEN LEAST(el.monthly_installment, el.remaining_amount)
            ELSE 0 
          END as next_deduction
        FROM employee_loans el
        JOIN employees e ON el.employee_id = e.id
        LEFT JOIN departments d ON e.department_id = d.id
        WHERE el.id = $1
      `;

      const result = await client.query(query, [id]);
      if (result.rows.length === 0) return null;

      MyLogger.success(action, { id });
      return result.rows[0];
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Create new advance salary
  async createAdvanceSalary(data: {
    employee_id: number;
    amount: number;
    monthly_installment: number;
    total_installments: number;
    start_date: string;
    loan_type?: string;
    notes?: string;
    created_by: number;
  }) {
    const action = 'AdvanceSalaryMediator.createAdvanceSalary';
    const client = await pool.connect();

    try {
      // Generate advance number
      const seqResult = await client.query("SELECT nextval('advance_salary_seq') as seq");
      const seq = seqResult.rows[0].seq;
      const advanceNumber = `ADV-${String(seq).padStart(4, '0')}`;

      const query = `
        INSERT INTO employee_loans (
          advance_number, employee_id, loan_type, amount, monthly_installment,
          total_installments, paid_installments, remaining_amount,
          start_date, status, notes, created_by, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, 0, $4, $7, 'active', $8, $9, NOW()
        )
        RETURNING *
      `;

      const result = await client.query(query, [
        advanceNumber,
        data.employee_id,
        data.loan_type || 'salary_advance',
        data.amount,
        data.monthly_installment,
        data.total_installments,
        data.start_date,
        data.notes || null,
        data.created_by,
      ]);

      MyLogger.success(action, { id: result.rows[0].id, advanceNumber });
      return result.rows[0];
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Approve or reject advance salary
  async approveAdvanceSalary(id: number, approved: boolean, approvedBy: number, notes?: string) {
    const action = 'AdvanceSalaryMediator.approveAdvanceSalary';
    const client = await pool.connect();

    try {
      const newStatus = approved ? 'active' : 'cancelled';
      const disbursementDate = approved ? new Date().toISOString().split('T')[0] : null;

      const query = `
        UPDATE employee_loans 
        SET 
          status = $1,
          approved_by = $2,
          approved_at = NOW(),
          disbursement_date = $3,
          notes = COALESCE($4, notes)
        WHERE id = $5
        RETURNING *
      `;

      const result = await client.query(query, [newStatus, approvedBy, disbursementDate, notes || null, id]);

      if (result.rows.length === 0) {
        throw new Error('Advance salary not found');
      }

      MyLogger.success(action, { id, approved });
      return result.rows[0];
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get advance salary stats
  async getAdvanceSalaryStats() {
    const action = 'AdvanceSalaryMediator.getAdvanceSalaryStats';
    const client = await pool.connect();

    try {
      const query = `
        SELECT
          COUNT(*) FILTER (WHERE status = 'active') as active_count,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
          COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
          COUNT(*) as total_count,
          COALESCE(SUM(amount) FILTER (WHERE status = 'active'), 0) as total_disbursed,
          COALESCE(SUM(remaining_amount) FILTER (WHERE status = 'active'), 0) as total_outstanding,
          COALESCE(SUM(
            LEAST(monthly_installment, remaining_amount)
          ) FILTER (WHERE status = 'active' AND remaining_amount > 0), 0) as next_payroll_deduction
        FROM employee_loans
      `;

      const result = await client.query(query);
      const row = result.rows[0];

      MyLogger.success(action);
      return {
        active_count: parseInt(row.active_count),
        completed_count: parseInt(row.completed_count),
        cancelled_count: parseInt(row.cancelled_count),
        total_count: parseInt(row.total_count),
        total_disbursed: parseFloat(row.total_disbursed),
        total_outstanding: parseFloat(row.total_outstanding),
        next_payroll_deduction: parseFloat(row.next_payroll_deduction),
      };
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get upcoming deductions per employee
  async getUpcomingDeductions() {
    const action = 'AdvanceSalaryMediator.getUpcomingDeductions';
    const client = await pool.connect();

    try {
      const query = `
        SELECT
          el.employee_id,
          e.employee_id as employee_code,
          COALESCE(e.first_name, '') || ' ' || COALESCE(e.last_name, '') as employee_name,
          COUNT(el.id) as active_advances,
          SUM(LEAST(el.monthly_installment, el.remaining_amount)) as total_deduction,
          json_agg(json_build_object(
            'advance_number', el.advance_number,
            'monthly_installment', LEAST(el.monthly_installment, el.remaining_amount),
            'remaining_amount', el.remaining_amount,
            'paid_installments', el.paid_installments,
            'total_installments', el.total_installments
          )) as advance_details
        FROM employee_loans el
        JOIN employees e ON el.employee_id = e.id
        WHERE el.status = 'active' AND el.remaining_amount > 0
        GROUP BY el.employee_id, e.employee_id, e.first_name, e.last_name
        ORDER BY total_deduction DESC
      `;

      const result = await client.query(query);

      MyLogger.success(action, { employeeCount: result.rows.length });
      return result.rows.map(row => ({
        ...row,
        active_advances: parseInt(row.active_advances),
        total_deduction: parseFloat(row.total_deduction),
      }));
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }
}

export default new AdvanceSalaryMediator();
