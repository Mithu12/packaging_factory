import express, { NextFunction, Request, Response } from 'express';
import {
    createExpenseSchema,
    updateExpenseSchema,
    expenseQuerySchema,
    approveExpenseSchema,
    rejectExpenseSchema,
    payExpenseSchema
} from '@/validation/expenseValidation';
import ExpenseMediator from '@/mediators/expenses/ExpenseMediator';
import { serializeSuccessResponse } from '@/utils/responseHelper';
import { authenticate, employeeAndAbove, managerAndAbove, adminOnly } from '@/middleware/auth';
import expressAsyncHandler from 'express-async-handler';
import { MyLogger } from '@/utils/new-logger';

const router = express.Router();

// Validation middleware
const validateRequest = (schema: any) => {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
        let action = 'Validate Request Body'
        try {
            MyLogger.info(action, { endpoint: req.path, method: req.method })
            const { error, value } = schema.validate(req.body);
            if (error) {
                MyLogger.warn(action, { endpoint: req.path, method: req.method, validationErrors: error.details })
                return res.status(400).json({
                    error: {
                        message: 'Validation error',
                        details: error.details.map((detail: any) => detail.message)
                    }
                });
            }
            req.body = value;
            MyLogger.success(action, { endpoint: req.path, method: req.method })
            return next();
        } catch (err: any) {
            MyLogger.error(action, err, { endpoint: req.path, method: req.method })
            throw err;
        }
    };
};

const validateQuery = (schema: any) => {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
        let action = 'Validate Query Parameters'
        try {
            MyLogger.info(action, { endpoint: req.path, method: req.method })
            const { error, value } = schema.validate(req.query);
            if (error) {
                MyLogger.warn(action, { endpoint: req.path, method: req.method, validationErrors: error.details })
                return res.status(400).json({
                    error: {
                        message: 'Validation error',
                        details: error.details.map((detail: any) => detail.message)
                    }
                });
            }
            req.query = value;
            MyLogger.success(action, { endpoint: req.path, method: req.method })
            return next();
        } catch (err: any) {
            MyLogger.error(action, err, { endpoint: req.path, method: req.method })
            throw err;
        }
    };
};

// GET /api/expenses - Get expenses with filtering and pagination
router.get('/', authenticate, employeeAndAbove, validateQuery(expenseQuerySchema), expressAsyncHandler(async (req, res, next) => {
    let action = 'GET /api/expenses'
    try {
        MyLogger.info(action, { query: req.query })
        const expenses = await ExpenseMediator.getExpenses(req.query);
        MyLogger.success(action, { count: expenses.expenses.length, total: expenses.total })
        serializeSuccessResponse(res, expenses, 'SUCCESS')
    } catch (error) {
        MyLogger.error(action, error)
        next(error)
    }
}));

// GET /api/expenses/stats - Get expense statistics
router.get('/stats', authenticate, employeeAndAbove, expressAsyncHandler(async (req, res, next) => {
    let action = 'GET /api/expenses/stats'
    try {
        const { start_date, end_date, department } = req.query;
        MyLogger.info(action, { start_date, end_date, department })
        const stats = await ExpenseMediator.getExpenseStats({
            start_date: start_date as string,
            end_date: end_date as string,
            department: department as string
        });
        MyLogger.success(action, { statsCount: Object.keys(stats).length })
        serializeSuccessResponse(res, stats, 'SUCCESS')
    } catch (error) {
        MyLogger.error(action, error)
        next(error)
    }
}));

// GET /api/expenses/:id - Get expense by ID
router.get('/:id', authenticate, employeeAndAbove, expressAsyncHandler(async (req, res, next) => {
    let action = 'GET /api/expenses/:id'
    try {
        const id = parseInt(req.params.id);
        MyLogger.info(action, { expenseId: id })
        const expense = await ExpenseMediator.getExpenseById(id);
        MyLogger.success(action, { expenseId: id, expenseNumber: expense.expense_number })
        serializeSuccessResponse(res, expense, 'SUCCESS')
    } catch (error) {
        MyLogger.error(action, error)
        next(error)
    }
}));

