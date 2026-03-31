import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';
import { eventBus, EVENT_NAMES } from '@/utils/eventBus';
import { interModuleConnector } from '@/utils/InterModuleConnector';
import { FactoryCustomerPayment, RecordFactoryOrderPaymentRequest } from '@/types/factory';
import { recalcFactoryCustomerFinancials } from '../../utils/customerFinancials';

/** Firm orders only: no payments on draft / quote / pending in acceptance queue. */
const ORDER_STATUSES_ALLOWING_PAYMENT = [
  'approved',
  'in_production',
  'completed',
  'shipped',
] as const;

export class FactoryCustomerPaymentsMediator {
  /**
   * Record a payment against a factory customer order
   */
  async recordPayment(
    orderId: string,
    data: RecordFactoryOrderPaymentRequest,
    userId: number
  ): Promise<FactoryCustomerPayment> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get the order details
      const orderQuery = `
        SELECT 
          fco.id,
          fco.order_number,
          fco.factory_customer_id,
          fco.factory_id,
          fco.total_value,
          fco.paid_amount,
          fco.outstanding_amount,
          fco.status,
          f.name as factory_name,
          f.cost_center_id as factory_cost_center_id,
          cc.name as factory_cost_center_name
        FROM factory_customer_orders fco
        LEFT JOIN factories f ON fco.factory_id = f.id
        LEFT JOIN cost_centers cc ON f.cost_center_id = cc.id
        WHERE fco.id = $1 --AND fco.deleted_at IS NULL
      `;
      
      const orderResult = await client.query(orderQuery, [orderId]);
      
      if (orderResult.rows.length === 0) {
        throw new Error('Customer order not found');
      }
      
      const order = orderResult.rows[0];
      
      if (
        !(ORDER_STATUSES_ALLOWING_PAYMENT as readonly string[]).includes(order.status)
      ) {
        throw new Error(
          `Payments cannot be recorded for orders in status "${order.status}". Allowed: ${ORDER_STATUSES_ALLOWING_PAYMENT.join(', ')}`
        );
      }
      
      // Validate payment amount
      if (data.payment_amount > order.outstanding_amount) {
        throw new Error(
          `Payment amount (${data.payment_amount}) exceeds outstanding amount (${order.outstanding_amount})`
        );
      }

