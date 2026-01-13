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
    pagination: {
        payments: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
        orders: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    };
}

export interface PaymentHistoryQueryParams {
    payments_page?: number;
    payments_limit?: number;
    orders_page?: number;
    orders_limit?: number;
    payment_type?: 'upfront' | 'due_payment' | 'refund' | 'adjustment' | 'all';
    order_status_filter?: 'due_amounts' | 'all';
}

export class CustomerPaymentHistoryMediator {
    static async getCustomerPaymentHistory(
        customerId: number,
        params?: PaymentHistoryQueryParams
    ): Promise<CustomerPaymentHistoryResponse> {
        const action = 'CustomerPaymentHistoryMediator.getCustomerPaymentHistory';
        try {
            const paymentsPage = params?.payments_page || 1;
            const paymentsLimit = params?.payments_limit || 20;
            const ordersPage = params?.orders_page || 1;
            const ordersLimit = params?.orders_limit || 20;

            MyLogger.info(action, { customerId, params });

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

            // Build payment type filter
            let paymentTypeFilter = '';
            const paymentsCountParams: any[] = [customerId];
            const paymentsQueryParams: any[] = [customerId];
            
            if (params?.payment_type && params.payment_type !== 'all') {
                paymentTypeFilter = 'AND cp.payment_type = $2';
                paymentsCountParams.push(params.payment_type);
                paymentsQueryParams.push(params.payment_type);
            }

            // Get total count of payments
            const paymentsCountQuery = `
                SELECT COUNT(*) as total
                FROM customer_payments cp
                WHERE cp.customer_id = $1 ${paymentTypeFilter}
            `;
            const paymentsCountResult = await pool.query(
                paymentsCountQuery, 
                paymentsCountParams
            );
            const totalPayments = parseInt(paymentsCountResult.rows[0].total);
            const paymentsOffset = (paymentsPage - 1) * paymentsLimit;

            // Get paginated payments for the customer
            const limitParamIndex = paymentsQueryParams.length + 1;
            const offsetParamIndex = paymentsQueryParams.length + 2;
            paymentsQueryParams.push(paymentsLimit, paymentsOffset);

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
                WHERE cp.customer_id = $1 ${paymentTypeFilter}
                ORDER BY cp.payment_date DESC, cp.recorded_at DESC
                LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
            `;
            const paymentsResult = await pool.query(paymentsQuery, paymentsQueryParams);

            // Build order filter (for due_amounts tab)
            let orderFilter = '';
            if (params?.order_status_filter === 'due_amounts') {
                orderFilter = 'AND due_amount > 0';
            }

            // Get total count of orders
            const ordersCountQuery = `
                SELECT COUNT(*) as total
                FROM sales_orders
                WHERE customer_id = $1 ${orderFilter}
            `;
            const ordersCountResult = await pool.query(
                ordersCountQuery, 
                [customerId]
            );
            const totalOrders = parseInt(ordersCountResult.rows[0].total);
            const ordersOffset = (ordersPage - 1) * ordersLimit;

            // Get paginated orders for the customer
            const ordersQueryParams: any[] = [customerId, ordersLimit, ordersOffset];
            const ordersLimitIndex = 2;
            const ordersOffsetIndex = 3;

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
                WHERE customer_id = $1 ${orderFilter}
                ORDER BY order_date DESC
                LIMIT $${ordersLimitIndex} OFFSET $${ordersOffsetIndex}
            `;
            const ordersResult = await pool.query(ordersQuery, ordersQueryParams);

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

            // Get all payments and orders for summary calculations (not paginated)
            const allPaymentsQuery = `
                SELECT 
                    cp.payment_type,
                    cp.payment_amount,
                    cp.payment_date
                FROM customer_payments cp
                WHERE cp.customer_id = $1
                ORDER BY cp.payment_date DESC
            `;
            const allPaymentsResult = await pool.query(allPaymentsQuery, [customerId]);

            const allOrdersQuery = `
                SELECT 
                    order_date,
                    total_amount,
                    cash_received,
                    due_amount
                FROM sales_orders
                WHERE customer_id = $1
                ORDER BY order_date DESC
            `;
            const allOrdersResult = await pool.query(allOrdersQuery, [customerId]);

            // Calculate summary statistics from all data
            const allPayments = allPaymentsResult.rows.map((p: any) => ({
                payment_type: p.payment_type,
                payment_amount: parseFloat(p.payment_amount),
                payment_date: p.payment_date
            }));

            const allOrders = allOrdersResult.rows.map((o: any) => ({
                total_amount: parseFloat(o.total_amount) || 0,
                cash_received: parseFloat(o.cash_received) || 0,
                due_amount: parseFloat(o.due_amount) || 0,
                order_date: o.order_date
            }));

            const totalOrderValue = allOrders.reduce((sum: number, order: any) => sum + order.total_amount, 0);
            const totalUpfrontPayments = allPayments
                .filter((p: any) => p.payment_type === 'upfront')
                .reduce((sum: number, p: any) => sum + p.payment_amount, 0);
            const totalDuePaymentsCollected = allPayments
                .filter((p: any) => p.payment_type === 'due_payment')
                .reduce((sum: number, p: any) => sum + p.payment_amount, 0);
            const totalDueAmounts = allOrders.reduce((sum: number, order: any) => sum + order.due_amount, 0);
            const currentOutstanding = parseFloat(customer.due_amount) || 0;
            const totalPaid = allPayments.reduce((sum: number, p: any) => sum + p.payment_amount, 0);
            const totalRefunds = allPayments
                .filter((p: any) => p.payment_type === 'refund')
                .reduce((sum: number, p: any) => sum + p.payment_amount, 0);

            const lastOrderDate = allOrders.length > 0 ? allOrders[0].order_date : null;
            const lastPaymentDate = allPayments.length > 0 ? allPayments[0].payment_date : null;

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

            const paymentsTotalPages = Math.ceil(totalPayments / paymentsLimit);
            const ordersTotalPages = Math.ceil(totalOrders / ordersLimit);

            MyLogger.success(action, { 
                customerId, 
                paymentsCount: payments.length, 
                ordersCount: orders.length,
                paymentsPage,
                ordersPage
            });

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
                orders,
                pagination: {
                    payments: {
                        page: paymentsPage,
                        limit: paymentsLimit,
                        total: totalPayments,
                        totalPages: paymentsTotalPages
                    },
                    orders: {
                        page: ordersPage,
                        limit: ordersLimit,
                        total: totalOrders,
                        totalPages: ordersTotalPages
                    }
                }
            };
        } catch (error: any) {
            MyLogger.error(action, error, { customerId });
            throw error;
        }
    }
}
