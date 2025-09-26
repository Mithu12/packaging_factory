import express from "express";
import expressAsyncHandler from "express-async-handler";
import { authenticate } from "@/middleware/auth";
import { auditMiddleware } from "@/middleware/audit";
import { requirePermission, PERMISSIONS } from "@/middleware/permission";
import { validateRequest } from "@/middleware/validation";
import { serializeSuccessResponse } from "@/utils/responseHelper";
import { MyLogger } from "@/utils/new-logger";

// Validation schemas
import {
  createDistributionCenterSchema,
  updateDistributionCenterSchema,
  createProductLocationSchema,
  updateProductLocationSchema,
  createStockTransferSchema,
  updateStockTransferSchema,
  distributionCenterQuerySchema,
  productLocationQuerySchema,
  stockTransferQuerySchema,
  productAllocationSchema,
} from "@/validation/distributionValidation";

// Mediators
import { DistributionCenterMediator } from "@/modules/inventory/mediators/distribution/DistributionCenterMediator";
import { ProductLocationMediator } from "@/modules/inventory/mediators/distribution/ProductLocationMediator";
import { StockTransferMediator } from "@/modules/inventory/mediators/distribution/StockTransferMediator";

const router = express.Router();

// =====================================================
// Distribution Centers Routes
// =====================================================

// GET /api/distribution/centers - Get all distribution centers
router.get(
  "/centers",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.WAREHOUSES_READ),
  validateRequest(distributionCenterQuerySchema, "query"),
  expressAsyncHandler(async (req, res, next) => {
    const action = "GET /api/distribution/centers";
    try {
      MyLogger.info(action, { query: req.query });

      const result = await DistributionCenterMediator.getDistributionCenters(
        req.query as any
      );

      MyLogger.success(action, {
        centersCount: result.centers.length,
        total: result.total,
        page: result.page,
      });

      serializeSuccessResponse(res, result, "SUCCESS");
    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    }
  })
);

// GET /api/distribution/centers/stats - Get distribution center statistics
router.get(
  "/centers/stats",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.WAREHOUSES_READ),
  expressAsyncHandler(async (req, res, next) => {
    const action = "GET /api/distribution/centers/stats";
    try {
      MyLogger.info(action);

      const stats =
        await DistributionCenterMediator.getDistributionCenterStats();

      MyLogger.success(action, { statsCount: stats.length });
      serializeSuccessResponse(res, stats, "SUCCESS");
    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    }
  })
);

// GET /api/distribution/centers/:id - Get distribution center by ID
router.get(
  "/centers/:id",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.WAREHOUSES_READ),
  expressAsyncHandler(async (req, res, next) => {
    const action = "GET /api/distribution/centers/:id";
    const centerId = parseInt(req.params.id);

    try {
      MyLogger.info(action, { centerId });

      const center = await DistributionCenterMediator.getDistributionCenterById(
        centerId
      );

      if (!center) {
        res.status(404);
        throw new Error("Distribution center not found");
      }

      MyLogger.success(action, { centerId, centerName: center.name });
      serializeSuccessResponse(res, center, "SUCCESS");
    } catch (error: any) {
      MyLogger.error(action, error, { centerId });
      throw error;
    }
  })
);

// POST /api/distribution/centers - Create new distribution center
router.post(
  "/centers",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.WAREHOUSES_CREATE),
  validateRequest(createDistributionCenterSchema),
  expressAsyncHandler(async (req, res, next) => {
    const action = "POST /api/distribution/centers";
    try {
      MyLogger.info(action, { name: req.body.name, type: req.body.type });

      const center = await DistributionCenterMediator.createDistributionCenter(
        req.body,
        req.user!.user_id
      );

      MyLogger.success(action, {
        centerId: center.id,
        centerName: center.name,
        code: center.code,
      });

      serializeSuccessResponse(res, center, "CREATED");
    } catch (error: any) {
      MyLogger.error(action, error, { name: req.body.name });
      throw error;
    }
  })
);

// PUT /api/distribution/centers/:id - Update distribution center
router.put(
  "/centers/:id",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.WAREHOUSES_UPDATE),
  validateRequest(updateDistributionCenterSchema),
  expressAsyncHandler(async (req, res, next) => {
    const action = "PUT /api/distribution/centers/:id";
    const centerId = parseInt(req.params.id);

    try {
      MyLogger.info(action, { centerId, updates: Object.keys(req.body) });

      const center = await DistributionCenterMediator.updateDistributionCenter(
        centerId,
        req.body,
        req.user!.user_id
      );

      MyLogger.success(action, {
        centerId,
        centerName: center.name,
        updatedFields: Object.keys(req.body),
      });

      serializeSuccessResponse(res, center, "SUCCESS");
    } catch (error: any) {
      MyLogger.error(action, error, {
        centerId,
        updates: Object.keys(req.body),
      });
      throw error;
    }
  })
);

