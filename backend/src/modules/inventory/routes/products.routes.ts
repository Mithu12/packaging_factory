import express, { NextFunction, Request, Response } from "express";
import {
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
  stockAdjustmentSchema,
} from "../validation/productValidation";
import { authenticate } from "@/middleware/auth";
import {
  requirePermission,
  requireSystemAdmin,
  PERMISSIONS,
} from "@/middleware/permission";
import { auditMiddleware } from "@/middleware/audit";
import expressAsyncHandler from "express-async-handler";
import { MyLogger } from "@/utils/new-logger";
import { uploadProductImage, handleUploadError } from "@/middleware/upload";
import ProductsController from "../controllers/products.controller";
import { GetProductInfoMediator } from "../mediators/products/GetProductInfo.mediator";
import { serializeSuccessResponse } from "@/utils/responseHelper";
import { AddProductMediator } from "../mediators/products/AddProduct.mediator";
import { UpdateProductInfoMediator } from "../mediators/products/UpdateProductInfo.mediator";
import { deleteProductImage } from "@/utils/file-utils";
import { StockAdjustmentMediator } from "../mediators/stockAdjustments/StockAdjustmentMediator";
import { DeleteProductMediator } from "../mediators/products/DeleteProduct.mediator";

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
  return (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
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
            message: "Validation error",
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
  requirePermission(PERMISSIONS.PRODUCTS_READ),
  validateQuery(productQuerySchema),
  expressAsyncHandler(ProductsController.getAllProducts)
);

router.get(
  "/stats",
  authenticate,
  requirePermission(PERMISSIONS.PRODUCTS_READ),
  expressAsyncHandler(ProductsController.getProductStats)
);

router.get(
  "/search",
  authenticate,
  requirePermission(PERMISSIONS.PRODUCTS_READ),
  expressAsyncHandler(ProductsController.searchProducts)
);

router.get(
  "/barcode/:barcode",
  authenticate,
  requirePermission(PERMISSIONS.PRODUCTS_READ),
  expressAsyncHandler(ProductsController.searchProductByBarcode)
);

router.get(
  "/low-stock",
  authenticate,
  requirePermission(PERMISSIONS.PRODUCTS_READ),
  expressAsyncHandler(ProductsController.getLowStockProducts)
);

router.get(
  "/category/:categoryId",
  authenticate,
  requirePermission(PERMISSIONS.PRODUCTS_READ),
  expressAsyncHandler(ProductsController.getProductsByCategory)
);

router.get(
  "/supplier/:supplierId",
  authenticate,
  requirePermission(PERMISSIONS.PRODUCTS_READ),
  expressAsyncHandler(ProductsController.getProductsBySupplier)
);

router.get(
  "/:id",
  authenticate,
  requirePermission(PERMISSIONS.PRODUCTS_READ),
  expressAsyncHandler(async (req, res, next) => {
    let action = "GET /api/products/:id";
    try {
      const id = parseInt(req.params.id);
      MyLogger.info(action, { productId: id });
      const product = await GetProductInfoMediator.getProductById(id);
      MyLogger.success(action, { productId: id, productName: product.name });
      serializeSuccessResponse(res, product, "SUCCESS");
    } catch (error: any) {
      MyLogger.error(action, error, { productId: req.params.id });
      throw error;
    }
  })
);

router.post(
  "/",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.PRODUCTS_CREATE),
  validateRequest(createProductSchema),
  expressAsyncHandler(async (req, res, next) => {
    let action = "Add Product";
    try {
      MyLogger.info(action, {
        productName: req.body.name,
        productSku: req.body.sku,
      });
      const product = await AddProductMediator.createProduct(req.body);
      MyLogger.success(action, {
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
      });
      serializeSuccessResponse(res, product, "SUCCESS");
    } catch (error: any) {
      MyLogger.error(action, error, {
        productName: req.body.name,
        productSku: req.body.sku,
      });
      throw error;
    }
  })
);

