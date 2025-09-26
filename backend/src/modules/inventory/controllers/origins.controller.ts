import { NextFunction, Request, Response } from "express";
import { OriginMediator } from "@/modules/inventory/mediators/origins/OriginMediator";
import { serializeSuccessResponse } from "@/utils/responseHelper";
import { MyLogger } from "@/utils/new-logger";

class OriginsController {
  async getAllOrigins(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    let action = "GET /api/origins";
    try {
      MyLogger.info(action);
      const origins = await OriginMediator.getAllOrigins();
      MyLogger.success(action, { count: origins.length });
      serializeSuccessResponse(res, origins, "SUCCESS");
    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    }
  }

  async getOriginById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    let action = "GET /api/origins/:id";
    try {
      const originId = parseInt(req.params.id);
      if (isNaN(originId)) {
        res.status(400).json({
          success: false,
          message: "Invalid origin ID",
        });
        return;
      }

      MyLogger.info(action, { origin_id: originId });
      const origin = await OriginMediator.getOriginById(originId);
      MyLogger.success(action, { origin_id: originId, name: origin.name });
      serializeSuccessResponse(res, origin, "SUCCESS");
    } catch (error: any) {
      MyLogger.error(action, error, { origin_id: req.params.id });
      throw error;
    }
  }

  async createOrigin(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    let action = "POST /api/origins";
    try {
      MyLogger.info(action, { origin: req.body });
      const origin = await OriginMediator.createOrigin(req.body);
      MyLogger.success(action, { origin_id: origin.id, name: origin.name });
      serializeSuccessResponse(res, origin, "Origin created successfully");
    } catch (error: any) {
      MyLogger.error(action, error, { origin: req.body });
      throw error;
    }
  }

  async updateOrigin(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    let action = "PUT /api/origins/:id";
    try {
      const originId = parseInt(req.params.id);
      if (isNaN(originId)) {
        res.status(400).json({
          success: false,
          message: "Invalid origin ID",
        });
        return;
      }

      MyLogger.info(action, { origin_id: originId, updates: req.body });
      const origin = await OriginMediator.updateOrigin(originId, req.body);
      MyLogger.success(action, { origin_id: originId, name: origin.name });
      serializeSuccessResponse(res, origin, "Origin updated successfully");
    } catch (error: any) {
      MyLogger.error(action, error, {
        origin_id: req.params.id,
        updates: req.body,
      });
      throw error;
    }
  }

  async deleteOrigin(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    let action = "DELETE /api/origins/:id";
    try {
      const originId = parseInt(req.params.id);
      if (isNaN(originId)) {
        res.status(400).json({
          success: false,
          message: "Invalid origin ID",
        });
        return;
      }

      MyLogger.info(action, { origin_id: originId });
      await OriginMediator.deleteOrigin(originId);
      MyLogger.success(action, { origin_id: originId });
      serializeSuccessResponse(
        res,
        { message: "Origin deleted successfully" },
        "SUCCESS"
      );
    } catch (error: any) {
      MyLogger.error(action, error, { origin_id: req.params.id });
      throw error;
    }
  }
}

export default new OriginsController();
