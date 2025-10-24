import { SalesRepOrder, CreateOrderRequest } from "../../types";
import { MediatorInterface } from "@/types";
import pool from "@/database/connection";
import { MyLogger } from "@/utils/new-logger";

class AddOrderMediator implements MediatorInterface {
  async process(data: any): Promise<any> {
    throw new Error("Not Implemented");
  }

  // Create new order
  async createOrder(
    data: CreateOrderRequest,
    salesRepId?: number
  ): Promise<SalesRepOrder> {
    let action = "Create Order";
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      MyLogger.info(action, { orderData: data, salesRepId });

      // Validate customer exists - check both sales_rep_customers and shared customers
      let customer;

      // First check sales_rep_customers table
      const salesRepCustomerQuery =
        "SELECT id, name FROM sales_rep_customers WHERE id = $1";
      const salesRepCustomerResult = await client.query(salesRepCustomerQuery, [
        data.customer_id,
      ]);

      if (salesRepCustomerResult.rows.length > 0) {
        customer = salesRepCustomerResult.rows[0];
      } else {
        // Check if factory module is available and look in shared customers
        const { moduleRegistry } = await import("@/utils/moduleRegistry");
        const { MODULE_NAMES } = await import("@/utils/moduleRegistry");
        const isFactoryAvailable = moduleRegistry.isModuleAvailable(
          MODULE_NAMES.FACTORY
        );

        if (isFactoryAvailable) {
          // Check factory_customers table (shared customers)
          const sharedCustomerQuery =
            "SELECT id, name FROM factory_customers WHERE id = $1";
          const sharedCustomerResult = await client.query(sharedCustomerQuery, [
            data.customer_id,
          ]);

          if (sharedCustomerResult.rows.length > 0) {
            customer = sharedCustomerResult.rows[0];
          } else {
            throw new Error("Customer not found");
          }
        } else {
          throw new Error("Customer not found");
        }
      }

      // Generate order number
      const orderNumber = await this.generateOrderNumber(client);

      // Calculate totals
      let totalAmount = 0;
      let discountAmount = data.discount_amount || 0;
      let taxAmount = data.tax_amount || 0;

      if (data.items && data.items.length > 0) {
        totalAmount = data.items.reduce((sum, item) => {
          return sum + (item.quantity * item.unit_price - (item.discount || 0));
        }, 0);
      }

      const finalAmount = totalAmount - discountAmount + taxAmount;

      // Insert order
      const insertOrderQuery = `
        INSERT INTO sales_rep_orders (
          customer_id,
          order_number,
          order_date,
          status,
          total_amount,
          discount_amount,
          tax_amount,
          final_amount,
          sales_rep_id,
          notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING
          id,
          customer_id,
          order_number,
          order_date,
          status,
          total_amount,
          discount_amount,
          tax_amount,
          final_amount,
          sales_rep_id,
          notes,
          created_at,
          updated_at
      `;

      const orderResult = await client.query(insertOrderQuery, [
        Number(data.customer_id),
        orderNumber,
        data.order_date ? new Date(data.order_date) : new Date(),
        data.status || "draft",
        Number(totalAmount),
        Number(discountAmount),
        Number(taxAmount),
        Number(finalAmount),
        salesRepId || null,
        data.notes || null,
      ]);

      const order = orderResult.rows[0];

      // Create order items
      if (data.items && data.items.length > 0) {
        await this.createOrderItems(client, order.id, data.items);
      }

      await client.query("COMMIT");
      MyLogger.success(action, {
        orderId: order.id,
        orderNumber: order.order_number,
        customerName: customer.name,
        totalAmount: order.total_amount,
        finalAmount: order.final_amount,
        itemsCount: data.items?.length || 0,
        salesRepId: order.sales_rep_id,
      });

      // Return the complete order with customer and items
      return await this.getCompleteOrder(client, order.id);
    } catch (error: any) {
      await client.query("ROLLBACK");
      MyLogger.error(action, error, { orderData: data, salesRepId });
      throw error;
    } finally {
      client.release();
    }
  }

  // Generate unique order number
  private async generateOrderNumber(client: any): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");

    const countQuery = `
      SELECT COUNT(*) as count
      FROM sales_rep_orders
      WHERE order_date::date = $1
    `;

    const countResult = await client.query(countQuery, [today]);
    const count = parseInt(countResult.rows[0].count);

    return `SR-${dateStr}-${String(count + 1).padStart(4, "0")}`;
  }

  // Create order items
  private async createOrderItems(
    client: any,
    orderId: number,
    items: any[]
  ): Promise<void> {
    const insertItemQuery = `
      INSERT INTO sales_rep_order_items (
        order_id,
        product_id,
        product_name,
        quantity,
        unit_price,
        discount,
        total_price
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    for (const item of items) {
      const totalPrice =
        Number(item.quantity) * Number(item.unit_price) - Number(item.discount);

      await client.query(insertItemQuery, [
        Number(orderId),
        item.product_id ? Number(item.product_id) : null,
        item.product_name,
        Number(item.quantity),
        Number(item.unit_price),
        Number(item.discount || 0),
        Number(totalPrice),
      ]);
    }
  }

  // Get complete order with customer and items (helper method)
  private async getCompleteOrder(
    client: any,
    orderId: number
  ): Promise<SalesRepOrder> {
    const orderQuery = `
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
        c.phone as customer_phone,
        c.address as customer_address,
        c.city as customer_city,
        c.state as customer_state,
        c.postal_code as customer_postal_code
      FROM sales_rep_orders o
      LEFT JOIN sales_rep_customers c ON o.customer_id = c.id
      WHERE o.id = $1
    `;

    const orderResult = await client.query(orderQuery, [orderId]);
    const orderRow = orderResult.rows[0];

    // Get order items
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

    const itemsResult = await client.query(itemsQuery, [orderId]);

    return {
      ...orderRow,
      customer: orderRow.customer_id
        ? {
            id: orderRow.customer_id,
            name: orderRow.customer_name,
            email: orderRow.customer_email,
            phone: orderRow.customer_phone,
            address: orderRow.customer_address,
            city: orderRow.customer_city,
            state: orderRow.customer_state,
            postal_code: orderRow.customer_postal_code,
            credit_limit: 0,
            current_balance: 0,
            sales_rep_id: null,
            created_at: new Date(),
            updated_at: new Date(),
          }
        : undefined,
      items: itemsResult.rows,
    };
  }
}

export default new AddOrderMediator();
