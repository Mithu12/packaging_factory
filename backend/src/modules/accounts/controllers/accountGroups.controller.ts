import { NextFunction, Request, Response } from "express";
import GetAccountGroupInfoMediator from "../mediators/accountGroups/GetAccountGroupInfo.mediator";
import AddAccountGroupMediator from "../mediators/accountGroups/AddAccountGroup.mediator";
import UpdateAccountGroupInfoMediator from "../mediators/accountGroups/UpdateAccountGroupInfo.mediator";
import DeleteAccountGroupMediator from "../mediators/accountGroups/DeleteAccountGroup.mediator";
import { serializeSuccessResponse } from "@/utils/responseHelper";
import { MyLogger } from "@/utils/new-logger";

class AccountGroupsController {
  // ===== ACCOUNT GROUP METHODS =====

  async getAllAccountGroups(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    let action = "GET /api/accounts/account-groups";
    try {
      MyLogger.info(action, { query: req.query });
      const result = await GetAccountGroupInfoMediator.getAccountGroupList(req.query);
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

  async getAccountGroupsTree(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    let action = "GET /api/accounts/account-groups/tree";
    try {
      MyLogger.info(action);
      const tree = await GetAccountGroupInfoMediator.getAccountGroupsTree();
      MyLogger.success(action, { groupsCount: tree.length });
      serializeSuccessResponse(res, tree, "SUCCESS");
    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    }
  }

  async getAccountGroupStats(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    let action = "GET /api/accounts/account-groups/stats";
    try {
      MyLogger.info(action);
      const stats = await GetAccountGroupInfoMediator.getAccountGroupStats();
      MyLogger.success(action, stats);
      serializeSuccessResponse(res, stats, "SUCCESS");
    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    }
  }

  async searchAccountGroups(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    let action = "GET /api/accounts/account-groups/search";
    try {
      const { q, limit } = req.query;
      MyLogger.info(action, { query: q, limit });
      const accountGroups = await GetAccountGroupInfoMediator.searchAccountGroups(
        q as string,
        limit ? parseInt(limit as string) : 10
      );
      MyLogger.success(action, { query: q, resultsCount: accountGroups.length });
      serializeSuccessResponse(res, accountGroups, "SUCCESS");
    } catch (error: any) {
      MyLogger.error(action, error, { query: req.query.q });
      throw error;
    }
  }

  async getAccountGroupById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    let action = "GET /api/accounts/account-groups/:id";
    try {
      const id = parseInt(req.params.id);
      MyLogger.info(action, { accountGroupId: id });
      const accountGroup = await GetAccountGroupInfoMediator.getAccountGroupById(id);
      MyLogger.success(action, { 
        accountGroupId: id, 
        accountGroupName: accountGroup.name 
      });
      serializeSuccessResponse(res, accountGroup, "SUCCESS");
    } catch (error: any) {
      MyLogger.error(action, error, { accountGroupId: req.params.id });
      throw error;
    }
  }

  async createAccountGroup(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    let action = "POST /api/accounts/account-groups";
    try {
      MyLogger.info(action, { accountGroupName: req.body.name });
      const accountGroup = await AddAccountGroupMediator.createAccountGroup(req.body);
      MyLogger.success(action, {
        accountGroupId: accountGroup.id,
        accountGroupName: accountGroup.name,
      });
      serializeSuccessResponse(res, accountGroup, "Account group created successfully");
    } catch (error: any) {
      MyLogger.error(action, error, { accountGroupName: req.body.name });
      throw error;
    }
  }

  async updateAccountGroup(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    let action = "PUT /api/accounts/account-groups/:id";
    try {
      const id = parseInt(req.params.id);
      MyLogger.info(action, {
        accountGroupId: id,
        updateFields: Object.keys(req.body),
      });
      const accountGroup = await UpdateAccountGroupInfoMediator.updateAccountGroup(
        id,
        req.body
      );
      MyLogger.success(action, { 
        accountGroupId: id, 
        accountGroupName: accountGroup.name 
      });
      serializeSuccessResponse(res, accountGroup, "Account group updated successfully");
    } catch (error: any) {
      MyLogger.error(action, error, { accountGroupId: req.params.id });
      throw error;
    }
  }

  async deleteAccountGroup(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    let action = "DELETE /api/accounts/account-groups/:id";
    try {
      const id = parseInt(req.params.id);
      MyLogger.info(action, { accountGroupId: id });
      await DeleteAccountGroupMediator.deleteAccountGroup(id);
      MyLogger.success(action, { accountGroupId: id });
      serializeSuccessResponse(res, {}, "Account group deleted successfully");
    } catch (error: any) {
      MyLogger.error(action, error, { accountGroupId: req.params.id });
      throw error;
    }
  }

  async deactivateAccountGroup(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    let action = "PUT /api/accounts/account-groups/:id/deactivate";
    try {
      const id = parseInt(req.params.id);
      MyLogger.info(action, { accountGroupId: id });
      await DeleteAccountGroupMediator.deactivateAccountGroup(id);
      MyLogger.success(action, { accountGroupId: id });
      serializeSuccessResponse(res, {}, "Account group deactivated successfully");
    } catch (error: any) {
      MyLogger.error(action, error, { accountGroupId: req.params.id });
      throw error;
    }
  }

  async activateAccountGroup(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    let action = "PUT /api/accounts/account-groups/:id/activate";
    try {
      const id = parseInt(req.params.id);
      MyLogger.info(action, { accountGroupId: id });
      await DeleteAccountGroupMediator.activateAccountGroup(id);
      MyLogger.success(action, { accountGroupId: id });
      serializeSuccessResponse(res, {}, "Account group activated successfully");
    } catch (error: any) {
      MyLogger.error(action, error, { accountGroupId: req.params.id });
      throw error;
    }
  }
}

export default new AccountGroupsController();
