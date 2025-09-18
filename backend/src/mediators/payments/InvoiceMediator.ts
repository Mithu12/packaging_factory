import pool from '@/database/connection'
import { MyLogger } from '@/utils/new-logger'
import { 
  Invoice, 
  CreateInvoiceRequest, 
  UpdateInvoiceRequest,
  InvoiceQueryParams,
  InvoiceWithDetails
} from '@/types/payment'

export class InvoiceMediator {

  static async generateInvoiceNumber(): Promise<string> {
    const action = 'Generate Invoice Number'
    const client = await pool.connect()
    
    try {
      const result = await client.query(`
        SELECT nextval('invoice_number_sequence') as next_number
      `)
      
      const nextNumber = result.rows[0].next_number
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(nextNumber).padStart(4, '0')}`
      
      MyLogger.success(action, { invoiceNumber })
      return invoiceNumber
    } catch (error: any) {
      MyLogger.error(action, error)
      throw error
    } finally {
      client.release()
    }
  }

  static async createInvoice(data: CreateInvoiceRequest): Promise<Invoice> {
    const action = 'Create Invoice'
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')
      MyLogger.info(action, { 
        supplierId: data.supplier_id, 
        totalAmount: data.total_amount,
        purchaseOrderId: data.purchase_order_id 
      })

      // Generate invoice number
      const invoiceNumber = await this.generateInvoiceNumber()

      // Validate supplier exists
      const supplierCheck = await client.query(
        'SELECT id FROM suppliers WHERE id = $1',
        [data.supplier_id]
      )
      if (supplierCheck.rows.length === 0) {
        throw new Error('Supplier not found')
      }

      // Validate purchase order if provided
      if (data.purchase_order_id) {
        const poCheck = await client.query(
          'SELECT id FROM purchase_orders WHERE id = $1',
          [data.purchase_order_id]
        )
        if (poCheck.rows.length === 0) {
          throw new Error('Purchase order not found')
        }
      }

      const query = `
        INSERT INTO invoices (
          invoice_number, purchase_order_id, supplier_id, invoice_date, due_date,
          total_amount, outstanding_amount, terms, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `

      const values = [
        invoiceNumber,
        data.purchase_order_id || null,
        data.supplier_id,
        data.invoice_date,
        data.due_date,
        data.total_amount,
        data.total_amount, // outstanding_amount starts same as total_amount
        data.terms || null,
        data.notes || null
      ]

      const result = await client.query(query, values)
      const invoice = result.rows[0]

      await client.query('COMMIT')
      
      MyLogger.success(action, { 
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        supplierId: data.supplier_id 
      })

      return invoice
    } catch (error: any) {
      await client.query('ROLLBACK')
      MyLogger.error(action, error, { 
        supplierId: data.supplier_id,
        totalAmount: data.total_amount 
      })
      throw error
    } finally {
      client.release()
    }
  }

  static async getInvoices(params: InvoiceQueryParams = {}): Promise<Invoice[]> {
    const action = 'Get Invoices'
    const client = await pool.connect()
    
    try {
      MyLogger.info(action, { params })

      const {
        page = 1,
        limit = 50,
        search,
        supplier_id,
        purchase_order_id,
        status,
        start_date,
        end_date,
        due_date_from,
        due_date_to,
        sortBy = 'invoice_date',
        sortOrder = 'desc'
      } = params

      const offset = (page - 1) * limit

      let query = `
        SELECT 
          i.*,
          s.name as supplier_name,
          s.supplier_code,
          po.po_number
        FROM invoices i
        LEFT JOIN suppliers s ON i.supplier_id = s.id
        LEFT JOIN purchase_orders po ON i.purchase_order_id = po.id
        WHERE 1=1
      `

      const queryParams: any[] = []
      let paramIndex = 1

      // Add search filter
      if (search) {
        query += ` AND (
          i.invoice_number ILIKE $${paramIndex} OR 
          s.name ILIKE $${paramIndex} OR 
          po.po_number ILIKE $${paramIndex}
        )`
        queryParams.push(`%${search}%`)
        paramIndex++
      }

      // Add filters
      if (supplier_id) {
        query += ` AND i.supplier_id = $${paramIndex}`
        queryParams.push(supplier_id)
        paramIndex++
      }

      if (purchase_order_id) {
        query += ` AND i.purchase_order_id = $${paramIndex}`
        queryParams.push(purchase_order_id)
        paramIndex++
      }

      if (status) {
        query += ` AND i.status = $${paramIndex}`
        queryParams.push(status)
        paramIndex++
      }

      if (start_date) {
        query += ` AND i.invoice_date >= $${paramIndex}`
        queryParams.push(start_date)
        paramIndex++
      }

      if (end_date) {
        query += ` AND i.invoice_date <= $${paramIndex}`
        queryParams.push(end_date)
        paramIndex++
      }

      if (due_date_from) {
        query += ` AND i.due_date >= $${paramIndex}`
        queryParams.push(due_date_from)
        paramIndex++
      }

      if (due_date_to) {
        query += ` AND i.due_date <= $${paramIndex}`
        queryParams.push(due_date_to)
        paramIndex++
      }

      // Add sorting
      const validSortColumns = ['invoice_date', 'due_date', 'total_amount', 'outstanding_amount', 'status', 'invoice_number']
      const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'invoice_date'
      const sortDirection = sortOrder === 'desc' ? 'DESC' : 'ASC'
      
      query += ` ORDER BY i.${sortColumn} ${sortDirection}`
      
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

  static async getInvoiceById(id: number): Promise<InvoiceWithDetails | null> {
    const action = 'Get Invoice By ID'
    const client = await pool.connect()
    
    try {
      MyLogger.info(action, { invoiceId: id })

      const query = `
        SELECT 
          i.*,
          s.name as supplier_name,
          s.supplier_code,
          po.po_number
        FROM invoices i
        LEFT JOIN suppliers s ON i.supplier_id = s.id
        LEFT JOIN purchase_orders po ON i.purchase_order_id = po.id
        WHERE i.id = $1
      `

      const result = await client.query(query, [id])
      
      if (result.rows.length === 0) {
        MyLogger.warn(action, { invoiceId: id, message: 'Invoice not found' })
        return null
      }

      const invoice = result.rows[0]

      // Get payments for this invoice
      const paymentsQuery = `
        SELECT p.*, s.name as supplier_name, s.supplier_code
        FROM payments p
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        WHERE p.invoice_id = $1
        ORDER BY p.payment_date DESC
      `
      const paymentsResult = await client.query(paymentsQuery, [id])

      // Get payment history for this invoice
      const paymentHistoryQuery = `
        SELECT ph.*, p.payment_number
        FROM payment_history ph
        LEFT JOIN payments p ON ph.payment_id = p.id
        WHERE ph.invoice_id = $1
        ORDER BY ph.created_at DESC
      `
      const paymentHistoryResult = await client.query(paymentHistoryQuery, [id])

      const invoiceWithDetails: InvoiceWithDetails = {
        ...invoice,
        supplier: {
          id: invoice.supplier_id,
          name: invoice.supplier_name,
          supplier_code: invoice.supplier_code
        },
        purchase_order: invoice.purchase_order_id ? {
          id: invoice.purchase_order_id,
          po_number: invoice.po_number
        } : undefined,
        payments: paymentsResult.rows,
        payment_history: paymentHistoryResult.rows
      }

      MyLogger.success(action, { invoiceId: id, invoiceNumber: invoice.invoice_number })
      return invoiceWithDetails
    } catch (error: any) {
      MyLogger.error(action, error, { invoiceId: id })
      throw error
    } finally {
      client.release()
    }
  }

  static async updateInvoice(id: number, data: UpdateInvoiceRequest): Promise<Invoice> {
    const action = 'Update Invoice'
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')
      MyLogger.info(action, { invoiceId: id, updateData: data })

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
        UPDATE invoices 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `

      const result = await client.query(query, values)
      
      if (result.rows.length === 0) {
        throw new Error('Invoice not found')
      }

      await client.query('COMMIT')
      
      const invoice = result.rows[0]
      MyLogger.success(action, { 
        invoiceId: id,
        invoiceNumber: invoice.invoice_number 
      })

      return invoice
    } catch (error: any) {
      await client.query('ROLLBACK')
      MyLogger.error(action, error, { invoiceId: id })
      throw error
    } finally {
      client.release()
    }
  }

