import express, { NextFunction, Request, Response } from 'express';
import {
    createExpenseSchema,
    updateExpenseSchema,
    expenseQuerySchema,
    approveExpenseSchema,
    rejectExpenseSchema,
    payExpenseSchema
} from '@/validation/expenseValidation';
import { authenticate, employeeAndAbove, managerAndAbove, adminOnly } from '@/middleware/auth';
import { uploadExpenseReceipt, handleExpenseUploadError } from '@/middleware/expenseUpload';
import expressAsyncHandler from 'express-async-handler';
import { MyLogger } from '@/utils/new-logger';
import ExpensesController from '@/controllers/expenses/expenses.controller';
import ExpenseMediator from "@/mediators/expenses/ExpenseMediator";
import {serializeSuccessResponse} from "@/utils/responseHelper";

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
router.get('/stats', authenticate, employeeAndAbove, expressAsyncHandler(ExpensesController.getExpenseStats));

// GET /api/expenses/:id - Get expense by ID
router.get('/:id', authenticate, employeeAndAbove, expressAsyncHandler(ExpensesController.getExpenseById));

// POST /api/expenses - Create new expense
router.post('/', authenticate, employeeAndAbove, validateRequest(createExpenseSchema), expressAsyncHandler(ExpensesController.createExpense));

// POST /api/expenses/with-receipt - Create new expense with receipt image
router.post('/with-receipt', authenticate, employeeAndAbove, uploadExpenseReceipt, handleExpenseUploadError, expressAsyncHandler(async (req, res, next) => {
    let action = 'POST /api/expenses/with-receipt'
    let uploadedFile: Express.Multer.File | null = null;
    
    try {
        // Parse the JSON data from FormData
        const expenseData = JSON.parse(req.body.data);
        
        MyLogger.info(action, { 
            title: expenseData.title, 
            amount: expenseData.amount,
            category: expenseData.category_id,
            hasReceipt: !!req.file
        })
        
        // Add receipt URL to expense data if file was uploaded
        if (req.file) {
            uploadedFile = req.file; // Store reference for cleanup
            expenseData.receipt_url = `/uploads/expenses/${req.file.filename}`;
        }
        
        // Validate the expense data
        const { error, value } = createExpenseSchema.validate(expenseData);
        if (error) {
            // Clean up uploaded file if validation fails
            if (uploadedFile) {
                const fs = require('fs');
                const path = require('path');
                const filePath = path.join(process.cwd(), 'uploads', 'expenses', uploadedFile.filename);
                try {
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                        MyLogger.info('Cleaned up uploaded file after validation failure', { filename: uploadedFile.filename });
                    }
                } catch (cleanupError) {
                    MyLogger.warn('Failed to cleanup uploaded file after validation failure', { filename: uploadedFile.filename, error: cleanupError });
                }
            }
            
            res.status(400).json({
                error: {
                    message: 'Validation error',
                    details: error.details.map((detail: any) => detail.message)
                }
            });
            return;
        }
        
        const expense = await ExpenseMediator.createExpense(value, req.user!.user_id);
        MyLogger.success(action, { expenseId: expense.id, expenseNumber: expense.expense_number, hasReceipt: !!req.file })
        serializeSuccessResponse(res, expense, 'SUCCESS')
    } catch (error) {
        // Clean up uploaded file if expense creation fails
        if (uploadedFile) {
            const fs = require('fs');
            const path = require('path');
            const filePath = path.join(process.cwd(), 'uploads', 'expenses', uploadedFile.filename);
            try {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    MyLogger.info('Cleaned up uploaded file after expense creation failure', { filename: uploadedFile.filename });
                }
            } catch (cleanupError) {
                MyLogger.warn('Failed to cleanup uploaded file after expense creation failure', { filename: uploadedFile.filename, error: cleanupError });
            }
        }
        
        MyLogger.error(action, error)
        next(error)
    }
}));

// PUT /api/expenses/:id - Update expense
router.put('/:id', authenticate, employeeAndAbove, validateRequest(updateExpenseSchema), expressAsyncHandler(ExpensesController.updateExpense));

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
router.patch('/:id/pay', authenticate, employeeAndAbove, validateRequest(payExpenseSchema), expressAsyncHandler(async (req, res, next) => {
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

// POST /api/expenses/:id/receipt - Update expense receipt image
router.post('/:id/receipt', authenticate, employeeAndAbove, uploadExpenseReceipt, handleExpenseUploadError, expressAsyncHandler(async (req, res, next) => {
    let action = 'POST /api/expenses/:id/receipt'
    let uploadedFile: Express.Multer.File | null = null;
    
    try {
        const id = parseInt(req.params.id);
        MyLogger.info(action, { expenseId: id, hasReceipt: !!req.file })
        
        if (!req.file) {
            res.status(400).json({
                error: {
                    message: 'No receipt file provided',
                    details: 'Please upload a receipt image file'
                }
            });
            return;
        }
        
        uploadedFile = req.file; // Store reference for cleanup
        
        // Get current expense to check for existing receipt
        let currentExpense = null;
        try {
            currentExpense = await ExpenseMediator.getExpenseById(id);
        } catch (error) {
            MyLogger.warn('Could not fetch current expense for receipt deletion', { expenseId: id, error });
        }
        
        const receiptUrl = `/uploads/expenses/${req.file.filename}`;
        const expense = await ExpenseMediator.updateExpense(id, { receipt_url: receiptUrl });
        
        // Delete old receipt file if it exists
        if (currentExpense?.receipt_url) {
            const fs = require('fs');
            const path = require('path');
            const oldFilePath = path.join(process.cwd(), currentExpense.receipt_url);
            try {
                if (fs.existsSync(oldFilePath)) {
                    fs.unlinkSync(oldFilePath);
                    MyLogger.info('Old receipt deleted', { 
                        expenseId: id, 
                        oldReceiptUrl: currentExpense.receipt_url
                    });
                }
            } catch (deleteError) {
                MyLogger.warn('Failed to delete old receipt', { 
                    expenseId: id, 
                    oldReceiptUrl: currentExpense.receipt_url,
                    error: deleteError
                });
            }
        }
        
        MyLogger.success(action, { expenseId: id, expenseNumber: expense.expense_number, receiptUrl })
        serializeSuccessResponse(res, expense, 'SUCCESS')
    } catch (error) {
        // Clean up uploaded file if expense update fails
        if (uploadedFile) {
            const fs = require('fs');
            const path = require('path');
            const filePath = path.join(process.cwd(), 'uploads', 'expenses', uploadedFile.filename);
            try {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    MyLogger.info('Cleaned up uploaded file after expense update failure', { filename: uploadedFile.filename });
                }
            } catch (cleanupError) {
                MyLogger.warn('Failed to cleanup uploaded file after expense update failure', { filename: uploadedFile.filename, error: cleanupError });
            }
        }
        
        MyLogger.error(action, error, { expenseId: req.params.id })
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
