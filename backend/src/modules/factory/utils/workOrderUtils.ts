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

    if (!order.line_items || order.line_items.length === 0) {
        MyLogger.info(action, {
            orderId: order.id,
            message: "No line items found; skipping work order generation",
        });
        return;
    }

    const existingWorkOrders = await pool.query(
        "SELECT id FROM work_orders WHERE customer_order_id = $1 LIMIT 1",
        [order.id]
    );

    if (existingWorkOrders.rows.length > 0) {
        MyLogger.info(action, {
            orderId: order.id,
            message: "Work orders already exist for this customer order; skipping auto-generation",
        });
        return;
    }

    const generatedWorkOrderIds: string[] = [];

    try {
        for (const lineItem of order.line_items) {
            const productId = lineItem.product_id?.toString();
            const quantity = Number(lineItem.quantity);

            if (!productId) {
                MyLogger.warn(action, {
                    orderId: order.id,
                    lineItemId: lineItem.id,
                    message: "Line item missing product reference; skipping work order generation for this item",
                });
                continue;
            }

            if (!Number.isFinite(quantity) || quantity <= 0) {
                MyLogger.warn(action, {
                    orderId: order.id,
                    lineItemId: lineItem.id,
                    productId,
                    quantity,
                    message: "Invalid quantity detected; skipping work order generation for this item",
                });
                continue;
            }

            const deadlineSource = lineItem.delivery_date || order.required_date;
            const workOrderPayload: CreateWorkOrderRequest = {
                customer_order_id: order.id,
                product_id: productId,
                quantity,
                deadline: ensureFutureIsoDate(deadlineSource),
                priority: order.priority || "medium",
                estimated_hours: Math.max(1, Math.round(quantity)),
                notes: `Auto-generated from customer order ${order.order_number} (line: ${lineItem.product_name}).`,
                specifications: lineItem.specifications || undefined,
            };

            const createdWorkOrder = await AddWorkOrderMediator.createWorkOrder(workOrderPayload, userId);
            generatedWorkOrderIds.push(createdWorkOrder.id);

            MyLogger.info(action, {
                orderId: order.id,
                lineItemId: lineItem.id,
                workOrderId: createdWorkOrder.id,
                workOrderNumber: createdWorkOrder.work_order_number,
            });
        }
    } catch (error) {
        MyLogger.error(action, error, {
            orderId: order.id,
            generatedCount: generatedWorkOrderIds.length,
        });

        // Attempt to clean up any partially created work orders
        for (const workOrderId of generatedWorkOrderIds) {
            try {
                await pool.query("DELETE FROM work_orders WHERE id = $1", [workOrderId]);
                MyLogger.warn(action, {
                    orderId: order.id,
                    workOrderId,
                    message: "Rolled back auto-generated work order after failure",
                });
            } catch (cleanupError: any) {
                MyLogger.error(`${action}.cleanup`, cleanupError, {
                    orderId: order.id,
                    workOrderId,
                });
            }
        }

        throw error;
    }
}
