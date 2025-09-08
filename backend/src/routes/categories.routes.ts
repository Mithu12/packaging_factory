import express, {NextFunction, Request, Response} from 'express';
import {
    createCategorySchema,
    updateCategorySchema,
    createSubcategorySchema,
    updateSubcategorySchema,
    getCategoriesQuerySchema,
    getSubcategoriesQuerySchema
} from '@/validation/categoryValidation';
import GetCategoryInfoMediator from "@/mediators/categories/GetCategoryInfo.mediator";
import {serializeSuccessResponse} from "@/utils/responseHelper";
import AddCategoryMediator from "@/mediators/categories/AddCategory.mediator";
import UpdateCategoryInfoMediator from "@/mediators/categories/UpdateCategoryInfo.mediator";
import DeleteCategoryMediator from "@/mediators/categories/DeleteCategory.mediator";
import expressAsyncHandler from "express-async-handler";
import {MyLogger} from "@/utils/new-logger";

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
router.get('/', validateQuery(getCategoriesQuerySchema), expressAsyncHandler(async (req, res) => {
    let action = 'GET /api/categories'
    try {
        MyLogger.info(action, { query: req.query })
        const result = await GetCategoryInfoMediator.getCategoryList(req.query);
        MyLogger.success(action, { total: result.total, page: result.page, limit: result.limit })
        serializeSuccessResponse(res, result, 'SUCCESS')
    } catch (error: any) {
        MyLogger.error(action, error, { query: req.query })
        throw error;
    }
}));

// GET /api/categories/stats - Get category statistics
router.get('/stats', expressAsyncHandler(async (req, res, next) => {
    let action = 'GET /api/categories/stats'
    try {
        MyLogger.info(action)
        const stats = await GetCategoryInfoMediator.getCategoryStats();
        MyLogger.success(action, stats)
        serializeSuccessResponse(res, stats, 'SUCCESS')
    } catch (error: any) {
        MyLogger.error(action, error)
        throw error;
    }
}));

// GET /api/categories/search - Search categories
router.get('/search', expressAsyncHandler(async (req, res, next) => {
    let action = 'GET /api/categories/search'
    try {
        const {q, limit} = req.query;
        MyLogger.info(action, { query: q, limit })
        const categories = await GetCategoryInfoMediator.searchCategories(
            q as string,
            limit ? parseInt(limit as string) : 10
        );
        MyLogger.success(action, { query: q, resultsCount: categories.length })
        serializeSuccessResponse(res, categories, 'SUCCESS')
    } catch (error: any) {
        MyLogger.error(action, error, { query: req.query.q })
        throw error;
    }
}));

// GET /api/categories/:id - Get category by ID with subcategories
router.get('/:id', expressAsyncHandler(async (req, res, next) => {
    let action = 'GET /api/categories/:id'
    try {
        const id = parseInt(req.params.id);
        MyLogger.info(action, { categoryId: id })
        const category = await GetCategoryInfoMediator.getCategoryById(id);
        MyLogger.success(action, { categoryId: id, categoryName: category.name })
        serializeSuccessResponse(res, category, 'SUCCESS')
    } catch (error: any) {
        MyLogger.error(action, error, { categoryId: req.params.id })
        throw error;
    }
}));

// POST /api/categories - Create new category
router.post('/', validateRequest(createCategorySchema), expressAsyncHandler(async (req, res, next) => {
    let action = 'POST /api/categories'
    try {
        MyLogger.info(action, { categoryName: req.body.name })
        const category = await AddCategoryMediator.createCategory(req.body);
        MyLogger.success(action, { categoryId: category.id, categoryName: category.name })
        serializeSuccessResponse(res, category, 'SUCCESS')
    } catch (error: any) {
        MyLogger.error(action, error, { categoryName: req.body.name })
        throw error;
    }
}));

// PUT /api/categories/:id - Update category
router.put('/:id', validateRequest(updateCategorySchema), expressAsyncHandler(async (req, res, next) => {
    let action = 'PUT /api/categories/:id'
    try {
        const id = parseInt(req.params.id);
        MyLogger.info(action, { categoryId: id, updateFields: Object.keys(req.body) })
        const category = await UpdateCategoryInfoMediator.updateCategory(id, req.body);
        MyLogger.success(action, { categoryId: id, categoryName: category.name })
        serializeSuccessResponse(res, category, 'SUCCESS')
    } catch (error: any) {
        MyLogger.error(action, error, { categoryId: req.params.id })
        throw error;
    }
}));

// DELETE /api/categories/:id - Delete category
router.delete('/:id', expressAsyncHandler(async (req, res, next) => {
    let action = 'DELETE /api/categories/:id'
    try {
        const id = parseInt(req.params.id);
        MyLogger.info(action, { categoryId: id })
        await DeleteCategoryMediator.deleteCategory(id);
        MyLogger.success(action, { categoryId: id })
        serializeSuccessResponse(res, {}, 'Deleted Successfully')
    } catch (error: any) {
        MyLogger.error(action, error, { categoryId: req.params.id })
        throw error;
    }
}));

