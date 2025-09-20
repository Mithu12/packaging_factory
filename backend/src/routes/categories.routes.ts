import express, {NextFunction, Request, Response} from 'express';
import {
    createCategorySchema,
    updateCategorySchema,
    createSubcategorySchema,
    updateSubcategorySchema,
    getCategoriesQuerySchema,
    getSubcategoriesQuerySchema
} from '@/validation/categoryValidation';
import { authenticate } from "@/middleware/auth";
import { requirePermission, requireSystemAdmin, PERMISSIONS } from '@/middleware/permission';
import expressAsyncHandler from "express-async-handler";
import {MyLogger} from "@/utils/new-logger";
import CategoriesController from "@/controllers/categories/categories.controller";

const router = express.Router();

// Validation middleware
const validateRequest = (schema: any) => {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
        let action = 'Validate Request Body'
        try {
            MyLogger.info(action, { endpoint: req.path, method: req.method })
            const {error, value} = schema.validate(req.body);
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
            MyLogger.info(action, { endpoint: req.path, method: req.method, query: req.query })
            const {error, value} = schema.validate(req.query);
            if (error) {
                MyLogger.warn(action, { endpoint: req.path, method: req.method, validationErrors: error.details })
                return res.status(400).json({
                    error: {
                        message: 'Query validation error',
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

// ===== CATEGORY ROUTES =====

// GET /api/categories - Get all categories with pagination and filtering
router.get('/', 
  authenticate, 
  requirePermission(PERMISSIONS.CATEGORIES_READ),
  validateQuery(getCategoriesQuerySchema), 
  expressAsyncHandler(CategoriesController.getAllCategories)
);

// GET /api/categories/stats - Get category statistics
router.get('/stats', 
  authenticate, 
  requirePermission(PERMISSIONS.CATEGORIES_READ),
  expressAsyncHandler(CategoriesController.getCategoryStats)
);

// GET /api/categories/search - Search categories
router.get('/search', 
  authenticate,
  requirePermission(PERMISSIONS.CATEGORIES_READ),
  expressAsyncHandler(CategoriesController.searchCategories)
);

// GET /api/categories/subcategories - Get all subcategories with pagination and filtering
router.get('/subcategories', 
  authenticate,
  requirePermission(PERMISSIONS.CATEGORIES_READ),
  validateQuery(getSubcategoriesQuerySchema), 
  expressAsyncHandler(CategoriesController.getAllSubcategories)
);

// GET /api/categories/subcategories/search - Search subcategories
router.get('/subcategories/search', 
  authenticate,
  requirePermission(PERMISSIONS.CATEGORIES_READ),
  expressAsyncHandler(CategoriesController.searchSubcategories)
);

// GET /api/categories/subcategories/:id - Get subcategory by ID
router.get('/subcategories/:id', 
  authenticate,
  requirePermission(PERMISSIONS.CATEGORIES_READ),
  expressAsyncHandler(CategoriesController.getSubcategoryById)
);

// GET /api/categories/:id - Get category by ID with subcategories
router.get('/:id', 
  authenticate,
  requirePermission(PERMISSIONS.CATEGORIES_READ),
  expressAsyncHandler(CategoriesController.getCategoryById)
);

// POST /api/categories - Create new category
router.post('/', 
  authenticate, 
  requirePermission(PERMISSIONS.CATEGORIES_CREATE),
  validateRequest(createCategorySchema), 
  expressAsyncHandler(CategoriesController.createCategory)
);

// PUT /api/categories/:id - Update category
router.put('/:id', 
  authenticate, 
  requirePermission(PERMISSIONS.CATEGORIES_UPDATE),
  validateRequest(updateCategorySchema), 
  expressAsyncHandler(CategoriesController.updateCategory)
);

// DELETE /api/categories/:id - Delete category
router.delete('/:id', 
  authenticate, 
  requirePermission(PERMISSIONS.CATEGORIES_DELETE),
  expressAsyncHandler(CategoriesController.deleteCategory)
);

// ===== SUBCATEGORY ROUTES =====

// GET /api/categories/:categoryId/subcategories - Get subcategories for a specific category
router.get('/:categoryId/subcategories', 
  authenticate,
  requirePermission(PERMISSIONS.CATEGORIES_READ),
  validateQuery(getSubcategoriesQuerySchema), 
  expressAsyncHandler(CategoriesController.getSubcategoriesByCategory)
);

// POST /api/subcategories - Create new subcategory
router.post('/subcategories', 
  authenticate, 
  requirePermission(PERMISSIONS.CATEGORIES_CREATE),
  validateRequest(createSubcategorySchema), 
  expressAsyncHandler(CategoriesController.createSubcategory)
);

// PUT /api/subcategories/:id - Update subcategory
router.put('/subcategories/:id', 
  authenticate, 
  requirePermission(PERMISSIONS.CATEGORIES_UPDATE),
  validateRequest(updateSubcategorySchema), 
  expressAsyncHandler(CategoriesController.updateSubcategory)
);

// DELETE /api/subcategories/:id - Delete subcategory
router.delete('/subcategories/:id', 
  authenticate, 
  requirePermission(PERMISSIONS.CATEGORIES_DELETE),
  expressAsyncHandler(CategoriesController.deleteSubcategory)
);

export default router;