// POST /api/expenses - Create new expense
router.post('/', authenticate, employeeAndAbove, validateRequest(createExpenseSchema), expressAsyncHandler(async (req, res, next) => {
    let action = 'POST /api/expenses'
    try {
        MyLogger.info(action, { 
            title: req.body.title, 
            amount: req.body.amount,
            category: req.body.category_id
        })
        const expense = await ExpenseMediator.createExpense(req.body, req.user!.user_id);
        MyLogger.success(action, { expenseId: expense.id, expenseNumber: expense.expense_number })
        serializeSuccessResponse(res, expense, 'SUCCESS')
    } catch (error) {
        MyLogger.error(action, error)
        next(error)
    }
}));

// PUT /api/expenses/:id - Update expense
router.put('/:id', authenticate, employeeAndAbove, validateRequest(updateExpenseSchema), expressAsyncHandler(async (req, res, next) => {
    let action = 'PUT /api/expenses/:id'
    try {
        const id = parseInt(req.params.id);
        MyLogger.info(action, { expenseId: id })
        const expense = await ExpenseMediator.updateExpense(id, req.body);
        MyLogger.success(action, { expenseId: id, expenseNumber: expense.expense_number })
        serializeSuccessResponse(res, expense, 'SUCCESS')
    } catch (error) {
        MyLogger.error(action, error)
        next(error)
    }
}));

// PATCH /api/expenses/:id/approve - Approve expense
router.patch('/:id/approve', authenticate, managerAndAbove, validateRequest(approveExpenseSchema), expressAsyncHandler(async (req, res, next) => {
    let action = 'PATCH /api/expenses/:id/approve'
    try {
        const id = parseInt(req.params.id);
        MyLogger.info(action, { expenseId: id, approvedBy: req.user!.user_id })
        const expense = await ExpenseMediator.approveExpense(id, req.user!.user_id, req.body.notes);
        MyLogger.success(action, { expenseId: id, expenseNumber: expense.expense_number })
        serializeSuccessResponse(res, expense, 'SUCCESS')
    } catch (error) {
        MyLogger.error(action, error)
        next(error)
    }
}));

// PATCH /api/expenses/:id/reject - Reject expense
router.patch('/:id/reject', authenticate, managerAndAbove, validateRequest(rejectExpenseSchema), expressAsyncHandler(async (req, res, next) => {
    let action = 'PATCH /api/expenses/:id/reject'
    try {
        const id = parseInt(req.params.id);
        MyLogger.info(action, { expenseId: id, rejectedBy: req.user!.user_id })
        const expense = await ExpenseMediator.rejectExpense(id, req.user!.user_id, req.body.reason);
        MyLogger.success(action, { expenseId: id, expenseNumber: expense.expense_number })
        serializeSuccessResponse(res, expense, 'SUCCESS')
    } catch (error) {
        MyLogger.error(action, error)
        next(error)
    }
}));

// PATCH /api/expenses/:id/pay - Mark expense as paid
router.patch('/:id/pay', authenticate, managerAndAbove, validateRequest(payExpenseSchema), expressAsyncHandler(async (req, res, next) => {
    let action = 'PATCH /api/expenses/:id/pay'
    try {
        const id = parseInt(req.params.id);
        MyLogger.info(action, { expenseId: id, paidBy: req.user!.user_id })
        const expense = await ExpenseMediator.payExpense(id, req.user!.user_id, req.body.notes);
        MyLogger.success(action, { expenseId: id, expenseNumber: expense.expense_number })
        serializeSuccessResponse(res, expense, 'SUCCESS')
    } catch (error) {
        MyLogger.error(action, error)
        next(error)
    }
}));

// DELETE /api/expenses/:id - Delete expense
router.delete('/:id', authenticate, adminOnly, expressAsyncHandler(async (req, res, next) => {
    let action = 'DELETE /api/expenses/:id'
    try {
        const id = parseInt(req.params.id);
        MyLogger.info(action, { expenseId: id })
        await ExpenseMediator.deleteExpense(id);
        MyLogger.success(action, { expenseId: id })
        serializeSuccessResponse(res, { message: 'Expense deleted successfully' }, 'SUCCESS')
    } catch (error) {
        MyLogger.error(action, error)
        next(error)
    }
}));

export default router;
