import express, { NextFunction, Request, Response } from "express";
import {
  createCategorySchema,
  updateCategorySchema,
  createSubcategorySchema,
  updateSubcategorySchema,
  getCategoriesQuerySchema,
  getSubcategoriesQuerySchema,
} from "../validation/categoryValidation";
import { authenticate } from "@/middleware/auth";
import {
  requirePermission,
  requireSystemAdmin,
  PERMISSIONS,
} from "@/middleware/permission";
import { auditMiddleware } from "@/middleware/audit";
import expressAsyncHandler from "express-async-handler";
import { MyLogger } from "@/utils/new-logger";
import CategoriesController from "../controllers/categories.controller";

const router = express.Router();

const validateRequest = (schema: any) => {
  return (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    let action = "Validate Request Body";
    try {
      MyLogger.info(action, { endpoint: req.path, method: req.method });
      const { error, value } = schema.validate(req.body);
      if (error) {
        MyLogger.warn(action, {
          endpoint: req.path,
          method: req.method,
          validationErrors: error.details,
        });
        return res.status(400).json({
          error: {
            message: "Validation error",
            details: error.details.map((detail: any) => detail.message),
          },
        });
      }
      req.body = value;
      MyLogger.success(action, { endpoint: req.path, method: req.method });
      return next();
    } catch (err: any) {
      MyLogger.error(action, err, { endpoint: req.path, method: req.method });
      throw err;
    }
  };
};

const validateQuery = (schema: any) => {
  return (req: express.Request, res: Response, next: NextFunction) => {
    let action = "Validate Query Parameters";
    try {
      MyLogger.info(action, {
        endpoint: req.path,
        method: req.method,
        query: req.query,
      });
      const { error, value } = schema.validate(req.query);
      if (error) {
        MyLogger.warn(action, {
          endpoint: req.path,
          method: req.method,
          validationErrors: error.details,
        });
        return res.status(400).json({
          error: {
            message: "Query validation error",
            details: error.details.map((detail: any) => detail.message),
          },
        });
      }
      req.query = value;
      MyLogger.success(action, { endpoint: req.path, method: req.method });
      return next();
    } catch (err: any) {
      MyLogger.error(action, err, { endpoint: req.path, method: req.method });
      throw err;
    }
  };
};

router.get(
  "/",
  authenticate,
  requirePermission(PERMISSIONS.CATEGORIES_READ),
  validateQuery(getCategoriesQuerySchema),
  expressAsyncHandler(CategoriesController.getAllCategories)
);

router.get(
  "/stats",
  authenticate,
  requirePermission(PERMISSIONS.CATEGORIES_READ),
  expressAsyncHandler(CategoriesController.getCategoryStats)
);

router.get(
  "/search",
  authenticate,
  requirePermission(PERMISSIONS.CATEGORIES_READ),
  expressAsyncHandler(CategoriesController.searchCategories)
);

router.get(
  "/subcategories",
  authenticate,
  requirePermission(PERMISSIONS.CATEGORIES_READ),
  validateQuery(getSubcategoriesQuerySchema),
  expressAsyncHandler(CategoriesController.getAllSubcategories)
);

router.get(
  "/subcategories/search",
  authenticate,
  requirePermission(PERMISSIONS.CATEGORIES_READ),
  expressAsyncHandler(CategoriesController.searchSubcategories)
);

router.get(
  "/subcategories/:id",
  authenticate,
  requirePermission(PERMISSIONS.CATEGORIES_READ),
  expressAsyncHandler(CategoriesController.getSubcategoryById)
);

router.get(
  "/:id",
  authenticate,
  requirePermission(PERMISSIONS.CATEGORIES_READ),
  expressAsyncHandler(CategoriesController.getCategoryById)
);

router.post(
  "/",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.CATEGORIES_CREATE),
  validateRequest(createCategorySchema),
  expressAsyncHandler(CategoriesController.createCategory)
);

router.put(
  "/:id",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.CATEGORIES_UPDATE),
  validateRequest(updateCategorySchema),
  expressAsyncHandler(CategoriesController.updateCategory)
);

router.delete(
  "/:id",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.CATEGORIES_DELETE),
  expressAsyncHandler(CategoriesController.deleteCategory)
);

router.get(
  "/:categoryId/subcategories",
  authenticate,
  requirePermission(PERMISSIONS.CATEGORIES_READ),
  validateQuery(getSubcategoriesQuerySchema),
  expressAsyncHandler(CategoriesController.getSubcategoriesByCategory)
);

router.post(
  "/subcategories",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.CATEGORIES_CREATE),
  validateRequest(createSubcategorySchema),
  expressAsyncHandler(CategoriesController.createSubcategory)
);

router.put(
  "/subcategories/:id",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.CATEGORIES_UPDATE),
  validateRequest(updateSubcategorySchema),
  expressAsyncHandler(CategoriesController.updateSubcategory)
);

router.delete(
  "/subcategories/:id",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.CATEGORIES_DELETE),
  expressAsyncHandler(CategoriesController.deleteSubcategory)
);

export default router;
