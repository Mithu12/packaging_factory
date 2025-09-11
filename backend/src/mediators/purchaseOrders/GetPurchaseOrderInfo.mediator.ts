import pool from "@/database/connection";
import { 
    PurchaseOrder, 
    PurchaseOrderWithDetails, 
    PurchaseOrderQueryParams, 
    PurchaseOrderStats,
    PurchaseOrderLineItem,
    PurchaseOrderTimeline
} from "@/types/purchaseOrder";
import { createError } from "@/middleware/errorHandler";
import { MyLogger } from "@/utils/new-logger";

class GetPurchaseOrderInfoMediator {

    // Get all purchase orders with pagination and filtering
    async getPurchaseOrderList(params: PurchaseOrderQueryParams): Promise<{
        purchase_orders: PurchaseOrder[];
        total: number;
        page: number;
        limit: number;
        total_pages: number;
    }> {
        let action = 'Get Purchase Order List'
        try {
            MyLogger.info(action, { params })

            const {
                page = 1,
                limit = 10,
                search,
                status,
                supplier_id,
                priority,
                start_date,
                end_date,
                sortBy = 'created_at',
                sortOrder = 'desc'
            } = params;

            const offset = (page - 1) * limit;
            let whereConditions: string[] = [];
            let queryParams: any[] = [];
            let paramIndex = 1;

            // Build WHERE conditions
            if (search) {
                whereConditions.push(`(po.po_number ILIKE $${paramIndex} OR s.name ILIKE $${paramIndex})`);
                queryParams.push(`%${search}%`);
                paramIndex++;
            }

            if (status) {
                whereConditions.push(`po.status = $${paramIndex}`);
                queryParams.push(status);
                paramIndex++;
            }

            if (supplier_id) {
                whereConditions.push(`po.supplier_id = $${paramIndex}`);
                queryParams.push(supplier_id);
                paramIndex++;
            }

            if (priority) {
                whereConditions.push(`po.priority = $${paramIndex}`);
                queryParams.push(priority);
                paramIndex++;
            }

            if (start_date) {
                whereConditions.push(`po.order_date >= $${paramIndex}`);
                queryParams.push(start_date);
                paramIndex++;
            }

            if (end_date) {
                whereConditions.push(`po.order_date <= $${paramIndex}`);
                queryParams.push(end_date);
                paramIndex++;
            }

            const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

            // Get total count
            const countQuery = `
                SELECT COUNT(*) as total
                FROM purchase_orders po
                LEFT JOIN suppliers s ON po.supplier_id = s.id
                ${whereClause}
            `;

            const countResult = await pool.query(countQuery, queryParams);
            const total = parseInt(countResult.rows[0].total);

            // Get purchase orders
            const query = `
                SELECT 
                    po.*,
                    s.name as supplier_name,
                    s.contact_person as supplier_contact,
                    s.email as supplier_email,
                    s.phone as supplier_phone,
                    s.address as supplier_address
                FROM purchase_orders po
                LEFT JOIN suppliers s ON po.supplier_id = s.id
                ${whereClause}
                ORDER BY po.${sortBy} ${sortOrder.toUpperCase()}
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `;

            queryParams.push(limit, offset);
            const result = await pool.query(query, queryParams);

            const totalPages = Math.ceil(total / limit);

            MyLogger.success(action, { 
                total, 
                page, 
                limit, 
                totalPages,
                returnedCount: result.rows.length
            });

            return {
                purchase_orders: result.rows,
                total,
                page,
                limit,
                total_pages: totalPages
            };
        } catch (error) {
            MyLogger.error(action, error, { params })
            throw error;
        }
    }

