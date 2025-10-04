import { Request, Response, NextFunction } from "express";
import { GetBOMInfoMediator } from "../mediators/bom/GetBOMInfo.mediator";
import { AddBOMMediator } from "../mediators/bom/AddBOM.mediator";
import { UpdateBOMMediator } from "../mediators/bom/UpdateBOM.mediator";
import { serializeSuccessResponse } from "@/utils/responseHelper";
import { MyLogger } from "@/utils/new-logger";
import {
  CreateBOMRequest,
  UpdateBOMRequest,
  BOMQueryParams,
  MaterialRequirementsQueryParams
} from "@/types/bom";

class BOMController {
  // Get all BOMs with pagination and filtering
  async getBOMs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "GET /api/factory/boms";
      MyLogger.info(action, { query: req.query });
      const userId = req.user?.user_id;
      if (!userId) {
        throw new Error('User not authenticated');
      }
      const result = await GetBOMInfoMediator.getBOMs(req.query as BOMQueryParams, userId);
      MyLogger.success(action, {
        total: result.total,
        page: result.page,
        limit: result.limit,
        bomsCount: result.boms.length
      });
      serializeSuccessResponse(res, result, "SUCCESS");
    } catch (error) {
      next(error);
    }
  }

  // Get BOM by ID with components
  async getBOMById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "GET /api/factory/boms/:id";
      const { id } = req.params;
      MyLogger.info(action, { bomId: id });

      const userId = req.user?.user_id;
      if (!userId) {
        throw new Error('User not authenticated');
      }
      const bom = await GetBOMInfoMediator.getBOMById(id, userId);

      if (!bom) {
        res.status(404).json({
          success: false,
          message: "BOM not found",
          data: null
        });
        return;
      }

      MyLogger.success(action, { bomId: id, found: true });
      serializeSuccessResponse(res, bom, "SUCCESS");
    } catch (error) {
      next(error);
    }
  }

  // Get BOM statistics
  async getBOMStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "GET /api/factory/boms/stats";
      MyLogger.info(action);
      const userId = req.user?.user_id;
      if (!userId) {
        throw new Error('User not authenticated');
      }
      const stats = await GetBOMInfoMediator.getBOMStats(userId);
      MyLogger.success(action, stats);
      serializeSuccessResponse(res, stats, "SUCCESS");
    } catch (error) {
      next(error);
    }
  }

  // Get material requirements for work orders
  async getMaterialRequirements(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "GET /api/factory/material-requirements";
      MyLogger.info(action, { query: req.query });
      const userId = req.user?.user_id;
      if (!userId) {
        throw new Error('User not authenticated');
      }
      const result = await GetBOMInfoMediator.getMaterialRequirements(
        req.query as MaterialRequirementsQueryParams,
        userId
      );
      MyLogger.success(action, {
        total: result.total,
        page: result.page,
        limit: result.limit,
        requirementsCount: result.requirements.length
      });
      serializeSuccessResponse(res, result, "SUCCESS");
    } catch (error) {
      next(error);
    }
  }

  // Get material planning statistics
  async getMaterialPlanningStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "GET /api/factory/material-planning/stats";
      MyLogger.info(action);
      const userId = req.user?.user_id;
      if (!userId) {
        throw new Error('User not authenticated');
      }
      const stats = await GetBOMInfoMediator.getMaterialPlanningStats(userId);
      MyLogger.success(action, stats);
      serializeSuccessResponse(res, stats, "SUCCESS");
    } catch (error) {
      next(error);
    }
  }

  // Get material shortages
  async getMaterialShortages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "GET /api/factory/material-shortages";
      MyLogger.info(action, { query: req.query });
      const userId = req.user?.user_id;
      if (!userId) {
        throw new Error('User not authenticated');
      }
      const params = req.query as {
        status?: string;
        priority?: string;
        material_id?: string;
        work_order_id?: string;
      };
      const shortages = await GetBOMInfoMediator.getMaterialShortages(params, userId);
      MyLogger.success(action, {
        shortagesCount: shortages.length,
        filters: params
      });
      serializeSuccessResponse(res, shortages, "SUCCESS");
    } catch (error) {
      next(error);
    }
  }

  // Run MRP calculation
  async runMRPCalculation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "POST /api/factory/run-mrp";
      MyLogger.info(action);
      const userId = req.user?.user_id;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const result = await GetBOMInfoMediator.runMRPCalculation(userId);
      MyLogger.success(action, result);
      serializeSuccessResponse(res, result, "MRP calculation completed successfully");
    } catch (error) {
      next(error);
    }
  }

  // Generate purchase orders for material shortages
  async generatePurchaseOrdersForShortages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "POST /api/factory/generate-purchase-orders";
      MyLogger.info(action, { body: req.body });
      const userId = req.user?.user_id;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const { shortageIds } = req.body;
      if (!shortageIds || !Array.isArray(shortageIds)) {
        throw new Error('shortageIds array is required');
      }

      const result = await GetBOMInfoMediator.generatePurchaseOrdersForShortages(shortageIds, userId);
      MyLogger.success(action, result);
      serializeSuccessResponse(res, result, "Purchase orders generated successfully");
    } catch (error) {
      next(error);
    }
  }

  // Create new BOM
  async createBOM(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "POST /api/factory/boms";
      const bomData: CreateBOMRequest = req.body;
      MyLogger.info(action, { bomData });

      const userId = req.user?.user_id;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const newBOM = await AddBOMMediator.createBOM(bomData, userId.toString());

      MyLogger.success(action, {
        bomId: newBOM.id,
        version: newBOM.version,
        componentsCount: newBOM.components?.length || 0
      });

      serializeSuccessResponse(res, newBOM, "BOM created successfully");
    } catch (error) {
      next(error);
    }
  }

  // Update BOM
  async updateBOM(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "PUT /api/factory/boms/:id";
      const { id } = req.params;
      const updateData: UpdateBOMRequest = req.body;
      MyLogger.info(action, { bomId: id, updateData });

      const userId = req.user?.user_id;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const updatedBOM = await UpdateBOMMediator.updateBOM(id, updateData, userId.toString());

      MyLogger.success(action, {
        bomId: updatedBOM.id,
        version: updatedBOM.version,
        componentsCount: updatedBOM.components?.length || 0
      });

      serializeSuccessResponse(res, updatedBOM, "BOM updated successfully");
    } catch (error) {
      next(error);
    }
  }

  // Delete BOM
  async deleteBOM(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "DELETE /api/factory/boms/:id";
      const { id } = req.params;
      const { force = false } = req.query;
      MyLogger.info(action, { bomId: id, force });

      const userId = req.user?.user_id;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // TODO: Implement BOM deletion logic
      // const result = await DeleteBOMMediator.deleteBOM(id, userId.toString(), force as boolean);

      MyLogger.success(action, {
        // bomId: id,
        message: "BOM deletion not yet implemented"
      });

      // serializeSuccessResponse(res, result, "BOM deleted successfully");
      res.status(501).json({
        success: false,
        message: "BOM deletion not yet implemented",
        data: null
      });
    } catch (error) {
      next(error);
    }
  }
}

export const bomController = new BOMController();
