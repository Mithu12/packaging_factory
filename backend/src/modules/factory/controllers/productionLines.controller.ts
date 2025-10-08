import { NextFunction, Request, Response } from "express";
import { ProductionLineMediator } from "../mediators/productionLines/ProductionLineMediator";
import { serializeSuccessResponse } from "@/utils/responseHelper";
import { MyLogger } from "@/utils/new-logger";
import {
  CreateProductionLineRequest,
  UpdateProductionLineRequest,
} from "@/types/factory";

export class ProductionLineController {
  // Get all production lines
  async getProductionLines(req: Request, res: Response, next: NextFunction): Promise<void> {
    const action = "GET /api/factory/production-lines";
    try {
      MyLogger.info(action, { query: req.query });

      const params = {
        factory_id: req.query.factory_id ? parseInt(req.query.factory_id as string) : undefined,
        status: req.query.status as string,
        is_active: req.query.is_active ? req.query.is_active === 'true' : undefined,
        search: req.query.search as string,
        sort_by: req.query.sort_by as string,
        sort_order: req.query.sort_order as 'asc' | 'desc',
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      };

      const result = await ProductionLineMediator.getProductionLines(params);

      MyLogger.success(action, {
        count: result.production_lines.length,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
      });

      serializeSuccessResponse(res, result, "Production lines retrieved successfully");
    } catch (error: any) {
      MyLogger.error(action, error, { query: req.query });
      next(error);
    }
  }

  // Get production line by ID
  async getProductionLineById(req: Request, res: Response, next: NextFunction): Promise<void> {
    const action = "GET /api/factory/production-lines/:id";
    try {
      const { id } = req.params;
      MyLogger.info(action, { id });

      const production_line = await ProductionLineMediator.getProductionLineById(id);

      MyLogger.success(action, { production_line: { id, name: production_line.name } });

      serializeSuccessResponse(res, production_line, "Production line retrieved successfully");
    } catch (error: any) {
      MyLogger.error(action, error, { id: req.params.id });
      next(error);
    }
  }

  // Create production line
  async createProductionLine(req: Request, res: Response, next: NextFunction): Promise<void> {
    const action = "POST /api/factory/production-lines";
    try {
      const factory_id = req.user!.factory_id ? parseInt(req.user!.factory_id as string) : null;
      const data: CreateProductionLineRequest = req.body;
      const created_by = parseInt(req.user!.user_id as string);

      MyLogger.info(action, { factory_id, data, created_by });

      const production_line = await ProductionLineMediator.createProductionLine(
        factory_id,
        data,
        created_by
      );

      MyLogger.success(action, { production_line: { id: production_line.id, name: production_line.name } });

      serializeSuccessResponse(res, production_line, "Production line created successfully", 201);
    } catch (error: any) {
      MyLogger.error(action, error, { data: req.body });
      next(error);
    }
  }

  // Update production line
  async updateProductionLine(req: Request, res: Response, next: NextFunction): Promise<void> {
    const action = "PUT /api/factory/production-lines/:id";
    try {
      const { id } = req.params;
      const data: UpdateProductionLineRequest = req.body;
      const updated_by = parseInt(req.user!.user_id as string);

      MyLogger.info(action, { id, data, updated_by });

      const production_line = await ProductionLineMediator.updateProductionLine(
        id,
        data,
        updated_by
      );

      MyLogger.success(action, { production_line: { id, name: production_line.name } });

      serializeSuccessResponse(res, production_line, "Production line updated successfully");
    } catch (error: any) {
      MyLogger.error(action, error, { id: req.params.id, data: req.body });
      next(error);
    }
  }

  // Delete production line
  async deleteProductionLine(req: Request, res: Response, next: NextFunction): Promise<void> {
    const action = "DELETE /api/factory/production-lines/:id";
    try {
      const { id } = req.params;
      MyLogger.info(action, { id });

      const deleted = await ProductionLineMediator.deleteProductionLine(id);

      if (!deleted) {
        throw new Error(`Production line with ID ${id} not found`);
      }

      MyLogger.success(action, { deleted, id });

      serializeSuccessResponse(res, { deleted }, "Production line deleted successfully");
    } catch (error: any) {
      MyLogger.error(action, error, { id: req.params.id });
      next(error);
    }
  }

  // Get production line statistics
  async getProductionLineStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    const action = "GET /api/factory/production-lines/stats";
    try {
      const factory_id = req.query.factory_id ? parseInt(req.query.factory_id as string) : undefined;

      MyLogger.info(action, { factory_id });

      const stats = await ProductionLineMediator.getProductionLineStats(factory_id);

      MyLogger.success(action, { stats });

      serializeSuccessResponse(res, stats, "Production line statistics retrieved successfully");
    } catch (error: any) {
      MyLogger.error(action, error, { query: req.query });
      next(error);
    }
  }

  // Update production line load
  async updateProductionLineLoad(req: Request, res: Response, next: NextFunction): Promise<void> {
    const action = "PATCH /api/factory/production-lines/:id/load";
    try {
      const { id } = req.params;
      const { load_change } = req.body;

      if (load_change === undefined || load_change === null) {
        throw new Error("load_change is required");
      }

      MyLogger.info(action, { id, load_change });

      const production_line = await ProductionLineMediator.updateProductionLineLoad(
        id,
        load_change
      );

      MyLogger.success(action, {
        production_line: { id, name: production_line.name },
        newLoad: production_line.current_load,
      });

      serializeSuccessResponse(res, production_line, "Production line load updated successfully");
    } catch (error: any) {
      MyLogger.error(action, error, { id: req.params.id, load_change: req.body.load_change });
      next(error);
    }
  }
}

// Export singleton instance
export const productionLineController = new ProductionLineController();