// DELETE /api/distribution/centers/:id - Delete distribution center
router.delete(
  "/centers/:id",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.STOCK_TRANSFERS_CREATE),
  expressAsyncHandler(async (req, res, next) => {
    const action = "DELETE /api/distribution/centers/:id";
    const centerId = parseInt(req.params.id);

    try {
      MyLogger.info(action, { centerId });

      await DistributionCenterMediator.deleteDistributionCenter(
        centerId,
        req.user!.user_id
      );

      MyLogger.success(action, { centerId });
      serializeSuccessResponse(
        res,
        { message: "Distribution center deactivated successfully" },
        "SUCCESS"
      );
    } catch (error: any) {
      MyLogger.error(action, error, { centerId });
      throw error;
    }
  })
);

// POST /api/distribution/centers/:id/set-primary - Set as primary distribution center
router.post(
  "/centers/:id/set-primary",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.STOCK_TRANSFERS_CREATE),
  expressAsyncHandler(async (req, res, next) => {
    const action = "POST /api/distribution/centers/:id/set-primary";
    const centerId = parseInt(req.params.id);

    try {
      MyLogger.info(action, { centerId });

      await DistributionCenterMediator.setPrimaryDistributionCenter(
        centerId,
        req.user!.user_id
      );

      MyLogger.success(action, { centerId });
      serializeSuccessResponse(
        res,
        { message: "Primary distribution center updated successfully" },
        "SUCCESS"
      );
    } catch (error: any) {
      MyLogger.error(action, error, { centerId });
      throw error;
    }
  })
);

// =====================================================
// Product Locations Routes
// =====================================================

// GET /api/distribution/locations - Get product locations
router.get(
  "/locations",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.STOCK_TRANSFERS_READ),
  validateRequest(productLocationQuerySchema, "query"),
  expressAsyncHandler(async (req, res, next) => {
    const action = "GET /api/distribution/locations";
    try {
      MyLogger.info(action, { query: req.query });

      const result = await ProductLocationMediator.getProductLocations(
        req.query as any
      );

      MyLogger.success(action, {
        locationsCount: result.locations.length,
        total: result.total,
        page: result.page,
      });

      serializeSuccessResponse(res, result, "SUCCESS");
    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    }
  })
);

// GET /api/distribution/locations/allocation-view - Get product allocation view
router.get(
  "/locations/allocation-view",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.STOCK_TRANSFERS_READ),
  expressAsyncHandler(async (req, res, next) => {
    const action = "GET /api/distribution/locations/allocation-view";
    try {
      MyLogger.info(action);

      const allocations =
        await ProductLocationMediator.getProductAllocationView();

      MyLogger.success(action, { allocationsCount: allocations.length });
      serializeSuccessResponse(res, allocations, "SUCCESS");
    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    }
  })
);

// GET /api/distribution/locations/:id - Get product location by ID
router.get(
  "/locations/:id",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.STOCK_TRANSFERS_READ),
  expressAsyncHandler(async (req, res, next) => {
    const action = "GET /api/distribution/locations/:id";
    const locationId = parseInt(req.params.id);

    try {
      MyLogger.info(action, { locationId });

      const location = await ProductLocationMediator.getProductLocationById(
        locationId
      );

      if (!location) {
        res.status(404);
        throw new Error("Product location not found");
      }

      MyLogger.success(action, {
        locationId,
        productName: location.product_name,
      });
      serializeSuccessResponse(res, location, "SUCCESS");
    } catch (error: any) {
      MyLogger.error(action, error, { locationId });
      throw error;
    }
  })
);

// GET /api/distribution/locations/product/:productId - Get locations for a product
router.get(
  "/locations/product/:productId",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.STOCK_TRANSFERS_READ),
  expressAsyncHandler(async (req, res, next) => {
    const action = "GET /api/distribution/locations/product/:productId";
    const productId = parseInt(req.params.productId);

    try {
      MyLogger.info(action, { productId });

      const locations =
        await ProductLocationMediator.getProductLocationsByProduct(productId);

      MyLogger.success(action, { productId, locationsFound: locations.length });
      serializeSuccessResponse(res, locations, "SUCCESS");
    } catch (error: any) {
      MyLogger.error(action, error, { productId });
      throw error;
    }
  })
);

