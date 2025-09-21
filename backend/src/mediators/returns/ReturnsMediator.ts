import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';
import { 
  SalesReturn, 
  SalesReturnWithDetails, 
  CreateReturnRequest, 
  ProcessReturnRequest,
  RefundTransactionRequest,
  ReturnQueryParams,
  ReturnStats,
  ReturnEligibilityCheck,
  SalesReturnItem,
  ReturnRefundTransaction
} from '@/types/returns';

export class ReturnsMediator {

  // Create a new return
  static async createReturn(
    data: CreateReturnRequest, 
    processedBy?: number
  ): Promise<SalesReturnWithDetails> {
    const action = 'ReturnsMediator.createReturn';
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 1. Validate original order exists and get details
      const orderQuery = `
        SELECT so.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone
        FROM sales_orders so
        LEFT JOIN customers c ON so.customer_id = c.id
        WHERE so.id = $1
      `;
      const orderResult = await client.query(orderQuery, [data.original_order_id]);
      
      if (orderResult.rows.length === 0) {
        throw new Error('Original order not found');
      }
      
      const originalOrder = orderResult.rows[0];
      
      // 2. Get original order line items
      const lineItemsQuery = `
        SELECT * FROM sales_order_line_items 
        WHERE sales_order_id = $1
        ORDER BY id
      `;
      const lineItemsResult = await client.query(lineItemsQuery, [data.original_order_id]);
      const originalLineItems = lineItemsResult.rows;
      
      // 3. Validate return items
      for (const item of data.items) {
        const originalItem = originalLineItems.find(li => li.id === item.original_line_item_id);
        if (!originalItem) {
          throw new Error(`Original line item ${item.original_line_item_id} not found`);
        }
        
        if (item.returned_quantity > originalItem.quantity) {
          throw new Error(`Cannot return more than original quantity for item ${originalItem.product_name}`);
        }
        
        // Check if already partially returned
        const existingReturnsQuery = `
          SELECT COALESCE(SUM(returned_quantity), 0) as total_returned
          FROM sales_return_items sri
          JOIN sales_returns sr ON sri.return_id = sr.id
          WHERE sri.original_line_item_id = $1 
          AND sr.return_status NOT IN ('rejected', 'cancelled')
        `;
        const existingReturnsResult = await client.query(existingReturnsQuery, [item.original_line_item_id]);
        const totalReturned = parseFloat(existingReturnsResult.rows[0].total_returned);
        
        if (totalReturned + item.returned_quantity > originalItem.quantity) {
          throw new Error(`Total return quantity exceeds original quantity for item ${originalItem.product_name}`);
        }
      }
      
      // 4. Generate return number
      const returnNumber = await this.generateReturnNumber(client);
      
      // 5. Calculate return totals
      let subtotalReturned = 0;
      let taxReturned = 0;
      
      for (const item of data.items) {
        const originalItem = originalLineItems.find(li => li.id === item.original_line_item_id);
        const refundUnitPrice = item.refund_unit_price || originalItem.unit_price;
        const lineRefundAmount = refundUnitPrice * item.returned_quantity;
        subtotalReturned += lineRefundAmount;
        
        // Calculate proportional tax
        const originalLineTotal = originalItem.line_total;
        const taxProportion = originalLineTotal > 0 ? lineRefundAmount / originalLineTotal : 0;
        const originalTaxForLine = (originalOrder.tax_amount * originalItem.line_total) / originalOrder.subtotal;
        taxReturned += originalTaxForLine * taxProportion;
      }
      
      const processingFee = data.processing_fee || 0;
      const totalRefundAmount = subtotalReturned + taxReturned;
      const finalRefundAmount = totalRefundAmount - processingFee;
      
      // 6. Insert return record
      const insertReturnQuery = `
        INSERT INTO sales_returns (
          return_number, original_order_id, original_order_number, return_type, reason,
          subtotal_returned, tax_returned, total_refund_amount, processing_fee,
          final_refund_amount, customer_id, processed_by, notes, return_location
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `;
      
      const returnValues = [
        returnNumber,
        data.original_order_id,
        originalOrder.order_number,
        data.return_type,
        data.reason,
        subtotalReturned,
        taxReturned,
        totalRefundAmount,
        processingFee,
        finalRefundAmount,
        originalOrder.customer_id,
        processedBy,
        data.notes,
        data.return_location
      ];
      
      const returnResult = await client.query(insertReturnQuery, returnValues);
      const salesReturn = returnResult.rows[0];
      
      // 7. Insert return items
      const returnItems: SalesReturnItem[] = [];
      
      for (const item of data.items) {
        const originalItem = originalLineItems.find(li => li.id === item.original_line_item_id);
        const refundUnitPrice = item.refund_unit_price || originalItem.unit_price;
        const lineRefundAmount = refundUnitPrice * item.returned_quantity;
        const restockFee = item.restock_fee || 0;
        
        const insertItemQuery = `
          INSERT INTO sales_return_items (
            return_id, original_line_item_id, product_id, product_sku, product_name,
            original_quantity, returned_quantity, original_unit_price, refund_unit_price,
            line_refund_amount, item_condition, restockable, restock_fee, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          RETURNING *
        `;
        
        const itemValues = [
          salesReturn.id,
          item.original_line_item_id,
          originalItem.product_id,
          originalItem.product_sku,
          originalItem.product_name,
          originalItem.quantity,
          item.returned_quantity,
          originalItem.unit_price,
          refundUnitPrice,
          lineRefundAmount,
          item.item_condition || 'good',
          item.restockable !== false,
          restockFee,
          item.notes
        ];
        
        const itemResult = await client.query(insertItemQuery, itemValues);
        returnItems.push(itemResult.rows[0]);
      }
      
      // 8. Update original order return tracking
      await client.query(`
        UPDATE sales_orders 
        SET has_returns = true, 
            return_count = return_count + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [data.original_order_id]);
      
      await client.query('COMMIT');
      
      MyLogger.success(action, { 
        return_id: salesReturn.id,
        return_number: returnNumber,
        items_count: returnItems.length
      });
      
      // Return complete return data
      return {
        ...salesReturn,
        items: returnItems,
        customer_name: originalOrder.customer_name,
        customer_email: originalOrder.customer_email,
        customer_phone: originalOrder.customer_phone,
        original_order: {
          order_number: originalOrder.order_number,
          order_date: originalOrder.order_date,
          total_amount: originalOrder.total_amount,
          payment_method: originalOrder.payment_method
        }
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get all returns with pagination and filtering
  static async getAllReturns(params: ReturnQueryParams): Promise<{
    returns: SalesReturn[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const action = 'ReturnsMediator.getAllReturns';
    
    try {
      const page = Math.max(1, parseInt(params.page?.toString() || '1'));
      const limit = Math.min(100, Math.max(1, parseInt(params.limit?.toString() || '10')));
      const offset = (page - 1) * limit;
      
      let whereConditions: string[] = [];
      let queryParams: any[] = [];
      let paramIndex = 1;
      
      // Build WHERE conditions
      if (params.search) {
        whereConditions.push(`(sr.return_number ILIKE $${paramIndex} OR sr.original_order_number ILIKE $${paramIndex} OR c.name ILIKE $${paramIndex})`);
        queryParams.push(`%${params.search}%`);
        paramIndex++;
      }
      
      if (params.return_status) {
        whereConditions.push(`sr.return_status = $${paramIndex}`);
        queryParams.push(params.return_status);
        paramIndex++;
      }
      
      if (params.return_type) {
        whereConditions.push(`sr.return_type = $${paramIndex}`);
        queryParams.push(params.return_type);
        paramIndex++;
      }
      
      if (params.reason) {
        whereConditions.push(`sr.reason = $${paramIndex}`);
        queryParams.push(params.reason);
        paramIndex++;
      }
      
      if (params.customer_id) {
        whereConditions.push(`sr.customer_id = $${paramIndex}`);
        queryParams.push(params.customer_id);
        paramIndex++;
      }
      
      if (params.processed_by) {
        whereConditions.push(`sr.processed_by = $${paramIndex}`);
        queryParams.push(params.processed_by);
        paramIndex++;
      }
      
      if (params.date_from) {
        whereConditions.push(`sr.return_date >= $${paramIndex}`);
        queryParams.push(params.date_from);
        paramIndex++;
      }
      
      if (params.date_to) {
        whereConditions.push(`sr.return_date <= $${paramIndex}`);
        queryParams.push(params.date_to);
        paramIndex++;
      }
      
      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
      
      // Sorting
      const sortBy = params.sortBy || 'return_date';
      const sortOrder = params.sortOrder || 'desc';
      const orderClause = `ORDER BY sr.${sortBy} ${sortOrder}`;
      
      // Count query
      const countQuery = `
        SELECT COUNT(*) as total
        FROM sales_returns sr
        LEFT JOIN customers c ON sr.customer_id = c.id
        ${whereClause}
      `;
      
      const countResult = await pool.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);
      
      // Main query
      const query = `
        SELECT 
          sr.*,
          c.name as customer_name,
          c.email as customer_email,
          c.phone as customer_phone,
          u1.username as processed_by_name,
          u2.username as authorized_by_name,
          so.order_number as original_order_number,
          so.order_date,
          so.total_amount as original_total_amount,
          so.payment_method as original_payment_method
        FROM sales_returns sr
        LEFT JOIN customers c ON sr.customer_id = c.id
        LEFT JOIN users u1 ON sr.processed_by = u1.id
        LEFT JOIN users u2 ON sr.authorized_by = u2.id
        LEFT JOIN sales_orders so ON sr.original_order_id = so.id
        ${whereClause}
        ${orderClause}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      queryParams.push(limit, offset);
      
      const result = await pool.query(query, queryParams);
      const returns = result.rows;
      
      const totalPages = Math.ceil(total / limit);
      
      MyLogger.success(action, { 
        returns_count: returns.length,
        total,
        page,
        totalPages
      });
      
      return {
        returns,
        total,
        page,
        limit,
        totalPages
      };
      
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    }
  }