    // Get purchase order by ID with full details
    async getPurchaseOrderById(id: number): Promise<PurchaseOrderWithDetails> {
        let action = 'Get Purchase Order By ID'
        try {
            MyLogger.info(action, { purchaseOrderId: id })

            // Get purchase order with supplier details
            const poQuery = `
                SELECT 
                    po.*,
                    s.id as supplier_id,
                    s.name as supplier_name,
                    s.contact_person as supplier_contact,
                    s.email as supplier_email,
                    s.phone as supplier_phone,
                    s.address as supplier_address
                FROM purchase_orders po
                LEFT JOIN suppliers s ON po.supplier_id = s.id
                WHERE po.id = $1
            `;

            const poResult = await pool.query(poQuery, [id]);
            
            if (poResult.rows.length === 0) {
                throw createError('Purchase order not found', 404);
            }

            const purchaseOrder = poResult.rows[0];

            // Get line items
            const lineItemsQuery = `
                SELECT 
                    li.*,
                    p.sku as product_sku,
                    p.name as product_name
                FROM purchase_order_line_items li
                LEFT JOIN products p ON li.product_id = p.id
                WHERE li.purchase_order_id = $1
                ORDER BY li.id
            `;

            const lineItemsResult = await pool.query(lineItemsQuery, [id]);
            const lineItems: PurchaseOrderLineItem[] = lineItemsResult.rows;

            // Get timeline
            const timelineQuery = `
                SELECT *
                FROM purchase_order_timeline
                WHERE purchase_order_id = $1
                ORDER BY created_at ASC
            `;

            const timelineResult = await pool.query(timelineQuery, [id]);
            const timeline: PurchaseOrderTimeline[] = timelineResult.rows;

            const result: PurchaseOrderWithDetails = {
                ...purchaseOrder,
                supplier: {
                    id: purchaseOrder.supplier_id,
                    name: purchaseOrder.supplier_name,
                    contact_person: purchaseOrder.supplier_contact,
                    email: purchaseOrder.supplier_email,
                    phone: purchaseOrder.supplier_phone,
                    address: purchaseOrder.supplier_address
                },
                line_items: lineItems,
                timeline: timeline
            };

            MyLogger.success(action, { 
                purchaseOrderId: id,
                lineItemsCount: lineItems.length,
                timelineEventsCount: timeline.length
            });

            return result;
        } catch (error) {
            MyLogger.error(action, error, { purchaseOrderId: id })
            throw error;
        }
    }

    // Get purchase order statistics
    async getPurchaseOrderStats(): Promise<PurchaseOrderStats> {
        let action = 'Get Purchase Order Stats'
        try {
            MyLogger.info(action)

            const statsQuery = `
                SELECT 
                    COUNT(*) as total_orders,
                    COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_orders,
                    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
                    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_orders,
                    COUNT(CASE WHEN status = 'received' THEN 1 END) as received_orders,
                    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders,
                    COALESCE(SUM(total_amount), 0) as total_value,
                    COALESCE(AVG(total_amount), 0) as average_order_value,
                    COUNT(CASE WHEN DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as orders_this_month,
                    COUNT(CASE WHEN expected_delivery_date < CURRENT_DATE AND status NOT IN ('received', 'cancelled') THEN 1 END) as orders_overdue
                FROM purchase_orders
            `;

            const result = await pool.query(statsQuery);
            const stats = result.rows[0];

            MyLogger.success(action, { stats })

            return {
                total_orders: parseInt(stats.total_orders),
                draft_orders: parseInt(stats.draft_orders),
                pending_orders: parseInt(stats.pending_orders),
                approved_orders: parseInt(stats.approved_orders),
                received_orders: parseInt(stats.received_orders),
                cancelled_orders: parseInt(stats.cancelled_orders),
                total_value: parseFloat(stats.total_value),
                average_order_value: parseFloat(stats.average_order_value),
                orders_this_month: parseInt(stats.orders_this_month),
                orders_overdue: parseInt(stats.orders_overdue)
            };
        } catch (error) {
            MyLogger.error(action, error)
            throw error;
        }
    }

    // Search purchase orders
    async searchPurchaseOrders(query: string, limit: number = 10): Promise<PurchaseOrder[]> {
        let action = 'Search Purchase Orders'
        try {
            MyLogger.info(action, { query, limit })

            const searchQuery = `
                SELECT 
                    po.*,
                    s.name as supplier_name
                FROM purchase_orders po
                LEFT JOIN suppliers s ON po.supplier_id = s.id
                WHERE po.po_number ILIKE $1 OR s.name ILIKE $1
                ORDER BY po.created_at DESC
                LIMIT $2
            `;

            const result = await pool.query(searchQuery, [`%${query}%`, limit]);

            MyLogger.success(action, { 
                query, 
                limit, 
                foundCount: result.rows.length 
            });

            return result.rows;
        } catch (error) {
            MyLogger.error(action, error, { query, limit })
            throw error;
        }
    }
}

export default new GetPurchaseOrderInfoMediator();
