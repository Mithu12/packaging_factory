import { Request, Response, NextFunction } from "express";
import { FactoryMediator } from "../mediators/factories/FactoryMediator";
import { serializeSuccessResponse } from "@/utils/responseHelper";
import { MyLogger } from "@/utils/new-logger";
import { CreateFactoryRequest, UpdateFactoryRequest } from "@/types/factory";

class FactoriesController {
  // Get all factories (admin only or user's accessible factories)
  async getAllFactories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "GET /api/factory/factories";
      MyLogger.info(action, { query: req.query });

      const userId = req.user?.user_id;
      const result = await FactoryMediator.getAllFactories(req.query, userId);

      MyLogger.success(action, {
        total: result.total,
        page: result.page,
        limit: result.limit,
        factoriesCount: result.factories.length
      });

      serializeSuccessResponse(res, result, "SUCCESS");
    } catch (error) {
      next(error);
    }
  }

  // Get factory by ID
  async getFactoryById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "GET /api/factory/factories/:id";
      const { id } = req.params;
      MyLogger.info(action, { factoryId: id });

      const userId = req.user?.user_id;
      const factory = await FactoryMediator.getFactoryById(id, userId);

      if (!factory) {
        res.status(404).json({
          success: false,
          message: "Factory not found",
          data: null
        });
        return;
      }

      MyLogger.success(action, { factoryId: id, found: true });
      serializeSuccessResponse(res, factory, "SUCCESS");
    } catch (error) {
      next(error);
    }
  }

  // Create new factory (admin only)
  async createFactory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "POST /api/factory/factories";
      MyLogger.info(action, { factoryData: req.body });

      const factoryData: CreateFactoryRequest = req.body;
      const userId = req.user?.user_id;

      const result = await FactoryMediator.createFactory(factoryData, userId);
      MyLogger.success(action, {
        factoryId: result.id,
        factoryCode: result.code,
        factoryName: result.name
      });

      serializeSuccessResponse(res, result, "SUCCESS");
    } catch (error) {
      next(error);
    }
  }

  // Update factory (admin only)
  async updateFactory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "PUT /api/factory/factories/:id";
      MyLogger.info(action, { factoryId: req.params.id, updateData: req.body });

      const factoryId = req.params.id;
      const updateData: UpdateFactoryRequest = req.body;
      const userId = req.user?.user_id;

      const result = await FactoryMediator.updateFactory(factoryId, updateData, userId);
      MyLogger.success(action, {
        factoryId,
        updatedFields: Object.keys(updateData)
      });

      serializeSuccessResponse(res, result, "SUCCESS");
    } catch (error) {
      next(error);
    }
  }

  // Delete factory (admin only)
  async deleteFactory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "DELETE /api/factory/factories/:id";
      MyLogger.info(action, { factoryId: req.params.id });

      const factoryId = req.params.id;
      const userId = req.user?.user_id;

      await FactoryMediator.deleteFactory(factoryId, userId);
      MyLogger.success(action, { factoryId });

      serializeSuccessResponse(res, { deleted: true }, "SUCCESS");
    } catch (error) {
      next(error);
    }
  }

  // Get user's accessible factories
  async getUserFactories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "GET /api/factory/user-factories";
      MyLogger.info(action);

      const userId = req.user?.user_id;
      const factories = await FactoryMediator.getUserFactories(userId);

      MyLogger.success(action, { factoriesCount: factories.length });
      serializeSuccessResponse(res, { factories }, "SUCCESS");
    } catch (error) {
      next(error);
    }
  }

  // Get users assigned to a specific factory
  async getFactoryUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "GET /api/factory/factories/:factoryId/users";
      const { factoryId } = req.params;
      MyLogger.info(action, { factoryId });

      const userId = req.user?.user_id;
      const users = await FactoryMediator.getFactoryUsers(factoryId, userId);

      MyLogger.success(action, { usersCount: users.length });
      serializeSuccessResponse(res, { users }, "SUCCESS");
    } catch (error) {
      next(error);
    }
  }

  // Assign user to factory
  async assignUserToFactory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "POST /api/factory/factories/:factoryId/users";
      MyLogger.info(action, {
        factoryId: req.params.factoryId,
        assignmentData: req.body
      });

      const factoryId = req.params.factoryId;
      const { userId, role, isPrimary } = req.body;
      const currentUserId = req.user?.user_id;

      await FactoryMediator.assignUserToFactory(factoryId, userId, role, isPrimary, currentUserId);
      MyLogger.success(action, { factoryId, userId, role });

      serializeSuccessResponse(res, { assigned: true }, "SUCCESS");
    } catch (error) {
      next(error);
    }
  }

  // Remove user from factory
  async removeUserFromFactory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "DELETE /api/factory/factories/:factoryId/users/:userId";
      MyLogger.info(action, {
        factoryId: req.params.factoryId,
        userId: req.params.userId
      });

      const factoryId = req.params.factoryId;
      const userId = parseInt(req.params.userId);
      const currentUserId = req.user?.user_id;

      await FactoryMediator.removeUserFromFactory(factoryId, userId, currentUserId);
      MyLogger.success(action, { factoryId, userId });

      serializeSuccessResponse(res, { removed: true }, "SUCCESS");
    } catch (error) {
      next(error);
    }
  }
}

export default new FactoriesController();
