import express, { NextFunction, Request, Response } from 'express';
import {
    createExpenseCategorySchema,
    updateExpenseCategorySchema,
    expenseCategoryQuerySchema
} from '@/validation/expenseValidation';
import ExpenseCategoryMediator from '@/mediators/expenses/ExpenseCategoryMediator';
import { serializeSuccessResponse } from '@/utils/responseHelper';
import { authenticate } from '@/middleware/auth';
import { requirePermission, requireSystemAdmin, PERMISSIONS } from '@/middleware/permission';
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

// GET /api/expense-categories - Get expense categories with filtering and pagination
router.get('/', 
  authenticate, 
  requirePermission(PERMISSIONS.EXPENSE_CATEGORIES_READ), 
  validateQuery(expenseCategoryQuerySchema), 
  expressAsyncHandler(async (req, res, next) => {
    let action = 'GET /api/expense-categories'
    try {
        MyLogger.info(action, { query: req.query })
        const categories = await ExpenseCategoryMediator.getExpenseCategories(req.query);
        MyLogger.success(action, { count: categories.categories.length, total: categories.total })
        serializeSuccessResponse(res, categories, 'SUCCESS')
    } catch (error) {
        MyLogger.error(action, error)
        next(error)
    }
}));

// GET /api/expense-categories/active - Get active expense categories (for dropdowns)
router.get('/active', 
  authenticate, 
  requirePermission(PERMISSIONS.EXPENSE_CATEGORIES_READ), 
  expressAsyncHandler(async (req, res, next) => {
    let action = 'GET /api/expense-categories/active'
    try {
        MyLogger.info(action)
        const categories = await ExpenseCategoryMediator.getActiveExpenseCategories();
        MyLogger.success(action, { count: categories.length })
        serializeSuccessResponse(res, categories, 'SUCCESS')
    } catch (error) {
        MyLogger.error(action, error)
        next(error)
    }
}));

// GET /api/expense-categories/:id - Get expense category by ID
router.get('/:id', 
  authenticate, 
  requirePermission(PERMISSIONS.EXPENSE_CATEGORIES_READ), 
  expressAsyncHandler(async (req, res, next) => {
    let action = 'GET /api/expense-categories/:id'
    try {
        const id = parseInt(req.params.id);
        MyLogger.info(action, { categoryId: id })
        const category = await ExpenseCategoryMediator.getExpenseCategoryById(id);
        MyLogger.success(action, { categoryId: id, name: category.name })
        serializeSuccessResponse(res, category, 'SUCCESS')
    } catch (error) {
        MyLogger.error(action, error)
        next(error)
    }
}));

// POST /api/expense-categories - Create new expense category
router.post('/', 
  authenticate, 
  requirePermission(PERMISSIONS.EXPENSE_CATEGORIES_CREATE), 
  validateRequest(createExpenseCategorySchema), 
  expressAsyncHandler(async (req, res, next) => {
    let action = 'POST /api/expense-categories'
    try {
        MyLogger.info(action, { name: req.body.name })
        const category = await ExpenseCategoryMediator.createExpenseCategory(req.body);
        MyLogger.success(action, { categoryId: category.id, name: category.name })
        serializeSuccessResponse(res, category, 'SUCCESS')
    } catch (error) {
        MyLogger.error(action, error)
        next(error)
    }
}));

// PUT /api/expense-categories/:id - Update expense category
router.put('/:id', 
  authenticate, 
  requirePermission(PERMISSIONS.EXPENSE_CATEGORIES_UPDATE), 
  validateRequest(updateExpenseCategorySchema), 
  expressAsyncHandler(async (req, res, next) => {
    let action = 'PUT /api/expense-categories/:id'
    try {
        const id = parseInt(req.params.id);
        MyLogger.info(action, { categoryId: id })
        const category = await ExpenseCategoryMediator.updateExpenseCategory(id, req.body);
        MyLogger.success(action, { categoryId: id, name: category.name })
        serializeSuccessResponse(res, category, 'SUCCESS')
    } catch (error) {
        MyLogger.error(action, error)
        next(error)
    }
}));

// DELETE /api/expense-categories/:id - Delete expense category
router.delete('/:id', 
  authenticate, 
  requirePermission(PERMISSIONS.EXPENSE_CATEGORIES_DELETE), 
  expressAsyncHandler(async (req, res, next) => {
    let action = 'DELETE /api/expense-categories/:id'
    try {
        const id = parseInt(req.params.id);
        MyLogger.info(action, { categoryId: id })
        await ExpenseCategoryMediator.deleteExpenseCategory(id);
        MyLogger.success(action, { categoryId: id })
        serializeSuccessResponse(res, { message: 'Expense category deleted successfully' }, 'SUCCESS')
    } catch (error) {
        MyLogger.error(action, error)
        next(error)
    }
}));

export default router;