// ===== SUBCATEGORY ROUTES =====

// GET /api/categories/:categoryId/subcategories - Get subcategories for a specific category
router.get('/:categoryId/subcategories', validateQuery(getSubcategoriesQuerySchema), expressAsyncHandler(async (req, res, next) => {
    let action = 'GET /api/categories/:categoryId/subcategories'
    try {
        const categoryId = parseInt(req.params.categoryId);
        const params = { ...req.query, category_id: categoryId };
        MyLogger.info(action, { categoryId, query: req.query })
        const result = await GetCategoryInfoMediator.getSubcategoryList(params);
        MyLogger.success(action, { categoryId, total: result.total, page: result.page, limit: result.limit })
        serializeSuccessResponse(res, result, 'SUCCESS')
    } catch (error: any) {
        MyLogger.error(action, error, { categoryId: req.params.categoryId })
        throw error;
    }
}));

// GET /api/subcategories - Get all subcategories with pagination and filtering
router.get('/subcategories', validateQuery(getSubcategoriesQuerySchema), expressAsyncHandler(async (req, res, next) => {
    let action = 'GET /api/subcategories'
    try {
        MyLogger.info(action, { query: req.query })
        const result = await GetCategoryInfoMediator.getSubcategoryList(req.query);
        MyLogger.success(action, { total: result.total, page: result.page, limit: result.limit })
        serializeSuccessResponse(res, result, 'SUCCESS')
    } catch (error: any) {
        MyLogger.error(action, error, { query: req.query })
        throw error;
    }
}));

// GET /api/subcategories/search - Search subcategories
router.get('/subcategories/search', expressAsyncHandler(async (req, res, next) => {
    let action = 'GET /api/subcategories/search'
    try {
        const {q, limit} = req.query;
        MyLogger.info(action, { query: q, limit })
        const subcategories = await GetCategoryInfoMediator.searchSubcategories(
            q as string,
            limit ? parseInt(limit as string) : 10
        );
        MyLogger.success(action, { query: q, resultsCount: subcategories.length })
        serializeSuccessResponse(res, subcategories, 'SUCCESS')
    } catch (error: any) {
        MyLogger.error(action, error, { query: req.query.q })
        throw error;
    }
}));

// GET /api/subcategories/:id - Get subcategory by ID
router.get('/subcategories/:id', expressAsyncHandler(async (req, res, next) => {
    let action = 'GET /api/subcategories/:id'
    try {
        const id = parseInt(req.params.id);
        MyLogger.info(action, { subcategoryId: id })
        const subcategory = await GetCategoryInfoMediator.getSubcategoryById(id);
        MyLogger.success(action, { subcategoryId: id, subcategoryName: subcategory.name })
        serializeSuccessResponse(res, subcategory, 'SUCCESS')
    } catch (error: any) {
        MyLogger.error(action, error, { subcategoryId: req.params.id })
        throw error;
    }
}));

// POST /api/subcategories - Create new subcategory
router.post('/subcategories', validateRequest(createSubcategorySchema), expressAsyncHandler(async (req, res, next) => {
    let action = 'POST /api/subcategories'
    try {
        MyLogger.info(action, { subcategoryName: req.body.name, categoryId: req.body.category_id })
        const subcategory = await AddCategoryMediator.createSubcategory(req.body);
        MyLogger.success(action, { subcategoryId: subcategory.id, subcategoryName: subcategory.name })
        serializeSuccessResponse(res, subcategory, 'SUCCESS')
    } catch (error: any) {
        MyLogger.error(action, error, { subcategoryName: req.body.name, categoryId: req.body.category_id })
        throw error;
    }
}));

// PUT /api/subcategories/:id - Update subcategory
router.put('/subcategories/:id', validateRequest(updateSubcategorySchema), expressAsyncHandler(async (req, res, next) => {
    let action = 'PUT /api/subcategories/:id'
    try {
        const id = parseInt(req.params.id);
        MyLogger.info(action, { subcategoryId: id, updateFields: Object.keys(req.body) })
        const subcategory = await UpdateCategoryInfoMediator.updateSubcategory(id, req.body);
        MyLogger.success(action, { subcategoryId: id, subcategoryName: subcategory.name })
        serializeSuccessResponse(res, subcategory, 'SUCCESS')
    } catch (error: any) {
        MyLogger.error(action, error, { subcategoryId: req.params.id })
        throw error;
    }
}));

// DELETE /api/subcategories/:id - Delete subcategory
router.delete('/subcategories/:id', expressAsyncHandler(async (req, res, next) => {
    let action = 'DELETE /api/subcategories/:id'
    try {
        const id = parseInt(req.params.id);
        MyLogger.info(action, { subcategoryId: id })
        await DeleteCategoryMediator.deleteSubcategory(id);
        MyLogger.success(action, { subcategoryId: id })
        serializeSuccessResponse(res, {}, 'Deleted Successfully')
    } catch (error: any) {
        MyLogger.error(action, error, { subcategoryId: req.params.id })
        throw error;
    }
}));

export default router;
