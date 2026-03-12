import pool from "@/database/connection";
import { FactoryCustomerOrder, CreateWorkOrderRequest } from "@/types/factory";
import { MyLogger } from "@/utils/new-logger";
import { AddWorkOrderMediator } from "../mediators/workOrders/AddWorkOrder.mediator";

const ONE_HOUR_IN_MS = 60 * 60 * 1000;

export function ensureFutureIsoDate(dateValue?: string | null): string {
    const fallback = new Date(Date.now() + ONE_HOUR_IN_MS);

    if (!dateValue) {
        return fallback.toISOString();
    }

    const parsedDate = new Date(dateValue);
    if (Number.isNaN(parsedDate.getTime()) || parsedDate.getTime() <= Date.now()) {
        return fallback.toISOString();
    }

    return parsedDate.toISOString();
}

/**
 * Automatically creates draft work orders for each line item in a customer order.
 * Skips if work orders already exist.
 */
export async function autoCreateDraftWorkOrders(order: FactoryCustomerOrder, userId: string): Promise<void> {
    const action = "workOrderUtils.autoCreateDraftWorkOrders";
    MyLogger.info(action, { 
        orderId: order.id, 
        orderNumber: order.order_number,
        lineItemsCount: order.line_items?.length 
    });

    if (!order.line_items || order.line_items.length === 0) {
        MyLogger.info(action, {
            orderId: order.id,
            message: "No line items found; skipping work order generation",
        });
        return;
    }

    // Check if work orders already exist for this order
    const existingWorkOrders = await pool.query(
        "SELECT id, work_order_number FROM work_orders WHERE customer_order_id = $1",
        [order.id]
    );

    if (existingWorkOrders.rows.length > 0) {
        MyLogger.info(action, {
            orderId: order.id,
            existingCount: existingWorkOrders.rows.length,
            message: "Work orders already exist for this customer order; skipping auto-generation",
        });
        return;
    }

    const { AddWorkOrderMediator } = await import("../mediators/workOrders/AddWorkOrder.mediator");

    const generatedWorkOrderIds: string[] = [];
    try {
        for (const lineItem of order.line_items) {
            const productId = lineItem.product_id?.toString();
            const quantity = parseFloat(lineItem.quantity.toString());

            if (!productId || !quantity || quantity <= 0) {
                MyLogger.warn(`${action}.skipItem`, {
                    orderId: order.id,
                    lineItemId: lineItem.id,
                    productId,
                    quantity,
                    message: "Skipping line item due to missing product ID or invalid quantity"
                });
                continue;
            }

            const deadlineSource = lineItem.delivery_date || order.required_date;
            const workOrderPayload: CreateWorkOrderRequest = {
                customer_order_id: order.id,
                product_id: productId,
                quantity: quantity,
                deadline: ensureFutureIsoDate(deadlineSource),
                priority: order.priority as any, // Map priority
                estimated_hours: Math.max(1, Math.round(quantity)), // Simple heuristic: 1 hour per unit
                notes: `Auto-generated from Order ${order.order_number}${lineItem.specifications ? ': ' + lineItem.specifications : ''}`,
                specifications: lineItem.specifications || undefined,
            };

            MyLogger.info(`${action}.creating`, { orderId: order.id, productId, quantity });
            const createdWorkOrder = await AddWorkOrderMediator.createWorkOrder(workOrderPayload, userId);
            generatedWorkOrderIds.push(createdWorkOrder.id);
        }

        MyLogger.success(action, {
            orderId: order.id,
            workOrdersCreated: generatedWorkOrderIds.length,
        });

    } catch (error) {
        MyLogger.error(action, error, {
            orderId: order.id,
            generatedCount: generatedWorkOrderIds.length,
        });

        // Attempt to clean up any partially created work orders to maintain consistency
        if (generatedWorkOrderIds.length > 0) {
            MyLogger.info(`${action}.rollback`, { 
                orderId: order.id, 
                toDelete: generatedWorkOrderIds 
            });
            for (const workOrderId of generatedWorkOrderIds) {
                try {
                    await pool.query("DELETE FROM work_orders WHERE id = $1", [workOrderId]);
                } catch (cleanupError) {
                    MyLogger.error(`${action}.cleanupError`, cleanupError, { workOrderId });
                }
            }
        }
        throw error;
    }
}
