import { NextFunction, Request, Response } from "express";
import GetCategoryInfoMediator from "@/mediators/categories/GetCategoryInfo.mediator";
import AddCategoryMediator from "@/mediators/categories/AddCategory.mediator";
import UpdateCategoryInfoMediator from "@/mediators/categories/UpdateCategoryInfo.mediator";
import DeleteCategoryMediator from "@/mediators/categories/DeleteCategory.mediator";
import { serializeSuccessResponse } from "@/utils/responseHelper";
import { MyLogger } from "@/utils/new-logger";

class CategoriesController {
    // ===== CATEGORY METHODS =====

    async getAllCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'GET /api/categories';
        try {
            MyLogger.info(action, { query: req.query });
            const result = await GetCategoryInfoMediator.getCategoryList(req.query);
            MyLogger.success(action, { total: result.total, page: result.page, limit: result.limit });
            serializeSuccessResponse(res, result, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error, { query: req.query });
            throw error;
        }
    }

    async getCategoryStats(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'GET /api/categories/stats';
        try {
            MyLogger.info(action);
            const stats = await GetCategoryInfoMediator.getCategoryStats();
            MyLogger.success(action, stats);
            serializeSuccessResponse(res, stats, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error);
            throw error;
        }
    }

    async searchCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'GET /api/categories/search';
        try {
            const { q, limit } = req.query;
            MyLogger.info(action, { query: q, limit });
            const categories = await GetCategoryInfoMediator.searchCategories(
                q as string,
                limit ? parseInt(limit as string) : 10
            );
            MyLogger.success(action, { query: q, resultsCount: categories.length });
            serializeSuccessResponse(res, categories, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error, { query: req.query.q });
            throw error;
        }
    }

    async getCategoryById(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'GET /api/categories/:id';
        try {
            const id = parseInt(req.params.id);
            MyLogger.info(action, { categoryId: id });
            const category = await GetCategoryInfoMediator.getCategoryById(id);
            MyLogger.success(action, { categoryId: id, categoryName: category.name });
            serializeSuccessResponse(res, category, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error, { categoryId: req.params.id });
            throw error;
        }
    }

    async createCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'POST /api/categories';
        try {
            MyLogger.info(action, { categoryName: req.body.name });
            const category = await AddCategoryMediator.createCategory(req.body);
            MyLogger.success(action, { categoryId: category.id, categoryName: category.name });
            serializeSuccessResponse(res, category, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error, { categoryName: req.body.name });
            throw error;
        }
    }

    async updateCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'PUT /api/categories/:id';
        try {
            const id = parseInt(req.params.id);
            MyLogger.info(action, { categoryId: id, updateFields: Object.keys(req.body) });
            const category = await UpdateCategoryInfoMediator.updateCategory(id, req.body);
            MyLogger.success(action, { categoryId: id, categoryName: category.name });
            serializeSuccessResponse(res, category, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error, { categoryId: req.params.id });
            throw error;
        }
    }

    async deleteCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'DELETE /api/categories/:id';
        try {
            const id = parseInt(req.params.id);
            MyLogger.info(action, { categoryId: id });
            await DeleteCategoryMediator.deleteCategory(id);
            MyLogger.success(action, { categoryId: id });
            serializeSuccessResponse(res, {}, 'Deleted Successfully');
        } catch (error: any) {
            MyLogger.error(action, error, { categoryId: req.params.id });
            throw error;
        }
    }

    // ===== SUBCATEGORY METHODS =====

    async getAllSubcategories(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'GET /api/subcategories';
        try {
            MyLogger.info(action, { query: req.query });
            const result = await GetCategoryInfoMediator.getSubcategoryList(req.query);
            MyLogger.success(action, { total: result.total, page: result.page, limit: result.limit });
            serializeSuccessResponse(res, result, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error, { query: req.query });
            throw error;
        }
    }

    async searchSubcategories(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'GET /api/subcategories/search';
        try {
            const { q, limit } = req.query;
            MyLogger.info(action, { query: q, limit });
            const subcategories = await GetCategoryInfoMediator.searchSubcategories(
                q as string,
                limit ? parseInt(limit as string) : 10
            );
            MyLogger.success(action, { query: q, resultsCount: subcategories.length });
            serializeSuccessResponse(res, subcategories, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error, { query: req.query.q });
            throw error;
        }
    }

    async getSubcategoryById(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'GET /api/subcategories/:id';
        try {
            const id = parseInt(req.params.id);
            MyLogger.info(action, { subcategoryId: id });
            const subcategory = await GetCategoryInfoMediator.getSubcategoryById(id);
            MyLogger.success(action, { subcategoryId: id, subcategoryName: subcategory.name });
            serializeSuccessResponse(res, subcategory, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error, { subcategoryId: req.params.id });
            throw error;
        }
    }

    async getSubcategoriesByCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'GET /api/categories/:categoryId/subcategories';
        try {
            const categoryId = parseInt(req.params.categoryId);
            const params = { ...req.query, category_id: categoryId };
            MyLogger.info(action, { categoryId, query: req.query });
            const result = await GetCategoryInfoMediator.getSubcategoryList(params);
            MyLogger.success(action, { categoryId, total: result.total, page: result.page, limit: result.limit });
            serializeSuccessResponse(res, result, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error, { categoryId: req.params.categoryId });
            throw error;
        }
    }

    async createSubcategory(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'POST /api/subcategories';
        try {
            MyLogger.info(action, { subcategoryName: req.body.name, categoryId: req.body.category_id });
            const subcategory = await AddCategoryMediator.createSubcategory(req.body);
            MyLogger.success(action, { subcategoryId: subcategory.id, subcategoryName: subcategory.name });
            serializeSuccessResponse(res, subcategory, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error, { subcategoryName: req.body.name, categoryId: req.body.category_id });
            throw error;
        }
    }

    async updateSubcategory(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'PUT /api/subcategories/:id';
        try {
            const id = parseInt(req.params.id);
            MyLogger.info(action, { subcategoryId: id, updateFields: Object.keys(req.body) });
            const subcategory = await UpdateCategoryInfoMediator.updateSubcategory(id, req.body);
            MyLogger.success(action, { subcategoryId: id, subcategoryName: subcategory.name });
            serializeSuccessResponse(res, subcategory, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error, { subcategoryId: req.params.id });
            throw error;
        }
    }

    async deleteSubcategory(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'DELETE /api/subcategories/:id';
        try {
            const id = parseInt(req.params.id);
            MyLogger.info(action, { subcategoryId: id });
            await DeleteCategoryMediator.deleteSubcategory(id);
            MyLogger.success(action, { subcategoryId: id });
            serializeSuccessResponse(res, {}, 'Deleted Successfully');
        } catch (error: any) {
            MyLogger.error(action, error, { subcategoryId: req.params.id });
            throw error;
        }
    }
}

export default new CategoriesController();