router.post(
  "/with-image",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.PRODUCTS_CREATE),
  uploadProductImage,
  handleUploadError,
  expressAsyncHandler(async (req, res, next) => {
    let action = "POST /api/products/with-image";
    try {
      const productData = JSON.parse(req.body.data);

      MyLogger.info(action, {
        productName: productData.name,
        productSku: productData.sku,
        hasImage: !!req.file,
      });

      if (req.file) {
        productData.image_url = `/uploads/products/${req.file.filename}`;
      }

      const { error, value } = createProductSchema.validate(productData);
      if (error) {
        res.status(400).json({
          error: {
            message: "Validation error",
            details: error.details.map((detail: any) => detail.message),
          },
        });
        return;
      }

      const product = await AddProductMediator.createProduct(value);
      MyLogger.success(action, {
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        hasImage: !!req.file,
      });
      serializeSuccessResponse(res, product, "SUCCESS");
    } catch (error: any) {
      MyLogger.error(action, error, {
        productName: req.body.data?.name,
        productSku: req.body.data?.sku,
      });
      throw error;
    }
  })
);

router.put(
  "/:id",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.PRODUCTS_UPDATE),
  validateRequest(updateProductSchema),
  expressAsyncHandler(ProductsController.updateProduct)
);

router.put(
  "/:id/with-image",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.PRODUCTS_UPDATE),
  uploadProductImage,
  handleUploadError,
  expressAsyncHandler(async (req, res, next) => {
    let action = "PUT /api/products/:id/with-image";
    try {
      const id = parseInt(req.params.id);
      const productData = JSON.parse(req.body.data);

      MyLogger.info(action, {
        productId: id,
        updateFields: Object.keys(productData),
        hasImage: !!req.file,
      });

      let currentProduct = null as any;
      if (req.file) {
        try {
          currentProduct = await GetProductInfoMediator.getProductById(id);
        } catch (error) {
          MyLogger.warn("Could not fetch current product for image deletion", {
            productId: id,
            error,
          });
        }
      }

      if (req.file) {
        productData.image_url = `/uploads/products/${req.file.filename}`;
      }

      const { error, value } = updateProductSchema.validate(productData);
      if (error) {
        MyLogger.error(action, error, {});
        res.status(400).json({
          error: {
            message: "Validation error",
            details: error.details.map((detail: any) => detail.message),
          },
        });
        return;
      }

      const product = await UpdateProductInfoMediator.updateProduct(id, value);

      if (req.file && currentProduct?.image_url) {
        const oldImageDeleted = await deleteProductImage(
          currentProduct.image_url
        );
        MyLogger.info("Old image deletion result", {
          productId: id,
          oldImageUrl: currentProduct.image_url,
          deleted: oldImageDeleted,
        });
      }

      MyLogger.success(action, {
        productId: id,
        productName: product.name,
        productSku: product.sku,
        hasImage: !!req.file,
      });
      serializeSuccessResponse(res, product, "SUCCESS");
    } catch (error: any) {
      MyLogger.error(action, error, {
        productId: req.params.id,
        updateFields: Object.keys(req.body.data || {}),
      });
      throw error;
    }
  })
);

router.post(
  "/:id/image",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.PRODUCTS_UPDATE),
  uploadProductImage,
  handleUploadError,
  expressAsyncHandler(async (req, res, next) => {
    let action = "POST /api/products/:id/image";
    try {
      const id = parseInt(req.params.id);
      MyLogger.info(action, { productId: id, hasImage: !!req.file });

      if (!req.file) {
        res.status(400).json({
          error: {
            message: "No image file provided",
            details: "Please upload an image file",
          },
        });
        return;
      }

      let currentProduct = null as any;
      try {
        currentProduct = await GetProductInfoMediator.getProductById(id);
      } catch (error) {
        MyLogger.warn("Could not fetch current product for image deletion", {
          productId: id,
          error,
        });
      }

      const imageUrl = `/uploads/products/${req.file.filename}`;
      const product = await UpdateProductInfoMediator.updateProduct(id, {
        image_url: imageUrl,
      });

      if (currentProduct?.image_url) {
        const oldImageDeleted = await deleteProductImage(
          currentProduct.image_url
        );
        MyLogger.info("Old image deletion result", {
          productId: id,
          oldImageUrl: currentProduct.image_url,
          deleted: oldImageDeleted,
        });
      }

      MyLogger.success(action, {
        productId: id,
        productName: product.name,
        imageUrl,
      });
      serializeSuccessResponse(res, product, "SUCCESS");
    } catch (error: any) {
      MyLogger.error(action, error, { productId: req.params.id });
      throw error;
    }
  })
);

