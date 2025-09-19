import { NextFunction, Request, Response } from "express";
import { InventoryMediator } from "@/mediators/inventory/InventoryMediator";
import { serializeSuccessResponse } from "@/utils/responseHelper";
import { MyLogger } from "@/utils/new-logger";

class InventoryController {
    async getInventoryItems(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'GET /api/inventory';
        try {
            MyLogger.info(action, { query: req.query });
            const inventoryItems = await InventoryMediator.getInventoryItems(req.query);
            MyLogger.success(action, { count: inventoryItems.length });
            serializeSuccessResponse(res, inventoryItems, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error, { query: req.query });
            throw error;
        }
    }

    async getInventoryStats(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'GET /api/inventory/stats';
        try {
            MyLogger.info(action);
            const stats = await InventoryMediator.getInventoryStats();
            MyLogger.success(action, stats);
            serializeSuccessResponse(res, stats, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error);
            throw error;
        }
    }

    async getStockMovements(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'GET /api/inventory/movements';
        try {
            MyLogger.info(action, { query: req.query });
            const movements = await InventoryMediator.getStockMovements(req.query);
            MyLogger.success(action, { count: movements.length });
            serializeSuccessResponse(res, movements, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error, { query: req.query });
            throw error;
        }
    }

    async getInventoryItemById(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'GET /api/inventory/:id';
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            res.status(400).json({
                error: {
                    message: 'Invalid inventory item ID'
                }
            });
            return;
        }

        try {
            MyLogger.info(action, { inventoryItemId: id });
            const inventoryItem = await InventoryMediator.getInventoryItemById(id);

            if (!inventoryItem) {
                res.status(404).json({
                    error: {
                        message: 'Inventory item not found'
                    }
                });
                return;
            }

            MyLogger.success(action, { inventoryItemId: id, productName: inventoryItem.product_name });
            serializeSuccessResponse(res, inventoryItem, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error, { inventoryItemId: id });
            throw error;
        }
    }
}

export default new InventoryController();
