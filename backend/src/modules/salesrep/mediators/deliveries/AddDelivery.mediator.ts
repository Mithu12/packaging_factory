import { SalesRepDelivery, CreateDeliveryRequest } from "../../types";
import { MediatorInterface } from "@/types";
import pool from "@/database/connection";
import { MyLogger } from "@/utils/new-logger";

class AddDeliveryMediator implements MediatorInterface {
  async process(data: any): Promise<any> {
    throw new Error("Not Implemented");
  }

  // Create new delivery
  async createDelivery(
    data: CreateDeliveryRequest,
    salesRepId?: number
  ): Promise<SalesRepDelivery> {
    let action = "Create Delivery";
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      MyLogger.info(action, { deliveryData: data, salesRepId });

      // Validate order exists and can be shipped
      const orderQuery = `
        SELECT o.id, o.status, o.final_amount, c.name as customer_name
        FROM sales_rep_orders o
        LEFT JOIN sales_rep_customers c ON o.customer_id = c.id
        WHERE o.id = $1
      `;
      const orderResult = await client.query(orderQuery, [data.order_id]);

      if (orderResult.rows.length === 0) {
        throw new Error("Order not found");
      }

      const order = orderResult.rows[0];

      // Check if order can be shipped (must be confirmed or processing)
      if (!["confirmed", "processing"].includes(order.status)) {
        throw new Error(
          `Order must be confirmed or processing to schedule delivery. Current status: ${order.status}`
        );
      }

      // Check if delivery already exists for this order
      const existingDeliveryQuery =
        "SELECT id FROM sales_rep_deliveries WHERE order_id = $1";
      const existingDeliveryResult = await client.query(existingDeliveryQuery, [
        data.order_id,
      ]);

      if (existingDeliveryResult.rows.length > 0) {
        throw new Error("Delivery already exists for this order");
      }

      // Generate delivery number
      const deliveryNumber = await this.generateDeliveryNumber(client);

      // Insert delivery
      const insertDeliveryQuery = `
        INSERT INTO sales_rep_deliveries (
          order_id,
          delivery_number,
          delivery_date,
          status,
          tracking_number,
          courier_service,
          delivery_address,
          contact_person,
          contact_phone,
          notes,
          sales_rep_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING
          id,
          order_id,
          delivery_number,
          delivery_date,
          status,
          tracking_number,
          courier_service,
          delivery_address,
          contact_person,
          contact_phone,
          notes,
          sales_rep_id,
          created_at,
          updated_at
      `;

      const deliveryResult = await client.query(insertDeliveryQuery, [
        data.order_id,
        deliveryNumber,
        data.delivery_date || new Date(Date.now() + 24 * 60 * 60 * 1000), // Default to tomorrow
        "pending",
        data.tracking_number || null,
        data.courier_service || null,
        data.delivery_address,
        data.contact_person,
        data.contact_phone,
        data.notes || null,
        salesRepId || null,
      ]);

      const delivery = deliveryResult.rows[0];

      // Update order status to shipped
      await client.query(
        "UPDATE sales_rep_orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        ["shipped", data.order_id]
      );

      await client.query("COMMIT");
      MyLogger.success(action, {
        deliveryId: delivery.id,
        deliveryNumber: delivery.delivery_number,
        orderId: data.order_id,
        customerName: order.customer_name,
        status: delivery.status,
        courierService: delivery.courier_service,
        salesRepId: delivery.sales_rep_id,
      });

      // Return the complete delivery with order and customer data
      return await this.getCompleteDelivery(client, delivery.id);
    } catch (error: any) {
      await client.query("ROLLBACK");
      MyLogger.error(action, error, { deliveryData: data, salesRepId });
      throw error;
    } finally {
      client.release();
    }
  }

  // Generate unique delivery number using database sequence
  private async generateDeliveryNumber(client: any): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");

    // Get next value from sequence
    const sequenceQuery = `SELECT nextval('sales_rep_delivery_number_seq') as seq_num`;
    const sequenceResult = await client.query(sequenceQuery);
    const sequenceNumber = sequenceResult.rows[0].seq_num;

    return `DEL-${dateStr}-${String(sequenceNumber).padStart(4, "0")}`;
  }

  // Get complete delivery with order and customer data (helper method)
  private async getCompleteDelivery(
    client: any,
    deliveryId: number
  ): Promise<SalesRepDelivery> {
    const deliveryQuery = `
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
        o.customer_id,
        c.name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        c.address as customer_address,
        c.city as customer_city,
        c.state as customer_state,
        c.postal_code as customer_postal_code
      FROM sales_rep_deliveries d
      JOIN sales_rep_orders o ON d.order_id = o.id
      LEFT JOIN sales_rep_customers c ON o.customer_id = c.id
      WHERE d.id = $1
    `;

    const deliveryResult = await client.query(deliveryQuery, [deliveryId]);
    const deliveryRow = deliveryResult.rows[0];

    return {
      ...deliveryRow,
      order: {
        id: deliveryRow.order_id,
        order_number: deliveryRow.order_number,
        customer_id: deliveryRow.customer_id,
        customer: deliveryRow.customer_id
          ? {
              id: deliveryRow.customer_id,
              name: deliveryRow.customer_name,
              email: deliveryRow.customer_email,
              phone: deliveryRow.customer_phone,
              address: deliveryRow.customer_address,
              city: deliveryRow.customer_city,
              state: deliveryRow.customer_state,
              postal_code: deliveryRow.customer_postal_code,
              credit_limit: 0,
              current_balance: 0,
              sales_rep_id: null,
              created_at: new Date(),
              updated_at: new Date(),
            }
          : undefined,
      },
    };
  }
}

export default new AddDeliveryMediator();
