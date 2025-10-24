import { DashboardStats } from "../../types";
import { MediatorInterface } from "@/types";
import pool from "@/database/connection";
import { MyLogger } from "@/utils/new-logger";

class GetDashboardStatsMediator implements MediatorInterface {
  async process(data: any): Promise<any> {
    throw new Error("Not Implemented");
  }

  // Get dashboard statistics
  async getDashboardStats(salesRepId?: number): Promise<DashboardStats> {
    let action = "Get Dashboard Statistics";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { salesRepId });

      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      // Build sales rep filter
      const salesRepCondition = salesRepId ? "sales_rep_id = $1" : "";
      const salesRepParams = salesRepId ? [salesRepId] : [];

      // Get total customers
      const totalCustomersQuery = `
        SELECT COUNT(*) as total
        FROM sales_rep_customers
        ${salesRepCondition ? "WHERE " + salesRepCondition : ""}
      `;

      const totalCustomersResult = await client.query(
        totalCustomersQuery,
        salesRepParams
      );
      const totalCustomers = parseInt(totalCustomersResult.rows[0].total);

      // Get active orders (not delivered or cancelled)
      const activeOrdersQuery = `
        SELECT COUNT(*) as total
        FROM sales_rep_orders
        WHERE status IN ('draft', 'confirmed', 'processing', 'shipped')
        ${salesRepCondition ? "AND " + salesRepCondition : ""}
      `;

      const activeOrdersResult = await client.query(
        activeOrdersQuery,
        salesRepParams
      );
      const activeOrders = parseInt(activeOrdersResult.rows[0].total);

      // Get pending invoices (sent but not paid)
      const pendingInvoicesQuery = `
        SELECT COUNT(*) as total
        FROM sales_rep_invoices
        WHERE status = 'sent'
        ${salesRepCondition ? "AND " + salesRepCondition : ""}
      `;

      const pendingInvoicesResult = await client.query(
        pendingInvoicesQuery,
        salesRepParams
      );
      const pendingInvoices = parseInt(pendingInvoicesResult.rows[0].total);

      // Get overdue payments (invoices past due date and not paid)
      const overduePaymentsQuery = `
        SELECT COUNT(*) as total
        FROM sales_rep_invoices
        WHERE due_date < CURRENT_DATE
        AND status IN ('sent', 'overdue')
        ${salesRepCondition ? "AND " + salesRepCondition : ""}
      `;

      const overduePaymentsResult = await client.query(
        overduePaymentsQuery,
        salesRepParams
      );
      const overduePayments = parseInt(overduePaymentsResult.rows[0].total);

      // Get monthly sales
      const monthlySalesQuery = `
        SELECT COALESCE(SUM(final_amount), 0) as total
        FROM sales_rep_orders
        WHERE order_date::date >= $1::date
        AND status != 'cancelled'
        ${salesRepCondition ? "AND sales_rep_id = $2" : ""}
      `;

      const monthlySalesParams = [startOfMonth, ...salesRepParams];

      const monthlySalesResult = await client.query(
        monthlySalesQuery,
        monthlySalesParams
      );
      const monthlySales = parseFloat(monthlySalesResult.rows[0].total);

      // Get recent orders (last 5)
      const recentOrdersQuery = `
        SELECT 
          o.id,
          o.customer_id,
          o.order_number,
          o.order_date,
          o.status,
          o.total_amount,
          o.discount_amount,
          o.tax_amount,
          o.final_amount,
          o.sales_rep_id,
          o.notes,
          o.created_at,
          o.updated_at,
          c.name as customer_name,
          c.email as customer_email,
          c.phone as customer_phone
        FROM sales_rep_orders o
        LEFT JOIN sales_rep_customers c ON o.customer_id = c.id
        ${salesRepCondition ? "WHERE o." + salesRepCondition : ""}
        ORDER BY o.created_at DESC
        LIMIT 5
      `;

      const recentOrdersResult = await client.query(
        recentOrdersQuery,
        salesRepParams
      );

