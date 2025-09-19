import { NextFunction, Request, Response } from "express";
import GetPurchaseOrderInfoMediator from "@/mediators/purchaseOrders/GetPurchaseOrderInfo.mediator";
import AddPurchaseOrderMediator from "@/mediators/purchaseOrders/AddPurchaseOrder.mediator";
import UpdatePurchaseOrderInfoMediator from "@/mediators/purchaseOrders/UpdatePurchaseOrderInfo.mediator";
import DeletePurchaseOrderMediator from "@/mediators/purchaseOrders/DeletePurchaseOrder.mediator";
import { serializeSuccessResponse } from "@/utils/responseHelper";
import { MyLogger } from "@/utils/new-logger";
import { PDFGenerator } from "@/services/pdf-generator";

class PurchaseOrdersController {
    async getAllPurchaseOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
        const result = await GetPurchaseOrderInfoMediator.getPurchaseOrderList(req.query);
        serializeSuccessResponse(res, result, 'SUCCESS');
    }

    async getPurchaseOrderStats(req: Request, res: Response, next: NextFunction): Promise<void> {
        const stats = await GetPurchaseOrderInfoMediator.getPurchaseOrderStats();
        serializeSuccessResponse(res, stats, 'SUCCESS');
    }

    async searchPurchaseOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
        const { q, limit } = req.query;
        const purchaseOrders = await GetPurchaseOrderInfoMediator.searchPurchaseOrders(
            q as string,
            limit ? parseInt(limit as string) : 10
        );
        serializeSuccessResponse(res, purchaseOrders, 'SUCCESS');
    }

    // Additional methods for status and supplier filtering can be added when mediator methods are available

    async getPurchaseOrderById(req: Request, res: Response, next: NextFunction): Promise<void> {
        const id = parseInt(req.params.id);
        const purchaseOrder = await GetPurchaseOrderInfoMediator.getPurchaseOrderById(id);
        serializeSuccessResponse(res, purchaseOrder, 'SUCCESS');
    }

    async createPurchaseOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
        const purchaseOrder = await AddPurchaseOrderMediator.createPurchaseOrder(req.body);
        serializeSuccessResponse(res, purchaseOrder, 'SUCCESS');
    }

    async updatePurchaseOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
        const id = parseInt(req.params.id);
        const purchaseOrder = await UpdatePurchaseOrderInfoMediator.updatePurchaseOrder(id, req.body);
        serializeSuccessResponse(res, purchaseOrder, 'SUCCESS');
    }

    async updatePurchaseOrderStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
        const id = parseInt(req.params.id);
        const { status } = req.body;
        const purchaseOrder = await UpdatePurchaseOrderInfoMediator.updatePurchaseOrderStatus(id, status);
        serializeSuccessResponse(res, purchaseOrder, 'SUCCESS');
    }

    async receiveGoods(req: Request, res: Response, next: NextFunction): Promise<void> {
        const id = parseInt(req.params.id);
        const purchaseOrder = await UpdatePurchaseOrderInfoMediator.receiveGoods(id, req.body);
        serializeSuccessResponse(res, purchaseOrder, 'SUCCESS');
    }

    // Cancel method can be added when mediator method is available

    async deletePurchaseOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
        const id = parseInt(req.params.id);
        await DeletePurchaseOrderMediator.deletePurchaseOrder(id);
        serializeSuccessResponse(res, {}, 'Purchase order deleted successfully');
    }

    async generatePurchaseOrderPDF(req: Request, res: Response, next: NextFunction): Promise<void> {
        const id = parseInt(req.params.id);
        const purchaseOrder = await GetPurchaseOrderInfoMediator.getPurchaseOrderById(id);
        
        // Generate PDF
        const pdfBuffer = await PDFGenerator.generatePurchaseOrderPDF(purchaseOrder);
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="purchase-order-${id}.pdf"`);
        res.send(pdfBuffer);
    }
}

export default new PurchaseOrdersController();
