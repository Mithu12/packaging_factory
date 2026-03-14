import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';
import { createError } from '@/utils/responseHelper';
import { interModuleConnector } from '@/utils/InterModuleConnector';
import { eventBus, EVENT_NAMES } from '@/utils/eventBus';
import { accountsIntegrationService, ExpenseAccountingData } from '@/services/accountsIntegrationService';
import ExpenseCategoryMediator from '@/mediators/expenses/ExpenseCategoryMediator';
import {
  Expense,
  CreateExpenseRequest,
  UpdateExpenseRequest,
  ExpenseQueryParams,
  ExpenseStats,
  ExpenseListResponse
} from '@/types/expense';

class ExpenseMediator {
  // Create new expense
  async createExpense(data: CreateExpenseRequest, createdBy: number): Promise<Expense> {
    let action = 'Create Expense';
    const client = await pool.connect();
    
    try {
      MyLogger.info(action, { createdBy, amount: data.amount, category: data.category_id });

      // Generate expense number
      const expenseNumberResult = await client.query('SELECT nextval(\'expense_number_seq\') as next_number');
      const expenseNumber = `EXP-${expenseNumberResult.rows[0].next_number.toString().padStart(6, '0')}`;

      const insertQuery = `
        INSERT INTO expenses (
          expense_number, title, description, category_id, amount, currency,
          expense_date, payment_method, vendor_name, vendor_contact,
          receipt_number, receipt_url, department, project, tags, notes, created_by, cost_center_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING *
      `;

      const values = [
        expenseNumber,
        data.title,
        data.description || null,
        data.category_id,
        data.amount,
        data.currency || 'USD',
        data.expense_date,
        data.payment_method || 'cash',
        data.vendor_name || null,
        data.vendor_contact || null,
        data.receipt_number || null,
        data.receipt_url || null,
        data.department || null,
        data.project || null,
        data.tags || null,
        data.notes || null,
        createdBy,
        data.cost_center_id ?? null
      ];

      const result = await client.query(insertQuery, values);
      const expense = result.rows[0];

      // Emit expense created event for potential integration
      await this.emitExpenseEvent(EVENT_NAMES.EXPENSE_CREATED, expense, createdBy);

      MyLogger.success(action, { expenseId: expense.id, expenseNumber: expense.expense_number });
      return expense;

    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get expenses with filtering and pagination
  async getExpenses(params: ExpenseQueryParams): Promise<ExpenseListResponse> {
    let action = 'Get Expenses';
    const client = await pool.connect();
    
    try {
      MyLogger.info(action, { params });

      let query = `
        SELECT 
          e.*,
          ec.name as category_name,
          cc.name as cost_center_name,
          cc.code as cost_center_code,
          u1.username as created_by_name,
          u2.username as approved_by_name,
          u3.username as paid_by_name
        FROM expenses e
        LEFT JOIN expense_categories ec ON e.category_id = ec.id
        LEFT JOIN cost_centers cc ON e.cost_center_id = cc.id
        LEFT JOIN users u1 ON e.created_by = u1.id
        LEFT JOIN users u2 ON e.approved_by = u2.id
        LEFT JOIN users u3 ON e.paid_by = u3.id
        WHERE 1=1
      `;

      const queryParams: any[] = [];
      let paramIndex = 1;

      // Add filters
      if (params.search) {
        query += ` AND (e.title ILIKE $${paramIndex} OR e.description ILIKE $${paramIndex} OR e.vendor_name ILIKE $${paramIndex} OR e.expense_number ILIKE $${paramIndex})`;
        queryParams.push(`%${params.search}%`);
        paramIndex++;
      }

      if (params.category_id) {
        query += ` AND e.category_id = $${paramIndex}`;
        queryParams.push(params.category_id);
        paramIndex++;
      }

      if (params.status) {
        query += ` AND e.status = $${paramIndex}`;
        queryParams.push(params.status);
        paramIndex++;
      }

      if (params.payment_method) {
        query += ` AND e.payment_method = $${paramIndex}`;
        queryParams.push(params.payment_method);
        paramIndex++;
      }

      if (params.department) {
        query += ` AND e.department = $${paramIndex}`;
        queryParams.push(params.department);
        paramIndex++;
      }

      if (params.project) {
        query += ` AND e.project = $${paramIndex}`;
        queryParams.push(params.project);
        paramIndex++;
      }

      if (params.cost_center_id) {
        query += ` AND e.cost_center_id = $${paramIndex}`;
        queryParams.push(params.cost_center_id);
        paramIndex++;
      }

      if (params.start_date) {
        query += ` AND e.expense_date >= $${paramIndex}`;
        queryParams.push(params.start_date);
        paramIndex++;
      }

      if (params.end_date) {
        query += ` AND e.expense_date <= $${paramIndex}`;
        queryParams.push(params.end_date);
        paramIndex++;
      }

      if (params.min_amount) {
        query += ` AND e.amount >= $${paramIndex}`;
        queryParams.push(params.min_amount);
        paramIndex++;
      }

      if (params.max_amount) {
        query += ` AND e.amount <= $${paramIndex}`;
        queryParams.push(params.max_amount);
        paramIndex++;
      }

      if (params.created_by) {
        query += ` AND e.created_by = $${paramIndex}`;
        queryParams.push(params.created_by);
        paramIndex++;
      }

      // Add sorting
      const validSortColumns = ['id', 'expense_number', 'title', 'amount', 'expense_date', 'status', 'created_at', 'updated_at'];
      const sortColumn = validSortColumns.includes(params.sortBy || 'created_at') ? params.sortBy || 'created_at' : 'created_at';
      const sortDirection = params.sortOrder === 'asc' ? 'ASC' : 'DESC';
      
      query += ` ORDER BY e.${sortColumn} ${sortDirection}`;

      // Add pagination
      const page = params.page || 1;
      const limit = params.limit || 10;
      const offset = (page - 1) * limit;

      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      queryParams.push(limit, offset);

      const result = await client.query(query, queryParams);
      const expenses = result.rows;

      // Get total count
      let countQuery = `
        SELECT COUNT(*) as total
        FROM expenses e
        WHERE 1=1
      `;
      
      const countParams: any[] = [];
      let countParamIndex = 1;

      // Apply same filters for count
      if (params.search) {
        countQuery += ` AND (e.title ILIKE $${countParamIndex} OR e.description ILIKE $${countParamIndex} OR e.vendor_name ILIKE $${countParamIndex} OR e.expense_number ILIKE $${countParamIndex})`;
        countParams.push(`%${params.search}%`);
        countParamIndex++;
      }

      if (params.category_id) {
        countQuery += ` AND e.category_id = $${countParamIndex}`;
        countParams.push(params.category_id);
        countParamIndex++;
      }

      if (params.status) {
        countQuery += ` AND e.status = $${countParamIndex}`;
        countParams.push(params.status);
        countParamIndex++;
      }

      if (params.payment_method) {
        countQuery += ` AND e.payment_method = $${countParamIndex}`;
        countParams.push(params.payment_method);
        countParamIndex++;
      }

      if (params.department) {
        countQuery += ` AND e.department = $${countParamIndex}`;
        countParams.push(params.department);
        countParamIndex++;
      }

      if (params.project) {
        countQuery += ` AND e.project = $${countParamIndex}`;
        countParams.push(params.project);
        countParamIndex++;
      }

      if (params.cost_center_id) {
        countQuery += ` AND e.cost_center_id = $${countParamIndex}`;
        countParams.push(params.cost_center_id);
        countParamIndex++;
      }

      if (params.start_date) {
        countQuery += ` AND e.expense_date >= $${countParamIndex}`;
        countParams.push(params.start_date);
        countParamIndex++;
      }

      if (params.end_date) {
        countQuery += ` AND e.expense_date <= $${countParamIndex}`;
        countParams.push(params.end_date);
        countParamIndex++;
      }

      if (params.min_amount) {
        countQuery += ` AND e.amount >= $${countParamIndex}`;
        countParams.push(params.min_amount);
        countParamIndex++;
      }

      if (params.max_amount) {
        countQuery += ` AND e.amount <= $${countParamIndex}`;
        countParams.push(params.max_amount);
        countParamIndex++;
      }

      if (params.created_by) {
        countQuery += ` AND e.created_by = $${countParamIndex}`;
        countParams.push(params.created_by);
        countParamIndex++;
      }

      const countResult = await client.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);

      MyLogger.success(action, { count: expenses.length, total, page, totalPages });

      return {
        expenses,
        total,
        page,
        limit,
        total_pages: totalPages
      };

    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get expense by ID
  async getExpenseById(id: number): Promise<Expense> {
    let action = 'Get Expense By ID';
    const client = await pool.connect();
    
    try {
      MyLogger.info(action, { expenseId: id });

      const query = `
        SELECT 
          e.*,
          ec.name as category_name,
          cc.name as cost_center_name,
          cc.code as cost_center_code,
          u1.username as created_by_name,
          u2.username as approved_by_name,
          u3.username as paid_by_name
        FROM expenses e
        LEFT JOIN expense_categories ec ON e.category_id = ec.id
        LEFT JOIN cost_centers cc ON e.cost_center_id = cc.id
        LEFT JOIN users u1 ON e.created_by = u1.id
        LEFT JOIN users u2 ON e.approved_by = u2.id
        LEFT JOIN users u3 ON e.paid_by = u3.id
        WHERE e.id = $1
      `;

      const result = await client.query(query, [id]);

      if (result.rows.length === 0) {
        throw createError('Expense not found', 404);
      }

      const expense = result.rows[0];
      MyLogger.success(action, { expenseId: id, expenseNumber: expense.expense_number });
      return expense;

    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Update expense
  async updateExpense(id: number, data: UpdateExpenseRequest): Promise<Expense> {
    let action = 'Update Expense';
    const client = await pool.connect();
    
    try {
      MyLogger.info(action, { expenseId: id });

      // Check if expense exists
      const checkResult = await client.query('SELECT id, status FROM expenses WHERE id = $1', [id]);
      if (checkResult.rows.length === 0) {
        throw createError('Expense not found', 404);
      }

      const currentExpense = checkResult.rows[0];
      
      // Don't allow updates to paid or approved expenses
      if (currentExpense.status === 'paid' || currentExpense.status === 'approved') {
        throw createError('Cannot update paid or approved expenses', 400);
      }

      // Build update query dynamically
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          updateFields.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      });

      if (updateFields.length === 0) {
        throw createError('No fields to update', 400);
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      const updateQuery = `
        UPDATE expenses 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await client.query(updateQuery, values);
      const expense = result.rows[0];

      // Emit expense updated event for potential integration
      await this.emitExpenseEvent(EVENT_NAMES.EXPENSE_UPDATED, expense, null);

      MyLogger.success(action, { expenseId: id, expenseNumber: expense.expense_number });
      return expense;

    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Approve expense
  async approveExpense(id: number, approvedBy: number, notes?: string): Promise<Expense> {
    let action = 'Approve Expense';
    const client = await pool.connect();
    
    try {
      MyLogger.info(action, { expenseId: id, approvedBy });

      const updateQuery = `
        UPDATE expenses 
        SET status = 'approved', approved_by = $1, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND status = 'pending'
        RETURNING *
      `;

      const result = await client.query(updateQuery, [approvedBy, id]);

      if (result.rows.length === 0) {
        throw createError('Expense not found or not in pending status', 404);
      }

      const expense = result.rows[0];

      // Add approval note if provided
      if (notes) {
        await client.query(
          'UPDATE expenses SET notes = COALESCE(notes, \'\') || $1 WHERE id = $2',
          [`\n\nApproval Note: ${notes}`, id]
        );
      }

      // Emit expense approved event for potential accounting integration
      MyLogger.info(action, { 
        message: 'About to emit expense approved event',
        expenseId: expense.id,
        approvedBy 
      });
      await this.emitExpenseEvent(EVENT_NAMES.EXPENSE_APPROVED, expense, approvedBy);
      MyLogger.info(action, { 
        message: 'Expense approved event emitted',
        expenseId: expense.id 
      });

      MyLogger.success(action, { expenseId: id, expenseNumber: expense.expense_number });
      return expense;

    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Reject expense
  async rejectExpense(id: number, rejectedBy: number, reason: string): Promise<Expense> {
    let action = 'Reject Expense';
    const client = await pool.connect();
    
    try {
      MyLogger.info(action, { expenseId: id, rejectedBy });

      const updateQuery = `
        UPDATE expenses 
        SET status = 'rejected', approved_by = $1, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND status = 'pending'
        RETURNING *
      `;

      const result = await client.query(updateQuery, [rejectedBy, id]);

      if (result.rows.length === 0) {
        throw createError('Expense not found or not in pending status', 404);
      }

      const expense = result.rows[0];

      // Add rejection reason to notes
      await client.query(
        'UPDATE expenses SET notes = COALESCE(notes, \'\') || $1 WHERE id = $2',
        [`\n\nRejection Reason: ${reason}`, id]
      );

      // Emit expense rejected event
      await this.emitExpenseEvent(EVENT_NAMES.EXPENSE_REJECTED, expense, rejectedBy);

      MyLogger.success(action, { expenseId: id, expenseNumber: expense.expense_number });
      return expense;

    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Mark expense as paid
  async payExpense(id: number, paidBy: number, notes?: string): Promise<Expense> {
    let action = 'Pay Expense';
    const client = await pool.connect();
    
    try {
      MyLogger.info(action, { expenseId: id, paidBy });

      const updateQuery = `
        UPDATE expenses 
        SET status = 'paid', paid_by = $1, paid_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND status = 'approved'
        RETURNING *
      `;

      const result = await client.query(updateQuery, [paidBy, id]);

      if (result.rows.length === 0) {
        throw createError('Expense not found or not in approved status', 404);
      }

      const expense = result.rows[0];

      // Add payment note if provided
      if (notes) {
        await client.query(
          'UPDATE expenses SET notes = COALESCE(notes, \'\') || $1 WHERE id = $2',
          [`\n\nPayment Note: ${notes}`, id]
        );
      }

      // Emit expense paid event
      await this.emitExpenseEvent(EVENT_NAMES.EXPENSE_PAID, expense, paidBy);

      MyLogger.success(action, { expenseId: id, expenseNumber: expense.expense_number });
      return expense;

    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Delete expense
  async deleteExpense(id: number): Promise<void> {
    let action = 'Delete Expense';
    const client = await pool.connect();
    
    try {
      MyLogger.info(action, { expenseId: id });

      // Check if expense exists and its status
      const checkResult = await client.query('SELECT id, status FROM expenses WHERE id = $1', [id]);
      if (checkResult.rows.length === 0) {
        throw createError('Expense not found', 404);
      }

      const currentExpense = checkResult.rows[0];
      
      // Don't allow deletion of paid or approved expenses
      if (currentExpense.status === 'paid' || currentExpense.status === 'approved') {
        throw createError('Cannot delete paid or approved expenses', 400);
      }

      const result = await client.query('DELETE FROM expenses WHERE id = $1', [id]);

      // Emit expense deleted event
      await eventBus.emit(EVENT_NAMES.EXPENSE_DELETED, { 
        expenseId: id,
        deletedBy: null // We don't track who deleted it in this method
      });

      MyLogger.success(action, { expenseId: id });

    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get expense statistics
  async getExpenseStats(params?: { start_date?: string; end_date?: string; department?: string }): Promise<ExpenseStats> {
    let action = 'Get Expense Stats';
    const client = await pool.connect();
    
    try {
      MyLogger.info(action, { params });

      let whereClause = 'WHERE 1=1';
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (params?.start_date) {
        whereClause += ` AND expense_date >= $${paramIndex}`;
        queryParams.push(params.start_date);
        paramIndex++;
      }

      if (params?.end_date) {
        whereClause += ` AND expense_date <= $${paramIndex}`;
        queryParams.push(params.end_date);
        paramIndex++;
      }

      if (params?.department) {
        whereClause += ` AND department = $${paramIndex}`;
        queryParams.push(params.department);
        paramIndex++;
      }

      // Basic stats
      const basicStatsQuery = `
        SELECT 
          COUNT(*) as total_expenses,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_expenses,
          COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_expenses,
          COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_expenses,
          COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_expenses,
          COALESCE(SUM(amount), 0) as total_amount,
          COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_amount,
          COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0) as approved_amount,
          COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as paid_amount,
          COALESCE(AVG(amount), 0) as average_expense_amount
        FROM expenses
        ${whereClause}
      `;

      const basicStatsResult = await client.query(basicStatsQuery, queryParams);
      const basicStats = basicStatsResult.rows[0];

      // Monthly trends
      const monthlyTrendsQuery = `
        SELECT 
          TO_CHAR(expense_date, 'YYYY-MM') as month,
          COUNT(*) as count,
          COALESCE(SUM(amount), 0) as total_amount
        FROM expenses
        ${whereClause}
        AND expense_date >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY TO_CHAR(expense_date, 'YYYY-MM')
        ORDER BY month
      `;

      const monthlyTrendsResult = await client.query(monthlyTrendsQuery, queryParams);
      const monthlyTrends = monthlyTrendsResult.rows;

      // Top categories
      const topCategoriesQuery = `
        SELECT 
          ec.id as category_id,
          ec.name as category_name,
          COUNT(*) as count,
          COALESCE(SUM(e.amount), 0) as total_amount
        FROM expenses e
        JOIN expense_categories ec ON e.category_id = ec.id
        ${whereClause}
        GROUP BY ec.id, ec.name
        ORDER BY total_amount DESC
        LIMIT 10
      `;

      const topCategoriesResult = await client.query(topCategoriesQuery, queryParams);
      const topCategories = topCategoriesResult.rows;

      // This month and year counts
      const thisMonthQuery = `
        SELECT COUNT(*) as count
        FROM expenses
        WHERE expense_date >= DATE_TRUNC('month', CURRENT_DATE)
        ${params?.start_date ? `AND expense_date >= $${paramIndex}` : ''}
        ${params?.end_date ? `AND expense_date <= $${paramIndex + (params?.start_date ? 1 : 0)}` : ''}
        ${params?.department ? `AND department = $${paramIndex + (params?.start_date ? 1 : 0) + (params?.end_date ? 1 : 0)}` : ''}
      `;

      const thisYearQuery = `
        SELECT COUNT(*) as count
        FROM expenses
        WHERE expense_date >= DATE_TRUNC('year', CURRENT_DATE)
        ${params?.start_date ? `AND expense_date >= $${paramIndex}` : ''}
        ${params?.end_date ? `AND expense_date <= $${paramIndex + (params?.start_date ? 1 : 0)}` : ''}
        ${params?.department ? `AND department = $${paramIndex + (params?.start_date ? 1 : 0) + (params?.end_date ? 1 : 0)}` : ''}
      `;

      const thisMonthResult = await client.query(thisMonthQuery, queryParams);
      const thisYearResult = await client.query(thisYearQuery, queryParams);

      const stats: ExpenseStats = {
        total_expenses: parseInt(basicStats.total_expenses),
        pending_expenses: parseInt(basicStats.pending_expenses),
        approved_expenses: parseInt(basicStats.approved_expenses),
        rejected_expenses: parseInt(basicStats.rejected_expenses),
        paid_expenses: parseInt(basicStats.paid_expenses),
        total_amount: parseFloat(basicStats.total_amount),
        pending_amount: parseFloat(basicStats.pending_amount),
        approved_amount: parseFloat(basicStats.approved_amount),
        paid_amount: parseFloat(basicStats.paid_amount),
        expenses_this_month: parseInt(thisMonthResult.rows[0].count),
        expenses_this_year: parseInt(thisYearResult.rows[0].count),
        average_expense_amount: parseFloat(basicStats.average_expense_amount),
        top_categories: topCategories.map(cat => ({
          category_id: parseInt(cat.category_id),
          category_name: cat.category_name,
          count: parseInt(cat.count),
          total_amount: parseFloat(cat.total_amount)
        })),
        monthly_trends: monthlyTrends.map(trend => ({
          month: trend.month,
          count: parseInt(trend.count),
          total_amount: parseFloat(trend.total_amount)
        }))
      };

      MyLogger.success(action, { statsCount: Object.keys(stats).length });
      return stats;

    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Helper method to emit expense events with proper data formatting
   * This enables loose coupling with other modules like accounts
   */
  private async emitExpenseEvent(eventName: string, expense: any, userId?: number | null): Promise<void> {
    let action = 'Emit Expense Event';
    try {
      MyLogger.info(action, { expenseId: expense.id, categoryId: expense.category_id });
      // Get category name for the expense
      let categoryName = expense.category_name;
      if (!categoryName && expense.category_id) {
        const client = await pool.connect();
        try {
          const categoryResult = await client.query(
            'SELECT name FROM expense_categories WHERE id = $1',
            [expense.category_id]
          );
          categoryName = categoryResult.rows[0]?.name || 'Unknown';
          MyLogger.success(action, { expenseId: expense.id, categoryName });
        } finally {
          client.release();
        }
      }

      // Format expense data for integration
      const expenseData: ExpenseAccountingData = {
        expenseId: expense.id,
        expenseNumber: expense.expense_number,
        title: expense.title,
        amount: parseFloat(expense.amount),
        currency: expense.currency || 'BDT',
        expenseDate: expense.expense_date,
        categoryName: categoryName || 'General',
        vendorName: expense.vendor_name,
        department: expense.department,
        project: expense.project,
        notes: expense.notes,
        createdBy: expense.created_by,
        costCenterId: expense.cost_center_id ?? undefined
      };

      // Emit the event
      await eventBus.emit(eventName, {
        expenseData,
        userId,
        timestamp: new Date().toISOString()
      });

      // Central Bridge: Call accounts module directly via InterModuleConnector if approved
      if (eventName === EVENT_NAMES.EXPENSE_APPROVED) {
        MyLogger.info('Expense Bridge: Calling accModule.addExpenseVoucher', { expenseId: expense.id });
        await interModuleConnector.accModule.addExpenseVoucher(expenseData, userId);
      }

      MyLogger.info('Expense Event Emitted', { 
        event: eventName, 
        expenseId: expense.id,
        expenseNumber: expense.expense_number 
      });

    } catch (error) {
      MyLogger.error('Emit Expense Event', error, { 
        event: eventName, 
        expenseId: expense.id 
      });
      // Don't throw - event emission failures shouldn't break the main operation
    }
  }

  /**
   * Get expense account preview for a category and optional cost center.
   * Returns the account that would be used when creating a voucher.
   */
  async getExpenseAccountPreview(categoryId: number, costCenterId?: number): Promise<{ account: { id: number; name: string; code: string } | null }> {
    try {
      const category = await ExpenseCategoryMediator.getExpenseCategoryById(categoryId);
      const account = await accountsIntegrationService.getExpenseAccountPreview(category.name, costCenterId);
      return { account };
    } catch (error) {
      MyLogger.error('Get Expense Account Preview', error, { categoryId, costCenterId });
      return { account: null };
    }
  }

  /**
   * Get the account debited for an expense.
   * For paid/approved expenses: looks up the actual account from the voucher.
   * For pending: uses the preview (resolved from category + cost center).
   */
  async getExpenseAccountDebited(expenseId: number): Promise<{ account: { id: number; name: string; code: string } | null }> {
    const client = await pool.connect();
    try {
      const expense = await this.getExpenseById(expenseId);

      // For paid/approved expenses, try to get the actual account from the voucher
      if (expense.status === 'paid' || expense.status === 'approved') {
        const voucherQuery = `
          SELECT coa.id, coa.code, coa.name
          FROM vouchers v
          JOIN voucher_lines vl ON v.id = vl.voucher_id
          JOIN chart_of_accounts coa ON vl.account_id = coa.id
          WHERE v.reference = $1 AND v.type = 'Payment' AND vl.debit > 0
          LIMIT 1
        `;
        const voucherResult = await client.query(voucherQuery, [expense.expense_number]);
        if (voucherResult.rows.length > 0) {
          const row = voucherResult.rows[0];
          return {
            account: { id: row.id, name: row.name, code: row.code }
          };
        }
      }

      // Fall back to preview (category + cost center resolution)
      return await this.getExpenseAccountPreview(expense.category_id, expense.cost_center_id ?? undefined);
    } catch (error) {
      MyLogger.error('Get Expense Account Debited', error, { expenseId });
      return { account: null };
    } finally {
      client.release();
    }
  }

  /**
   * Get accounts integration status for an expense
   * This provides visibility into whether accounting integration is available
   */
  async getAccountsIntegrationStatus(expenseId: number): Promise<{
    available: boolean;
    canIntegrate: boolean;
    voucherInfo?: { voucherId: number; voucherNo: string } | null;
  }> {
    try {
      const expense = await this.getExpenseById(expenseId);
      
      const status = accountsIntegrationService.getAccountsModuleStatus();
      const expenseData: ExpenseAccountingData = {
        expenseId: expense.id,
        expenseNumber: expense.expense_number,
        title: expense.title,
        amount: parseFloat(expense.amount.toString()),
        currency: expense.currency,
        expenseDate: expense.expense_date,
        categoryName: expense.category_name || 'General',
        vendorName: expense.vendor_name,
        department: expense.department,
        project: expense.project,
        notes: expense.notes,
        createdBy: expense.created_by,
        costCenterId: expense.cost_center_id ?? undefined
      };

      const canIntegrate = accountsIntegrationService.canIntegrateExpense(expenseData);

      return {
        available: status.available,
        canIntegrate,
        voucherInfo: null // TODO: Add voucher lookup if needed
      };

    } catch (error) {
      MyLogger.error('Get Accounts Integration Status', error, { expenseId });
      return {
        available: false,
        canIntegrate: false,
        voucherInfo: null
      };
    }
  }
}

export default new ExpenseMediator();