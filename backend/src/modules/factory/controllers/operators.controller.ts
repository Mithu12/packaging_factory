import { NextFunction, Request, Response } from "express";
import { OperatorMediator } from "../mediators/operators/OperatorMediator";
import { serializeSuccessResponse } from "@/utils/responseHelper";
import { MyLogger } from "@/utils/new-logger";
import {
  CreateOperatorRequest,
  UpdateOperatorRequest,
} from "@/types/factory";

export class OperatorController {
  // Get all operators
  async getOperators(req: Request, res: Response, next: NextFunction): Promise<void> {
    const action = "GET /api/factory/operators";
    try {
      MyLogger.info(action, { query: req.query });

      const params = {
        factory_id: req.query.factory_id ? parseInt(req.query.factory_id as string) : undefined,
        skill_level: req.query.skill_level as string,
        department: req.query.department as string,
        availability_status: req.query.availability_status as string,
        is_active: req.query.is_active ? req.query.is_active === 'true' : undefined,
        search: req.query.search as string,
        sort_by: req.query.sort_by as string,
        sort_order: req.query.sort_order as 'asc' | 'desc',
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      };

      const result = await OperatorMediator.getOperators(params);

      MyLogger.success(action, {
        count: result.operators.length,
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
      });

      serializeSuccessResponse(res, result, "Operators retrieved successfully");
    } catch (error: any) {
      MyLogger.error(action, error, { query: req.query });
      next(error);
    }
  }

  // Get operator by ID
  async getOperatorById(req: Request, res: Response, next: NextFunction): Promise<void> {
    const action = "GET /api/factory/operators/:id";
    try {
      const { id } = req.params;
      MyLogger.info(action, { id });

      const operator = await OperatorMediator.getOperatorById(id);

      MyLogger.success(action, { operator: { id, employee_id: operator.employee_id } });

      serializeSuccessResponse(res, operator, "Operator retrieved successfully");
    } catch (error: any) {
      MyLogger.error(action, error, { id: req.params.id });
      next(error);
    }
  }

  // Get operator by employee ID
  async getOperatorByEmployeeId(req: Request, res: Response, next: NextFunction): Promise<void> {
    const action = "GET /api/factory/operators/employee/:employee_id";
    try {
      const { employee_id } = req.params;
      MyLogger.info(action, { employee_id });

      const operator = await OperatorMediator.getOperatorByEmployeeId(employee_id);

      MyLogger.success(action, { operator: { id: operator.id, employee_id } });

      serializeSuccessResponse(res, operator, "Operator retrieved successfully");
    } catch (error: any) {
      MyLogger.error(action, error, { employee_id: req.params.employee_id });
      next(error);
    }
  }

  // Create operator
  async createOperator(req: Request, res: Response, next: NextFunction): Promise<void> {
    const action = "POST /api/factory/operators";
    try {
      const factory_id = req.user!.factory_id ? Number(req.user!.factory_id) : null;
      const data: CreateOperatorRequest = req.body;
      const created_by = Number(req.user!.user_id);

      MyLogger.info(action, { factory_id, data, created_by });

      const operator = await OperatorMediator.createOperator(
        factory_id,
        data,
        created_by
      );

      MyLogger.success(action, { operator: { id: operator.id, employee_id: operator.employee_id } });

      serializeSuccessResponse(res, operator, "Operator created successfully");
    } catch (error: any) {
      MyLogger.error(action, error, { data: req.body });
      next(error);
    }
  }

  // Update operator
  async updateOperator(req: Request, res: Response, next: NextFunction): Promise<void> {
    const action = "PUT /api/factory/operators/:id";
    try {
      const { id } = req.params;
      const data: UpdateOperatorRequest = req.body;
      const updated_by = Number(req.user!.user_id);

      MyLogger.info(action, { id, data, updated_by });

      const operator = await OperatorMediator.updateOperator(
        id,
        data,
        updated_by
      );

      MyLogger.success(action, { operator: { id, employee_id: operator.employee_id } });

      serializeSuccessResponse(res, operator, "Operator updated successfully");
    } catch (error: any) {
      MyLogger.error(action, error, { id: req.params.id, data: req.body });
      next(error);
    }
  }

  // Delete operator
  async deleteOperator(req: Request, res: Response, next: NextFunction): Promise<void> {
    const action = "DELETE /api/factory/operators/:id";
    try {
      const { id } = req.params;
      MyLogger.info(action, { id });

      const deleted = await OperatorMediator.deleteOperator(id);

      if (!deleted) {
        throw new Error(`Operator with ID ${id} not found`);
      }

      MyLogger.success(action, { deleted, id });

      serializeSuccessResponse(res, { deleted }, "Operator deleted successfully");
    } catch (error: any) {
      MyLogger.error(action, error, { id: req.params.id });
      next(error);
    }
  }

  // Update operator availability
  async updateOperatorAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    const action = "PATCH /api/factory/operators/:id/availability";
    try {
      const { id } = req.params;
      const { availability_status, current_work_order_id } = req.body;

      if (!availability_status) {
        throw new Error("availability_status is required");
      }

      MyLogger.info(action, { id, availability_status, current_work_order_id });

      const operator = await OperatorMediator.updateOperatorAvailability(
        id,
        availability_status,
        current_work_order_id
      );

      MyLogger.success(action, {
        operator: { id, employee_id: operator.employee_id },
        newStatus: availability_status,
      });

      serializeSuccessResponse(res, operator, "Operator availability updated successfully");
    } catch (error: any) {
      MyLogger.error(action, error, { id: req.params.id, data: req.body });
      next(error);
    }
  }

  // Get operator statistics
  async getOperatorStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    const action = "GET /api/factory/operators/stats";
    try {
      const factory_id = req.query.factory_id ? parseInt(req.query.factory_id as string) : undefined;

      MyLogger.info(action, { factory_id });

      const stats = await OperatorMediator.getOperatorStats(factory_id);

      MyLogger.success(action, { stats });

      serializeSuccessResponse(res, stats, "Operator statistics retrieved successfully");
    } catch (error: any) {
      MyLogger.error(action, error, { query: req.query });
      next(error);
    }
  }
}

// Export singleton instance
export const operatorController = new OperatorController();