// POST /api/distribution/locations - Create product location
router.post(
  "/locations",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.STOCK_TRANSFERS_CREATE),
  validateRequest(createProductLocationSchema),
  expressAsyncHandler(async (req, res, next) => {
    const action = "POST /api/distribution/locations";
    try {
      MyLogger.info(action, {
        productId: req.body.product_id,
        centerId: req.body.distribution_center_id,
      });

      const location = await ProductLocationMediator.createProductLocation(
        req.body,
        req.user!.user_id
      );

      MyLogger.success(action, {
        locationId: location.id,
        productId: req.body.product_id,
        centerId: req.body.distribution_center_id,
      });

      serializeSuccessResponse(res, location, "CREATED");
    } catch (error: any) {
      MyLogger.error(action, error, {
        productId: req.body.product_id,
        centerId: req.body.distribution_center_id,
      });
      throw error;
    }
  })
);

// PUT /api/distribution/locations/:id - Update product location
router.put(
  "/locations/:id",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.INVENTORY_ADJUST),
  validateRequest(updateProductLocationSchema),
  expressAsyncHandler(async (req, res, next) => {
    const action = "PUT /api/distribution/locations/:id";
    const locationId = parseInt(req.params.id);

    try {
      MyLogger.info(action, { locationId, updates: Object.keys(req.body) });

      const location = await ProductLocationMediator.updateProductLocation(
        locationId,
        req.body,
        req.user!.user_id
      );

      MyLogger.success(action, {
        locationId,
        updatedFields: Object.keys(req.body),
      });

      serializeSuccessResponse(res, location, "SUCCESS");
    } catch (error: any) {
      MyLogger.error(action, error, {
        locationId,
        updates: Object.keys(req.body),
      });
      throw error;
    }
  })
);

// POST /api/distribution/locations/:id/adjust-stock - Adjust stock at location
router.post(
  "/locations/:id/adjust-stock",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.INVENTORY_ADJUST),
  expressAsyncHandler(async (req, res, next) => {
    const action = "POST /api/distribution/locations/:id/adjust-stock";
    const locationId = parseInt(req.params.id);
    const { adjustment, reason } = req.body;

    try {
      MyLogger.info(action, { locationId, adjustment, reason });

      if (typeof adjustment !== "number" || !reason) {
        res.status(400);
        throw new Error("Adjustment amount and reason are required");
      }

      const location = await ProductLocationMediator.adjustStock(
        locationId,
        adjustment,
        reason,
        req.user!.user_id
      );

      MyLogger.success(action, {
        locationId,
        adjustment,
        newStock: location.current_stock,
      });

      serializeSuccessResponse(res, location, "SUCCESS");
    } catch (error: any) {
      MyLogger.error(action, error, { locationId, adjustment, reason });
      throw error;
    }
  })
);

// POST /api/distribution/locations/allocate - Allocate product across locations
router.post(
  "/locations/allocate",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.STOCK_TRANSFERS_READ),
  validateRequest(productAllocationSchema),
  expressAsyncHandler(async (req, res, next) => {
    const action = "POST /api/distribution/locations/allocate";
    try {
      MyLogger.info(action, {
        productId: req.body.product_id,
        quantity: req.body.quantity,
        priority: req.body.priority,
      });

      const allocation = await ProductLocationMediator.allocateProduct(
        req.body
      );

      MyLogger.success(action, {
        productId: req.body.product_id,
        requested: req.body.quantity,
        allocated: allocation.total_allocated,
        fullyAllocated: allocation.is_fully_allocated,
      });

      serializeSuccessResponse(res, allocation, "SUCCESS");
    } catch (error: any) {
      MyLogger.error(action, error, {
        productId: req.body.product_id,
        quantity: req.body.quantity,
      });
      throw error;
    }
  })
);