  // Generate return number
  private static async generateReturnNumber(client: any): Promise<string> {
    const result = await client.query("SELECT nextval('sales_return_number_seq') as next_val");
    const nextVal = result.rows[0].next_val;
    return `RET${String(nextVal).padStart(6, '0')}`;
  }

  // Check return eligibility for an order
  static async checkReturnEligibility(orderId: number): Promise<ReturnEligibilityCheck> {
    const action = 'ReturnsMediator.checkReturnEligibility';
    
    try {
      // Get order details
      const orderQuery = `
        SELECT * FROM sales_orders 
        WHERE id = $1 AND status = 'completed'
      `;
      const orderResult = await pool.query(orderQuery, [orderId]);
      
      if (orderResult.rows.length === 0) {
        return {
          eligible: false,
          reasons: ['Order not found or not completed']
        };
      }
      
      const order = orderResult.rows[0];
      const orderDate = new Date(order.order_date);
      const daysSinceOrder = Math.floor((Date.now() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Check return window (30 days default)
      const maxReturnDays = 30;
      if (daysSinceOrder > maxReturnDays) {
        return {
          eligible: false,
          reasons: ['Return window expired'],
          restrictions: {
            max_return_days: maxReturnDays,
            return_window_expired: true
          }
        };
      }
      
      // Check existing returns
      const existingReturnsQuery = `
        SELECT 
          sri.original_line_item_id,
          sri.returned_quantity,
          soli.quantity as original_quantity,
          soli.product_name
        FROM sales_return_items sri
        JOIN sales_returns sr ON sri.return_id = sr.id
        JOIN sales_order_line_items soli ON sri.original_line_item_id = soli.id
        WHERE sr.original_order_id = $1 
        AND sr.return_status NOT IN ('rejected', 'cancelled')
      `;
      
      const existingReturnsResult = await pool.query(existingReturnsQuery, [orderId]);
      const existingReturns = existingReturnsResult.rows;
      
      // Calculate remaining quantities
      const itemsAlreadyReturned = existingReturns.map(item => ({
        line_item_id: item.original_line_item_id,
        returned_quantity: parseFloat(item.returned_quantity),
        remaining_quantity: parseFloat(item.original_quantity) - parseFloat(item.returned_quantity)
      }));
      
      const hasFullyReturnedItems = itemsAlreadyReturned.some(item => item.remaining_quantity <= 0);
      
      return {
        eligible: true,
        restrictions: {
          max_return_days: maxReturnDays,
          return_window_expired: false,
          partial_returns_allowed: true,
          items_already_returned: itemsAlreadyReturned
        }
      };
      
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    }
  }

  // Additional methods would be implemented here...
  // For brevity, I'm including stubs for the remaining methods
  
  static async getReturnById(returnId: number): Promise<SalesReturnWithDetails | null> {
    // Implementation for getting return by ID with full details
    throw new Error('Method not implemented yet');
  }
  
  static async processReturn(returnId: number, data: ProcessReturnRequest, authorizedBy?: number): Promise<SalesReturn> {
    // Implementation for processing (approving/rejecting) returns
    throw new Error('Method not implemented yet');
  }
  
  static async completeReturn(returnId: number, processedBy?: number): Promise<SalesReturn> {
    const action = 'ReturnsMediator.completeReturn';
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 1. Get return details
      const returnQuery = `
        SELECT * FROM sales_returns 
        WHERE id = $1 AND return_status = 'approved'
      `;
      const returnResult = await client.query(returnQuery, [returnId]);
      
      if (returnResult.rows.length === 0) {
        throw new Error('Return not found or not approved');
      }
      
      const salesReturn = returnResult.rows[0];
      
      // 2. Get return items
      const itemsQuery = `
        SELECT * FROM sales_return_items 
        WHERE return_id = $1
        ORDER BY id
      `;
      const itemsResult = await client.query(itemsQuery, [returnId]);
      const returnItems = itemsResult.rows;
      
      // 3. Process inventory adjustments for each item
      for (const item of returnItems) {
        // Get current product stock
        const stockQuery = `
          SELECT current_stock FROM products WHERE id = $1
        `;
        const stockResult = await client.query(stockQuery, [item.product_id]);
        
        if (stockResult.rows.length === 0) {
          throw new Error(`Product ${item.product_id} not found`);
        }
        
        const currentStock = parseFloat(stockResult.rows[0].current_stock);
        let adjustmentType = 'return_restock';
        let quantityToRestock = item.returned_quantity;
        
        // Determine adjustment type based on item condition
        if (item.item_condition === 'damaged' || item.item_condition === 'defective') {
          adjustmentType = 'return_damaged';
          quantityToRestock = 0; // Don't restock damaged items
        } else if (item.item_condition === 'expired') {
          adjustmentType = 'return_write_off';
          quantityToRestock = 0; // Don't restock expired items
        } else if (!item.restockable) {
          adjustmentType = 'return_write_off';
          quantityToRestock = 0; // Don't restock non-restockable items
        }
        
        const newStock = currentStock + quantityToRestock;
        
        // 4. Update product inventory
        if (quantityToRestock > 0) {
          const updateStockQuery = `
            UPDATE products 
            SET current_stock = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
          `;
          await client.query(updateStockQuery, [newStock, item.product_id]);
        }
        
        // 5. Record inventory adjustment
        const insertAdjustmentQuery = `
          INSERT INTO return_inventory_adjustments (
            return_id, return_item_id, product_id, adjustment_type,
            quantity_adjusted, stock_before, stock_after, adjusted_by,
            adjustment_reason
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *
        `;
        
        const adjustmentReason = item.item_condition !== 'good' 
          ? `Item returned in ${item.item_condition} condition`
          : 'Item returned in good condition';
        
        await client.query(insertAdjustmentQuery, [
          returnId,
          item.id,
          item.product_id,
          adjustmentType,
          quantityToRestock,
          currentStock,
          newStock,
          processedBy,
          adjustmentReason
        ]);
        
        // 6. Create stock adjustment record (for general inventory tracking)
        const stockAdjustmentQuery = `
          INSERT INTO stock_adjustments (
            product_id, adjustment_type, quantity, reason, adjusted_by
          ) VALUES ($1, $2, $3, $4, $5)
        `;
        
        await client.query(stockAdjustmentQuery, [
          item.product_id,
          'increase', // Always increase for returns (even if quantity is 0)
          quantityToRestock,
          `Return: ${salesReturn.return_number} - ${adjustmentReason}`,
          processedBy
        ]);
      }
      
      // 7. Update return status to completed
      const updateReturnQuery = `
        UPDATE sales_returns 
        SET return_status = 'completed',
            processed_by = $1,
            completed_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `;
      
      const updatedReturnResult = await client.query(updateReturnQuery, [processedBy, returnId]);
      const updatedReturn = updatedReturnResult.rows[0];
      
      // 8. Update original sales order return tracking
      const updateOrderQuery = `
        UPDATE sales_orders 
        SET total_returned_amount = total_returned_amount + $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `;
      
      await client.query(updateOrderQuery, [
        salesReturn.final_refund_amount,
        salesReturn.original_order_id
      ]);
      
      await client.query('COMMIT');
      
      MyLogger.success(action, { 
        return_id: returnId,
        return_number: salesReturn.return_number,
        items_processed: returnItems.length,
        final_refund_amount: salesReturn.final_refund_amount
      });
      
      return updatedReturn;
      
    } catch (error) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  static async processRefund(returnId: number, data: RefundTransactionRequest, processedBy?: number): Promise<ReturnRefundTransaction> {
    // Implementation for processing refund transactions
    throw new Error('Method not implemented yet');
  }
  
  static async getReturnStats(params: any): Promise<ReturnStats> {
    // Implementation for return statistics
    throw new Error('Method not implemented yet');
  }
  
  static async updateReturnStatus(returnId: number, status: string, notes?: string, updatedBy?: number): Promise<SalesReturn> {
    // Implementation for updating return status
    throw new Error('Method not implemented yet');
  }
  
  static async getReturnsByCustomer(customerId: number, params: any): Promise<SalesReturn[]> {
    // Implementation for getting returns by customer
    throw new Error('Method not implemented yet');
  }
  
  static async getReturnsByOrder(orderId: number): Promise<SalesReturn[]> {
    // Implementation for getting returns by order
    throw new Error('Method not implemented yet');
  }
}
