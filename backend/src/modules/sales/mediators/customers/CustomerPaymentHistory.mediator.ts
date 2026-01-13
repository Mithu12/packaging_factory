import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';

export interface CustomerPaymentHistoryResponse {
    customer: {
        id: number;
        name: string;
        email: string | null;
        phone: string | null;
        due_amount: number;
    };
    summary: {
        total_orders: number;
        total_order_value: number;
        total_upfront_payments: number;
        total_due_payments_collected: number;
        total_due_amounts: number;
        current_outstanding: number;
        total_paid: number;
        total_refunds: number;
        last_order_date: string | null;
        last_payment_date: string | null;
    };
    payments: Array<{
        id: number;
        payment_type: 'upfront' | 'due_payment' | 'refund' | 'adjustment';
        payment_amount: number;
        payment_date: string;
        payment_method: string;
        payment_reference: string | null;
        notes: string | null;
        sales_order_id: number | null;
        order_number: string | null;
        recorded_by_username: string | null;
        recorded_at: string;
    }>;
    orders: Array<{
        id: number;
        order_number: string;
        order_date: string;
        total_amount: number;
        cash_received: number;
        due_amount: number;
        payment_method: string | null;
        payment_status: string;
        status: string;
        payment_type: 'full_cash' | 'partial' | 'credit' | 'full_card' | 'full_bank_transfer';
    }>;
}

export class CustomerPaymentHistoryMediator {
    static async getCustomerPaymentHistory(customerId: number): Promise<CustomerPaymentHistoryResponse> {
        const action = 'CustomerPaymentHistoryMediator.getCustomerPaymentHistory';
        try {
            MyLogger.info(action, { customerId });

            // Get customer info
            const customerQuery = `
                SELECT id, name, email, phone, due_amount
                FROM customers
                WHERE id = $1
            `;
            const customerResult = await pool.query(customerQuery, [customerId]);

            if (customerResult.rows.length === 0) {
                throw new Error(`Customer with ID ${customerId} not found`);
            }

            const customer = customerResult.rows[0];

            // Get all payments for the customer
            const paymentsQuery = `
                SELECT 
                    cp.id,
                    cp.payment_type,
                    cp.payment_amount,
                    cp.payment_date,
                    cp.payment_method,
                    cp.payment_reference,
                    cp.notes,
                    cp.sales_order_id,
                    cp.recorded_at,
                    so.order_number,
                    u.username as recorded_by_username
                FROM customer_payments cp
                LEFT JOIN sales_orders so ON cp.sales_order_id = so.id
                LEFT JOIN users u ON cp.recorded_by = u.id
                WHERE cp.customer_id = $1
                ORDER BY cp.payment_date DESC, cp.recorded_at DESC
            `;
            const paymentsResult = await pool.query(paymentsQuery, [customerId]);

            // Get all orders for the customer
            const ordersQuery = `
                SELECT 
                    id,
                    order_number,
                    order_date,
                    total_amount,
                    cash_received,
                    due_amount,
                    payment_method,
                    payment_status,
                    status
                FROM sales_orders
                WHERE customer_id = $1
                ORDER BY order_date DESC
            `;
            const ordersResult = await pool.query(ordersQuery, [customerId]);

            // Calculate payment type for each order
            const orders = ordersResult.rows.map((order: any) => {
                let paymentType: 'full_cash' | 'partial' | 'credit' | 'full_card' | 'full_bank_transfer';
                const cashReceived = parseFloat(order.cash_received) || 0;
                const dueAmount = parseFloat(order.due_amount) || 0;
                const totalAmount = parseFloat(order.total_amount) || 0;
                const paymentMethod = order.payment_method || 'cash';

                if (cashReceived === totalAmount && dueAmount === 0 && paymentMethod === 'cash') {
                    paymentType = 'full_cash';
                } else if (cashReceived > 0 && dueAmount > 0) {
                    paymentType = 'partial';
                } else if (cashReceived === 0 && dueAmount === totalAmount && paymentMethod === 'credit') {
                    paymentType = 'credit';
                } else if (cashReceived === 0 && dueAmount === 0 && paymentMethod === 'card') {
                    paymentType = 'full_card';
                } else if (cashReceived === 0 && dueAmount === 0 && paymentMethod === 'bank_transfer') {
                    paymentType = 'full_bank_transfer';
                } else {
                    paymentType = 'credit'; // default
                }

                return {
                    id: order.id,
                    order_number: order.order_number,
                    order_date: order.order_date,
                    total_amount: totalAmount,
                    cash_received: cashReceived,
                    due_amount: dueAmount,
                    payment_method: paymentMethod,
                    payment_status: order.payment_status,
                    status: order.status,
                    payment_type: paymentType
                };
            });

            // Process payments
            const payments = paymentsResult.rows.map((payment: any) => ({
                id: payment.id,
                payment_type: payment.payment_type,
                payment_amount: parseFloat(payment.payment_amount),
                payment_date: payment.payment_date,
                payment_method: payment.payment_method,
                payment_reference: payment.payment_reference,
                notes: payment.notes,
                sales_order_id: payment.sales_order_id,
                order_number: payment.order_number,
                recorded_by_username: payment.recorded_by_username,
                recorded_at: payment.recorded_at
            }));

            // Calculate summary statistics
            const totalOrders = orders.length;
            const totalOrderValue = orders.reduce((sum: number, order: any) => sum + order.total_amount, 0);
            const totalUpfrontPayments = payments
                .filter((p: any) => p.payment_type === 'upfront')
                .reduce((sum: number, p: any) => sum + p.payment_amount, 0);
            const totalDuePaymentsCollected = payments
                .filter((p: any) => p.payment_type === 'due_payment')
                .reduce((sum: number, p: any) => sum + p.payment_amount, 0);
            const totalDueAmounts = orders.reduce((sum: number, order: any) => sum + order.due_amount, 0);
            const currentOutstanding = parseFloat(customer.due_amount) || 0;
            const totalPaid = payments.reduce((sum: number, p: any) => sum + p.payment_amount, 0);
            const totalRefunds = payments
                .filter((p: any) => p.payment_type === 'refund')
                .reduce((sum: number, p: any) => sum + p.payment_amount, 0);

            const lastOrderDate = orders.length > 0 ? orders[0].order_date : null;
            const lastPaymentDate = payments.length > 0 ? payments[0].payment_date : null;

            const summary = {
                total_orders: totalOrders,
                total_order_value: totalOrderValue,
                total_upfront_payments: totalUpfrontPayments,
                total_due_payments_collected: totalDuePaymentsCollected,
                total_due_amounts: totalDueAmounts,
                current_outstanding: currentOutstanding,
                total_paid: totalPaid,
                total_refunds: totalRefunds,
                last_order_date: lastOrderDate,
                last_payment_date: lastPaymentDate
            };

            MyLogger.success(action, { customerId, paymentsCount: payments.length, ordersCount: orders.length });

            return {
                customer: {
                    id: customer.id,
                    name: customer.name,
                    email: customer.email,
                    phone: customer.phone,
                    due_amount: currentOutstanding
                },
                summary,
                payments,
                orders
            };
        } catch (error: any) {
            MyLogger.error(action, error, { customerId });
            throw error;
        }
    }
}
