import { NextFunction, Request, Response } from "express";
import { MachineMediator } from "../mediators/machines/MachineMediator";
import { serializeSuccessResponse } from "@/utils/responseHelper";
import { MyLogger } from "@/utils/new-logger";
import {
  CreateMachineRequest,
  UpdateMachineRequest,
  CreateMachineMaintenanceLogRequest,
  MachineStatus,
} from "@/types/factory";

export class MachineController {
  async getMachines(req: Request, res: Response, next: NextFunction): Promise<void> {
    const action = "GET /api/factory/machines";
    try {
      const params = {
        factory_id: req.query.factory_id ? parseInt(req.query.factory_id as string, 10) : undefined,
        production_line_id: req.query.production_line_id
          ? parseInt(req.query.production_line_id as string, 10)
          : undefined,
        status: req.query.status as MachineStatus | undefined,
        is_active: req.query.is_active !== undefined ? req.query.is_active === "true" : undefined,
        search: req.query.search as string | undefined,
        sort_by: req.query.sort_by as string | undefined,
        sort_order: req.query.sort_order as "asc" | "desc" | undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      };
      MyLogger.info(action, { params });
      const result = await MachineMediator.getMachines(params);
      serializeSuccessResponse(res, result, "Machines retrieved successfully");
    } catch (error: any) {
      MyLogger.error(action, error, { query: req.query });
      next(error);
    }
  }

  async getMachineById(req: Request, res: Response, next: NextFunction): Promise<void> {
    const action = "GET /api/factory/machines/:id";
    try {
      const machine = await MachineMediator.getMachineById(req.params.id);
      serializeSuccessResponse(res, machine, "Machine retrieved successfully");
    } catch (error: any) {
      MyLogger.error(action, error, { id: req.params.id });
      next(error);
    }
  }

  async createMachine(req: Request, res: Response, next: NextFunction): Promise<void> {
    const action = "POST /api/factory/machines";
    try {
      const factory_id = req.user!.factory_id ? Number(req.user!.factory_id) : null;
      const data: CreateMachineRequest = req.body;
      const created_by = Number(req.user!.user_id);
      const machine = await MachineMediator.createMachine(factory_id, data, created_by);
      res.status(201).json({
        success: true,
        data: machine,
        message: "Machine created successfully",
      });
    } catch (error: any) {
      MyLogger.error(action, error, { data: req.body });
      next(error);
    }
  }

  async updateMachine(req: Request, res: Response, next: NextFunction): Promise<void> {
    const action = "PUT /api/factory/machines/:id";
    try {
      const data: UpdateMachineRequest = req.body;
      const machine = await MachineMediator.updateMachine(req.params.id, data);
      serializeSuccessResponse(res, machine, "Machine updated successfully");
    } catch (error: any) {
      MyLogger.error(action, error, { id: req.params.id, data: req.body });
      next(error);
    }
  }

  async deleteMachine(req: Request, res: Response, next: NextFunction): Promise<void> {
    const action = "DELETE /api/factory/machines/:id";
    try {
      const deleted = await MachineMediator.deleteMachine(req.params.id);
      if (!deleted) {
        const err: any = new Error(`Machine with ID ${req.params.id} not found`);
        err.statusCode = 404;
        throw err;
      }
      serializeSuccessResponse(res, { deleted }, "Machine deleted successfully");
    } catch (error: any) {
      MyLogger.error(action, error, { id: req.params.id });
      next(error);
    }
  }

  async getMachineStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    const action = "GET /api/factory/machines/stats";
    try {
      const factory_id = req.query.factory_id
        ? parseInt(req.query.factory_id as string, 10)
        : undefined;
      const stats = await MachineMediator.getMachineStats(factory_id);
      serializeSuccessResponse(res, stats, "Machine statistics retrieved successfully");
    } catch (error: any) {
      MyLogger.error(action, error, { query: req.query });
      next(error);
    }
  }

  async getMaintenanceLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    const action = "GET /api/factory/machines/:id/maintenance-logs";
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const result = await MachineMediator.getMaintenanceLogs(req.params.id, { page, limit });
      serializeSuccessResponse(res, result, "Maintenance logs retrieved successfully");
    } catch (error: any) {
      MyLogger.error(action, error, { id: req.params.id });
      next(error);
    }
  }

  async createMaintenanceLog(req: Request, res: Response, next: NextFunction): Promise<void> {
    const action = "POST /api/factory/machines/:id/maintenance-logs";
    try {
      const created_by = Number(req.user!.user_id);
      const data: CreateMachineMaintenanceLogRequest = req.body;
      const log = await MachineMediator.createMaintenanceLog(req.params.id, data, created_by);
      res.status(201).json({
        success: true,
        data: log,
        message: "Maintenance log recorded successfully",
      });
    } catch (error: any) {
      MyLogger.error(action, error, { id: req.params.id, data: req.body });
      next(error);
    }
  }

  async deleteMaintenanceLog(req: Request, res: Response, next: NextFunction): Promise<void> {
    const action = "DELETE /api/factory/machines/:id/maintenance-logs/:logId";
    try {
      const deleted = await MachineMediator.deleteMaintenanceLog(
        req.params.id,
        req.params.logId
      );
      if (!deleted) {
        const err: any = new Error("Maintenance log not found");
        err.statusCode = 404;
        throw err;
      }
      serializeSuccessResponse(res, { deleted }, "Maintenance log deleted successfully");
    } catch (error: any) {
      MyLogger.error(action, error, { params: req.params });
      next(error);
    }
  }
}

export const machineController = new MachineController();
