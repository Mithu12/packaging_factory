import { NextFunction, Request, Response } from "express";
import GetChartOfAccountInfoMediator from "../mediators/chartOfAccounts/GetChartOfAccountInfo.mediator";
import AddChartOfAccountMediator from "../mediators/chartOfAccounts/AddChartOfAccount.mediator";
import UpdateChartOfAccountInfoMediator from "../mediators/chartOfAccounts/UpdateChartOfAccountInfo.mediator";
import DeleteChartOfAccountMediator from "../mediators/chartOfAccounts/DeleteChartOfAccount.mediator";
import GenerateCcAccountsMediator from "../mediators/chartOfAccounts/GenerateCcAccounts.mediator";
import { serializeSuccessResponse } from "@/utils/responseHelper";
import { MyLogger } from "@/utils/new-logger";

class ChartOfAccountsController {
  // ===== CHART OF ACCOUNTS METHODS =====

  async getAllChartOfAccounts(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    let action = "GET /api/accounts/chart-of-accounts";
    try {
      MyLogger.info(action, { query: req.query });
      const result = await GetChartOfAccountInfoMediator.getChartOfAccountList(req.query);
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

  async getChartOfAccountsTree(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    let action = "GET /api/accounts/chart-of-accounts/tree";
    try {
      MyLogger.info(action);
      const tree = await GetChartOfAccountInfoMediator.getChartOfAccountsTree();
      MyLogger.success(action, { accountsCount: tree.length });
      serializeSuccessResponse(res, tree, "SUCCESS");
    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    }
  }

  async getChartOfAccountById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    let action = "GET /api/accounts/chart-of-accounts/:id";
    try {
      const id = parseInt(req.params.id);
      MyLogger.info(action, { accountId: id });
      const account = await GetChartOfAccountInfoMediator.getChartOfAccountById(id);
      MyLogger.success(action, { 
        accountId: id, 
        accountName: account.name 
      });
      serializeSuccessResponse(res, account, "SUCCESS");
    } catch (error: any) {
      MyLogger.error(action, error, { accountId: req.params.id });
      throw error;
    }
  }

  async createChartOfAccount(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    let action = "POST /api/accounts/chart-of-accounts";
    try {
      MyLogger.info(action, { accountName: req.body.name });
      const account = await AddChartOfAccountMediator.createChartOfAccount(req.body);
      MyLogger.success(action, {
        accountId: account.id,
        accountName: account.name,
      });
      serializeSuccessResponse(res, account, "Chart of account created successfully");
    } catch (error: any) {
      MyLogger.error(action, error, { accountName: req.body.name });
      throw error;
    }
  }

  async updateChartOfAccount(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    let action = "PUT /api/accounts/chart-of-accounts/:id";
    try {
      const id = parseInt(req.params.id);
      MyLogger.info(action, {
        accountId: id,
        updateFields: Object.keys(req.body),
      });
      const account = await UpdateChartOfAccountInfoMediator.updateChartOfAccount(
        id,
        req.body
      );
      MyLogger.success(action, { 
        accountId: id, 
        accountName: account.name 
      });
      serializeSuccessResponse(res, account, "Chart of account updated successfully");
    } catch (error: any) {
      MyLogger.error(action, error, { accountId: req.params.id });
      throw error;
    }
  }

  async deleteChartOfAccount(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    let action = "DELETE /api/accounts/chart-of-accounts/:id";
    try {
      const id = parseInt(req.params.id);
      MyLogger.info(action, { accountId: id });
      await DeleteChartOfAccountMediator.deleteChartOfAccount(id);
      MyLogger.success(action, { accountId: id });
      serializeSuccessResponse(res, {}, "Chart of account deleted successfully");
    } catch (error: any) {
      MyLogger.error(action, error, { accountId: req.params.id });
      throw error;
    }
  }

  async deactivateChartOfAccount(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    let action = "PUT /api/accounts/chart-of-accounts/:id/deactivate";
    try {
      const id = parseInt(req.params.id);
      MyLogger.info(action, { accountId: id });
      await DeleteChartOfAccountMediator.deactivateChartOfAccount(id);
      MyLogger.success(action, { accountId: id });
      serializeSuccessResponse(res, {}, "Chart of account deactivated successfully");
    } catch (error: any) {
      MyLogger.error(action, error, { accountId: req.params.id });
      throw error;
    }
  }

  async activateChartOfAccount(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    let action = "PUT /api/accounts/chart-of-accounts/:id/activate";
    try {
      const id = parseInt(req.params.id);
      MyLogger.info(action, { accountId: id });
      await DeleteChartOfAccountMediator.activateChartOfAccount(id);
      MyLogger.success(action, { accountId: id });
      serializeSuccessResponse(res, {}, "Chart of account activated successfully");
    } catch (error: any) {
      MyLogger.error(action, error, { accountId: req.params.id });
      throw error;
    }
  }

  async generateCcAccounts(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    let action = "POST /api/accounts/chart-of-accounts/generate-cc-accounts";
    try {
      MyLogger.info(action, { body: req.body });
      const result = await GenerateCcAccountsMediator.process(req.body);
      MyLogger.success(action, result);
      serializeSuccessResponse(res, result, "CC-specific accounts generated successfully");
    } catch (error: any) {
      MyLogger.error(action, error, { body: req.body });
      throw error;
    }
  }
}

export default new ChartOfAccountsController();