// POST /api/distribution/locations/bulk-create - Bulk create product locations
router.post(
  "/locations/bulk-create",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.STOCK_TRANSFERS_CREATE),
  expressAsyncHandler(async (req, res, next) => {
    const action = "POST /api/distribution/locations/bulk-create";
    const { product_id, center_ids, initial_stock = 0 } = req.body;

    try {
      MyLogger.info(action, {
        productId: product_id,
        centerIds: center_ids,
        initialStock: initial_stock,
      });

      if (
        !product_id ||
        !Array.isArray(center_ids) ||
        center_ids.length === 0
      ) {
        res.status(400);
        throw new Error("Product ID and center IDs array are required");
      }

      const locations =
        await ProductLocationMediator.bulkCreateProductLocations(
          product_id,
          center_ids,
          initial_stock,
          req.user!.user_id
        );

      MyLogger.success(action, {
        productId: product_id,
        locationsCreated: locations.length,
      });

      serializeSuccessResponse(res, locations, "CREATED");
    } catch (error: any) {
      MyLogger.error(action, error, {
        productId: product_id,
        centerIds: center_ids,
      });
      throw error;
    }
  })
);

// =====================================================
// Stock Transfers Routes
// =====================================================

// GET /api/distribution/transfers - Get all stock transfers
router.get(
  "/transfers",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.STOCK_TRANSFERS_READ),
  validateRequest(stockTransferQuerySchema, "query"),
  expressAsyncHandler(async (req, res, next) => {
    const action = "GET /api/distribution/transfers";
    try {
      MyLogger.info(action, { query: req.query });

      const result = await StockTransferMediator.getStockTransfers(
        req.query as any
      );

      MyLogger.success(action, {
        transfersCount: result.transfers.length,
        total: result.total,
        page: result.page,
      });

      serializeSuccessResponse(res, result, "SUCCESS");
    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    }
  })
);

// GET /api/distribution/transfers/:id - Get specific stock transfer
router.get(
  "/transfers/:id",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.STOCK_TRANSFERS_READ),
  expressAsyncHandler(async (req, res, next) => {
    const action = "GET /api/distribution/transfers/:id";
    const transferId = parseInt(req.params.id);

    try {
      MyLogger.info(action, { transferId });

      const transfer = await StockTransferMediator.getStockTransferById(
        transferId
      );

      if (!transfer) {
        res.status(404);
        throw new Error("Stock transfer not found");
      }

      MyLogger.success(action, {
        transferId,
        transferNumber: transfer.transfer_number,
      });
      serializeSuccessResponse(res, transfer, "SUCCESS");
    } catch (error: any) {
      MyLogger.error(action, error, { transferId });
      throw error;
    }
  })
);

// POST /api/distribution/transfers - Create new stock transfer
router.post(
  "/transfers",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.STOCK_TRANSFERS_CREATE),
  validateRequest(createStockTransferSchema),
  expressAsyncHandler(async (req, res, next) => {
    const action = "POST /api/distribution/transfers";
    try {
      MyLogger.info(action, {
        productId: req.body.product_id,
        fromCenter: req.body.from_center_id,
        toCenter: req.body.to_center_id,
        quantity: req.body.quantity,
      });

      const transfer = await StockTransferMediator.createStockTransfer(
        req.body,
        req.user!.user_id
      );

      MyLogger.success(action, {
        transferId: transfer.id,
        transferNumber: transfer.transfer_number,
        productId: req.body.product_id,
        quantity: req.body.quantity,
      });

      serializeSuccessResponse(res, transfer, "CREATED");
    } catch (error: any) {
      MyLogger.error(action, error, {
        productId: req.body.product_id,
        fromCenter: req.body.from_center_id,
        toCenter: req.body.to_center_id,
      });
      throw error;
    }
  })
);

// PATCH /api/distribution/transfers/:id/status - Update transfer status
router.patch(
  "/transfers/:id/status",
  authenticate,
  auditMiddleware,
  requirePermission(PERMISSIONS.STOCK_TRANSFERS_CREATE),
  expressAsyncHandler(async (req, res, next) => {
    const action = "PATCH /api/distribution/transfers/:id/status";
    const transferId = parseInt(req.params.id);
    const { status, notes } = req.body;

    try {
      MyLogger.info(action, { transferId, status, notes });

      if (!["approved", "shipped", "received", "cancelled"].includes(status)) {
        res.status(400);
        throw new Error(
          "Invalid status. Must be: approved, shipped, received, or cancelled"
        );
      }

      const transfer = await StockTransferMediator.updateStockTransferStatus(
        transferId,
        status,
        req.user!.user_id,
        notes
      );

      MyLogger.success(action, {
        transferId,
        newStatus: status,
        transferNumber: transfer.transfer_number,
      });

      serializeSuccessResponse(res, transfer, "SUCCESS");
    } catch (error: any) {
      MyLogger.error(action, error, { transferId, status });
      throw error;
    }
  })
);

export default router;
