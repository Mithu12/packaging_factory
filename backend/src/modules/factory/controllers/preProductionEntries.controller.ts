import { Request, Response, NextFunction } from "express";
import { serializeSuccessResponse } from "@/utils/responseHelper";
import { MyLogger } from "@/utils/new-logger";
import { CreatePreProductionEntryMediator } from "../mediators/preProduction/CreatePreProductionEntry.mediator";
import { GetPreProductionEntriesMediator } from "../mediators/preProduction/GetPreProductionEntries.mediator";
import {
  CreatePreProductionEntryRequest,
  PreProductionEntryQueryParams,
} from "@/types/preProduction";

class PreProductionEntriesController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "POST /api/factory/pre-production-entries";
      const userId = req.user?.user_id;
      MyLogger.info(action, { body: req.body, userId });

      const entry = await CreatePreProductionEntryMediator.create(
        req.body as CreatePreProductionEntryRequest,
        String(userId)
      );

      MyLogger.success(action, { entryId: entry.id });
      serializeSuccessResponse(res, entry, "SUCCESS");
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "GET /api/factory/pre-production-entries";
      MyLogger.info(action, { query: req.query });

      const result = await GetPreProductionEntriesMediator.list(
        req.query as unknown as PreProductionEntryQueryParams
      );

      MyLogger.success(action, { total: result.total });
      serializeSuccessResponse(res, result, "SUCCESS");
    } catch (error) {
      next(error);
    }
  }
}

export const preProductionEntriesController = new PreProductionEntriesController();
export default preProductionEntriesController;
