import pool from "@/database/connection";
import { MyLogger } from "@/utils/new-logger";
import { eventBus, EVENT_NAMES } from "@/utils/eventBus";
import { interModuleConnector } from "@/utils/InterModuleConnector";
import {
  StockTransfer,
  CreateStockTransferRequest,
  UpdateStockTransferRequest,
  StockTransferQueryParams,
} from "@/types/distribution";

export class StockTransferMediator {
  static async getStockTransfers(
    params: StockTransferQueryParams = {}
  ): Promise<{
    transfers: StockTransfer[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const action = "Get Stock Transfers";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { params });

      const {
        page = 1,
        limit = 20,
        search,
        product_id,
        from_center_id,
        to_center_id,
        status,
        priority,
        sortBy = "created_at",
        sortOrder = "desc",
      } = params;

      const offset = (page - 1) * limit;

      // Build the base query with joins
      let query = `
        SELECT 
          st.*,
          p.name as product_name,
          p.sku as product_sku,
          dc_from.name as from_center_name,
          dc_to.name as to_center_name,
          u_req.full_name as requested_by_name,
          u_app.full_name as approved_by_name
        FROM stock_transfers st
        JOIN products p ON st.product_id = p.id
        LEFT JOIN distribution_centers dc_from ON st.from_center_id = dc_from.id
        JOIN distribution_centers dc_to ON st.to_center_id = dc_to.id
        JOIN users u_req ON st.requested_by = u_req.id
        LEFT JOIN users u_app ON st.approved_by = u_app.id
        WHERE 1=1
      `;

      const queryParams: any[] = [];
      let paramIndex = 1;

      // Apply filters
      if (search) {
        query += ` AND (
          p.name ILIKE $${paramIndex} OR 
          p.sku ILIKE $${paramIndex} OR 
          st.transfer_number ILIKE $${paramIndex} OR
          dc_from.name ILIKE $${paramIndex} OR
          dc_to.name ILIKE $${paramIndex}
        )`;
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      if (product_id) {
        query += ` AND st.product_id = $${paramIndex}`;
        queryParams.push(product_id);
        paramIndex++;
      }

      if (from_center_id) {
        query += ` AND st.from_center_id = $${paramIndex}`;
        queryParams.push(from_center_id);
        paramIndex++;
      }

      if (to_center_id) {
        query += ` AND st.to_center_id = $${paramIndex}`;
        queryParams.push(to_center_id);
        paramIndex++;
      }

      if (status) {
        query += ` AND st.status = $${paramIndex}`;
        queryParams.push(status);
        paramIndex++;
      }

      if (priority) {
        query += ` AND st.priority = $${paramIndex}`;
        queryParams.push(priority);
        paramIndex++;
      }

      // Add sorting
      const validSortColumns = [
        "created_at",
        "request_date",
        "quantity",
        "status",
        "priority",
        "product_name",
      ];
      const validSortOrders = ["asc", "desc"];

      const finalSortBy = validSortColumns.includes(sortBy)
        ? sortBy
        : "created_at";
      const finalSortOrder = validSortOrders.includes(sortOrder)
        ? sortOrder
        : "desc";

      query += ` ORDER BY ${finalSortBy} ${finalSortOrder}`;

      // Get total count
      const countQuery = query
        .replace(/SELECT[\s\S]*?FROM/, "SELECT COUNT(*) FROM")
        .replace(/ORDER BY.*$/, "");

      const countResult = await client.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].count);
      const totalPages = Math.ceil(total / limit);

      // Add pagination
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      queryParams.push(limit, offset);

      const result = await client.query(query, queryParams);

      MyLogger.success(action, {
        transfersCount: result.rows.length,
        total,
        page,
        totalPages,
      });