router.patch(
  "/:id/toggle-status",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.PRODUCTS_UPDATE),
  expressAsyncHandler(async (req, res, next) => {
    let action = "PATCH /api/products/:id/toggle-status";
    try {
      const id = parseInt(req.params.id);
      MyLogger.info(action, { productId: id });
      const product = await UpdateProductInfoMediator.toggleProductStatus(id);
      MyLogger.success(action, {
        productId: id,
        productName: product.name,
        newStatus: product.status,
      });
      serializeSuccessResponse(res, product, "SUCCESS");
    } catch (error: any) {
      MyLogger.error(action, error, { productId: req.params.id });
      throw error;
    }
  })
);

router.patch(
  "/:id/stock",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.STOCK_ADJUSTMENTS_CREATE),
  validateRequest(stockAdjustmentSchema),
  expressAsyncHandler(async (req, res, next) => {
    let action = "PATCH /api/products/:id/stock";
    try {
      const id = parseInt(req.params.id);
      const { adjustment_type, quantity, reason, reference, notes } = req.body;
      MyLogger.info(action, {
        productId: id,
        adjustmentType: adjustment_type,
        quantity,
        reason,
      });

      const adjustmentData = {
        product_id: id,
        adjustment_type,
        quantity,
        reason,
        reference,
        notes,
      };

      const adjustment = await StockAdjustmentMediator.createStockAdjustment(
        adjustmentData
      );
      const product = await GetProductInfoMediator.getProductById(id);

      MyLogger.success(action, {
        productId: id,
        adjustmentId: adjustment.id,
        productName: product.name,
        newStock: product.current_stock,
      });
      serializeSuccessResponse(res, product, "SUCCESS");
    } catch (error: any) {
      MyLogger.error(action, error, {
        productId: req.params.id,
        quantity: req.body.quantity,
      });
      throw error;
    }
  })
);

router.delete(
  "/:id",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.PRODUCTS_DELETE),
  expressAsyncHandler(async (req, res, next) => {
    let action = "DELETE /api/products/:id";
    try {
      const id = parseInt(req.params.id);
      MyLogger.info(action, { productId: id });

      let currentProduct = null as any;
      try {
        currentProduct = await GetProductInfoMediator.getProductById(id);
      } catch (error) {
        MyLogger.warn("Could not fetch current product for image deletion", {
          productId: id,
          error,
        });
      }

      await DeleteProductMediator.deleteProduct(id);

      MyLogger.success(action, {
        productId: id,
        message: "Product marked as discontinued",
      });
      serializeSuccessResponse(
        res,
        { message: "Product marked as discontinued" },
        "SUCCESS"
      );
    } catch (error: any) {
      MyLogger.error(action, error, { productId: req.params.id });
      throw error;
    }
  })
);

router.delete(
  "/:id/hard",
  authenticate,
  auditMiddleware,
  requireSystemAdmin(),
  expressAsyncHandler(async (req, res, next) => {
    let action = "DELETE /api/products/:id/hard";
    try {
      const id = parseInt(req.params.id);
      MyLogger.info(action, { productId: id });

      let currentProduct = null as any;
      try {
        currentProduct = await GetProductInfoMediator.getProductById(id);
      } catch (error) {
        MyLogger.warn("Could not fetch current product for image deletion", {
          productId: id,
          error,
        });
      }

      await DeleteProductMediator.hardDeleteProduct(id);

      if (currentProduct?.image_url) {
        const oldImageDeleted = await deleteProductImage(
          currentProduct.image_url
        );
        MyLogger.info("Old image deletion result", {
          productId: id,
          imageUrl: currentProduct.image_url,
          deleted: oldImageDeleted,
        });
      }

      MyLogger.success(action, {
        productId: id,
        message: "Product permanently deleted",
      });
      serializeSuccessResponse(
        res,
        { message: "Product permanently deleted" },
        "SUCCESS"
      );
    } catch (error: any) {
      MyLogger.error(action, error, { productId: req.params.id });
      throw error;
    }
  })
);

router.get(
  "/:id/references",
  authenticate,
  requirePermission(PERMISSIONS.PRODUCTS_READ),
  expressAsyncHandler(async (req, res, next) => {
    let action = "GET /api/products/:id/references";
    try {
      const id = parseInt(req.params.id);
      MyLogger.info(action, { productId: id });
      const references = await DeleteProductMediator.checkProductReferences(id);
      MyLogger.success(action, {
        productId: id,
        hasReferences: references.hasReferences,
      });
      serializeSuccessResponse(res, references, "SUCCESS");
    } catch (error: any) {
      MyLogger.error(action, error, { productId: req.params.id });
      throw error;
    }
  })
);

export default router;
