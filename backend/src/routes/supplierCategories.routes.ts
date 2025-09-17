import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import { serializeSuccessResponse } from '@/utils/responseHelper';
import { MyLogger } from '@/utils/new-logger';
import { authenticate } from '@/middleware/auth';
import { employeeAndAbove, managerAndAbove } from '@/middleware/auth';
import { validateRequest } from '@/middleware/validation';
import { 
  createSupplierCategorySchema, 
  updateSupplierCategorySchema
} from '@/validation/supplierCategoryValidation';
import SupplierCategoryMediator from '@/mediators/supplierCategories/SupplierCategoryMediator';

const router = express.Router();

// ===== SUPPLIER CATEGORY ROUTES =====

// GET /api/supplier-categories - Get all supplier categories with pagination and filtering
router.get('/', 
  authenticate, 
  employeeAndAbove, // Employees and above can view categories
  expressAsyncHandler(async (req, res) => {
    let action = 'GET /api/supplier-categories'
    try {
      MyLogger.info(action, { query: req.query })
      const result = await SupplierCategoryMediator.getSupplierCategories(req.query);
      MyLogger.success(action, { total: result.total, page: result.page, limit: result.limit })
      serializeSuccessResponse(res, result, 'SUCCESS')
    } catch (error: any) {
      MyLogger.error(action, error, { query: req.query })
      throw error;
    }
  })
);

// GET /api/supplier-categories/names - Get simple list of category names (for backward compatibility)
router.get('/names', 
  authenticate, 
  employeeAndAbove, // Employees and above can view category names
  expressAsyncHandler(async (req, res) => {
    let action = 'GET /api/supplier-categories/names'
    try {
      MyLogger.info(action)
      const categories = await SupplierCategoryMediator.getSupplierCategoryNames();
      MyLogger.success(action, { categoriesCount: categories.length })
      serializeSuccessResponse(res, { categories }, 'SUCCESS')
    } catch (error: any) {
      MyLogger.error(action, error)
      throw error;
    }
  })
);

// GET /api/supplier-categories/:id - Get a single supplier category
router.get('/:id', 
  authenticate, 
  employeeAndAbove, // Employees and above can view categories
  expressAsyncHandler(async (req, res, next) => {
    let action = 'GET /api/supplier-categories/:id'
    try {
      MyLogger.info(action, { categoryId: req.params.id })
      const category = await SupplierCategoryMediator.getSupplierCategoryById(parseInt(req.params.id));
      MyLogger.success(action, { categoryId: category.id, categoryName: category.name })
      serializeSuccessResponse(res, category, 'SUCCESS')
    } catch (error: any) {
      MyLogger.error(action, error, { categoryId: req.params.id })
      throw error;
    }
  })
);

// POST /api/supplier-categories - Create new supplier category
router.post('/', 
  authenticate, 
  managerAndAbove, // Only managers and above can create categories
  validateRequest(createSupplierCategorySchema), 
  expressAsyncHandler(async (req, res, next) => {
    let action = 'POST /api/supplier-categories'
    try {
      MyLogger.info(action, { categoryName: req.body.name })
      const category = await SupplierCategoryMediator.createSupplierCategory(req.body);
      MyLogger.success(action, { categoryId: category.id, categoryName: category.name })
      serializeSuccessResponse(res, category, 'SUCCESS')
    } catch (error: any) {
      MyLogger.error(action, error, { categoryName: req.body.name })
      throw error;
    }
  })
);

// PUT /api/supplier-categories/:id - Update supplier category
router.put('/:id', 
  authenticate, 
  managerAndAbove, // Only managers and above can update categories
  validateRequest(updateSupplierCategorySchema), 
  expressAsyncHandler(async (req, res, next) => {
    let action = 'PUT /api/supplier-categories/:id'
    try {
      MyLogger.info(action, { categoryId: req.params.id, updateData: req.body })
      const category = await SupplierCategoryMediator.updateSupplierCategory(parseInt(req.params.id), req.body);
      MyLogger.success(action, { categoryId: category.id, categoryName: category.name })
      serializeSuccessResponse(res, category, 'SUCCESS')
    } catch (error: any) {
      MyLogger.error(action, error, { categoryId: req.params.id, updateData: req.body })
      throw error;
    }
  })
);

// DELETE /api/supplier-categories/:id - Delete supplier category
router.delete('/:id', 
  authenticate, 
  managerAndAbove, // Only managers and above can delete categories
  expressAsyncHandler(async (req, res, next) => {
    let action = 'DELETE /api/supplier-categories/:id'
    try {
      MyLogger.info(action, { categoryId: req.params.id })
      await SupplierCategoryMediator.deleteSupplierCategory(parseInt(req.params.id));
      MyLogger.success(action, { categoryId: req.params.id })
      serializeSuccessResponse(res, { message: 'Supplier category deleted successfully' }, 'SUCCESS')
    } catch (error: any) {
      MyLogger.error(action, error, { categoryId: req.params.id })
      throw error;
    }
  })
);

export default router;