      // Get order items for recent orders
      const recentOrders = [];
      for (const orderRow of recentOrdersResult.rows) {
        const items = await this.getOrderItems(orderRow.id);

        recentOrders.push({
          ...orderRow,
          customer: orderRow.customer_id
            ? {
                id: orderRow.customer_id,
                name: orderRow.customer_name,
                email: orderRow.customer_email,
                phone: orderRow.customer_phone,
                address: null,
                city: null,
                state: null,
                postal_code: null,
                credit_limit: 0,
                current_balance: 0,
                sales_rep_id: null,
                created_at: new Date(),
                updated_at: new Date(),
              }
            : undefined,
          items,
        });
      }

      // Get upcoming deliveries (next 5)
      const upcomingDeliveriesQuery = `
        SELECT
          d.id,
          d.order_id,
          d.delivery_number,
          d.delivery_date,
          d.status,
          d.tracking_number,
          d.courier_service,
          d.delivery_address,
          d.contact_person,
          d.contact_phone,
          d.notes,
          d.sales_rep_id,
          d.created_at,
          d.updated_at,
          o.order_number,
          c.name as customer_name
        FROM sales_rep_deliveries d
        LEFT JOIN sales_rep_orders o ON d.order_id = o.id
        LEFT JOIN sales_rep_customers c ON o.customer_id = c.id
        WHERE d.status IN ('pending', 'in_transit')
        ${salesRepCondition ? "AND d." + salesRepCondition : ""}
        ORDER BY d.delivery_date ASC
        LIMIT 5
      `;

      const upcomingDeliveriesResult = await client.query(
        upcomingDeliveriesQuery,
        salesRepParams
      );

      // Get unread notifications
      const unreadNotificationsQuery = `
        SELECT COUNT(*) as total
        FROM sales_rep_notifications
        WHERE is_read = false
        ${salesRepCondition ? "AND " + salesRepCondition : ""}
      `;

      const unreadNotificationsResult = await client.query(
        unreadNotificationsQuery,
        salesRepParams
      );
      const unreadNotifications = parseInt(
        unreadNotificationsResult.rows[0].total
      );

      const stats: DashboardStats = {
        total_customers: totalCustomers,
        active_orders: activeOrders,
        pending_invoices: pendingInvoices,
        overdue_payments: overduePayments,
        monthly_sales: monthlySales,
        monthly_target: 100000, // This could be configurable per sales rep
        recent_orders: recentOrders,
        upcoming_deliveries: upcomingDeliveriesResult.rows.map((delivery) => ({
          ...delivery,
          order: {
            id: delivery.order_id,
            order_number: delivery.order_number,
            customer: delivery.customer_id
              ? {
                  id: delivery.customer_id,
                  name: delivery.customer_name,
                  email: null,
                  phone: null,
                  address: null,
                  city: null,
                  state: null,
                  postal_code: null,
                  credit_limit: 0,
                  current_balance: 0,
                  sales_rep_id: null,
                  created_at: new Date(),
                  updated_at: new Date(),
                }
              : undefined,
          },
        })),
        unread_notifications: unreadNotifications,
      };

      MyLogger.success(action, {
        salesRepId,
        totalCustomers,
        activeOrders,
        pendingInvoices,
        overduePayments,
        monthlySales,
        recentOrdersCount: recentOrders.length,
        upcomingDeliveriesCount: upcomingDeliveriesResult.rows.length,
        unreadNotifications,
      });

      return stats;
    } catch (error: any) {
      MyLogger.error(action, error, { salesRepId });
      throw error;
    } finally {
      client.release();
    }
  }

  // Get order items for a specific order (helper method)
  private async getOrderItems(orderId: number): Promise<any[]> {
    const itemsQuery = `
      SELECT
        oi.id,
        oi.order_id,
        oi.product_id,
        oi.product_name,
        oi.quantity,
        oi.unit_price,
        oi.discount,
        oi.total_price,
        oi.created_at,
        oi.updated_at
      FROM sales_rep_order_items oi
      WHERE oi.order_id = $1
      ORDER BY oi.id
    `;

    const itemsResult = await pool.query(itemsQuery, [orderId]);
    return itemsResult.rows;
  }
}

export default new GetDashboardStatsMediator();