  static async deleteInvoice(id: number): Promise<void> {
    const action = 'Delete Invoice'
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')
      MyLogger.info(action, { invoiceId: id })

      // Check if invoice has payments
      const paymentsCheck = await client.query(
        'SELECT COUNT(*) as count FROM payments WHERE invoice_id = $1',
        [id]
      )

      if (parseInt(paymentsCheck.rows[0].count) > 0) {
        throw new Error('Cannot delete invoice with existing payments')
      }

      const result = await client.query('DELETE FROM invoices WHERE id = $1', [id])
      
      if (result.rowCount === 0) {
        throw new Error('Invoice not found')
      }

      await client.query('COMMIT')
      
      MyLogger.success(action, { invoiceId: id })
    } catch (error: any) {
      await client.query('ROLLBACK')
      MyLogger.error(action, error, { invoiceId: id })
      throw error
    } finally {
      client.release()
    }
  }

  static async getInvoiceStats(): Promise<any> {
    const action = 'Get Invoice Stats'
    const client = await pool.connect()
    
    try {
      MyLogger.info(action)

      const statsQuery = `
        SELECT 
          COUNT(*) as total_invoices,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_invoices,
          COUNT(CASE WHEN status = 'partial' THEN 1 END) as partial_invoices,
          COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_invoices,
          COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_invoices,
          SUM(outstanding_amount) as total_outstanding_amount,
          SUM(paid_amount) as total_paid_amount,
          SUM(CASE WHEN status = 'overdue' THEN outstanding_amount ELSE 0 END) as overdue_amount
        FROM invoices
        WHERE status != 'cancelled'
      `

      const result = await client.query(statsQuery)
      const stats = result.rows[0]

      MyLogger.success(action, stats)
      return {
        total_invoices: parseInt(stats.total_invoices),
        pending_invoices: parseInt(stats.pending_invoices),
        partial_invoices: parseInt(stats.partial_invoices),
        paid_invoices: parseInt(stats.paid_invoices),
        overdue_invoices: parseInt(stats.overdue_invoices),
        total_outstanding_amount: parseFloat(stats.total_outstanding_amount) || 0,
        total_paid_amount: parseFloat(stats.total_paid_amount) || 0,
        overdue_amount: parseFloat(stats.overdue_amount) || 0
      }
    } catch (error: any) {
      MyLogger.error(action, error)
      throw error
    } finally {
      client.release()
    }
  }
}