      // Insert payment record
      const paymentQuery = `
        INSERT INTO factory_customer_payments (
          factory_customer_order_id,
          factory_customer_id,
          factory_id,
          payment_amount,
          payment_date,
          payment_method,
          payment_reference,
          notes,
          recorded_by,
          factory_sales_invoice_id,
          additional_metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
      
      const paymentValues = [
        orderId,
        order.factory_customer_id,
        order.factory_id,
        data.payment_amount,
        data.payment_date || new Date(),
        data.payment_method,
        data.payment_reference || null,
        data.notes || null,
        userId,
        data.factory_sales_invoice_id || null,
        data.additional_metadata ? JSON.stringify(data.additional_metadata) : null
      ];
      
      const paymentResult = await client.query(paymentQuery, paymentValues);
      const payment = paymentResult.rows[0];

      // Update order paid_amount and outstanding_amount
      const newPaidAmount = parseFloat(order.paid_amount) + Number(data.payment_amount);
      const newOutstandingAmount = parseFloat(order.outstanding_amount) - data.payment_amount;
      
      const fullyPaid = newOutstandingAmount <= 0.01;
      let newStatus = order.status;
      if (fullyPaid) {
        if (order.status === 'shipped') {
          newStatus = 'completed';
        } else if (order.status === 'completed') {
          newStatus = 'completed';
        }
        // approved / in_production: keep workflow status; only financial columns change
      }
      
      const updateOrderQuery = `
        UPDATE factory_customer_orders
        SET 
          paid_amount = $1,
          outstanding_amount = $2,
          status = $3,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
      `;
      
      await client.query(updateOrderQuery, [
        newPaidAmount,
        newOutstandingAmount,
        newStatus,
        orderId
      ]);

      await recalcFactoryCustomerFinancials(client, order.factory_customer_id);

      await client.query('COMMIT');

      MyLogger.info('Factory customer payment recorded', {
        orderId,
        paymentId: payment.id,
        amount: data.payment_amount,
        newPaidAmount,
        newOutstandingAmount
      });

      // Emit event for accounts integration
      const paymentData = {
        orderId: order.id,
        orderNumber: order.order_number,
        paymentId: payment.id,
        amount: data.payment_amount,
        paymentMethod: data.payment_method,
        paymentReference: data.payment_reference,
        paymentDate: payment.payment_date,
        factoryId: order.factory_id,
        factoryName: order.factory_name,
        factoryCostCenterId: order.factory_cost_center_id,
        factoryCostCenterName: order.factory_cost_center_name,
        customerId: order.factory_customer_id,
        userId,
        timestamp: new Date()
      };

      eventBus.emit(EVENT_NAMES.FACTORY_PAYMENT_RECEIVED, paymentData);

      // Central Bridge: Call accounts module directly via InterModuleConnector
      MyLogger.info('Factory Payment Bridge: Calling accModule.addFactoryPaymentVoucher', { orderId });
      await interModuleConnector.accModule.addFactoryPaymentVoucher(paymentData, userId);

      return {
        id: payment.id,
        factory_customer_order_id: payment.factory_customer_order_id,
        factory_customer_id: order.factory_customer_id,
        factory_id: order.factory_id,
        payment_amount: parseFloat(payment.payment_amount),
        payment_date: payment.payment_date,
        payment_method: payment.payment_method,
        payment_reference: payment.payment_reference,
        notes: payment.notes,
        recorded_by: payment.recorded_by,
        recorded_at: payment.recorded_at,
        factory_sales_invoice_id: payment.factory_sales_invoice_id,
        additional_metadata: payment.additional_metadata,
        updated_at: payment.updated_at,
        voucher_id: payment.voucher_id
      } as FactoryCustomerPayment;
      
    } catch (error) {
      await client.query('ROLLBACK');
      MyLogger.error('Error recording factory customer payment', { orderId, error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get payment history for a factory customer order
   */
  async getPaymentHistory(orderId: string): Promise<FactoryCustomerPayment[]> {
    try {
      const query = `
        SELECT 
          fcp.*,
          u.username as recorded_by_username,
          v.voucher_no as voucher_no
        FROM factory_customer_payments fcp
        LEFT JOIN users u ON fcp.recorded_by = u.id
        LEFT JOIN vouchers v ON fcp.voucher_id = v.id
        WHERE fcp.factory_customer_order_id = $1
        ORDER BY fcp.payment_date DESC, fcp.recorded_at DESC
      `;
      
      const result = await pool.query(query, [orderId]);
      
      return result.rows.map((row: any) => ({
        id: row.id,
        factory_customer_order_id: row.factory_customer_order_id,
        factory_customer_id: row.factory_customer_id || '',
        factory_id: row.factory_id,
        payment_amount: parseFloat(row.payment_amount),
        payment_date: row.payment_date,
        payment_method: row.payment_method,
        payment_reference: row.payment_reference,
        notes: row.notes,
        recorded_by: row.recorded_by,
        recorded_at: row.recorded_at,
        recorded_by_username: row.recorded_by_username,
        factory_sales_invoice_id: row.factory_sales_invoice_id,
        additional_metadata: row.additional_metadata,
        updated_at: row.updated_at,
        voucher_id: row.voucher_id,
        voucher_no: row.voucher_no
      } as FactoryCustomerPayment));
      
    } catch (error) {
      MyLogger.error('Error fetching payment history', { orderId, error });
      throw error;
    }
  }

  /**
   * Get payment summary for a factory customer order
   */
  async getPaymentSummary(orderId: string) {
    try {
      const query = `
        SELECT 
          fco.id,
          fco.order_number,
          fco.total_value,
          fco.paid_amount,
          fco.outstanding_amount,
          COUNT(fcp.id) as payment_count,
          MAX(fcp.payment_date) as last_payment_date
        FROM factory_customer_orders fco
        LEFT JOIN factory_customer_payments fcp ON fco.id = fcp.factory_customer_order_id
        WHERE fco.id = $1
        GROUP BY fco.id, fco.order_number, fco.total_value, fco.paid_amount, fco.outstanding_amount
      `;
      
      const result = await pool.query(query, [orderId]);
      
      if (result.rows.length === 0) {
        throw new Error('Customer order not found');
      }
      
      return {
        orderId: result.rows[0].id,
        orderNumber: result.rows[0].order_number,
        totalValue: parseFloat(result.rows[0].total_value),
        paidAmount: parseFloat(result.rows[0].paid_amount),
        outstandingAmount: parseFloat(result.rows[0].outstanding_amount),
        paymentCount: parseInt(result.rows[0].payment_count),
        lastPaymentDate: result.rows[0].last_payment_date
      };
      
    } catch (error) {
      MyLogger.error('Error fetching payment summary', { orderId, error });
      throw error;
    }
  }
  /**
   * Get all factory customer payments with filtering and pagination
   */
  async getAllPayments(params: any): Promise<{ payments: FactoryCustomerPayment[], total: number, page: number, limit: number, totalPages: number }> {
    try {
      const page = parseInt(params.page as string) || 1;
      const limit = parseInt(params.limit as string) || 20;
      const offset = (page - 1) * limit;
      const { customer_id, factory_id, start_date, end_date, search } = params;

      let query = `
        SELECT 
          fcp.*,
          fco.order_number,
          fc.name as customer_name,
          f.name as factory_name,
          u.username as recorded_by_username,
          v.voucher_no as voucher_no
        FROM factory_customer_payments fcp
        JOIN factory_customer_orders fco ON fcp.factory_customer_order_id = fco.id
        JOIN factory_customers fc ON fcp.factory_customer_id = fc.id
        JOIN factories f ON fcp.factory_id = f.id
        LEFT JOIN users u ON fcp.recorded_by = u.id
        LEFT JOIN vouchers v ON fcp.voucher_id = v.id
        WHERE 1=1
      `;
      
      const values: any[] = [];
      let paramIndex = 1;

      if (customer_id) {
        query += ` AND fcp.factory_customer_id = $${paramIndex}`;
        values.push(customer_id);
        paramIndex++;
      }

      if (factory_id) {
        query += ` AND fcp.factory_id = $${paramIndex}`;
        values.push(factory_id);
        paramIndex++;
      }

      if (start_date) {
        query += ` AND fcp.payment_date >= $${paramIndex}`;
        values.push(start_date);
        paramIndex++;
      }

      if (end_date) {
        query += ` AND fcp.payment_date <= $${paramIndex}`;
        values.push(end_date);
        paramIndex++;
      }

      if (search) {
        query += ` AND (fc.name ILIKE $${paramIndex} OR fco.order_number ILIKE $${paramIndex} OR fcp.payment_reference ILIKE $${paramIndex})`;
        values.push(`%${search}%`);
        paramIndex++;
      }

      // Get total count
      const countQuery = `SELECT COUNT(*) FROM (${query}) as count_query`;
      const countResult = await pool.query(countQuery, values);
      const total = parseInt(countResult.rows[0].count);

      // Add ordering and pagination
      query += ` ORDER BY fcp.payment_date DESC, fcp.recorded_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      values.push(limit, offset);

      const result = await pool.query(query, values);
      
      const totalPages = Math.ceil(total / limit);

      return {
        payments: result.rows.map((row: any) => ({
          id: row.id,
          factory_customer_order_id: row.factory_customer_order_id,
          order_number: row.order_number,
          customer_name: row.customer_name,
          factory_name: row.factory_name,
          factory_customer_id: row.factory_customer_id,
          factory_id: row.factory_id,
          payment_amount: parseFloat(row.payment_amount),
          payment_date: row.payment_date,
          payment_method: row.payment_method,
          payment_reference: row.payment_reference,
          notes: row.notes,
          recorded_by: row.recorded_by,
          recorded_at: row.recorded_at,
          recorded_by_username: row.recorded_by_username,
          factory_sales_invoice_id: row.factory_sales_invoice_id,
          additional_metadata: row.additional_metadata,
          updated_at: row.updated_at,
          voucher_id: row.voucher_id,
          voucher_no: row.voucher_no
        })),
        total,
        page,
        limit,
        totalPages
      };
      
    } catch (error) {
      MyLogger.error('Error fetching all payment history', { error });
      throw error;
    }
  }
}

export default new FactoryCustomerPaymentsMediator();

