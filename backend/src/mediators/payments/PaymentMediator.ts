import pool from '@/database/connection'
import { MyLogger } from '@/utils/new-logger'
import { 
  Payment, 
  CreatePaymentRequest, 
  UpdatePaymentRequest,
  PaymentQueryParams,
  PaymentWithDetails,
  PaymentStats
} from '@/types/payment'
import { InvoiceMediator } from './InvoiceMediator'

export class PaymentMediator {

  static async generatePaymentNumber(): Promise<string> {
    const action = 'Generate Payment Number'
    const client = await pool.connect()
    
    try {
      const result = await client.query(`
        SELECT nextval('payment_number_sequence') as next_number
      `)
      
      const nextNumber = result.rows[0].next_number
      const paymentNumber = `PAY-${new Date().getFullYear()}-${String(nextNumber).padStart(4, '0')}`
      
      MyLogger.success(action, { paymentNumber })
      return paymentNumber
    } catch (error: any) {
      MyLogger.error(action, error)
      throw error
    } finally {
      client.release()
    }
  }

  static async createPayment(data: CreatePaymentRequest): Promise<Payment> {
    const action = 'Create Payment'
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')
      MyLogger.info(action, { 
        supplierId: data.supplier_id, 
        amount: data.amount,
        invoiceId: data.invoice_id 
      })

      // Generate payment number
      const paymentNumber = await this.generatePaymentNumber()

      // Validate supplier exists
      const supplierCheck = await client.query(
        'SELECT id FROM suppliers WHERE id = $1',
        [data.supplier_id]
      )
      if (supplierCheck.rows.length === 0) {
        throw new Error('Supplier not found')
      }

      // Validate invoice if provided
      if (data.invoice_id) {
        const invoiceCheck = await client.query(
          'SELECT id, outstanding_amount FROM invoices WHERE id = $1',
          [data.invoice_id]
        )
        if (invoiceCheck.rows.length === 0) {
          throw new Error('Invoice not found')
        }

        const invoice = invoiceCheck.rows[0]
        if (data.amount > parseFloat(invoice.outstanding_amount)) {
          throw new Error('Payment amount cannot exceed outstanding amount')
        }
      }

      const query = `
        INSERT INTO payments (
          payment_number, invoice_id, supplier_id, amount, payment_date,
          payment_method, reference, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `

      const values = [
        paymentNumber,
        data.invoice_id || null,
        data.supplier_id,
        data.amount,
        data.payment_date,
        data.payment_method,
        data.reference || null,
        data.notes || null,
        data.created_by || null
      ]

      const result = await client.query(query, values)
      const payment = result.rows[0]

      // Update invoice if payment is for a specific invoice
      if (data.invoice_id) {
        await this.updateInvoicePaymentStatus(data.invoice_id, data.amount)
      }

      await client.query('COMMIT')

      // Add payment history entry after commit
      await this.addPaymentHistory(payment.id, data.invoice_id, 'Payment Created', 'Payment recorded', null, data.amount.toString(), data.created_by)
      
      MyLogger.success(action, { 
        paymentId: payment.id,
        paymentNumber: payment.payment_number,
        supplierId: data.supplier_id 
      })

      return payment
    } catch (error: any) {
      await client.query('ROLLBACK')
      MyLogger.error(action, error, { 
        supplierId: data.supplier_id,
        amount: data.amount 
      })
      throw error
    } finally {
      client.release()
    }
  }

  static async updateInvoicePaymentStatus(invoiceId: number, paymentAmount: number): Promise<void> {
    const action = 'Update Invoice Payment Status'
    const client = await pool.connect()
    
    try {
      // Get current invoice status
      const invoiceResult = await client.query(
        'SELECT total_amount, paid_amount, outstanding_amount FROM invoices WHERE id = $1',
        [invoiceId]
      )

      if (invoiceResult.rows.length === 0) {
        throw new Error('Invoice not found')
      }

      const invoice = invoiceResult.rows[0]
      const newPaidAmount = parseFloat(invoice.paid_amount) + paymentAmount
      const newOutstandingAmount = parseFloat(invoice.outstanding_amount) - paymentAmount

      // Determine new status
      let newStatus = 'pending'
      if (newOutstandingAmount <= 0) {
        newStatus = 'paid'
      } else if (newPaidAmount > 0) {
        newStatus = 'partial'
      }

      // Update invoice
      await client.query(
        `UPDATE invoices 
         SET paid_amount = $1, outstanding_amount = $2, status = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [newPaidAmount, newOutstandingAmount, newStatus, invoiceId]
      )

      MyLogger.success(action, { 
        invoiceId, 
        newPaidAmount, 
        newOutstandingAmount, 
        newStatus 
      })
    } catch (error: any) {
      MyLogger.error(action, error, { invoiceId })
      throw error
    } finally {
      client.release()
    }
  }

  static async addPaymentHistory(paymentId: number, invoiceId: number | undefined, event: string, description: string, oldValue: string | null, newValue: string | null, userName: string | undefined): Promise<void> {
    const action = 'Add Payment History'
    const client = await pool.connect()
    
    try {
      await client.query(
        `INSERT INTO payment_history (payment_id, invoice_id, event, description, old_value, new_value, user_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [paymentId, invoiceId || null, event, description, oldValue, newValue, userName || null]
      )

      MyLogger.success(action, { paymentId, event })
    } catch (error: any) {
      MyLogger.error(action, error, { paymentId })
      throw error
    } finally {
      client.release()
    }
  }

  static async getPayments(params: PaymentQueryParams = {}): Promise<Payment[]> {
    const action = 'Get Payments'
    const client = await pool.connect()
    
    try {
      MyLogger.info(action, { params })

      const {
        page = 1,
        limit = 50,
        search,
        supplier_id,
        invoice_id,
        status,
        payment_method,
        start_date,
        end_date,
        sortBy = 'payment_date',
        sortOrder = 'desc'
      } = params

      const offset = (page - 1) * limit

      let query = `
        SELECT 
          p.*,
          s.name as supplier_name,
          s.supplier_code,
          i.invoice_number
        FROM payments p
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        LEFT JOIN invoices i ON p.invoice_id = i.id
        WHERE 1=1
      `

      const queryParams: any[] = []
      let paramIndex = 1

      // Add search filter
      if (search) {
        query += ` AND (
          p.payment_number ILIKE $${paramIndex} OR 
          s.name ILIKE $${paramIndex} OR 
          i.invoice_number ILIKE $${paramIndex} OR
          p.reference ILIKE $${paramIndex}
        )`
        queryParams.push(`%${search}%`)
        paramIndex++
      }

      // Add filters
      if (supplier_id) {
        query += ` AND p.supplier_id = $${paramIndex}`
        queryParams.push(supplier_id)
        paramIndex++
      }

      if (invoice_id) {
        query += ` AND p.invoice_id = $${paramIndex}`
        queryParams.push(invoice_id)
        paramIndex++
      }

      if (status) {
        query += ` AND p.status = $${paramIndex}`
        queryParams.push(status)
        paramIndex++
      }

      if (payment_method) {
        query += ` AND p.payment_method = $${paramIndex}`
        queryParams.push(payment_method)
        paramIndex++
      }

      if (start_date) {
        query += ` AND p.payment_date >= $${paramIndex}`
        queryParams.push(start_date)
        paramIndex++
      }

      if (end_date) {
        query += ` AND p.payment_date <= $${paramIndex}`
        queryParams.push(end_date)
        paramIndex++
      }

      // Add sorting
      const validSortColumns = ['payment_date', 'amount', 'status', 'payment_number', 'payment_method']
      const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'payment_date'
      const sortDirection = sortOrder === 'desc' ? 'DESC' : 'ASC'
      
      query += ` ORDER BY p.${sortColumn} ${sortDirection}`
      
      // Add pagination
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
      queryParams.push(limit, offset)

      const result = await client.query(query, queryParams)
      
      MyLogger.success(action, { count: result.rows.length, page, limit })
      return result.rows
    } catch (error: any) {
      MyLogger.error(action, error, { params })
      throw error
    } finally {
      client.release()
    }
  }

  static async getPaymentById(id: number): Promise<PaymentWithDetails | null> {
    const action = 'Get Payment By ID'
    const client = await pool.connect()
    
    try {
      MyLogger.info(action, { paymentId: id })

      const query = `
        SELECT 
          p.*,
          s.name as supplier_name,
          s.supplier_code,
          i.invoice_number
        FROM payments p
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        LEFT JOIN invoices i ON p.invoice_id = i.id
        WHERE p.id = $1
      `

      const result = await client.query(query, [id])
      
      if (result.rows.length === 0) {
        MyLogger.warn(action, { paymentId: id, message: 'Payment not found' })
        return null
      }

      const payment = result.rows[0]

      const paymentWithDetails: PaymentWithDetails = {
        ...payment,
        supplier: {
          id: payment.supplier_id,
          name: payment.supplier_name,
          supplier_code: payment.supplier_code
        },
        invoice: payment.invoice_id ? {
          id: payment.invoice_id,
          invoice_number: payment.invoice_number
        } : undefined
      }

      MyLogger.success(action, { paymentId: id, paymentNumber: payment.payment_number })
      return paymentWithDetails
    } catch (error: any) {
      MyLogger.error(action, error, { paymentId: id })
      throw error
    } finally {
      client.release()
    }
  }

  static async updatePayment(id: number, data: UpdatePaymentRequest): Promise<Payment> {
    const action = 'Update Payment'
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')
      MyLogger.info(action, { paymentId: id, updateData: data })

      // Get current payment
      const currentPayment = await client.query(
        'SELECT * FROM payments WHERE id = $1',
        [id]
      )

      if (currentPayment.rows.length === 0) {
        throw new Error('Payment not found')
      }

      const oldPayment = currentPayment.rows[0]

      // Build dynamic update query
      const updateFields: string[] = []
      const values: any[] = []
      let paramIndex = 1

      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          updateFields.push(`${key} = $${paramIndex}`)
          values.push(value)
          paramIndex++
        }
      })

      if (updateFields.length === 0) {
        throw new Error('No fields to update')
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`)
      values.push(id)

      const query = `
        UPDATE payments 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `

      const result = await client.query(query, values)
      const payment = result.rows[0]

      // Add payment history entry
      await this.addPaymentHistory(
        id, 
        oldPayment.invoice_id, 
        'Payment Updated', 
        'Payment details updated', 
        JSON.stringify(oldPayment), 
        JSON.stringify(payment), 
        data.created_by
      )

      await client.query('COMMIT')
      
      MyLogger.success(action, { 
        paymentId: id,
        paymentNumber: payment.payment_number 
      })

      return payment
    } catch (error: any) {
      await client.query('ROLLBACK')
      MyLogger.error(action, error, { paymentId: id })
      throw error
    } finally {
      client.release()
    }
  }

  static async deletePayment(id: number): Promise<void> {
    const action = 'Delete Payment'
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')
      MyLogger.info(action, { paymentId: id })

      // Get payment details before deletion
      const paymentResult = await client.query(
        'SELECT * FROM payments WHERE id = $1',
        [id]
      )

      if (paymentResult.rows.length === 0) {
        throw new Error('Payment not found')
      }

      const payment = paymentResult.rows[0]

      // If payment is for an invoice, reverse the invoice payment status
      if (payment.invoice_id) {
        await this.reverseInvoicePaymentStatus(payment.invoice_id, payment.amount)
      }

      // Delete payment
      const result = await client.query('DELETE FROM payments WHERE id = $1', [id])
      
      if (result.rowCount === 0) {
        throw new Error('Payment not found')
      }

      await client.query('COMMIT')
      
      MyLogger.success(action, { paymentId: id })
    } catch (error: any) {
      await client.query('ROLLBACK')
      MyLogger.error(action, error, { paymentId: id })
      throw error
    } finally {
      client.release()
    }
  }

  static async reverseInvoicePaymentStatus(invoiceId: number, paymentAmount: number): Promise<void> {
    const action = 'Reverse Invoice Payment Status'
    const client = await pool.connect()
    
    try {
      // Get current invoice status
      const invoiceResult = await client.query(
        'SELECT total_amount, paid_amount, outstanding_amount FROM invoices WHERE id = $1',
        [invoiceId]
      )

      if (invoiceResult.rows.length === 0) {
        throw new Error('Invoice not found')
      }

      const invoice = invoiceResult.rows[0]
      const newPaidAmount = Math.max(0, parseFloat(invoice.paid_amount) - paymentAmount)
      const newOutstandingAmount = parseFloat(invoice.total_amount) - newPaidAmount

      // Determine new status
      let newStatus = 'pending'
      if (newOutstandingAmount <= 0) {
        newStatus = 'paid'
      } else if (newPaidAmount > 0) {
        newStatus = 'partial'
      }

      // Update invoice
      await client.query(
        `UPDATE invoices 
         SET paid_amount = $1, outstanding_amount = $2, status = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [newPaidAmount, newOutstandingAmount, newStatus, invoiceId]
      )

      MyLogger.success(action, { 
        invoiceId, 
        newPaidAmount, 
        newOutstandingAmount, 
        newStatus 
      })
    } catch (error: any) {
      MyLogger.error(action, error, { invoiceId })
      throw error
    } finally {
      client.release()
    }
  }

  static async getPaymentStats(): Promise<PaymentStats> {
    const action = 'Get Payment Stats'
    const client = await pool.connect()
    
    try {
      MyLogger.info(action)

      // Get basic payment stats
      const paymentStatsQuery = `
        SELECT 
          COUNT(*) as total_payments,
          SUM(amount) as total_payment_amount,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_payments,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_payments,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_payments
        FROM payments
        WHERE status != 'cancelled'
      `

      const paymentStatsResult = await client.query(paymentStatsQuery)
      const paymentStats = paymentStatsResult.rows[0]

      // Get recent payments count (last 30 days)
      const recentPaymentsQuery = `
        SELECT COUNT(*) as recent_payments_count
        FROM payments
        WHERE payment_date >= CURRENT_DATE - INTERVAL '30 days'
      `

      const recentPaymentsResult = await client.query(recentPaymentsQuery)
      const recentPaymentsCount = parseInt(recentPaymentsResult.rows[0].recent_payments_count)

      // Get monthly payment trend (last 6 months)
      const trendQuery = `
        SELECT 
          TO_CHAR(payment_date, 'YYYY-MM') as month,
          COUNT(*) as total_payments,
          SUM(amount) as total_amount
        FROM payments
        WHERE payment_date >= CURRENT_DATE - INTERVAL '6 months'
        AND status = 'completed'
        GROUP BY TO_CHAR(payment_date, 'YYYY-MM')
        ORDER BY month
      `

      const trendResult = await client.query(trendQuery)

      // Get invoice stats
      const invoiceStats = await InvoiceMediator.getInvoiceStats()

      const paymentStatsData: PaymentStats = {
        total_invoices: invoiceStats.total_invoices,
        pending_invoices: invoiceStats.pending_invoices,
        partial_invoices: invoiceStats.partial_invoices,
        paid_invoices: invoiceStats.paid_invoices,
        overdue_invoices: invoiceStats.overdue_invoices,
        total_outstanding_amount: invoiceStats.total_outstanding_amount,
        total_paid_amount: parseFloat(paymentStats.total_payment_amount) || 0,
        overdue_amount: invoiceStats.overdue_amount,
        recent_movements_count: recentPaymentsCount,
        monthly_movement_trend: trendResult.rows.map(row => ({
          month: row.month,
          receipts: parseInt(row.total_payments),
          issues: 0, // Not applicable for payments
          adjustments: 0 // Not applicable for payments
        }))
      }

      MyLogger.success(action, paymentStatsData)
      return paymentStatsData
    } catch (error: any) {
      MyLogger.error(action, error)
      throw error
    } finally {
      client.release()
    }
  }
}
