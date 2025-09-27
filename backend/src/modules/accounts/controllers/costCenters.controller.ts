import { NextFunction, Request, Response } from "express";
import GetCostCenterInfoMediator from "../mediators/costCenters/GetCostCenterInfo.mediator";
import AddCostCenterMediator from "../mediators/costCenters/AddCostCenter.mediator";
import UpdateCostCenterInfoMediator from "../mediators/costCenters/UpdateCostCenterInfo.mediator";
import DeleteCostCenterMediator from "../mediators/costCenters/DeleteCostCenter.mediator";
import { serializeSuccessResponse } from "@/utils/responseHelper";
import { MyLogger } from "@/utils/new-logger";

class CostCentersController {
  // ===== COST CENTERS METHODS =====

  async getAllCostCenters(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    let action = "GET /api/accounts/cost-centers";
    try {
      MyLogger.info(action, { query: req.query });
      const result = await GetCostCenterInfoMediator.getCostCenterList(req.query);
      MyLogger.success(action, {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      });
      serializeSuccessResponse(res, result, "SUCCESS");
    } catch (error: any) {
      MyLogger.error(action, error, { query: req.query });
      throw error;
    }
  }

  async getCostCenterStats(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    let action = "GET /api/accounts/cost-centers/stats";
    try {
      MyLogger.info(action);
      const stats = await GetCostCenterInfoMediator.getCostCenterStats();
      MyLogger.success(action, { stats });
      serializeSuccessResponse(res, stats, "SUCCESS");
    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    }
  }

  async searchCostCenters(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    let action = "GET /api/accounts/cost-centers/search";
    try {
      const query = req.query.q as string;
      if (!query) {
        return serializeSuccessResponse(res, [], "SUCCESS");
      }
      MyLogger.info(action, { query });
      const results = await GetCostCenterInfoMediator.searchCostCenters(query);
      MyLogger.success(action, { 
        query, 
        resultCount: results.length 
      });
      serializeSuccessResponse(res, results, "SUCCESS");
    } catch (error: any) {
      MyLogger.error(action, error, { query: req.query.q });
      throw error;
    }
  }

  async getCostCenterById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    let action = "GET /api/accounts/cost-centers/:id";
    try {
      const id = parseInt(req.params.id);
      MyLogger.info(action, { costCenterId: id });
      const costCenter = await GetCostCenterInfoMediator.getCostCenterById(id);
      MyLogger.success(action, { 
        costCenterId: id, 
        costCenterName: costCenter.name 
      });
      serializeSuccessResponse(res, costCenter, "SUCCESS");
    } catch (error: any) {
      MyLogger.error(action, error, { costCenterId: req.params.id });
      throw error;
    }
  }

  async createCostCenter(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    let action = "POST /api/accounts/cost-centers";
    try {
      MyLogger.info(action, { costCenterName: req.body.name });
      const costCenter = await AddCostCenterMediator.createCostCenter(req.body);
      MyLogger.success(action, {
        costCenterId: costCenter.id,
        costCenterName: costCenter.name,
      });
      serializeSuccessResponse(res, costCenter, "Cost center created successfully");
    } catch (error: any) {
      MyLogger.error(action, error, { costCenterName: req.body.name });
      throw error;
    }
  }

  async updateCostCenter(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    let action = "PUT /api/accounts/cost-centers/:id";
    try {
      const id = parseInt(req.params.id);
      MyLogger.info(action, {
        costCenterId: id,
        updateFields: Object.keys(req.body),
      });
      const costCenter = await UpdateCostCenterInfoMediator.updateCostCenter(
        id,
        req.body
      );
      MyLogger.success(action, { 
        costCenterId: id, 
        costCenterName: costCenter.name 
      });
      serializeSuccessResponse(res, costCenter, "Cost center updated successfully");
    } catch (error: any) {
      MyLogger.error(action, error, { costCenterId: req.params.id });
      throw error;
    }
  }

  async updateActualSpend(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    let action = "PUT /api/accounts/cost-centers/:id/actual-spend";
    try {
      const id = parseInt(req.params.id);
      const { actualSpend } = req.body;
      MyLogger.info(action, { costCenterId: id, actualSpend });
      const costCenter = await UpdateCostCenterInfoMediator.updateActualSpend(id, actualSpend);
      MyLogger.success(action, { 
        costCenterId: id, 
        actualSpend: costCenter.actualSpend 
      });
      serializeSuccessResponse(res, costCenter, "Actual spend updated successfully");
    } catch (error: any) {
      MyLogger.error(action, error, { costCenterId: req.params.id });
      throw error;
    }
  }

  async deleteCostCenter(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    let action = "DELETE /api/accounts/cost-centers/:id";
    try {
      const id = parseInt(req.params.id);
      MyLogger.info(action, { costCenterId: id });
      await DeleteCostCenterMediator.deleteCostCenter(id);
      MyLogger.success(action, { costCenterId: id });
      serializeSuccessResponse(res, {}, "Cost center deleted successfully");
    } catch (error: any) {
      MyLogger.error(action, error, { costCenterId: req.params.id });
      throw error;
    }
  }

  async deactivateCostCenter(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    let action = "PUT /api/accounts/cost-centers/:id/deactivate";
    try {
      const id = parseInt(req.params.id);
      MyLogger.info(action, { costCenterId: id });
      await DeleteCostCenterMediator.deactivateCostCenter(id);
      MyLogger.success(action, { costCenterId: id });
      serializeSuccessResponse(res, {}, "Cost center deactivated successfully");
    } catch (error: any) {
      MyLogger.error(action, error, { costCenterId: req.params.id });
      throw error;
    }
  }

  async activateCostCenter(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    let action = "PUT /api/accounts/cost-centers/:id/activate";
    try {
      const id = parseInt(req.params.id);
      MyLogger.info(action, { costCenterId: id });
      await DeleteCostCenterMediator.activateCostCenter(id);
      MyLogger.success(action, { costCenterId: id });
      serializeSuccessResponse(res, {}, "Cost center activated successfully");
    } catch (error: any) {
      MyLogger.error(action, error, { costCenterId: req.params.id });
      throw error;
    }
  }
}

export default new CostCentersController();
