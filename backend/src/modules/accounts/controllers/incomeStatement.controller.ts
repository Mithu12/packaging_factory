import { Request, Response } from 'express';
import { GetIncomeStatementMediator } from '@/modules/accounts/mediators/reports/GetIncomeStatement.mediator';
import { GetBalanceSheetMediator } from '@/modules/accounts/mediators/reports/GetBalanceSheet.mediator';
import { IncomeStatementQueryParams, BalanceSheetQueryParams } from '@/types/accounts';
import { serializeSuccessResponse } from '@/utils/responseHelper';
import { MyLogger } from '@/utils/new-logger';

export class ReportsController {
  static async getIncomeStatement(req: Request, res: Response): Promise<void> {
    const action = 'GET /api/accounts/reports/income-statement';
    try {
      const query = req.query as unknown as IncomeStatementQueryParams;
      
      MyLogger.info(action, { query });

      const result = await GetIncomeStatementMediator.getIncomeStatement(query);

      MyLogger.success(action, {
        sectionsCount: result.sections.length,
        highlightsCount: result.highlights.length,
        period: result.period.label,
        totalRevenue: result.totals.revenue,
        netIncome: result.totals.netIncome
      });

      serializeSuccessResponse(res, result, "SUCCESS");
    } catch (error: any) {
      MyLogger.error(action, error, { query: req.query });
      throw error;
    }
  }

  static async getBalanceSheet(req: Request, res: Response): Promise<void> {
    const action = 'GET /api/accounts/reports/balance-sheet';
    try {
      const query = req.query as unknown as BalanceSheetQueryParams;
      
      MyLogger.info(action, { query });

      const result = await GetBalanceSheetMediator.getBalanceSheet(query);

      MyLogger.success(action, {
        asOfDate: result.asOfDate,
        assetsCount: result.assets.length,
        liabilitiesCount: result.liabilities.length,
        equityCount: result.equity.length,
        totalAssets: result.totals.totalAssets,
        totalLiabilities: result.totals.totalLiabilities,
        totalEquity: result.totals.totalEquity,
        balanceCheck: result.totals.balanceCheck
      });

      serializeSuccessResponse(res, result, "SUCCESS");
    } catch (error: any) {
      MyLogger.error(action, error, { query: req.query });
      throw error;
    }
  }
}
