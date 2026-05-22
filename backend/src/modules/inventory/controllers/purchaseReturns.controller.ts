import { NextFunction, Request, Response } from "express";
import AddPurchaseReturnMediator from "../mediators/purchaseReturns/AddPurchaseReturn.mediator";
import GetPurchaseReturnInfoMediator from "../mediators/purchaseReturns/GetPurchaseReturnInfo.mediator";
import UpdatePurchaseReturnInfoMediator from "../mediators/purchaseReturns/UpdatePurchaseReturnInfo.mediator";
import DeletePurchaseReturnMediator from "../mediators/purchaseReturns/DeletePurchaseReturn.mediator";
import { serializeSuccessResponse } from "@/utils/responseHelper";
import { createError } from "@/middleware/errorHandler";

class PurchaseReturnsController {
  async getAllPurchaseReturns(
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> {
    const result = await GetPurchaseReturnInfoMediator.getPurchaseReturnList(req.query);
    serializeSuccessResponse(res, result, "SUCCESS");
  }

  async getPurchaseReturnStats(
    _req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> {
    const stats = await GetPurchaseReturnInfoMediator.getPurchaseReturnStats();
    serializeSuccessResponse(res, stats, "SUCCESS");
  }

  async searchPurchaseReturns(
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> {
    const { q, limit } = req.query;
    const rows = await GetPurchaseReturnInfoMediator.searchPurchaseReturns(
      (q as string) || "",
      limit ? parseInt(limit as string) : 10
    );
    serializeSuccessResponse(res, rows, "SUCCESS");
  }

  async getEligibleLines(
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> {
    const poId = parseInt(req.query.purchase_order_id as string);
    const grnIdRaw = req.query.purchase_order_receipt_id as string | undefined;
    if (isNaN(poId)) {
      throw createError("purchase_order_id is required", 400);
    }
    const grnId = grnIdRaw ? parseInt(grnIdRaw) : undefined;
    const rows = await GetPurchaseReturnInfoMediator.getEligibleLinesForPO(poId, grnId);
    serializeSuccessResponse(res, rows, "SUCCESS");
  }

  async getPurchaseReturnById(
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> {
    const id = parseInt(req.params.id);
    if (isNaN(id)) throw createError("Invalid purchase return ID", 400);
    const row = await GetPurchaseReturnInfoMediator.getPurchaseReturnById(id);
    serializeSuccessResponse(res, row, "SUCCESS");
  }

  async createPurchaseReturn(
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> {
    const createdBy = req.user?.username || "System User";
    const row = await AddPurchaseReturnMediator.createPurchaseReturn(req.body, createdBy);
    serializeSuccessResponse(res, row, "SUCCESS");
  }

  async updatePurchaseReturn(
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> {
    const id = parseInt(req.params.id);
    if (isNaN(id)) throw createError("Invalid purchase return ID", 400);
    const username = req.user?.username || "System User";
    const row = await UpdatePurchaseReturnInfoMediator.updatePurchaseReturn(
      id,
      req.body,
      username
    );
    serializeSuccessResponse(res, row, "SUCCESS");
  }

  async submitPurchaseReturn(
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> {
    const id = parseInt(req.params.id);
    if (isNaN(id)) throw createError("Invalid purchase return ID", 400);
    if (!req.user) throw createError("Authentication required", 401);
    const row = await UpdatePurchaseReturnInfoMediator.submitPurchaseReturn(
      id,
      req.user.user_id,
      req.user.username,
      req.body?.notes
    );
    serializeSuccessResponse(res, row, "SUCCESS");
  }

  async approvePurchaseReturn(
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> {
    const id = parseInt(req.params.id);
    if (isNaN(id)) throw createError("Invalid purchase return ID", 400);
    if (!req.user) throw createError("Authentication required", 401);
    const row = await UpdatePurchaseReturnInfoMediator.approvePurchaseReturn(
      id,
      req.user.user_id,
      req.user.username,
      req.body?.notes
    );
    serializeSuccessResponse(res, row, "SUCCESS");
  }

  async rejectPurchaseReturn(
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> {
    const id = parseInt(req.params.id);
    if (isNaN(id)) throw createError("Invalid purchase return ID", 400);
    if (!req.user) throw createError("Authentication required", 401);
    const row = await UpdatePurchaseReturnInfoMediator.rejectPurchaseReturn(
      id,
      req.user.user_id,
      req.user.username,
      req.body?.notes
    );
    serializeSuccessResponse(res, row, "SUCCESS");
  }

  async cancelPurchaseReturn(
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> {
    const id = parseInt(req.params.id);
    if (isNaN(id)) throw createError("Invalid purchase return ID", 400);
    if (!req.user) throw createError("Authentication required", 401);
    const row = await UpdatePurchaseReturnInfoMediator.cancelPurchaseReturn(
      id,
      req.user.user_id,
      req.user.username,
      req.body.reason
    );
    serializeSuccessResponse(res, row, "SUCCESS");
  }

  async deletePurchaseReturn(
    req: Request,
    res: Response,
    _next: NextFunction
  ): Promise<void> {
    const id = parseInt(req.params.id);
    if (isNaN(id)) throw createError("Invalid purchase return ID", 400);
    await DeletePurchaseReturnMediator.deletePurchaseReturn(id);
    serializeSuccessResponse(res, {}, "Purchase return deleted successfully");
  }
}

export default new PurchaseReturnsController();
