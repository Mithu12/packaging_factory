import { Request, Response } from 'express';
import { GetLedgerInfoMediator, LedgerQueryParams } from '../mediators/ledger/GetLedgerInfo.mediator';
import { MyLogger } from '@/utils/new-logger';
import { serializeSuccessResponse } from '@/utils/responseHelper';

export class LedgerController {
  static async getAllLedgerEntries(req: Request, res: Response): Promise<void> {
    const action = 'GET /api/accounts/ledger';
    try {
      const query = req.query as unknown as LedgerQueryParams;
      MyLogger.info(action, { query });

      const result = await GetLedgerInfoMediator.getLedgerEntries(query);

      MyLogger.success(action, {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages
      });

      serializeSuccessResponse(res, result, "SUCCESS");
    } catch (error: any) {
      MyLogger.error(action, error, { query: req.query });
      throw error;
    }
  }

  static async getLedgerStats(req: Request, res: Response): Promise<void> {
    const action = 'GET /api/accounts/ledger/stats';
    try {
      const query = req.query as unknown as LedgerQueryParams;
      MyLogger.info(action, { query });

      const stats = await GetLedgerInfoMediator.getLedgerStats(query);

      MyLogger.success(action, stats);
      serializeSuccessResponse(res, stats, "SUCCESS");
    } catch (error: any) {
      MyLogger.error(action, error, { query: req.query });
      throw error;
    }
  }

  static async getCostCenterLedgerEntries(req: Request, res: Response): Promise<void> {
    const action = 'GET /api/accounts/ledger/cost-center/:id';
    try {
      const costCenterId = parseInt(req.params.id);
      const query = req.query as unknown as LedgerQueryParams;
      
      MyLogger.info(action, { costCenterId, query });

      if (isNaN(costCenterId)) {
        const error = new Error('Invalid cost center ID');
        MyLogger.error(action, error, { costCenterId: req.params.id });
        throw error;
      }

      const result = await GetLedgerInfoMediator.getCostCenterLedgerEntries(costCenterId, query);

      MyLogger.success(action, {
        costCenterId,
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages
      });

      serializeSuccessResponse(res, result, "SUCCESS");
    } catch (error: any) {
      MyLogger.error(action, error, { costCenterId: req.params.id, query: req.query });
      throw error;
    }
  }
}
