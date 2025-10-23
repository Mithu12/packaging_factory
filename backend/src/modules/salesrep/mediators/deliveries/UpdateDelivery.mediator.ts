import {
  SalesRepDelivery,
  UpdateDeliveryRequest,
} from '../../types';
import { MediatorInterface } from '@/types';
import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';

class UpdateDeliveryMediator implements MediatorInterface {
  async process(data: any): Promise<any> {
    throw new Error('Not Implemented');
  }

  // Update delivery
  async updateDelivery(id: number, data: UpdateDeliveryRequest): Promise<SalesRepDelivery | null> {
    let action = 'Update Delivery';
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      MyLogger.info(action, { deliveryId: id, updateData: data });

      // Check if delivery exists
      const existingDelivery = await this.getDelivery(id);
      if (!existingDelivery) {
        throw new Error('Delivery not found');
      }

      // Update delivery
      const updateQuery = `
        UPDATE sales_rep_deliveries SET
          delivery_date = COALESCE($1, delivery_date),
          tracking_number = COALESCE($2, tracking_number),
          courier_service = COALESCE($3, courier_service),
          delivery_address = COALESCE($4, delivery_address),
          contact_person = COALESCE($5, contact_person),
          contact_phone = COALESCE($6, contact_phone),
          notes = COALESCE($7, notes),
          status = COALESCE($8, status),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $9
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

      const result = await client.query(updateQuery, [
        data.delivery_date,
        data.tracking_number,
        data.courier_service,
        data.delivery_address,
        data.contact_person,
        data.contact_phone,
        data.notes,
        data.status,
        id
      ]);

      const delivery = result.rows[0];

      // If status is delivered, update order status
      if (data.status === 'delivered') {
        await client.query(
          'UPDATE sales_rep_orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          ['delivered', delivery.order_id]
        );
      }

      await client.query('COMMIT');
      MyLogger.success(action, {
        deliveryId: id,
        deliveryNumber: delivery.delivery_number,
        status: delivery.status,
        updatedFields: Object.keys(data),
        orderStatusUpdated: data.status === 'delivered'
      });

      // Return the complete delivery with order and customer data
      return await this.getCompleteDelivery(client, id);
    } catch (error: any) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { deliveryId: id, updateData: data });
      throw error;
    } finally {
      client.release();
    }
  }

  // Update delivery status
  async updateDeliveryStatus(id: number, status: string): Promise<SalesRepDelivery | null> {
    let action = 'Update Delivery Status';
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      MyLogger.info(action, { deliveryId: id, status });

      // Check if delivery exists
      const existingDelivery = await this.getDelivery(id);
      if (!existingDelivery) {
        throw new Error('Delivery not found');
      }

      // Update delivery status
      const updateQuery = `
        UPDATE sales_rep_deliveries SET
          status = $1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
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

      const result = await client.query(updateQuery, [status, id]);
      const delivery = result.rows[0];

      // If status is delivered, update order status
      if (status === 'delivered') {
        await client.query(
          'UPDATE sales_rep_orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          ['delivered', delivery.order_id]
        );
      }

      await client.query('COMMIT');
      MyLogger.success(action, {
        deliveryId: id,
        deliveryNumber: delivery.delivery_number,
        oldStatus: existingDelivery.status,
        newStatus: status,
        orderStatusUpdated: status === 'delivered'
      });

      // Return the complete delivery with order and customer data
      return await this.getCompleteDelivery(client, id);
    } catch (error: any) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { deliveryId: id, status });
      throw error;
    } finally {
      client.release();
    }
  }

  // Get delivery by ID (helper method)
  private async getDelivery(id: number): Promise<any | null> {
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
        d.updated_at
      FROM sales_rep_deliveries d
      WHERE d.id = $1
    `;

    const result = await pool.query(deliveryQuery, [id]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  // Get complete delivery with order and customer data (helper method)
  private async getCompleteDelivery(client: any, deliveryId: number): Promise<SalesRepDelivery> {
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
        customer: deliveryRow.customer_id ? {
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
          updated_at: new Date()
        } : undefined
      }
    };
  }
}

export default new UpdateDeliveryMediator();