      return {
        transfers: result.rows,
        total,
        page,
        totalPages,
      };
    } catch (error: any) {
      MyLogger.error(action, error, { params });
      throw error;
    } finally {
      client.release();
    }
  }

  static async getStockTransferById(id: number): Promise<StockTransfer | null> {
    const action = "Get Stock Transfer By ID";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { transferId: id });

      const query = `
        SELECT 
          st.*,
          p.name as product_name,
          p.sku as product_sku,
          dc_from.name as from_center_name,
          dc_to.name as to_center_name,
          u_req.full_name as requested_by_name,
          u_app.full_name as approved_by_name
        FROM stock_transfers st
        JOIN products p ON st.product_id = p.id
        LEFT JOIN distribution_centers dc_from ON st.from_center_id = dc_from.id
        JOIN distribution_centers dc_to ON st.to_center_id = dc_to.id
        JOIN users u_req ON st.requested_by = u_req.id
        LEFT JOIN users u_app ON st.approved_by = u_app.id
        WHERE st.id = $1
      `;

      const result = await client.query(query, [id]);

      if (result.rows.length === 0) {
        MyLogger.info(action, { transferId: id, found: false });
        return null;
      }

      MyLogger.success(action, {
        transferId: id,
        transferNumber: result.rows[0].transfer_number,
      });

      return result.rows[0];
    } catch (error: any) {
      MyLogger.error(action, error, { transferId: id });
      throw error;
    } finally {
      client.release();
    }
  }

  static async createStockTransfer(
    data: CreateStockTransferRequest,
    requestedBy: number
  ): Promise<StockTransfer> {
    const action = "Create Stock Transfer";
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      MyLogger.info(action, { ...data, requestedBy });

      // Generate transfer number
      const transferNumberResult = await client.query(`
        SELECT CONCAT('ST-', TO_CHAR(CURRENT_DATE, 'YYYY-MM'), '-', 
               LPAD(NEXTVAL('transfer_number_seq')::text, 6, '0')) as transfer_number
      `);
      const transferNumber = transferNumberResult.rows[0].transfer_number;

      // Calculate total cost if unit cost is provided
      const totalCost = data.unit_cost ? data.quantity * data.unit_cost : null;

      const insertQuery = `
        INSERT INTO stock_transfers (
          transfer_number, product_id, from_center_id, to_center_id, quantity,
          unit_cost, total_cost, priority, tracking_number, carrier,
          shipping_cost, notes, requested_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `;

      const values = [
        transferNumber,
        data.product_id,
        data.from_center_id || null,
        data.to_center_id,
        data.quantity,
        data.unit_cost || null,
        totalCost,
        data.priority || "normal",
        data.tracking_number || null,
        data.carrier || null,
        data.shipping_cost || null,
        data.notes || null,
        requestedBy,
      ];

      const result = await client.query(insertQuery, values);
      const transfer = result.rows[0];

      // If from_center_id is provided, check and reserve stock
      if (data.from_center_id) {
        const stockCheckQuery = `
          SELECT available_stock 
          FROM product_locations 
          WHERE product_id = $1 AND distribution_center_id = $2
        `;
        const stockResult = await client.query(stockCheckQuery, [
          data.product_id,
          data.from_center_id,
        ]);

        if (
          stockResult.rows.length === 0 ||
          stockResult.rows[0].available_stock < data.quantity
        ) {
          throw new Error("Insufficient stock available for transfer");
        }

        // Reserve stock at source location
        const reserveStockQuery = `
          UPDATE product_locations 
          SET reserved_stock = reserved_stock + $1,
              updated_at = CURRENT_TIMESTAMP
          WHERE product_id = $2 AND distribution_center_id = $3
        `;
        await client.query(reserveStockQuery, [
          data.quantity,
          data.product_id,
          data.from_center_id,
        ]);
      }

      await client.query("COMMIT");

      MyLogger.success(action, {
        transferId: transfer.id,
        transferNumber: transfer.transfer_number,
        productId: data.product_id,
        quantity: data.quantity,
      });

      // Return the transfer with joined data
      return (await this.getStockTransferById(transfer.id)) as StockTransfer;
    } catch (error: any) {
      await client.query("ROLLBACK");
      MyLogger.error(action, error, { ...data, requestedBy });
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateStockTransferStatus(
    id: number,
    status: string,
    userId: number,
    notes?: string
  ): Promise<StockTransfer> {
    const action = "Update Stock Transfer Status";
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      MyLogger.info(action, { transferId: id, status, userId });

      // Get current transfer data
      const currentTransfer = await this.getStockTransferById(id);
      if (!currentTransfer) {
        throw new Error("Stock transfer not found");
      }

      let updateQuery = `
        UPDATE stock_transfers 
        SET status = $1, updated_at = CURRENT_TIMESTAMP
      `;
      let values: any[] = [status];
      let paramIndex = 2;

      // Add status-specific fields
      switch (status) {
        case "approved":
          updateQuery += `, approved_by = $${paramIndex.toString()}`;
          values.push(userId);
          paramIndex++;
          break;
        case "shipped":
          updateQuery += `, shipped_by = $${paramIndex.toString()}, shipped_date = CURRENT_TIMESTAMP`;
          values.push(userId);
          paramIndex++;
          break;
        case "received":
          updateQuery += `, received_by = $${paramIndex.toString()}, received_date = CURRENT_TIMESTAMP`;
          values.push(userId);
          paramIndex++;
          break;
      }

      if (notes) {
        updateQuery += `, notes = $${paramIndex.toString()}`;
        values.push(notes);
        paramIndex++;
      }

      updateQuery += ` WHERE id = $${paramIndex.toString()} RETURNING *`;
      values.push(id);

      const result = await client.query(updateQuery, values);
      const transfer = result.rows[0];

      // Handle stock movements based on status
      if (status === "received" && currentTransfer.from_center_id) {
        // Move stock from source to destination
        await this.processStockMovement(client, currentTransfer);
      } else if (status === "cancelled" && currentTransfer.from_center_id) {
        // Release reserved stock
        const releaseStockQuery = `
          UPDATE product_locations 
          SET reserved_stock = reserved_stock - $1,
              updated_at = CURRENT_TIMESTAMP
          WHERE product_id = $2 AND distribution_center_id = $3
        `;
        await client.query(releaseStockQuery, [
          currentTransfer.quantity,
          currentTransfer.product_id,
          currentTransfer.from_center_id,
        ]);
      }

      // Trigger accounting integration if status is received
      if (status === "received") {
        try {
          const transferData = {
            transferId: id,
            transferNumber: currentTransfer.transfer_number,
            productId: currentTransfer.product_id,
            productName: currentTransfer.product_name,
            quantity: currentTransfer.quantity,
            unitCost: currentTransfer.unit_cost,
            totalCost: currentTransfer.total_cost,
            fromCenterId: currentTransfer.from_center_id,
            fromCenterName: currentTransfer.from_center_name,
            toCenterId: currentTransfer.to_center_id,
            toCenterName: currentTransfer.to_center_name,
            transferDate: new Date().toISOString().split("T")[0]
          };

          // 1. Emit event for async listeners
          eventBus.emit(EVENT_NAMES.STOCK_TRANSFER_RECEIVED, {
            transferData,
            userId
          });

          // 2. Direct call for synchronous integration
          await interModuleConnector.accModule.addInternalTransferVoucher(transferData, userId);

          MyLogger.success("Stock Transfer Accounting Triggered", { transferId: id });
        } catch (error) {
          MyLogger.error("Failed to trigger stock transfer accounting", error, { transferId: id });
          // Don't fail the transaction for accounting errors
        }
      }

      await client.query("COMMIT");

      MyLogger.success(action, {
        transferId: id,
        newStatus: status,
        transferNumber: transfer.transfer_number,
      });

      return (await this.getStockTransferById(id)) as StockTransfer;
    } catch (error: any) {
      await client.query("ROLLBACK");
      MyLogger.error(action, error, { transferId: id, status, userId });
      throw error;
    } finally {
      client.release();
    }
  }

  private static async processStockMovement(
    client: any,
    transfer: StockTransfer
  ): Promise<void> {
    const action = "Process Stock Movement";

    try {
      MyLogger.info(action, {
        transferId: transfer.id,
        productId: transfer.product_id,
        fromCenter: transfer.from_center_id,
        toCenter: transfer.to_center_id,
        quantity: transfer.quantity,
      });

      // Initialize the quantity that will actually be moved
      let actualQuantity = transfer.quantity;

      // Remove stock from source location
      if (transfer.from_center_id) {
        // First check current reserved and current stock
        const checkStockQuery = `
          SELECT current_stock, reserved_stock 
          FROM product_locations 
          WHERE product_id = $1 AND distribution_center_id = $2
        `;
        const stockResult = await client.query(checkStockQuery, [
          transfer.product_id,
          transfer.from_center_id,
        ]);

        if (stockResult.rows.length === 0) {
          throw new Error("Source location not found for stock transfer");
        }

        const { current_stock, reserved_stock } = stockResult.rows[0];

        // Ensure we don't go negative on either stock value
        actualQuantity = Math.min(transfer.quantity, current_stock);
        const reservedToRelease = Math.min(transfer.quantity, reserved_stock);

        const removeStockQuery = `
          UPDATE product_locations 
          SET current_stock = current_stock - $1,
              reserved_stock = reserved_stock - $2,
              last_movement_date = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
          WHERE product_id = $3 AND distribution_center_id = $4
        `;
        await client.query(removeStockQuery, [
          actualQuantity,
          reservedToRelease,
          transfer.product_id,
          transfer.from_center_id,
        ]);
      }

      // Use the actual quantity that was moved
      const quantityToAdd = actualQuantity;

      // Add stock to destination location (create location if doesn't exist)
      const checkDestinationQuery = `
        SELECT id FROM product_locations 
        WHERE product_id = $1 AND distribution_center_id = $2
      `;
      const destResult = await client.query(checkDestinationQuery, [
        transfer.product_id,
        transfer.to_center_id,
      ]);

      if (destResult.rows.length === 0) {
        // Create new location at destination
        const createLocationQuery = `
          INSERT INTO product_locations (
            product_id, distribution_center_id, current_stock, reserved_stock,
            min_stock_level, status, last_movement_date, created_at, updated_at
          ) VALUES ($1, $2, $3, 0, 0, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `;
        await client.query(createLocationQuery, [
          transfer.product_id,
          transfer.to_center_id,
          quantityToAdd,
        ]);
      } else {
        // Update existing location
        const addStockQuery = `
          UPDATE product_locations 
          SET current_stock = current_stock + $1,
              last_movement_date = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
          WHERE product_id = $2 AND distribution_center_id = $3
        `;
        await client.query(addStockQuery, [
          quantityToAdd,
          transfer.product_id,
          transfer.to_center_id,
        ]);
      }

      MyLogger.success(action, {
        transferId: transfer.id,
        stockMoved: transfer.quantity,
      });
    } catch (error: any) {
      MyLogger.error(action, error, { transferId: transfer.id });
      throw error;
    }
  }
}
