import { NextFunction, Request, Response } from "express";
import { PlatesMediator } from "../mediators/plates/PlatesMediator";
import { serializeSuccessResponse } from "@/utils/responseHelper";
import { MyLogger } from "@/utils/new-logger";
import {
  CreatePlateRequest,
  UpdatePlateRequest,
  CreatePlateTypeRequest,
  UpdatePlateTypeRequest,
  PlateStatus,
} from "@/types/factory";

export class PlatesController {
  // ---------------- Plate Types ----------------

  async listPlateTypes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const includeStats = req.query.stats !== "false";
      const types = await PlatesMediator.listPlateTypes(includeStats);
      serializeSuccessResponse(res, types, "Plate types retrieved successfully");
    } catch (error: any) {
      MyLogger.error("GET /api/factory/plates/types", error, { query: req.query });
      next(error);
    }
  }

  async createPlateType(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: CreatePlateTypeRequest = req.body;
      const type = await PlatesMediator.createPlateType(data, Number(req.user!.user_id));
      res.status(201).json({ success: true, data: type, message: "Plate type created successfully" });
    } catch (error: any) {
      MyLogger.error("POST /api/factory/plates/types", error, { data: req.body });
      next(error);
    }
  }

  async updatePlateType(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: UpdatePlateTypeRequest = req.body;
      const type = await PlatesMediator.updatePlateType(req.params.typeId, data);
      serializeSuccessResponse(res, type, "Plate type updated successfully");
    } catch (error: any) {
      MyLogger.error("PUT /api/factory/plates/types/:typeId", error, { params: req.params });
      next(error);
    }
  }

  async deletePlateType(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const deleted = await PlatesMediator.deletePlateType(req.params.typeId);
      if (!deleted) {
        const err: any = new Error("Plate type not found");
        err.statusCode = 404;
        throw err;
      }
      serializeSuccessResponse(res, { deleted }, "Plate type deleted successfully");
    } catch (error: any) {
      MyLogger.error("DELETE /api/factory/plates/types/:typeId", error, { params: req.params });
      next(error);
    }
  }

  async getLifespanStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await PlatesMediator.getLifespanStats();
      serializeSuccessResponse(res, stats, "Plate lifespan stats retrieved successfully");
    } catch (error: any) {
      MyLogger.error("GET /api/factory/plates/stats", error);
      next(error);
    }
  }

  // ---------------- Plates ----------------

  async listPlates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const params = {
        status: req.query.status as PlateStatus | undefined,
        plate_type_id: req.query.plate_type_id
          ? parseInt(req.query.plate_type_id as string, 10)
          : undefined,
        factory_id: req.query.factory_id
          ? parseInt(req.query.factory_id as string, 10)
          : undefined,
        is_active:
          req.query.is_active !== undefined ? req.query.is_active === "true" : undefined,
        search: req.query.search as string | undefined,
        sort_by: req.query.sort_by as any,
        sort_order: req.query.sort_order as "asc" | "desc" | undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      };
      const result = await PlatesMediator.listPlates(params);
      serializeSuccessResponse(res, result, "Plates retrieved successfully");
    } catch (error: any) {
      MyLogger.error("GET /api/factory/plates", error, { query: req.query });
      next(error);
    }
  }

  async getPlate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const plate = await PlatesMediator.getPlate(req.params.id);
      serializeSuccessResponse(res, plate, "Plate retrieved successfully");
    } catch (error: any) {
      MyLogger.error("GET /api/factory/plates/:id", error, { params: req.params });
      next(error);
    }
  }

  async createPlate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: CreatePlateRequest = req.body;
      const plate = await PlatesMediator.createPlate(data, Number(req.user!.user_id));
      res.status(201).json({ success: true, data: plate, message: "Plate created successfully" });
    } catch (error: any) {
      MyLogger.error("POST /api/factory/plates", error, { data: req.body });
      next(error);
    }
  }

  async updatePlate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: UpdatePlateRequest = req.body;
      const plate = await PlatesMediator.updatePlate(req.params.id, data);
      serializeSuccessResponse(res, plate, "Plate updated successfully");
    } catch (error: any) {
      MyLogger.error("PUT /api/factory/plates/:id", error, { params: req.params, data: req.body });
      next(error);
    }
  }

  async deletePlate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const deleted = await PlatesMediator.deletePlate(req.params.id);
      if (!deleted) {
        const err: any = new Error("Plate not found");
        err.statusCode = 404;
        throw err;
      }
      serializeSuccessResponse(res, { deleted }, "Plate deleted successfully");
    } catch (error: any) {
      MyLogger.error("DELETE /api/factory/plates/:id", error, { params: req.params });
      next(error);
    }
  }

  async getPlateUsageHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const history = await PlatesMediator.getPlateUsageHistory(req.params.id);
      serializeSuccessResponse(res, history, "Plate usage history retrieved successfully");
    } catch (error: any) {
      MyLogger.error("GET /api/factory/plates/:id/usage", error, { params: req.params });
      next(error);
    }
  }
}

export const platesController = new PlatesController();
