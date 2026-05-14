import { NextFunction, Request, Response } from "express";
import { MachinePartsMediator } from "../mediators/machines/MachinePartsMediator";
import { serializeSuccessResponse } from "@/utils/responseHelper";
import { MyLogger } from "@/utils/new-logger";
import {
  CreateMachinePartRequest,
  UpdateMachinePartRequest,
  CreateMachinePartReplacementRequest,
  MachinePartStatus,
} from "@/types/factory";

export class MachinePartsController {
  async listParts(req: Request, res: Response, next: NextFunction): Promise<void> {
    const action = "GET /api/factory/machines/:id/parts";
    try {
      const params = {
        status: req.query.status as MachinePartStatus | undefined,
        is_active:
          req.query.is_active !== undefined ? req.query.is_active === "true" : undefined,
        overdue_only:
          req.query.overdue_only !== undefined
            ? req.query.overdue_only === "true"
            : undefined,
        search: req.query.search as string | undefined,
        sort_by: req.query.sort_by as any,
        sort_order: req.query.sort_order as "asc" | "desc" | undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      };
      const result = await MachinePartsMediator.listParts(req.params.id, params);
      serializeSuccessResponse(res, result, "Machine parts retrieved successfully");
    } catch (error: any) {
      MyLogger.error(action, error, { id: req.params.id, query: req.query });
      next(error);
    }
  }

  async getPart(req: Request, res: Response, next: NextFunction): Promise<void> {
    const action = "GET /api/factory/machines/:id/parts/:partId";
    try {
      const part = await MachinePartsMediator.getPart(
        req.params.id,
        req.params.partId
      );
      serializeSuccessResponse(res, part, "Machine part retrieved successfully");
    } catch (error: any) {
      MyLogger.error(action, error, { params: req.params });
      next(error);
    }
  }

  async createPart(req: Request, res: Response, next: NextFunction): Promise<void> {
    const action = "POST /api/factory/machines/:id/parts";
    try {
      const data: CreateMachinePartRequest = req.body;
      const created_by = Number(req.user!.user_id);
      const part = await MachinePartsMediator.createPart(
        req.params.id,
        data,
        created_by
      );
      res.status(201).json({
        success: true,
        data: part,
        message: "Machine part created successfully",
      });
    } catch (error: any) {
      MyLogger.error(action, error, { id: req.params.id, data: req.body });
      next(error);
    }
  }

  async updatePart(req: Request, res: Response, next: NextFunction): Promise<void> {
    const action = "PUT /api/factory/machines/:id/parts/:partId";
    try {
      const data: UpdateMachinePartRequest = req.body;
      const part = await MachinePartsMediator.updatePart(
        req.params.id,
        req.params.partId,
        data
      );
      serializeSuccessResponse(res, part, "Machine part updated successfully");
    } catch (error: any) {
      MyLogger.error(action, error, { params: req.params, data: req.body });
      next(error);
    }
  }

  async deletePart(req: Request, res: Response, next: NextFunction): Promise<void> {
    const action = "DELETE /api/factory/machines/:id/parts/:partId";
    try {
      const deleted = await MachinePartsMediator.deletePart(
        req.params.id,
        req.params.partId
      );
      if (!deleted) {
        const err: any = new Error("Machine part not found");
        err.statusCode = 404;
        throw err;
      }
      serializeSuccessResponse(res, { deleted }, "Machine part deleted successfully");
    } catch (error: any) {
      MyLogger.error(action, error, { params: req.params });
      next(error);
    }
  }

  async listReplacements(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const action = "GET /api/factory/machines/:id/parts/:partId/replacements";
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const result = await MachinePartsMediator.listReplacements(
        req.params.id,
        req.params.partId,
        { page, limit }
      );
      serializeSuccessResponse(
        res,
        result,
        "Part replacements retrieved successfully"
      );
    } catch (error: any) {
      MyLogger.error(action, error, { params: req.params });
      next(error);
    }
  }

  async createReplacement(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const action = "POST /api/factory/machines/:id/parts/:partId/replacements";
    try {
      const data: CreateMachinePartReplacementRequest = req.body;
      const created_by = Number(req.user!.user_id);
      const replacement = await MachinePartsMediator.createReplacement(
        req.params.id,
        req.params.partId,
        data,
        created_by
      );
      res.status(201).json({
        success: true,
        data: replacement,
        message: "Part replacement recorded successfully",
      });
    } catch (error: any) {
      MyLogger.error(action, error, { params: req.params, data: req.body });
      next(error);
    }
  }

  async deleteReplacement(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const action =
      "DELETE /api/factory/machines/:id/parts/:partId/replacements/:replacementId";
    try {
      const deleted = await MachinePartsMediator.deleteReplacement(
        req.params.id,
        req.params.partId,
        req.params.replacementId
      );
      if (!deleted) {
        const err: any = new Error("Part replacement not found");
        err.statusCode = 404;
        throw err;
      }
      serializeSuccessResponse(
        res,
        { deleted },
        "Part replacement deleted successfully"
      );
    } catch (error: any) {
      MyLogger.error(action, error, { params: req.params });
      next(error);
    }
  }
}

export const machinePartsController = new MachinePartsController();
