import { NextFunction, Request, Response } from "express";
import ExpenseMediator from '@/mediators/expenses/ExpenseMediator';
import { serializeSuccessResponse } from '@/utils/responseHelper';
import { MyLogger } from '@/utils/new-logger';

class ExpensesController {
    async getExpenses(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'GET /api/expenses';
        try {
            MyLogger.info(action, { query: req.query });
            const expenses = await ExpenseMediator.getExpenses(req.query);
            MyLogger.success(action, { count: expenses.expenses.length, total: expenses.total });
            serializeSuccessResponse(res, expenses, 'SUCCESS');
        } catch (error) {
            MyLogger.error(action, error);
            throw error;
        }
    }

    async getExpenseStats(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'GET /api/expenses/stats';
        try {
            MyLogger.info(action);
            const stats = await ExpenseMediator.getExpenseStats();
            MyLogger.success(action, stats);
            serializeSuccessResponse(res, stats, 'SUCCESS');
        } catch (error) {
            MyLogger.error(action, error);
            throw error;
        }
    }

    async getExpenseById(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'GET /api/expenses/:id';
        try {
            const id = parseInt(req.params.id);
            MyLogger.info(action, { expenseId: id });
            const expense = await ExpenseMediator.getExpenseById(id);
            MyLogger.success(action, { expenseId: id });
            serializeSuccessResponse(res, expense, 'SUCCESS');
        } catch (error) {
            MyLogger.error(action, error, { expenseId: req.params.id });
            throw error;
        }
    }

    async createExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'POST /api/expenses';
        try {
            MyLogger.info(action, { amount: req.body.amount, category: req.body.category_id });
            
            // Handle receipt upload if present
            if (req.file) {
                req.body.receipt = req.file.filename;
            }
            
            const expense = await ExpenseMediator.createExpense(req.body, req.user?.user_id || 1);
            MyLogger.success(action, { expenseId: expense.id });
            serializeSuccessResponse(res, expense, 'SUCCESS');
        } catch (error) {
            MyLogger.error(action, error, { amount: req.body.amount });
            throw error;
        }
    }

    async updateExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'PUT /api/expenses/:id';
        try {
            const id = parseInt(req.params.id);
            MyLogger.info(action, { expenseId: id });
            
            // Handle receipt upload if present
            if (req.file) {
                req.body.receipt = req.file.filename;
            }
            
            const expense = await ExpenseMediator.updateExpense(id, req.body);
            MyLogger.success(action, { expenseId: id });
            serializeSuccessResponse(res, expense, 'SUCCESS');
        } catch (error) {
            MyLogger.error(action, error, { expenseId: req.params.id });
            throw error;
        }
    }

    async deleteExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'DELETE /api/expenses/:id';
        try {
            const id = parseInt(req.params.id);
            MyLogger.info(action, { expenseId: id });
            await ExpenseMediator.deleteExpense(id);
            MyLogger.success(action, { expenseId: id });
            serializeSuccessResponse(res, {}, 'Expense deleted successfully');
        } catch (error) {
            MyLogger.error(action, error, { expenseId: req.params.id });
            throw error;
        }
    }

    async approveExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'PATCH /api/expenses/:id/approve';
        try {
            const id = parseInt(req.params.id);
            MyLogger.info(action, { expenseId: id });
            const expense = await ExpenseMediator.approveExpense(id, req.user?.user_id || 1, req.body.notes);
            MyLogger.success(action, { expenseId: id });
            serializeSuccessResponse(res, expense, 'SUCCESS');
        } catch (error) {
            MyLogger.error(action, error, { expenseId: req.params.id });
            throw error;
        }
    }

    async rejectExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'PATCH /api/expenses/:id/reject';
        try {
            const id = parseInt(req.params.id);
            MyLogger.info(action, { expenseId: id });
            const expense = await ExpenseMediator.rejectExpense(id, req.user?.user_id || 1, req.body.reason || 'No reason provided');
            MyLogger.success(action, { expenseId: id });
            serializeSuccessResponse(res, expense, 'SUCCESS');
        } catch (error) {
            MyLogger.error(action, error, { expenseId: req.params.id });
            throw error;
        }
    }

    async payExpense(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'PATCH /api/expenses/:id/pay';
        try {
            const id = parseInt(req.params.id);
            MyLogger.info(action, { expenseId: id });
            const expense = await ExpenseMediator.payExpense(id, req.user?.user_id || 1, req.body.notes);
            MyLogger.success(action, { expenseId: id });
            serializeSuccessResponse(res, expense, 'SUCCESS');
        } catch (error) {
            MyLogger.error(action, error, { expenseId: req.params.id });
            throw error;
        }
    }

    async getAccountsIntegrationStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'GET /api/expenses/:id/accounts-integration';
        try {
            const id = parseInt(req.params.id);
            MyLogger.info(action, { expenseId: id });
            const status = await ExpenseMediator.getAccountsIntegrationStatus(id);
            MyLogger.success(action, { expenseId: id, status });
            serializeSuccessResponse(res, status, 'SUCCESS');
        } catch (error) {
            MyLogger.error(action, error, { expenseId: req.params.id });
            throw error;
        }
    }

    async getExpenseAccountPreview(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'GET /api/expenses/preview-account';
        try {
            const categoryId = parseInt(req.query.category_id as string);
            const costCenterId = req.query.cost_center_id ? parseInt(req.query.cost_center_id as string) : undefined;
            MyLogger.info(action, { categoryId, costCenterId });
            const result = await ExpenseMediator.getExpenseAccountPreview(categoryId, costCenterId);
            MyLogger.success(action, {
                categoryId,
                hasAccount: !!result.account,
                hasPaymentAccount: !!result.payment_account,
                accountsModuleAvailable: result.accounts_module_available
            });
            serializeSuccessResponse(res, result, 'SUCCESS');
        } catch (error) {
            MyLogger.error(action, error);
            throw error;
        }
    }

    async getExpenseAccountDebited(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'GET /api/expenses/:id/account-debited';
        try {
            const id = parseInt(req.params.id);
            MyLogger.info(action, { expenseId: id });
            const result = await ExpenseMediator.getExpenseAccountDebited(id);
            MyLogger.success(action, { expenseId: id, hasAccount: !!result.account });
            serializeSuccessResponse(res, result, 'SUCCESS');
        } catch (error) {
            MyLogger.error(action, error, { expenseId: req.params.id });
            throw error;
        }
    }
}

export default new ExpensesController();
